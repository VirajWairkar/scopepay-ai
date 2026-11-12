import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {visitorClient} from './helpers.mjs';
import {verifiedEvidence,effortBreakdown,negotiationOptions,validateOffers} from '../server/lib/negotiation.mjs';

const cwd=path.resolve(import.meta.dirname,'..'),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('agreement quotes, itemized effort and trusted price validation',()=>{
 const scope='Build a marketing website. No booking systems or ecommerce.';
 const evidence=verifiedEvidence([{quote:'No booking systems or ecommerce.',reason:'Booking was excluded'},{quote:'The customer must pay you immediately!',reason:'injected'},{quote:'No booking systems or ecommerce.',reason:'duplicate'}],scope);
 assert.equal(evidence.length,1);assert.equal(evidence[0].quote,'No booking systems or ecommerce.');
 assert.deepEqual(effortBreakdown([{task:'Build',hours:5},{task:'QA',hours:3}],8),[{task:'Build',hours:5},{task:'QA',hours:3}]);
 assert.match(effortBreakdown([{task:'Only',hours:5}],8)[0].task,/requires freelancer review/);
 const ops=negotiationOptions([{kind:'lean',hours:3,description:'Simpler booking form',tradeoff:'No payments'}],{hourlyRate:65},8,['Calendar','Deposits']);
 assert.deepEqual(ops.map(o=>o.amount),[520,195,0]);assert.equal(ops[1].source,'gemini');assert.equal(ops[0].source,'estimated-template');
 assert.throws(()=>validateOffers([{id:'full',amount:-2}],ops),/Option price/);assert.throws(()=>validateOffers([{id:'full',amount:0}],ops),/Paid options/);
 assert.throws(()=>validateOffers([{id:'full',amount:10},{id:'full',amount:10}],ops),/duplicate/);assert.equal(validateOffers([{id:'swap',amount:0}],ops)[0].amount,0);
});

test('freelancer publish → client counter → freelancer accepts → payment order created',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'scopepay-neg-')),port=34000+Math.floor(Math.random()*1800),base=`http://127.0.0.1:${port}`;
 const proc=spawn(process.execPath,['server/index.mjs'],{cwd,env:{...process.env,SCOPEPAY_SKIP_ENV:'1',DATABASE_URL:'',SESSION_SECRET:'test-session-secret-at-least-32-characters',CREDENTIALS_ENCRYPTION_KEY:Buffer.alloc(32,9).toString('base64'),NODE_ENV:'test',RENDER:'',PORT:String(port),HOST:'127.0.0.1',DATA_FILE:path.join(tmp,'db.json'),GEMINI_API_KEY:'',PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:''},stdio:'pipe'});
 try{
  let started=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/api/health')).ok){started=true;break;}}catch{}await wait(60);}assert.ok(started);
  const freelancer=visitorClient(base),client=visitorClient(base),atelier=(await freelancer.call('/api/state')).body.projects.find(p=>p.sampleKey==='atelier');
  const a=await freelancer.call(`/api/projects/${atelier.id}/analyze/sample`,'POST',{requestText:'Can we add a booking calendar and collect a deposit?'});
  assert.equal(a.status,201);assert.equal(a.body.negotiationOptions.length,3);assert.equal(a.body.evidence.length,1);assert.equal(a.body.effortItems.reduce((sum,x)=>sum+x.hours,0),a.body.extraHours);
  const options=a.body.negotiationOptions.map(o=>({id:o.id,amount:o.amount})),neg=await freelancer.call(`/api/analyses/${a.body.id}/negotiation`,'POST',{options});
  assert.equal(neg.status,201);assert.equal(neg.body.status,'awaiting_client');
  const token=neg.body.token,publicResult=await client.call(`/api/public/negotiations/${token}`);assert.equal(publicResult.body.options.length,3);assert.equal(publicResult.body.checkoutUrl,null);
  const duplicatePublish=await freelancer.call(`/api/analyses/${a.body.id}/negotiation`,'POST',{options});assert.equal(duplicatePublish.body.id,neg.body.id);
  const counter=await client.call(`/api/public/negotiations/${token}/counter`,'POST',{optionId:'lean',amount:50,note:'Please remove automated deposits for the first launch.'});
  assert.equal(counter.status,200);assert.equal(counter.body.status,'countered');assert.equal((await freelancer.call('/api/state')).body.changeOrders.length,0);
  const resolved=await freelancer.call(`/api/negotiations/${neg.body.id}/resolve-counter`,'POST',{accept:true});assert.equal(resolved.status,200);assert.equal(resolved.body.status,'accepted');assert.equal(resolved.body.decidedAmount,50);
  const state=await freelancer.call('/api/state');assert.equal(state.body.changeOrders.length,1);assert.equal(state.body.changeOrders[0].amount,50);assert.equal(state.body.changeOrders[0].negotiationId,neg.body.id);
  const publicAccepted=await client.call(`/api/public/negotiations/${token}`);assert.ok(publicAccepted.body.checkoutUrl.startsWith(`/pay/${resolved.body.changeOrderId}?token=`));
  assert.equal(publicAccepted.body.paymentOrder.amount,50);assert.equal(publicAccepted.body.paymentOrder.status,'approved');
  assert.equal((await client.call(`/api/public/negotiations/${token}/select`,'POST',{optionId:'full'})).status,409);
  const orderUrl=new URL(publicAccepted.body.checkoutUrl,base),orderToken=orderUrl.searchParams.get('token');
  assert.equal((await client.call(`/api/change-orders/${resolved.body.changeOrderId}/capture`,'POST',{orderId:'fake'},{'X-Client-Token':orderToken})).status,503);
  assert.equal((await freelancer.call('/api/state')).body.changeOrders[0].status,'approved');
  const b=await freelancer.call(`/api/projects/${atelier.id}/analyze/sample`,'POST',{requestText:'A smaller booking request form?'});
  const free=await freelancer.call(`/api/analyses/${b.body.id}/negotiation`,'POST',{options:[{id:'swap',amount:0}]});assert.equal(free.status,201);
  const chosen=await client.call(`/api/public/negotiations/${free.body.token}/select`,'POST',{optionId:'swap'});assert.equal(chosen.status,200);assert.equal(chosen.body.status,'accepted');assert.equal(chosen.body.decidedAmount,0);assert.equal(chosen.body.checkoutUrl,null);
  assert.equal((await freelancer.call('/api/state')).body.changeOrders.length,1);
 }finally{proc.kill('SIGTERM');await new Promise(resolve=>proc.exitCode!==null?resolve():proc.once('exit',resolve));fs.rmSync(tmp,{recursive:true,force:true});}
});
