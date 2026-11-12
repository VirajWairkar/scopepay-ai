import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store, publicState, makeId, now} from './lib/store.mjs';
import {makePostgresStore} from './lib/postgres-store.mjs';
import {sampleAnalysis, analyzeWithGemini} from './lib/analysis.mjs';
import {paypalReady, PayPalSandbox, verifiedCapture} from './lib/paypal.mjs';
import crypto from 'node:crypto';
import {negotiationOptions,validateOffers} from './lib/negotiation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const clientRoot = path.join(root, 'client');

function loadEnv() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file,'utf8').split(/\r?\n/)) {
    const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value=match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) value=value.slice(1,-1);
    process.env[match[1]]=value;
  }
}
loadEnv();
let store; // Initialized at startup; PostgreSQL connection must succeed before serving requests.
export async function initializeStorage() {
  if (store) return store;
  store=process.env.DATABASE_URL ? await makePostgresStore() :
    new Store(process.env.DATA_FILE ? path.resolve(root,process.env.DATA_FILE) : path.join(root,'server/data/store.json'));
  return store;
}
const paypal=new PayPalSandbox();
const port=Number(process.env.PORT || 3000);
const host=process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1');

function fail(message, status=400) {const e=new Error(message);e.status=status;throw e;}
function send(res, status, data, headers={}) {
  const text=JSON.stringify(data);
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});
  res.end(text);
}
function requiredText(v, field, max=3000) {
  if (typeof v!=='string' || !v.trim()) fail(`${field} is required.`);
  if (v.length>max) fail(`${field} is too long (max ${max} characters).`);
  return v.trim();
}
function validAmount(v, field='Amount') {
  const n=Number(v);
  if (!Number.isFinite(n) || n < 1 || n > 250000 || Math.abs(Math.round(n*100)-n*100)>1e-6) fail(`${field} must be between $1 and $250,000 with at most 2 decimals.`);
  return n;
}
async function readBody(req) {
  let text='';
  for await (const chunk of req) {
    text+=chunk.toString('utf8');
    if (text.length>250000) fail('Request body is too large.',413);
  }
  if (!text.trim()) return {};
  try {return JSON.parse(text);}catch{fail('Invalid JSON body.');}
}
function projectBy(id) {
  const project=store.data.projects.find(p=>p.id===id);
  if (!project) fail('Project not found.',404);
  return project;
}
function analysisBy(id) {
  const analysis=store.data.analyses.find(a=>a.id===id);
  if (!analysis) fail('Analysis not found.',404);
  return analysis;
}
function negotiationBy(id) {
  const deal=(store.data.negotiations||[]).find(n=>n.id===id);
  if (!deal) fail('Negotiation not found.',404);
  return deal;
}
function negotiationByToken(token) {
  const deal=(store.data.negotiations||[]).find(n=>n.token===token);
  if (!deal) fail('Client invitation not found.',404);
  return deal;
}
function changeOrderBy(id) {
  const order=store.data.changeOrders.find(o=>o.id===id);
  if (!order) fail('Change order not found.',404);
  return order;
}
function configPublic() {
  return {aiReady:Boolean(process.env.GEMINI_API_KEY),paypalReady:paypalReady(),paypalClientId:paypalReady()?process.env.PAYPAL_CLIENT_ID:null,
    aiModel:process.env.GEMINI_MODEL||'gemini-2.5-flash', paypalEnv:'sandbox', currency:'USD',storageMode:process.env.DATABASE_URL?'Supabase PostgreSQL':'Local JSON',appName:'ScopePay AI'};
}
function publicNegotiation(deal) {
  const project=projectBy(deal.projectId),analysis=analysisBy(deal.analysisId);
  const order=deal.changeOrderId?changeOrderBy(deal.changeOrderId):null;
  return {id:deal.id,projectName:project.name,clientName:project.client,originalScope:project.scope,
    requestText:analysis.requestText,analysisSummary:analysis.summary,reasoning:analysis.reasoning,
    evidence:analysis.evidence||[],effortItems:analysis.effortItems||[],
    options:deal.options,status:deal.status,selectedOptionId:deal.selectedOptionId||null,
    decidedAmount:deal.decidedAmount??null,decisionSource:deal.decisionSource||null,
    counter:deal.status==='countered'?deal.counter:null,
    paymentOrder:order?getPublicOrder(order):null,checkoutUrl:order?`/pay/${order.id}`:null,createdAt:deal.createdAt};
}
function orderFromNegotiation(db,deal,choice,origin) {
  if (choice.amount===0)return null;
  const analysis=analysisBy(deal.analysisId);
  const order={id:makeId('co'),projectId:deal.projectId,analysisId:deal.analysisId,
    negotiationId:deal.id,title:`Agreed option · ${choice.name}`.slice(0,120),
    description:choice.description,amount:choice.amount,currency:'USD',status:'approved',
    source:analysis.source,approvalSource:origin,createdAt:now(),paypalOrderId:null,captureId:null,paidAt:null};
  db.changeOrders.unshift(order);
  deal.changeOrderId=order.id;
  return order;
}
function getPublicOrder(order) {
  const project=projectBy(order.projectId);
  return {id:order.id,title:order.title,description:order.description,amount:order.amount,currency:order.currency,
    status:order.status,createdAt:order.createdAt,paidAt:order.paidAt || null,projectName:project.name,merchantName:'ScopePay demo freelancer',
    clientName:project.client, captureId:order.captureId || null};
}

async function api(req,res,url) {
  const route=url.pathname;
  const method=req.method;
  if (route==='/api/health' && method==='GET') return send(res,200,{ok:true,version:'2.1.0',mode:'sandbox',storage:process.env.DATABASE_URL?'postgresql':'local-json'});
  if (route==='/api/config' && method==='GET') return send(res,200,configPublic());
  if (route==='/api/state' && method==='GET') return send(res,200,publicState(store));
  if (route==='/api/projects' && method==='POST') {
    const body=await readBody(req);
    const project={id:makeId('proj'),name:requiredText(body.name,'Project name',100),client:requiredText(body.client,'Client',100),
      category:typeof body.category==='string'?body.category.slice(0,50):'Freelance project',
      scope:requiredText(body.scope,'Project agreement',10000), budget:validAmount(body.budget,'Project budget'),
      hourlyRate:validAmount(body.hourlyRate,'Hourly rate'),currency:'USD',
      status:'active',deadline:body.deadline&&/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)?body.deadline:null,createdAt:now()};
    await store.update(db=>{db.projects.unshift(project);store.activity('project',`New project created: ${project.name}`,project.id);});
    return send(res,201,project);
  }
  const analyzeMatch=route.match(/^\/api\/projects\/([^/]+)\/analyze(?:\/(sample))?$/);
  if (analyzeMatch && method==='POST') {
    const project=projectBy(analyzeMatch[1]);
    const body=await readBody(req);
    const requestText=requiredText(body.requestText,'Client request',5000);
    if (analyzeMatch[2] && project.id !== 'proj_atelier') fail('The static example is only available for the Atelier sample project.',400);
    const result=analyzeMatch[2] ? sampleAnalysis(project,requestText) : await analyzeWithGemini(project,requestText);
    const analysis={id:makeId('analysis'),...result,createdAt:now()};
    await store.update(db=>{
      db.analyses.unshift(analysis);
      store.activity('analysis',`${analysis.source==='sample'?'Sample preview':'Gemini analysis'}: ${project.name} · ${analysis.outOfScope?'outside scope':'within scope'}`,project.id);
    });
    return send(res,201,analysis);
  }
  // The freelancer curates the options before sharing the client invitation.
  const publishMatch=route.match(/^\/api\/analyses\/([^/]+)\/negotiation$/);
  if (publishMatch && method==='POST') {
    const analysis=analysisBy(publishMatch[1]);
    if (!analysis.outOfScope) fail('Only out-of-scope changes can be negotiated.',409);
    const project=projectBy(analysis.projectId);
    const body=await readBody(req);
    const suggested=analysis.negotiationOptions?.length?analysis.negotiationOptions:
      negotiationOptions([],project,analysis.extraHours,analysis.additionalWork);
    const options=validateOffers(body.options,suggested);
    const existing=(store.data.negotiations||[]).find(n=>n.analysisId===analysis.id);
    if (existing) return send(res,200,existing);
    const deal={id:makeId('neg'),token:crypto.randomBytes(24).toString('base64url'),analysisId:analysis.id,projectId:analysis.projectId,
      options,status:'awaiting_client',selectedOptionId:null,decidedAmount:null,changeOrderId:null,counter:null,
      freelancerApprovedAt:now(),createdAt:now(),acceptedAt:null};
    await store.update(db=>{db.negotiations??=[];db.negotiations.unshift(deal);
      store.activity('order',`Negotiation published for ${project.client} · ${options.length} options`,project.id);});
    return send(res,201,deal);
  }
  const publicDealMatch=route.match(/^\/api\/public\/negotiations\/([^/]+)$/);
  if (publicDealMatch && method==='GET') return send(res,200,publicNegotiation(negotiationByToken(publicDealMatch[1])));
  const clientDecisionMatch=route.match(/^\/api\/public\/negotiations\/([^/]+)\/(select|counter)$/);
  if (clientDecisionMatch && method==='POST') {
    const deal=negotiationByToken(clientDecisionMatch[1]);
    if (deal.status!=='awaiting_client') fail('This negotiation is no longer open for selections.',409);
    const body=await readBody(req);
    const choice=deal.options.find(o=>o.id===body.optionId);
    if (!choice) fail('Choose one of the published options.',400);
    if (clientDecisionMatch[2]==='select') {
      await store.update(db=>{
        const current=db.negotiations.find(n=>n.id===deal.id);
        current.selectedOptionId=choice.id;current.decidedAmount=choice.amount;current.status='accepted';current.acceptedAt=now();current.decisionSource='client_selected';
        orderFromNegotiation(db,current,choice,'freelancer_published_and_client_accepted');
        store.activity('order',`Client accepted ${choice.name} · $${choice.amount.toFixed(2)}`,current.projectId);
      });
    } else {
      const proposed=validAmount(body.amount,'Counteroffer');
      const note=requiredText(body.note,'Counteroffer explanation',600);
      if (note.length<8)fail('Explain your counteroffer in at least 8 characters.');
      await store.update(db=>{const current=db.negotiations.find(n=>n.id===deal.id);
        current.status='countered';current.counter={optionId:choice.id,amount:proposed,note,at:now()};
        store.activity('order',`Client proposed a $${proposed.toFixed(2)} counteroffer`,current.projectId);});
    }
    return send(res,200,publicNegotiation(negotiationBy(deal.id)));
  }
  const counterResponseMatch=route.match(/^\/api\/negotiations\/([^/]+)\/resolve-counter$/);
  if (counterResponseMatch && method==='POST') {
    const deal=negotiationBy(counterResponseMatch[1]);
    if (deal.status!=='countered' || !deal.counter) fail('No pending counteroffer.',409);
    const body=await readBody(req);
    if (typeof body.accept!=='boolean') fail('Provide accept: true or false.');
    await store.update(db=>{
      const current=db.negotiations.find(n=>n.id===deal.id);
      if (body.accept) {
        const source=current.options.find(o=>o.id===current.counter.optionId);
        const accepted={...source,amount:current.counter.amount};
        current.selectedOptionId=accepted.id;current.decidedAmount=accepted.amount;
        current.status='accepted';current.acceptedAt=now();current.decisionSource='client_proposed_freelancer_accepted';
        orderFromNegotiation(db,current,accepted,'client_counteroffer_and_freelancer_accepted');
        store.activity('order',`Freelancer accepted client counteroffer · $${accepted.amount.toFixed(2)}`,current.projectId);
      } else {
        current.status='awaiting_client';current.counter=null;
        store.activity('order','Freelancer declined counteroffer; client may select an original option',current.projectId);
      }
    });
    return send(res,200,negotiationBy(deal.id));
  }
  const createMatch=route.match(/^\/api\/analyses\/([^/]+)\/change-order$/);
  if (createMatch && method==='POST') {
    const analysis=analysisBy(createMatch[1]);
    if (!analysis.outOfScope) fail('This analysis marked the request within scope. A change order cannot be generated from it.',409);
    const project=projectBy(analysis.projectId);
    const existing=store.data.changeOrders.find(o=>o.analysisId===analysis.id);
    if (existing) return send(res,200,existing);
    const body=await readBody(req);
    const amount=validAmount(body.amount);
    const changeOrder={id:makeId('co'),projectId:project.id,analysisId:analysis.id,
      title:`Additional work · ${analysis.category}`.slice(0,120),
      description:analysis.summary, amount,currency:'USD',status:'approved',source:analysis.source,
      createdAt:now(),paypalOrderId:null,captureId:null,paidAt:null};
    await store.update(db=>{db.changeOrders.unshift(changeOrder);store.activity('order',`Change order approved for ${project.client} · $${amount.toFixed(2)}`,project.id);});
    return send(res,201,changeOrder);
  }
  const publicMatch=route.match(/^\/api\/public\/change-orders\/([^/]+)$/);
  if (publicMatch && method==='GET') return send(res,200,getPublicOrder(changeOrderBy(publicMatch[1])));
  const orderMatch=route.match(/^\/api\/change-orders\/([^/]+)\/(paypal-order|capture)$/);
  if (orderMatch && method==='POST') {
    const order=changeOrderBy(orderMatch[1]);
    if (order.status==='paid') {
      if (orderMatch[2]==='capture') return send(res,200,{status:'COMPLETED',captureId:order.captureId,order:getPublicOrder(order)});
      fail('This change order was already paid.',409);
    }
    if (!paypalReady()) fail('PayPal Sandbox is not configured; add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.',503);
    if (orderMatch[2]==='paypal-order') {
      if (order.paypalOrderId) return send(res,200,{id:order.paypalOrderId});
      const result=await paypal.createOrder(order,projectBy(order.projectId));
      if (!result.id) fail('PayPal did not return a checkout order ID.',502);
      await store.update(db=>{const current=db.changeOrders.find(o=>o.id===order.id);current.paypalOrderId=result.id;current.status='awaiting_payment';store.activity('payment',`PayPal sandbox order created for $${current.amount.toFixed(2)}`,current.projectId);});
      return send(res,201,{id:result.id});
    }
    const body=await readBody(req);
    const orderId=requiredText(body.orderId,'PayPal order ID',100);
    if (!order.paypalOrderId || order.paypalOrderId !== orderId) fail('Order ID does not match this change order.',409);
    const result=await paypal.captureOrder(orderId,order.id);
    const capture=verifiedCapture(result,order);
    if (!capture) fail('PayPal did not confirm a completed capture for the expected USD amount. Payment was not marked paid.',409);
    await store.update(db=>{const current=db.changeOrders.find(o=>o.id===order.id);current.status='paid';current.captureId=capture.id;current.paidAt=now();store.activity('payment',`Sandbox payment captured for $${current.amount.toFixed(2)} · ${capture.id}`,current.projectId);});
    return send(res,200,{status:'COMPLETED',captureId:capture.id,order:getPublicOrder(changeOrderBy(order.id))});
  }
  if (route.startsWith('/api/')) return send(res,404,{error:'API route not found.'});
  return false;
}
const mimetypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
function staticFile(res, route) {
  const filename=route.startsWith('/pay/')?'/pay.html':route.startsWith('/negotiate/')?'/negotiate.html':route==='/'?'/index.html':route;
  const normalized=path.resolve(clientRoot,`.`+filename);
  if (!normalized.startsWith(clientRoot+path.sep)) return send(res,403,{error:'Forbidden'});
  let stats;
  try {stats=fs.statSync(normalized);}catch{return send(res,404,{error:'Not found'});}
  if (!stats.isFile()) return send(res,404,{error:'Not a file'});
  res.writeHead(200,{'Content-Type':mimetypes[path.extname(normalized)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
  fs.createReadStream(normalized).pipe(res);
}
// Optional basic access protection for the freelancer workspace on a public demo.
// Client negotiation invitations and PayPal checkout retain separate public links.
function adminAuthorized(req, pathname) {
  const password=process.env.ADMIN_PASSWORD;
  if(!password) return true; // local mode; Render startup requires this to be set
  const publicApi = pathname==='/api/health' || pathname==='/api/config' ||
    pathname.startsWith('/api/public/') ||
    /^\/api\/change-orders\/[^/]+\/(paypal-order|capture)$/.test(pathname);
  const publicPage=pathname.startsWith('/pay/') || pathname.startsWith('/negotiate/') ||
    /^\/(logo\.svg|styles\.css|app\.js|pay\.js|negotiate\.js)$/.test(pathname);
  if (publicApi||publicPage) return true;
  const header=req.headers.authorization||'';
  if (!header.startsWith('Basic ')) return false;
  let credentials;
  try {credentials=Buffer.from(header.slice(6),'base64').toString('utf8');}catch{return false;}
  const sep=credentials.indexOf(':');
  if(sep<0)return false;
  const username=credentials.slice(0,sep), entered=credentials.slice(sep+1);
  const same=(a,b)=>{const left=crypto.createHash('sha256').update(a).digest(),right=crypto.createHash('sha256').update(b).digest();return crypto.timingSafeEqual(left,right);};
  return same(username,process.env.ADMIN_USERNAME||'demo') && same(entered,password);
}
export function buildServer(){
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Frame-Options','DENY');
    try {
      const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
      if (!adminAuthorized(req,url.pathname)) {res.setHeader('WWW-Authenticate','Basic realm="ScopePay freelancer workspace"');return send(res,401,{error:'Workspace access required.'});}
      if (url.pathname.startsWith('/api/')) return await api(req,res,url);
      if (req.method!=='GET' && req.method!=='HEAD') return send(res,405,{error:'Method not allowed'});
      return staticFile(res,url.pathname);
    } catch (error) {
      const code=Number.isInteger(error.status)?error.status:500;
      if (code>=500) console.error('[ScopePay API]',error.message);
      return send(res,code,{error:code===500?'Unexpected server error. Check server logs.':error.message});
    }
  });
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  (async()=>{
    if (process.env.RENDER && !process.env.ADMIN_PASSWORD) throw Error('Set ADMIN_PASSWORD on Render before publishing this demo.');
    await initializeStorage();
    buildServer().listen(port,host,()=>{
      console.log(`\n  ScopePay AI  http://${host}:${port}`);
      console.log(`  Storage      ${process.env.DATABASE_URL?'Supabase PostgreSQL':'local JSON (development)'}`);
      console.log(`  Gemini AI    ${process.env.GEMINI_API_KEY?'configured':'not configured · sample preview available'}`);
      console.log(`  PayPal       ${paypalReady()?'Sandbox configured':'not configured · checkout disabled'}`);
      console.log('  Press Ctrl+C to stop\n');
    });
  })().catch(error=>{console.error('[ScopePay startup]',error.message);process.exitCode=1;});
}
