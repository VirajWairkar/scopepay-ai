import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
const cwd=path.resolve(import.meta.dirname,'..');

test('end-to-end sample analyzer → approved change order → public checkout (without fake payment)',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'scopepay-api-'));
 const file=path.join(tmp,'db.json');
 const PORT=33000 + Math.floor(Math.random()*1000);
 const server=spawn(process.execPath,['server/index.mjs'],{
  cwd,env:{...process.env,PORT:String(PORT),HOST:'127.0.0.1',DATA_FILE:file,GEMINI_API_KEY:'',PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:''},stdio:'pipe'
 });
 const base=`http://127.0.0.1:${PORT}`;
 const call=async(url,method='GET',body)=>{
  const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,body:await r.json()};
 };
 try{
  let started=false;
  for(let i=0;i<70;i++){try{const r=await call('/api/health');if(r.body.ok){started=true;break;}}catch{}await sleep(70);}
  assert.equal(started,true,'server did not start');
  const initial=await call('/api/state');assert.equal(initial.body.projects.length,3);
  const missing=await call('/api/projects/proj_atelier/analyze','POST',{requestText:'Add a customer portal please'});
  assert.equal(missing.status,503);
  const sample=await call('/api/projects/proj_atelier/analyze/sample','POST',{requestText:'Please add an online booking and payment flow.'});
  assert.equal(sample.status,201);assert.equal(sample.body.source,'sample');
  assert.equal(sample.body.estimatedPrice,780);
  const approved=await call(`/api/analyses/${sample.body.id}/change-order`,'POST',{amount:825.5});
  assert.equal(approved.status,201);assert.equal(approved.body.amount,825.5);
  const duplicate=await call(`/api/analyses/${sample.body.id}/change-order`,'POST',{amount:900});
  assert.equal(duplicate.body.id,approved.body.id);
  const publicOrder=await call(`/api/public/change-orders/${approved.body.id}`);
  assert.equal(publicOrder.body.status,'approved');
  assert.equal(publicOrder.body.amount,825.5);
  const payment=await call(`/api/change-orders/${approved.body.id}/paypal-order`,'POST');
  assert.equal(payment.status,503);
  const capture=await call(`/api/change-orders/${approved.body.id}/capture`,'POST',{orderId:'fake'});
  assert.equal(capture.status,503);
  const final=await call('/api/state');
  assert.equal(final.body.changeOrders[0].status,'approved');
  const staticHtml=await fetch(base+'/');assert.equal(staticHtml.status,200);assert.match(await staticHtml.text(),/ScopePay AI/);
  const checkHtml=await fetch(base+'/pay/'+approved.body.id);assert.equal(checkHtml.status,200);assert.match(await checkHtml.text(),/Client checkout/);
  const badPath=await call('/api/public/change-orders/nonexistent');assert.equal(badPath.status,404);
  const restartDb=JSON.parse(fs.readFileSync(file));assert.equal(restartDb.changeOrders.length,1);
 }finally{server.kill('SIGTERM');fs.rmSync(tmp,{recursive:true,force:true});}
});
