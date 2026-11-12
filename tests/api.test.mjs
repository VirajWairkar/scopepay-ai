import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {visitorClient} from './helpers.mjs';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('sample analyzer → change order → token-protected public checkout',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scopepay-api-')),file=path.join(dir,'legacy.json'),port=33000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;
 const server=spawn(process.execPath,['server/index.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,SCOPEPAY_SKIP_ENV:'1',DATABASE_URL:'',SESSION_SECRET:'test-session-secret-at-least-32-characters',CREDENTIALS_ENCRYPTION_KEY:Buffer.alloc(32,4).toString('base64'),NODE_ENV:'test',RENDER:'',PORT:String(port),HOST:'127.0.0.1',DATA_FILE:file,GEMINI_API_KEY:'',PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:''},stdio:'pipe'});
 try{
  let ready=false;for(let i=0;i<70;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await sleep(70);}assert.ok(ready);
  const client=visitorClient(base),initial=await client.call('/api/state'),atelier=initial.body.projects.find(p=>p.sampleKey==='atelier');assert.equal(initial.status,200);
  const missing=await client.call(`/api/projects/${atelier.id}/analyze`,'POST',{requestText:'Add a customer portal please'});assert.equal(missing.status,503);
  const sample=await client.call(`/api/projects/${atelier.id}/analyze/sample`,'POST',{requestText:'Please add an online booking and payment flow.'});
  assert.equal(sample.status,201);assert.equal(sample.body.source,'sample');assert.equal(sample.body.estimatedPrice,780);
  const approved=await client.call(`/api/analyses/${sample.body.id}/change-order`,'POST',{amount:825.5});assert.equal(approved.status,201);assert.equal(approved.body.amount,825.5);
  const duplicate=await client.call(`/api/analyses/${sample.body.id}/change-order`,'POST',{amount:900});assert.equal(duplicate.body.id,approved.body.id);
  const outsider=visitorClient(base),noToken=await outsider.call(`/api/public/change-orders/${approved.body.id}`);assert.equal(noToken.status,404);
  const token=approved.body.accessToken,publicOrder=await client.call(`/api/public/change-orders/${approved.body.id}`,'GET',undefined,{'X-Client-Token':token});
  assert.equal(publicOrder.status,200);assert.equal(publicOrder.body.status,'approved');assert.equal(publicOrder.body.amount,825.5);assert.equal(publicOrder.body.paypalClientId,undefined);
  const payment=await client.call(`/api/change-orders/${approved.body.id}/paypal-order`,'POST',{}, {'X-Client-Token':token});assert.equal(payment.status,503);
  const capture=await client.call(`/api/change-orders/${approved.body.id}/capture`,'POST',{orderId:'fake'},{'X-Client-Token':token});assert.equal(capture.status,503);
  const final=await client.call('/api/state');assert.equal(final.body.changeOrders[0].status,'approved');
  const staticHtml=await fetch(base+'/');assert.equal(staticHtml.status,200);assert.match(await staticHtml.text(),/ScopePay AI/);
  const checkHtml=await fetch(base+'/pay/'+approved.body.id);assert.equal(checkHtml.status,200);assert.match(await checkHtml.text(),/Client checkout/);
 }finally{server.kill('SIGTERM');await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
