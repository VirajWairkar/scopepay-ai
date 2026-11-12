import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {visitorClient} from './helpers.mjs';
import {initialStore} from '../server/lib/store.mjs';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('public anonymous visitor workspaces are isolated and client links are capability-scoped',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scopepay-visitors-')),file=path.join(dir,'legacy.json');
 const legacy=initialStore();legacy.projects.unshift({id:'legacy_private_project',name:'Legacy owner only record',client:'Private',scope:'Legacy agreement',budget:100,hourlyRate:50,status:'active',createdAt:new Date().toISOString()});fs.writeFileSync(file,JSON.stringify(legacy));
 const port=36000+Math.floor(Math.random()*900),base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,SCOPEPAY_SKIP_ENV:'1',DATABASE_URL:'',DATA_FILE:file,PORT:String(port),HOST:'127.0.0.1',SESSION_SECRET:'test-secret-with-more-than-32-characters',ADMIN_USERNAME:'owner',ADMIN_PASSWORD:'owner-test-password',CREDENTIALS_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),NODE_ENV:'test',RENDER:'',GEMINI_API_KEY:'',PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:''},stdio:'pipe'});
 try{
  let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await sleep(50);}assert.ok(ready,'server did not start');
  await t.test('homepage and API are public without a login challenge',async()=>{
   const home=await fetch(base+'/');assert.equal(home.status,200);assert.equal(home.headers.get('www-authenticate'),null);assert.match(await home.text(),/ScopePay AI/);
   const a=visitorClient(base),state=await a.call('/api/state');assert.equal(state.status,200);assert.equal(state.body.projects.length,3);
   const config=await a.call('/api/config');assert.equal(config.status,200);assert.equal(config.body.aiReady,false);assert.equal(config.body.paypalReady,false);
  });
  await t.test('separate browsers receive separate projects and cannot read each other records',async()=>{
   const a=visitorClient(base),b=visitorClient(base),aState=(await a.call('/api/state')).body,bState=(await b.call('/api/state')).body;
   assert.equal(aState.projects.length,3);assert.equal(bState.projects.length,3);assert.notEqual(aState.projects[0].id,bState.projects[0].id);
   const project=await a.call('/api/projects','POST',{name:'Visitor A private project',client:'A Client',scope:'A private original agreement',budget:100,hourlyRate:50});assert.equal(project.status,201);
   assert.equal((await a.call('/api/state')).body.projects.some(p=>p.id===project.body.id),true);
   assert.equal((await b.call('/api/state')).body.projects.some(p=>p.id===project.body.id),false);
   assert.equal((await b.call(`/api/projects/${project.body.id}/analyze/sample`,'POST',{requestText:'Add a booking calendar'})).status,404);
  });
  await t.test('client capability links expose only the selected negotiation and order',async()=>{
   const freelancer=visitorClient(base),client=visitorClient(base),state=(await freelancer.call('/api/state')).body,atelier=state.projects.find(p=>p.sampleKey==='atelier');
   const analysis=await freelancer.call(`/api/projects/${atelier.id}/analyze/sample`,'POST',{requestText:'Please add a booking calendar and deposit checkout.'});assert.equal(analysis.status,201);
   const negotiation=await freelancer.call(`/api/analyses/${analysis.body.id}/negotiation`,'POST',{options:[{id:'full',amount:45}]});assert.equal(negotiation.status,201);
   const publicDeal=await client.call(`/api/public/negotiations/${negotiation.body.token}`);assert.equal(publicDeal.status,200);assert.equal(publicDeal.body.projectName,atelier.name);
   const selected=await client.call(`/api/public/negotiations/${negotiation.body.token}/select`,'POST',{optionId:'full'});assert.equal(selected.status,200);assert.equal(selected.body.status,'accepted');
   const checkout=new URL(selected.body.checkoutUrl,base),orderId=checkout.pathname.split('/')[2],token=checkout.searchParams.get('token');
   assert.equal((await client.call(`/api/public/change-orders/${orderId}`)).status,404,'order must not be readable without its token');
   const publicOrder=await client.call(`/api/public/change-orders/${orderId}`,'GET',undefined,{'X-Client-Token':token});assert.equal(publicOrder.status,200);assert.equal(publicOrder.body.amount,45);
   assert.equal((await freelancer.call('/api/state')).body.changeOrders.length,1);
   assert.equal((await client.call('/api/state')).body.changeOrders.length,0,'client capability must not grant access to the freelancer workspace');
   assert.equal((await client.call(`/api/public/negotiations/${negotiation.body.token}x`)).status,404);
  });
  await t.test('optional owner login accesses only legacy private records and returns to visitor workspace on logout',async()=>{
   const session=await fetch(base+'/api/auth/session'),cookie=session.headers.get('set-cookie').split(';')[0],csrf=(await session.json()).csrfToken;
   const publicState=await fetch(base+'/api/state',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(publicState.projects.some(p=>p.id==='legacy_private_project'),false);
   const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({username:'owner',password:'owner-test-password'})});
   assert.equal(login.status,200);const ownerCookie=login.headers.get('set-cookie').split(';')[0],ownerCsrf=(await login.json()).csrfToken;
   const privateState=await fetch(base+'/api/state',{headers:{Cookie:ownerCookie}}).then(r=>r.json());assert.equal(privateState.projects.some(p=>p.id==='legacy_private_project'),true);
   const logout=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:ownerCookie,'Content-Type':'application/json','X-CSRF-Token':ownerCsrf},body:'{}'});assert.equal(logout.status,200);
   const returnedCookie=logout.headers.get('set-cookie').split(';')[0],visitorState=await fetch(base+'/api/state',{headers:{Cookie:returnedCookie}}).then(r=>r.json());
   assert.equal(visitorState.projects.some(p=>p.id==='legacy_private_project'),false);
  });
  await t.test('state-changing workspace requests require CSRF',async()=>{
   const response=await fetch(base+'/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'No CSRF',client:'No',scope:'No',budget:10,hourlyRate:10})});
   assert.equal(response.status,403);
  });
 }finally{child.kill('SIGTERM');await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
