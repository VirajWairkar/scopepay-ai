import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createAuth} from './lib/auth.mjs';
import {TenantJsonStore,makePostgresTenantStore} from './lib/tenant-store.mjs';
import {publicState,makeId,now} from './lib/store.mjs';
import {sampleAnalysis,analyzeWithGemini} from './lib/analysis.mjs';
import {paypalReady,PayPalSandbox,verifiedCapture} from './lib/paypal.mjs';
import {negotiationOptions,validateOffers} from './lib/negotiation.mjs';
import {encryptSecret,decryptSecret,validateGeminiKey} from './lib/credentials.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const clientRoot=path.join(root,'client');
function loadEnv(){
  if(process.env.SCOPEPAY_SKIP_ENV==='1')return;
  const file=path.join(root,'.env');if(!fs.existsSync(file))return;
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){
    const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);if(!match||process.env[match[1]]!==undefined)continue;
    let value=match[2].trim();if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);process.env[match[1]]=value;
  }
}
loadEnv();
let persistence;
export async function initializeStorage(){
  if(persistence)return persistence;
  persistence=process.env.DATABASE_URL?await makePostgresTenantStore():new TenantJsonStore(process.env.DATA_FILE?path.resolve(root,process.env.DATA_FILE):path.join(root,'server/data/store.json'));
  return persistence;
}
const port=Number(process.env.PORT||3000);
const host=process.env.HOST||(process.env.RENDER?'0.0.0.0':'127.0.0.1');
const activeMutations=new Set();
const integrationAttempts=new Map();

function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
function send(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));}
function requiredText(value,field,max=3000){if(typeof value!=='string'||!value.trim())fail(`${field} is required.`);if(value.length>max)fail(`${field} is too long (max ${max} characters).`);return value.trim();}
function validAmount(value,field='Amount'){
  const amount=Number(value);if(!Number.isFinite(amount)||amount<1||amount>250000||Math.abs(Math.round(amount*100)-amount*100)>1e-6)fail(`${field} must be between $1 and $250,000 with at most 2 decimals.`);return amount;
}
async function readBody(req){let text='';for await(const chunk of req){text+=chunk.toString('utf8');if(text.length>250000)fail('Request body is too large.',413);}if(!text.trim())return {};try{return JSON.parse(text);}catch{fail('Invalid JSON body.');}}

function createScopedStore(base,ownerId,initialData){
  let data=initialData,draft=null;
  return {
    get data(){return data;},
    async update(fn){
      const result=await base.updateOwner(ownerId,next=>{draft=next;try{return fn(next);}finally{draft=null;}});
      data=await base.loadOwner(ownerId);return result;
    },
    activity(type,message,projectId=null){
      const target=draft||data;target.activities.unshift({id:makeId('act'),type,message,projectId,createdAt:now()});target.activities=target.activities.slice(0,150);
    }
  };
}
function projectBy(id,scoped){const project=scoped.data.projects.find(item=>item.id===id);if(!project)fail('Project not found.',404);return project;}
function analysisBy(id,scoped){const analysis=scoped.data.analyses.find(item=>item.id===id);if(!analysis)fail('Analysis not found.',404);return analysis;}
function negotiationBy(id,scoped){const deal=(scoped.data.negotiations||[]).find(item=>item.id===id);if(!deal)fail('Negotiation not found.',404);return deal;}
function negotiationByToken(token,scoped){const deal=(scoped.data.negotiations||[]).find(item=>item.token===token);if(!deal||deal.revokedAt||!(Date.parse(deal.expiresAt)>Date.now()))fail('Client invitation expired or unavailable.',404);return deal;}
function changeOrderBy(id,scoped){const order=scoped.data.changeOrders.find(item=>item.id===id);if(!order)fail('Change order not found.',404);return order;}

async function secretsFor(ownerId){
  if(ownerId===null)return {geminiApiKey:process.env.GEMINI_API_KEY||null,paypalClientId:process.env.PAYPAL_CLIENT_ID||null,paypalClientSecret:process.env.PAYPAL_CLIENT_SECRET||null};
  const row=await persistence.getCredentials(ownerId);
  return {geminiApiKey:row.geminiKeyEnc?decryptSecret(row.geminiKeyEnc):null,paypalClientId:row.paypalClientIdEnc?decryptSecret(row.paypalClientIdEnc):null,paypalClientSecret:row.paypalClientSecretEnc?decryptSecret(row.paypalClientSecretEnc):null};
}
function paypalFingerprint(secrets){return crypto.createHash('sha256').update(`${secrets.paypalClientId||''}\0${secrets.paypalClientSecret||''}`).digest('hex');}
function paypalFor(secrets){
  const config={PAYPAL_CLIENT_ID:secrets.paypalClientId,PAYPAL_CLIENT_SECRET:secrets.paypalClientSecret,PAYPAL_ENV:'sandbox'};
  if(!paypalReady(config))fail('Connect your PayPal Sandbox merchant credentials in Integrations before creating a payment.',503);
  return new PayPalSandbox(config);
}
async function configPublic(ownerId){
  const secrets=await secretsFor(ownerId),ready=Boolean(secrets.paypalClientId&&secrets.paypalClientSecret);
  return {aiReady:Boolean(secrets.geminiApiKey),paypalReady:ready,paypalClientId:ready?secrets.paypalClientId:null,
    aiModel:process.env.GEMINI_MODEL||'gemini-2.5-flash',paypalEnv:'sandbox',currency:'USD',
    storageMode:process.env.DATABASE_URL?'Supabase PostgreSQL':'Local JSON (visitor-isolated)',appName:'ScopePay AI',sessionMode:'anonymous visitor workspace',ownerAccessEnabled:Boolean(process.env.ADMIN_PASSWORD),ownerAuthenticated:ownerId===null};
}
function publicNegotiation(deal,scoped){
  const project=projectBy(deal.projectId,scoped),analysis=analysisBy(deal.analysisId,scoped),order=deal.changeOrderId?changeOrderBy(deal.changeOrderId,scoped):null;
  return {id:deal.id,projectName:project.name,clientName:project.client,originalScope:project.scope,requestText:analysis.requestText,
    analysisSummary:analysis.summary,reasoning:analysis.reasoning,evidence:analysis.evidence||[],effortItems:analysis.effortItems||[],
    options:deal.options,status:deal.status,selectedOptionId:deal.selectedOptionId||null,decidedAmount:deal.decidedAmount??null,
    decisionSource:deal.decisionSource||null,counter:deal.status==='countered'?deal.counter:null,
    paymentOrder:order?getPublicOrder(order,scoped):null,checkoutUrl:order?`/pay/${order.id}?token=${order.accessToken}`:null,createdAt:deal.createdAt};
}
function orderFromNegotiation(db,deal,choice,origin,scoped){
  if(choice.amount===0)return null;
  const analysis=analysisBy(deal.analysisId,scoped);
  const order={id:makeId('co'),projectId:deal.projectId,analysisId:deal.analysisId,negotiationId:deal.id,
    title:`Agreed option · ${choice.name}`.slice(0,120),description:choice.description,amount:choice.amount,currency:'USD',status:'approved',
    accessToken:crypto.randomBytes(32).toString('base64url'),expiresAt:new Date(Date.now()+90*86400000).toISOString(),source:analysis.source,
    approvalSource:origin,createdAt:now(),paypalOrderId:null,captureId:null,paidAt:null};
  db.changeOrders.unshift(order);deal.changeOrderId=order.id;return order;
}
function getPublicOrder(order,scoped,paypalClientId=null){
  const project=projectBy(order.projectId,scoped);
  return {id:order.id,title:order.title,description:order.description,amount:order.amount,currency:order.currency,status:order.status,
    createdAt:order.createdAt,paidAt:order.paidAt||null,projectName:project.name,merchantName:'ScopePay freelancer',clientName:project.client,
    captureId:order.captureId||null,...(paypalClientId?{paypalClientId}: {})};
}
function limitIntegration(ownerId,route){
  const key=`${ownerId}:${route}`,nowMs=Date.now();
  for(const [id,row]of integrationAttempts)if(row.until<=nowMs)integrationAttempts.delete(id);
  const row=integrationAttempts.get(key)||{count:0,until:nowMs+10*60*1000};
  if(row.count>=8)fail('Too many integration attempts. Wait 10 minutes and try again.',429);
  row.count++;integrationAttempts.set(key,row);
}

async function api(req,res,url,scoped,ownerId){
  const route=url.pathname,method=req.method;
  if(route==='/api/health'&&method==='GET')return send(res,200,{ok:true});
  if(route==='/api/config'&&method==='GET')return send(res,200,await configPublic(ownerId));
  if(route==='/api/state'&&method==='GET')return send(res,200,publicState(scoped));
  if(route==='/api/integrations/gemini'&&method==='POST'){
    if(ownerId===null)fail('Legacy workspace credentials are managed by the server owner.',403);
    limitIntegration(ownerId,'gemini');const body=await readBody(req),key=requiredText(body.apiKey,'Gemini API key',300);
    if(key.length<20||/\s/.test(key))fail('Enter a valid Gemini API key.',400);
    const encrypted=encryptSecret(key);await validateGeminiKey(key,process.env.GEMINI_MODEL||'gemini-2.5-flash');
    await persistence.setCredentials(ownerId,{geminiKeyEnc:encrypted});
    return send(res,200,{ok:true,aiReady:true});
  }
  if(route==='/api/integrations/gemini'&&method==='DELETE'){
    if(ownerId===null)fail('Legacy workspace credentials are managed by the server owner.',403);
    await persistence.clearCredentials(ownerId,['geminiKeyEnc']);return send(res,200,{ok:true,aiReady:false});
  }
  if(route==='/api/integrations/paypal'&&method==='POST'){
    if(ownerId===null)fail('Legacy workspace credentials are managed by the server owner.',403);
    limitIntegration(ownerId,'paypal');const body=await readBody(req);
    const clientId=requiredText(body.clientId,'PayPal Sandbox Client ID',500),clientSecret=requiredText(body.clientSecret,'PayPal Sandbox Client Secret',500);
    if(clientId.length<10||clientSecret.length<10)fail('Enter the Client ID and Client Secret from a PayPal Sandbox REST app.',400);
    const encryptedClientId=encryptSecret(clientId),encryptedClientSecret=encryptSecret(clientSecret);
    const client=new PayPalSandbox({PAYPAL_CLIENT_ID:clientId,PAYPAL_CLIENT_SECRET:clientSecret,PAYPAL_ENV:'sandbox'});
    await client.token();
    const workspace=await persistence.loadOwner(ownerId),pending=workspace.changeOrders.filter(order=>order.paypalOrderId&&order.status==='awaiting_payment');
    if(pending.length&&pending.some(order=>order.paypalCredentialFingerprint&&order.paypalCredentialFingerprint!==paypalFingerprint({paypalClientId:clientId,paypalClientSecret:clientSecret})))fail('Finish or cancel pending Sandbox payments before changing the merchant credentials.',409);
    const current=await persistence.getCredentials(ownerId),oldSecrets={paypalClientId:current.paypalClientIdEnc?decryptSecret(current.paypalClientIdEnc):null,paypalClientSecret:current.paypalClientSecretEnc?decryptSecret(current.paypalClientSecretEnc):null};
    if(pending.length&&oldSecrets.paypalClientId&&(!oldSecrets.paypalClientSecret||oldSecrets.paypalClientId!==clientId||oldSecrets.paypalClientSecret!==clientSecret))fail('Finish pending Sandbox payments before replacing the merchant credentials.',409);
    await persistence.setCredentials(ownerId,{paypalClientIdEnc:encryptedClientId,paypalClientSecretEnc:encryptedClientSecret});
    return send(res,200,{ok:true,paypalReady:true});
  }
  if(route==='/api/integrations/paypal'&&method==='DELETE'){
    if(ownerId===null)fail('Legacy workspace credentials are managed by the server owner.',403);
    const workspace=await persistence.loadOwner(ownerId);if(workspace.changeOrders.some(order=>order.paypalOrderId&&order.status==='awaiting_payment'))fail('Finish pending Sandbox payments before disconnecting PayPal.',409);
    await persistence.clearCredentials(ownerId,['paypalClientIdEnc','paypalClientSecretEnc']);return send(res,200,{ok:true,paypalReady:false});
  }
  if(route==='/api/projects'&&method==='POST'){
    const body=await readBody(req);
    const project={id:makeId('proj'),name:requiredText(body.name,'Project name',100),client:requiredText(body.client,'Client',100),
      category:typeof body.category==='string'?body.category.slice(0,50):'Freelance project',scope:requiredText(body.scope,'Project agreement',10000),
      budget:validAmount(body.budget,'Project budget'),hourlyRate:validAmount(body.hourlyRate,'Hourly rate'),currency:'USD',status:'active',
      deadline:body.deadline&&/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)?body.deadline:null,createdAt:now(),isSample:false};
    await scoped.update(db=>{db.projects.unshift(project);scoped.activity('project',`New project created: ${project.name}`,project.id);});
    return send(res,201,project);
  }
  const analyzeMatch=route.match(/^\/api\/projects\/([^/]+)\/analyze(?:\/(sample))?$/);
  if(analyzeMatch&&method==='POST'){
    const project=projectBy(analyzeMatch[1],scoped),body=await readBody(req),requestText=requiredText(body.requestText,'Client request',5000);
    if(analyzeMatch[2]&&project.sampleKey!=='atelier'&&project.id!=='proj_atelier')fail('The static example is only available for the Atelier sample project.',400);
    let result;
    if(analyzeMatch[2])result=sampleAnalysis(project,requestText);
    else {const secrets=await secretsFor(ownerId);if(!secrets.geminiApiKey)fail('Connect your own Gemini API key in Integrations to run live AI analysis. You can still explore the clearly labeled sample preview.',503);
      result=await analyzeWithGemini(project,requestText,{apiKey:secrets.geminiApiKey});}
    const analysis={id:makeId('analysis'),...result,createdAt:now()};
    await scoped.update(db=>{db.analyses.unshift(analysis);scoped.activity('analysis',`${analysis.source==='sample'?'Sample preview':'Gemini analysis'}: ${project.name} · ${analysis.outOfScope?'outside scope':'within scope'}`,project.id);});
    return send(res,201,analysis);
  }
  const publishMatch=route.match(/^\/api\/analyses\/([^/]+)\/negotiation$/);
  if(publishMatch&&method==='POST'){
    const analysis=analysisBy(publishMatch[1],scoped);if(!analysis.outOfScope)fail('Only out-of-scope changes can be negotiated.',409);
    const project=projectBy(analysis.projectId,scoped),body=await readBody(req),suggested=analysis.negotiationOptions?.length?analysis.negotiationOptions:negotiationOptions([],project,analysis.extraHours,analysis.additionalWork);
    const options=validateOffers(body.options,suggested),existing=(scoped.data.negotiations||[]).find(item=>item.analysisId===analysis.id);
    if(existing)return send(res,200,existing);
    const candidate={id:makeId('neg'),token:crypto.randomBytes(32).toString('base64url'),analysisId:analysis.id,projectId:analysis.projectId,
      expiresAt:new Date(Date.now()+90*86400000).toISOString(),options,status:'awaiting_client',selectedOptionId:null,decidedAmount:null,
      changeOrderId:null,counter:null,freelancerApprovedAt:now(),createdAt:now(),acceptedAt:null};
    let published=candidate;
    await scoped.update(db=>{db.negotiations??=[];const already=db.negotiations.find(item=>item.analysisId===analysis.id);if(already){published=already;return;}
      db.negotiations.unshift(candidate);scoped.activity('order',`Negotiation published for ${project.client} · ${options.length} options`,project.id);});
    return send(res,published===candidate?201:200,published);
  }
  const revoke=route.match(/^\/api\/(negotiations|change-orders)\/([^/]+)\/revoke$/);
  if(revoke&&method==='POST'){
    const item=revoke[1]==='negotiations'?negotiationBy(revoke[2],scoped):changeOrderBy(revoke[2],scoped);
    await scoped.update(db=>{const rows=revoke[1]==='negotiations'?db.negotiations:db.changeOrders;rows.find(x=>x.id===item.id).revokedAt=now();
      if(revoke[1]==='negotiations')for(const order of db.changeOrders)if(order.negotiationId===item.id)order.revokedAt=now();});
    return send(res,200,{ok:true});
  }
  const publicDealMatch=route.match(/^\/api\/public\/negotiations\/([^/]+)$/);
  if(publicDealMatch&&method==='GET')return send(res,200,publicNegotiation(negotiationByToken(publicDealMatch[1],scoped),scoped));
  const clientDecisionMatch=route.match(/^\/api\/public\/negotiations\/([^/]+)\/(select|counter)$/);
  if(clientDecisionMatch&&method==='POST'){
    const deal=negotiationByToken(clientDecisionMatch[1],scoped);if(deal.status!=='awaiting_client')fail('This negotiation is no longer open for selections.',409);
    const body=await readBody(req),choice=deal.options.find(option=>option.id===body.optionId);if(!choice)fail('Choose one of the published options.',400);
    if(clientDecisionMatch[2]==='select'){
      await scoped.update(db=>{const current=db.negotiations.find(item=>item.id===deal.id);if(current.status!==deal.status)fail('Negotiation changed. Refresh and try again.',409);
        current.selectedOptionId=choice.id;current.decidedAmount=choice.amount;current.status='accepted';current.acceptedAt=now();current.decisionSource='client_selected';
        orderFromNegotiation(db,current,choice,'freelancer_published_and_client_accepted',scoped);scoped.activity('order',`Client accepted ${choice.name} · $${choice.amount.toFixed(2)}`,current.projectId);});
    }else{
      const proposed=validAmount(body.amount,'Counteroffer'),note=requiredText(body.note,'Counteroffer explanation',600);if(note.length<8)fail('Explain your counteroffer in at least 8 characters.');
      await scoped.update(db=>{const current=db.negotiations.find(item=>item.id===deal.id);if(current.status!==deal.status)fail('Negotiation changed. Refresh and try again.',409);
        current.status='countered';current.counter={optionId:choice.id,amount:proposed,note,at:now()};scoped.activity('order',`Client proposed a $${proposed.toFixed(2)} counteroffer`,current.projectId);});
    }
    return send(res,200,publicNegotiation(negotiationBy(deal.id,scoped),scoped));
  }
  const counterResponseMatch=route.match(/^\/api\/negotiations\/([^/]+)\/resolve-counter$/);
  if(counterResponseMatch&&method==='POST'){
    const deal=negotiationBy(counterResponseMatch[1],scoped);if(deal.status!=='countered'||!deal.counter)fail('No pending counteroffer.',409);
    const body=await readBody(req);if(typeof body.accept!=='boolean')fail('Provide accept: true or false.');
    await scoped.update(db=>{const current=db.negotiations.find(item=>item.id===deal.id);if(current.status!==deal.status)fail('Negotiation changed. Refresh and try again.',409);
      if(body.accept){const source=current.options.find(option=>option.id===current.counter.optionId),accepted={...source,amount:current.counter.amount};
        current.selectedOptionId=accepted.id;current.decidedAmount=accepted.amount;current.status='accepted';current.acceptedAt=now();current.decisionSource='client_proposed_freelancer_accepted';
        orderFromNegotiation(db,current,accepted,'client_counteroffer_and_freelancer_accepted',scoped);scoped.activity('order',`Freelancer accepted client counteroffer · $${accepted.amount.toFixed(2)}`,current.projectId);
      }else{current.status='awaiting_client';current.counter=null;scoped.activity('order','Freelancer declined counteroffer; client may select an original option',current.projectId);}});
    return send(res,200,negotiationBy(deal.id,scoped));
  }
  const createMatch=route.match(/^\/api\/analyses\/([^/]+)\/change-order$/);
  if(createMatch&&method==='POST'){
    const analysis=analysisBy(createMatch[1],scoped);if(!analysis.outOfScope)fail('This analysis marked the request within scope. A change order cannot be generated from it.',409);
    const project=projectBy(analysis.projectId,scoped),existing=scoped.data.changeOrders.find(item=>item.analysisId===analysis.id);if(existing)return send(res,200,existing);
    const body=await readBody(req),amount=validAmount(body.amount);
    const candidate={id:makeId('co'),projectId:project.id,analysisId:analysis.id,title:`Additional work · ${analysis.category}`.slice(0,120),
      description:analysis.summary,amount,currency:'USD',status:'approved',source:analysis.source,accessToken:crypto.randomBytes(32).toString('base64url'),
      expiresAt:new Date(Date.now()+90*86400000).toISOString(),createdAt:now(),paypalOrderId:null,captureId:null,paidAt:null};
    let approved=candidate;
    await scoped.update(db=>{const already=db.changeOrders.find(item=>item.analysisId===analysis.id);if(already){approved=already;return;}
      db.changeOrders.unshift(candidate);scoped.activity('order',`Change order approved for ${project.client} · $${amount.toFixed(2)}`,project.id);});
    return send(res,approved===candidate?201:200,approved);
  }
  const publicOrderMatch=route.match(/^\/api\/public\/change-orders\/([^/]+)$/);
  if(publicOrderMatch&&method==='GET'){
    const order=changeOrderBy(publicOrderMatch[1],scoped),secrets=await secretsFor(ownerId);
    const merchantMatches=!order.paypalCredentialFingerprint||order.paypalCredentialFingerprint===paypalFingerprint(secrets);
    return send(res,200,getPublicOrder(order,scoped,merchantMatches&&secrets.paypalClientId&&secrets.paypalClientSecret?secrets.paypalClientId:null));
  }
  const orderMatch=route.match(/^\/api\/change-orders\/([^/]+)\/(paypal-order|capture)$/);
  if(orderMatch&&method==='POST'){
    const order=changeOrderBy(orderMatch[1],scoped),secrets=await secretsFor(ownerId),paypal=paypalFor(secrets);
    if(order.paypalCredentialFingerprint&&order.paypalCredentialFingerprint!==paypalFingerprint(secrets))fail('The PayPal Sandbox merchant credentials changed after this order was created. Reconnect the original merchant credentials to continue.',409);
    if(order.status==='paid'){if(orderMatch[2]==='capture')return send(res,200,{status:'COMPLETED',captureId:order.captureId,order:getPublicOrder(order,scoped)});fail('This change order was already paid.',409);}
    if(!['approved','awaiting_payment'].includes(order.status))fail('This change order is not approved for payment.',409);
    if(orderMatch[2]==='paypal-order'){
      if(order.paypalOrderId)return send(res,200,{id:order.paypalOrderId});
      const result=await paypal.createOrder(order,projectBy(order.projectId,scoped));if(!result.id)fail('PayPal did not return a checkout order ID.',502);
      await scoped.update(db=>{const current=db.changeOrders.find(item=>item.id===order.id);current.paypalOrderId=result.id;current.paypalCredentialFingerprint=paypalFingerprint(secrets);current.status='awaiting_payment';scoped.activity('payment',`PayPal sandbox order created for $${current.amount.toFixed(2)}`,current.projectId);});
      return send(res,201,{id:result.id});
    }
    const body=await readBody(req),orderId=requiredText(body.orderId,'PayPal order ID',100);
    if(!order.paypalOrderId||order.paypalOrderId!==orderId)fail('Order ID does not match this change order.',409);
    const result=await paypal.captureOrder(orderId,order.id),capture=verifiedCapture(result,order);
    if(!capture)fail('PayPal did not confirm a completed capture for the expected USD amount. Payment was not marked paid.',409);
    await scoped.update(db=>{const current=db.changeOrders.find(item=>item.id===order.id);current.status='paid';current.captureId=capture.id;current.paidAt=now();scoped.activity('payment',`Sandbox payment captured for $${current.amount.toFixed(2)} · ${capture.id}`,current.projectId);});
    return send(res,200,{status:'COMPLETED',captureId:capture.id,order:getPublicOrder(changeOrderBy(order.id,scoped),scoped)});
  }
  if(route.startsWith('/api/'))return send(res,404,{error:'API route not found.'});
  return false;
}

const mimetypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
function staticFile(res,route){
  const filename=route.startsWith('/pay/')?'/pay.html':route.startsWith('/negotiate/')?'/negotiate.html':route==='/'?'/index.html':route;
  const normalized=path.resolve(clientRoot,`.${filename}`);if(!normalized.startsWith(clientRoot+path.sep))return send(res,403,{error:'Forbidden'});
  let stats;try{stats=fs.statSync(normalized);}catch{return send(res,404,{error:'Not found'});}if(!stats.isFile())return send(res,404,{error:'Not a file'});
  res.writeHead(200,{'Content-Type':mimetypes[path.extname(normalized)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});fs.createReadStream(normalized).pipe(res);
}

export function buildServer(){
  if(!persistence)throw new Error('Call initializeStorage() before buildServer().');
  const auth=createAuth(process.env,persistence.pool||null);
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      const url=new URL(req.url,`http://${req.headers.host||'localhost'}`),route=url.pathname,mutating=!['GET','HEAD'].includes(req.method);
      if(route==='/api/health'&&req.method==='GET')return send(res,200,{ok:true});
      if(!route.startsWith('/api/')){
        if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed'});
        return staticFile(res,url.pathname);
      }
      await auth.load(req,res);
      const sessionInfo=await auth.ensureVisitor(req),admin=auth.authenticated(req);
      if(route==='/api/auth/session'&&req.method==='GET')return send(res,200,{authenticated:admin,csrfToken:sessionInfo.csrfToken,sessionMode:'anonymous'});
      if(route==='/api/auth/login'&&req.method==='POST'){
        if(!auth.csrf(req))return send(res,403,{error:'Refresh the page and try again.'});
        return send(res,200,await auth.login(req,await readBody(req)));
      }
      if(route==='/api/auth/logout'&&req.method==='POST'){
        if(!admin)return send(res,401,{error:'Optional owner login required.'});if(!auth.csrf(req))return send(res,403,{error:'Invalid CSRF token.'});
        return send(res,200,{ok:true,...await auth.logout(req)});
      }
      const ownerId=auth.ownerId(req);
      if(route==='/api/config'&&req.method==='GET'){
        if(ownerId!==null&&persistence.ensureVisitor)await persistence.ensureVisitor(ownerId);
        return send(res,200,await configPublic(ownerId));
      }
      let capability=null,capabilityType=null,capabilityToken=null;
      const negotiationRoute=route.match(/^\/api\/public\/negotiations\/([^/]+)(?:\/(?:select|counter))?$/);
      if(negotiationRoute){capabilityType='negotiation';capabilityToken=negotiationRoute[1];}
      const checkoutRoute=route.match(/^\/api\/(?:public\/)?change-orders\/([^/]+)(?:\/(?:paypal-order|capture))?$/);
      if(checkoutRoute){capabilityType='change_order';capabilityToken=req.headers['x-client-token']||url.searchParams.get('token')||null;}
      let requestOwnerId=ownerId;
      const clientCapability=Boolean(capabilityType&&capabilityToken);
      if(clientCapability){
        capability=await persistence.resolveCapability(capabilityToken,capabilityType);
        if(!capability||capability.revoked||!(Date.parse(capability.expiresAt)>Date.now()))return send(res,404,{error:'Client link expired or unavailable.'});
        if(checkoutRoute&&capability.entityId!==checkoutRoute[1])return send(res,404,{error:'Client payment link is invalid.'});
        requestOwnerId=capability.ownerId;
      }
      if(mutating&&!clientCapability&&!auth.csrf(req))return send(res,403,{error:'Invalid or missing CSRF token. Refresh the page and try again.'});
      if(requestOwnerId!==null&&persistence.ensureVisitor)await persistence.ensureVisitor(requestOwnerId);
      const data=await persistence.loadOwner(requestOwnerId),scoped=createScopedStore(persistence,requestOwnerId,data);
      if(route.startsWith('/api/')){
        const key=mutating?(route.match(/^\/api\/(?:public\/)?(?:change-orders|negotiations)\/([^/]+)/)?.[1]):null;
        if(key&&activeMutations.has(key))return send(res,409,{error:'A request is already processing. Please refresh shortly.'});
        if(key)activeMutations.add(key);
        try{return await api(req,res,url,scoped,requestOwnerId);}finally{if(key)activeMutations.delete(key);}
      }
      return send(res,404,{error:'Not found'});
    }catch(error){
      const code=Number.isInteger(error.status)?error.status:500;if(code>=500)console.error('[ScopePay API]',error.message);
      return send(res,code,{error:code===500?'Unexpected server error. Check server logs.':error.message});
    }
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  (async()=>{
    const production=process.env.NODE_ENV==='production'||Boolean(process.env.RENDER);
    if(production&&!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required for visitor-isolated production storage.');
    if(production)encryptSecret('scopepay-startup-check');
    await initializeStorage();
    buildServer().listen(port,host,()=>{
      console.log(`\n  ScopePay AI  http://${host}:${port}`);
      console.log(`  Storage      ${process.env.DATABASE_URL?'Supabase PostgreSQL':'Local JSON (visitor-isolated)'}`);
      console.log('  Access       Public anonymous visitor workspaces');
      console.log('  Gemini       Bring your own API key in Integrations');
      console.log('  PayPal       Bring your own Sandbox merchant app in Integrations');
      console.log('  Press Ctrl+C to stop\n');
    });
  })().catch(error=>{console.error('[ScopePay startup]',error.message);process.exitCode=1;});
}
