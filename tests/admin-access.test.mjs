import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
const cwd=path.resolve(import.meta.dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

test('deployed demo protects freelancer workspace but allows tokenized client routes',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scopepay-admin-'));
 const port=36100+Math.floor(Math.random()*900);
 const child=spawn(process.execPath,['server/index.mjs'],{cwd,env:{...process.env,DATABASE_URL:'',DATA_FILE:path.join(dir,'db.json'),PORT:String(port),HOST:'127.0.0.1',ADMIN_USERNAME:'judge',ADMIN_PASSWORD:'test-pass',GEMINI_API_KEY:'',PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:''},stdio:'pipe'});
 const root=`http://127.0.0.1:${port}`;
 try{
  let ready=false;
  for(let i=0;i<70;i++) {try{const r=await fetch(root+'/api/health');if(r.ok){ready=true;break;}}catch{}await sleep(65);}
  assert.ok(ready);
  assert.equal((await fetch(root+'/api/state')).status,401);
  assert.equal((await fetch(root+'/')).status,401);
  assert.equal((await fetch(root+'/api/config')).status,200);
  assert.equal((await fetch(root+'/negotiate/nonexistent')).status,200);
  const auth='Basic '+Buffer.from('judge:test-pass').toString('base64');
  const response=await fetch(root+'/api/state',{headers:{Authorization:auth}});
  assert.equal(response.status,200);
  assert.equal((await response.json()).projects.length,3);
 }finally{child.kill('SIGTERM');fs.rmSync(dir,{recursive:true,force:true});}
});
