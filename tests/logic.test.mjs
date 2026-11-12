import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {normalizeAnalysis, sampleAnalysis} from '../server/lib/analysis.mjs';
import {Store} from '../server/lib/store.mjs';
import {paypalReady, verifiedCapture} from '../server/lib/paypal.mjs';

const project={id:'p1',name:'Example',scope:'One website page',hourlyRate:65};
test('AI estimate uses server trusted hourly rate instead of model-proposed price',()=>{
 const a=normalizeAnalysis({outOfScope:true,extraHours:12,estimatedPrice:0.01,confidence:0.9,reasoning:'New work',suggestedReply:'Thanks!',risk:'high'},project,'Add checkout');
 assert.equal(a.estimatedPrice,780);
 assert.equal(a.extraHours,12);
 assert.equal(a.hourlyRate,65);
});
test('in-scope requests produce zero charge',()=>{
 const a=normalizeAnalysis({outOfScope:false,extraHours:52,confidence:0.8,reasoning:'Agreed.',suggestedReply:'Included.'},project,'Fix mobile issue');
 assert.equal(a.estimatedPrice,0);
 assert.equal(a.extraHours,0);
});
test('malformed AI data is limited to finite, bounded outputs',()=>{
 const a=normalizeAnalysis({outOfScope:true,extraHours:100000,confidence:80,originalIncludes:['x'.repeat(700)],additionalWork:['A']},project,'request');
 assert.equal(a.extraHours,300);
 assert.equal(a.confidence,100);
 assert.equal(a.originalIncludes[0].length,180);
});
test('sample preview is clearly labeled non-AI data',()=>{
 const a=sampleAnalysis(project,'New feature');
 assert.equal(a.source,'sample');
 assert.match(a.model,/not live AI/);
});
test('PayPal does not activate without both secrets and sandbox mode',()=>{
 assert.equal(paypalReady({PAYPAL_CLIENT_ID:'abc',PAYPAL_CLIENT_SECRET:'xyz',PAYPAL_ENV:'sandbox'}),true);
 assert.equal(paypalReady({PAYPAL_CLIENT_ID:'abc'}),false);
 assert.equal(paypalReady({PAYPAL_CLIENT_ID:'abc',PAYPAL_CLIENT_SECRET:'xyz',PAYPAL_ENV:'live'}),false);
});
test('PayPal capture requires COMPLETED + exact USD amount',()=>{
 const order={amount:780};
 const capture={status:'COMPLETED',purchase_units:[{payments:{captures:[{id:'CAP123',status:'COMPLETED',amount:{currency_code:'USD',value:'780.00'}}]}}]};
 assert.equal(verifiedCapture(capture,order).id,'CAP123');
 assert.equal(verifiedCapture({...capture,status:'APPROVED'},order),null);
 assert.equal(verifiedCapture({status:'COMPLETED',purchase_units:[{payments:{captures:[{id:'X',status:'COMPLETED',amount:{currency_code:'USD',value:'7.80'}}]}}]},order),null);
 assert.equal(verifiedCapture({status:'COMPLETED',purchase_units:[{payments:{captures:[{id:'X',status:'COMPLETED',amount:{currency_code:'EUR',value:'780.00'}}]}}]},order),null);
});
test('projects and events persist to disk',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'scopepay-unit-'));
 try{const file=path.join(tmp,'store.json');const db=new Store(file);
 assert.equal(db.data.projects.length,3);
 db.update(d=>{d.projects[0].name='Changed';db.activity('project','Modified');});
 const second=new Store(file);
 assert.equal(second.data.projects[0].name,'Changed');
 assert.equal(second.data.activities[0].message,'Modified');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
