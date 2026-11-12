import test from 'node:test';
import assert from 'node:assert/strict';
import {PayPalSandbox,verifiedCapture} from '../server/lib/paypal.mjs';
import {analyzeWithGemini} from '../server/lib/analysis.mjs';

function fakeResponse(code,obj){return {ok:code>=200&&code<300,status:code,json:async()=>obj};}

test('PayPal REST flow requests OAuth, creates order at server-stored amount, and captures',async()=>{
 const original=global.fetch;
 const requests=[];
 global.fetch=async(url,opts)=>{
  requests.push({url,opts});
  if(url.endsWith('/v1/oauth2/token'))return fakeResponse(200,{access_token:'TEST_TOKEN',expires_in:3600});
  if(url.endsWith('/v2/checkout/orders'))return fakeResponse(201,{id:'PAYPAL-ORDER-123',status:'CREATED'});
  if(url.endsWith('/v2/checkout/orders/PAYPAL-ORDER-123/capture'))return fakeResponse(201,{status:'COMPLETED',purchase_units:[{payments:{captures:[{id:'PAYPAL-CAPTURE-123',status:'COMPLETED',amount:{currency_code:'USD',value:'780.00'}}]}}]});
  throw Error('Unexpected API path '+url);
 };
 try{
  const paypal=new PayPalSandbox({PAYPAL_CLIENT_ID:'SANDBOX_CLIENT',PAYPAL_CLIENT_SECRET:'SANDBOX_SECRET',PAYPAL_ENV:'sandbox'});
  const quote={id:'co_quote',amount:780};
  const created=await paypal.createOrder(quote,{name:'Website'});
  assert.equal(created.id,'PAYPAL-ORDER-123');
  assert.equal(requests.length,2);
  assert.equal(requests[0].opts.headers.Authorization,`Basic ${Buffer.from('SANDBOX_CLIENT:SANDBOX_SECRET').toString('base64')}`);
  const amount=JSON.parse(requests[1].opts.body).purchase_units[0].amount;
  assert.deepEqual(amount,{currency_code:'USD',value:'780.00'});
  assert.equal(requests[1].opts.headers.Authorization,'Bearer TEST_TOKEN');
  assert.ok(requests[1].opts.headers['PayPal-Request-Id'].length<=38);
  const captured=await paypal.captureOrder(created.id,quote.id);
  assert.equal(verifiedCapture(captured,quote).id,'PAYPAL-CAPTURE-123');
  assert.equal(requests.length,3);
 }finally{global.fetch=original;}
});

test('Gemini receives input agreement and returns normalized, trusted price',async()=>{
 const original=global.fetch;
 let call;
 global.fetch=async(url,opts)=>{call={url,opts};return fakeResponse(200,{candidates:[{content:{parts:[{text:JSON.stringify({outOfScope:true,confidence:.85,category:'Extra feature',summary:'New calendar module',reasoning:'Calendar is excluded by scope',originalIncludes:['Marketing site'],additionalWork:['Booking calendar'],extraHours:6,risk:'medium',suggestedReply:'Happy to discuss extra work'})}]}}]});};
 try{
  const project={id:'p',name:'Website',scope:'Marketing site only; no booking calendar',hourlyRate:75};
  const analysis=await analyzeWithGemini(project,'Add a full calendar',{apiKey:'fake_key',model:'gemini-2.5-flash'});
  assert.equal(analysis.estimatedPrice,450);
  assert.equal(analysis.source,'gemini');
  assert.match(call.url,/gemini-2.5-flash:generateContent/);
  assert.equal(call.opts.headers['x-goog-api-key'],'fake_key');
  const body=JSON.parse(call.opts.body);
  assert.equal(body.generationConfig.responseMimeType,'application/json');
  assert.match(body.contents[0].parts[0].text,/Marketing site only/);
  assert.match(body.contents[0].parts[0].text,/Add a full calendar/);
 }finally{global.fetch=original;}
});
