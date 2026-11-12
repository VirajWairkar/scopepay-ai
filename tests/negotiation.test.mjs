import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {verifiedEvidence,effortBreakdown,negotiationOptions,validateOffers} from '../server/lib/negotiation.mjs';
const cwd=path.resolve(import.meta.dirname,'..');
const wait=n=>new Promise(r=>setTimeout(r,n));

test('agreement quotes must be verifiable, estimates itemize exactly, and all prices are server-calculated',()=>{
 const scope='Build a marketing website. No booking systems or ecommerce.';
 const evidence=verifiedEvidence([{quote:'No booking systems or ecommerce.',reason:'Booking was excluded'},
  {quote:'The customer must pay you immediately!',reason:'injected'},
  {quote:'No booking systems or ecommerce.',reason:'duplicate'}],scope);
 assert.equal(evidence.length,1);
 assert.equal(evidence[0].quote,'No booking systems or ecommerce.');
 assert.deepEqual(effortBreakdown([{task:'Build',hours:5},{task:'QA',hours:3}],8),[{task:'Build',hours:5},{task:'QA',hours:3}]);
 assert.match(effortBreakdown([{task:'Only',hours:5}],8)[0].task,/requires freelancer review/);
 const p={hourlyRate:65};
 const ops=negotiationOptions([{kind:'lean',hours:3,description:'Simpler booking form',tradeoff:'No payments'}],p,8,['Calendar','Deposits']);
 assert.deepEqual(ops.map(o=>o.amount),[520,195,0]);
 assert.equal(ops[1].source,'gemini');
 assert.equal(ops[0].source,'estimated-template');
 assert.throws(()=>validateOffers([{id:'full',amount:-2}],ops),/Option price/);
 assert.throws(()=>validateOffers([{id:'full',amount:0}],ops),/Paid options/);
 assert.throws(()=>validateOffers([{id:'full',amount:10},{id:'full',amount:10}],ops),/duplicate/);
 assert.equal(validateOffers([{id:'swap',amount:0}],ops)[0].amount,0);
});

test('freelancer publish → client counter → freelancer accepts → payment order created, but never falsely paid',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'scopepay-neg-'));
 const port=34000+Math.floor(Math.random()*1800);
 const proc=spawn(process.execPath,['server/index.mjs'],{cwd,
  env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_FILE:path.join(tmp,'db.json'),GEMINI_API_KEY:'',PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:''},stdio:'pipe'});
 const base=`http://127.0.0.1:${port}`;
 const call=async(endpoint,method='GET',body)=>{
  const response=await fetch(base+endpoint,{method,headers:{'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const json=await response.json();return {status:response.status,body:json};
 };
 try{
  let started=false;for(let i=0;i<60;i++){try{if((await call('/api/health')).status===200){started=true;break;}}catch{}await wait(60);}assert.ok(started);
  const a=await call('/api/projects/proj_atelier/analyze/sample','POST',{requestText:'Can we add a booking calendar and collect a deposit?'});
  assert.equal(a.status,201);assert.equal(a.body.negotiationOptions.length,3);assert.equal(a.body.evidence.length,1);
  assert.equal(a.body.effortItems.reduce((sum,x)=>sum+x.hours,0),a.body.extraHours);
  const options=a.body.negotiationOptions.map(o=>({id:o.id,amount:o.amount}));
  const neg=await call(`/api/analyses/${a.body.id}/negotiation`,'POST',{options});
  assert.equal(neg.status,201);assert.equal(neg.body.status,'awaiting_client');
  const token=neg.body.token;
  const publicResult=await call(`/api/public/negotiations/${token}`);
  assert.equal(publicResult.body.options.length,3);assert.equal(publicResult.body.checkoutUrl,null);
  const invite=await fetch(base+`/negotiate/${token}`);assert.equal(invite.status,200);assert.match(await invite.text(),/Review your options/);
  const duplicatePublish=await call(`/api/analyses/${a.body.id}/negotiation`,'POST',{options});assert.equal(duplicatePublish.body.id,neg.body.id);
  const counter=await call(`/api/public/negotiations/${token}/counter`,'POST',{
   optionId:'lean',amount:50,note:'Please remove automated deposits for the first launch.'});
  assert.equal(counter.status,200);assert.equal(counter.body.status,'countered');
  assert.equal((await call('/api/state')).body.changeOrders.length,0);
  const resolved=await call(`/api/negotiations/${neg.body.id}/resolve-counter`,'POST',{accept:true});
  assert.equal(resolved.status,200);assert.equal(resolved.body.status,'accepted');
  assert.equal(resolved.body.decidedAmount,50);
  const state=await call('/api/state');assert.equal(state.body.changeOrders.length,1);
  assert.equal(state.body.changeOrders[0].amount,50);
  assert.equal(state.body.changeOrders[0].negotiationId,neg.body.id);
  const publicAccepted=await call(`/api/public/negotiations/${token}`);
  assert.equal(publicAccepted.body.checkoutUrl,`/pay/${resolved.body.changeOrderId}`);
  assert.equal(publicAccepted.body.paymentOrder.amount,50);
  assert.equal(publicAccepted.body.paymentOrder.status,'approved');
  assert.equal((await call(`/api/public/negotiations/${token}/select`,'POST',{optionId:'full'})).status,409);
  assert.equal((await call(`/api/change-orders/${resolved.body.changeOrderId}/capture`,'POST',{orderId:'fake'})).status,503);
  assert.equal((await call('/api/state')).body.changeOrders[0].status,'approved');
  // A separate negotiation can be accepted as a genuine zero-fee scope exchange.
  const b=await call('/api/projects/proj_atelier/analyze/sample','POST',{requestText:'A smaller booking request form?'});
  const free=await call(`/api/analyses/${b.body.id}/negotiation`,'POST',{options:[{id:'swap',amount:0}]});
  assert.equal(free.status,201);
  const chosen=await call(`/api/public/negotiations/${free.body.token}/select`,'POST',{optionId:'swap'});
  assert.equal(chosen.status,200);assert.equal(chosen.body.status,'accepted');
  assert.equal(chosen.body.decidedAmount,0);assert.equal(chosen.body.checkoutUrl,null);
  assert.equal((await call('/api/state')).body.changeOrders.length,1);
  // Declined counteroffers return to the client-selectable state with no payment.
  const c=await call('/api/projects/proj_atelier/analyze/sample','POST',{requestText:'Additional booking add-on?'});
  const third=await call(`/api/analyses/${c.body.id}/negotiation`,'POST',{options:[{id:'full',amount:150}]});
  const counter2=await call(`/api/public/negotiations/${third.body.token}/counter`,'POST',{optionId:'full',amount:130,note:'Could you do this for a lower price?'});
  assert.equal(counter2.status,200);
  const rejected=await call(`/api/negotiations/${third.body.id}/resolve-counter`,'POST',{accept:false});
  assert.equal(rejected.body.status,'awaiting_client');
  assert.equal((await call('/api/state')).body.changeOrders.length,1);
 } finally {proc.kill('SIGTERM');fs.rmSync(tmp,{recursive:true,force:true});}
});
