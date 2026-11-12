import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('public isolation, session authentication, client capabilities and abuse protection',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scopepay-security-')),file=path.join(dir,'db.json');
 const port=36100+Math.floor(Math.random()*900),base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,DATABASE_URL:'',DATA_FILE:file,PORT:String(port),HOST:'127.0.0.1',ADMIN_USERNAME:'judge',ADMIN_PASSWORD:'test-pass',SESSION_SECRET:'test-secret-with-more-than-32-characters',SESSION_TTL_MS:'1800',NODE_ENV:'test',RENDER:'',GEMINI_API_KEY:'',PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:''},stdio:'pipe'});
 let cookie='',csrf='';
 const call=(route,method='GET',body,headers={})=>fetch(base+route,{method,headers:{'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const login=async(password='test-pass')=>{
  const session=await call('/api/auth/session');cookie=session.headers.get('set-cookie').split(';')[0];csrf=(await session.json()).csrfToken;
  const r=await call('/api/auth/login','POST',{username:'judge',password},{Cookie:cookie,'X-CSRF-Token':csrf});
  if(r.ok){const old=cookie;cookie=r.headers.get('set-cookie').split(';')[0];assert.notEqual(cookie,old);csrf=(await r.clone().json()).csrfToken;}return r;
 };
 const admin=(route,method='GET',body)=>call(route,method,body,{Cookie:cookie,'X-CSRF-Token':csrf});
 try{
  let ready=false;for(let i=0;i<80;i++){try{if((await call('/api/health')).ok){ready=true;break;}}catch{}await sleep(50);}assert.ok(ready);
  await t.test('original public homepage opens without a challenge or private data',async()=>{
   const before=fs.readFileSync(file,'utf8');
   for(const route of ['/','/index.html','/app.js']){const response=await call(route);assert.equal(response.status,200);assert.equal(response.headers.get('www-authenticate'),null);}
   for(const route of ['/demo','/admin','/admin/login','/landing.html','/login.html'])assert.equal((await call(route)).status,404);
   const publicState=await (await call('/api/state')).json();assert.equal(publicState.projects.length,3);assert.equal(publicState.changeOrders.length,0);
   assert.deepEqual(await (await call('/api/health')).json(),{ok:true});
   for(const [route,method,body]of [['/api/projects','POST',{}],['/api/projects/proj_atelier/analyze','POST',{requestText:'hello'}],['/api/change-orders/unknown/paypal-order','POST'],['/api/change-orders/unknown/capture','POST',{orderId:'fake'}],['/api/demo/pay','POST',{}]])assert.equal((await call(route,method,body)).status,401);
   assert.equal(fs.readFileSync(file,'utf8'),before);
  });
  await t.test('login validates credentials, CSRF and rotates HttpOnly SameSite sessions',async()=>{
   assert.equal((await call('/api/auth/login','POST',{username:'judge',password:'test-pass'})).status,403);
   assert.equal((await login('wrong')).status,401);
   const response=await login();assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/SameSite=Lax/);
   assert.equal((await admin('/api/state')).status,200);
   assert.equal((await admin('/api/projects','POST',{name:'Private project sentinel',client:'Private client sentinel',scope:'Private agreement',budget:100,hourlyRate:50})).status,201);
   const anonymous=await (await call('/api/state')).text();assert.doesNotMatch(anonymous,/Private project sentinel|Private client sentinel/);
   assert.equal((await call('/api/projects','POST',{}, {Cookie:cookie})).status,403);
  });
  await t.test('client tokens scope negotiation and checkout; revocation blocks both',async()=>{
   const a=await (await admin('/api/projects/proj_atelier/analyze/sample','POST',{requestText:'Add bookings'})).json();
   const deal=await (await admin(`/api/analyses/${a.id}/negotiation`,'POST',{options:[{id:'full',amount:15}]})).json();
   assert.equal((await call(`/api/public/negotiations/${deal.token}`)).status,200);
   assert.equal((await call(`/api/public/negotiations/${deal.token}x`)).status,404);
   assert.equal((await (await call('/api/state','GET',undefined,{'X-Client-Token':deal.token})).json()).changeOrders.length,0);
   const selected=await (await call(`/api/public/negotiations/${deal.token}/select`,'POST',{optionId:'full'})).json();
   const url=new URL(selected.checkoutUrl,base),id=url.pathname.split('/')[2],token=url.searchParams.get('token');
   assert.equal((await call(`/api/public/change-orders/${id}`)).status,401);
   assert.equal((await call(`/api/public/change-orders/${id}?token=${token}`)).status,200);
   assert.equal((await call(`/api/public/change-orders/unrelated?token=${token}`)).status,401);
   assert.equal((await call(`/api/change-orders/${id}/paypal-order`,'POST')).status,401);
   assert.equal((await call(`/api/change-orders/${id}/paypal-order`,'POST',{}, {'X-Client-Token':token})).status,503);
   assert.equal((await call(`/api/change-orders/${id}/capture`,'POST',{orderId:'fake'},{'X-Client-Token':token})).status,503);
   assert.equal((await admin(`/api/negotiations/${deal.id}/revoke`,'POST',{})).status,200);
   assert.equal((await call(`/api/public/negotiations/${deal.token}`)).status,404);
   assert.equal((await call(`/api/public/change-orders/${id}?token=${token}`)).status,401);
  });
  await t.test('logout invalidates sessions and expiration is enforced',async()=>{
   assert.equal((await admin('/api/auth/logout','POST',{})).status,200);assert.equal((await admin('/api/projects','POST',{})).status,401);
   await login();await sleep(1900);assert.equal((await admin('/api/projects','POST',{})).status,401);
  });
  await t.test('repeated login attempts are rate limited',async()=>{let limited=false;for(let i=0;i<12;i++)if((await login('incorrect')).status===429){limited=true;break;}assert.ok(limited);});
 }finally{child.kill('SIGTERM');await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
