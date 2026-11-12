import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {initialStore} from '../server/lib/store.mjs';
import {adminClient} from './helpers.mjs';

test('additive migration, token expiration and concurrent verified captures',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scopepay-payments-')),file=path.join(dir,'db.json');
 const seed=structuredClone(initialStore());seed.changeOrders.push({id:'legacy',projectId:'proj_atelier',amount:20,currency:'USD',status:'paid',captureId:'historical-capture',createdAt:'2026-01-01T00:00:00Z'});
 seed.negotiations.push({id:'legacy-neg',token:'legacy-unguessable-invitation-token',status:'awaiting_client'});fs.writeFileSync(file,JSON.stringify(seed));
 Object.assign(process.env,{SCOPEPAY_SKIP_ENV:'1',DATABASE_URL:'',DATA_FILE:file,ADMIN_USERNAME:'test-admin',ADMIN_PASSWORD:'test-password',SESSION_SECRET:'test-session-secret-at-least-32-characters',NODE_ENV:'test',RENDER:'',PAYPAL_CLIENT_ID:'mock',PAYPAL_CLIENT_SECRET:'mock',PAYPAL_ENV:'sandbox'});
 const {initializeStorage,buildServer}=await import('../server/index.mjs');
 const store=await initializeStorage(),legacy=store.data.changeOrders[0];
 assert.equal(legacy.captureId,'historical-capture');assert.equal(legacy.status,'paid');assert.ok(legacy.accessToken.length>=32);assert.ok(Date.parse(legacy.expiresAt)>Date.now());assert.equal(store.data.negotiations[0].token,seed.negotiations[0].token);
 const persisted=fs.readFileSync(file,'utf8');await initializeStorage();assert.equal(fs.readFileSync(file,'utf8'),persisted);
 const server=buildServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`,admin=adminClient(base);
 const original=global.fetch;let captures=0,creates=0,confirmed=false;
 global.fetch=async(url,options)=>{
  if(!String(url).startsWith('https://api-m.sandbox.paypal.com'))return original(url,options);
  let payload;
  if(String(url).endsWith('/v1/oauth2/token'))payload={access_token:'mock-oauth',expires_in:3600};
  else if(String(url).endsWith('/v2/checkout/orders')){creates++;await new Promise(r=>setTimeout(r,40));payload={id:'mock-paypal-order'};}
  else{captures++;await new Promise(r=>setTimeout(r,40));payload={status:'COMPLETED',purchase_units:[{payments:{captures:[{id:'mock-capture',status:confirmed?'COMPLETED':'PENDING',amount:{currency_code:'USD',value:'15.00'}}]}}]};}
  return {ok:true,status:200,json:async()=>payload};
 };
 try{
  const analysis=(await admin('/api/projects/proj_atelier/analyze/sample','POST',{requestText:'Add bookings'})).body;
  const deal=(await admin(`/api/analyses/${analysis.id}/negotiation`,'POST',{options:[{id:'full',amount:15}]})).body;
  const selected=await original(base+`/api/public/negotiations/${deal.token}/select`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({optionId:'full'})}).then(r=>r.json());
  const url=new URL(selected.checkoutUrl,base),id=url.pathname.split('/')[2],token=url.searchParams.get('token');
  const client=(action,body)=>original(base+`/api/change-orders/${id}/${action}`,{method:'POST',headers:{'X-Client-Token':token,'Content-Type':'application/json'},body:JSON.stringify(body||{})});
  const createResults=await Promise.all([client('paypal-order'),client('paypal-order')]);assert.deepEqual(createResults.map(r=>r.status).sort(),[201,409]);assert.equal(creates,1);
  assert.equal((await client('capture',{orderId:'wrong-order'})).status,409);assert.equal(captures,0);
  assert.equal((await client('capture',{orderId:'mock-paypal-order'})).status,409);assert.notEqual(store.data.changeOrders.find(o=>o.id===id).status,'paid');
  confirmed=true;const results=await Promise.all([client('capture',{orderId:'mock-paypal-order'}),client('capture',{orderId:'mock-paypal-order'})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(captures,2);
  assert.equal((await client('capture',{orderId:'mock-paypal-order'})).status,200);assert.equal(captures,2);assert.equal(store.data.changeOrders.find(o=>o.id===id).captureId,'mock-capture');
  await store.update(db=>{db.changeOrders.find(o=>o.id===id).expiresAt='2000-01-01T00:00:00Z';db.negotiations.find(n=>n.id===deal.id).expiresAt='2000-01-01T00:00:00Z';});
  assert.equal((await client('capture',{orderId:'mock-paypal-order'})).status,401);assert.equal((await original(base+`/api/public/negotiations/${deal.token}`)).status,404);
 }finally{global.fetch=original;await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
