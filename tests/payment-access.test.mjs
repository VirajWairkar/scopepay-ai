import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {TenantJsonStore} from '../server/lib/tenant-store.mjs';
import {encryptSecret,decryptSecret} from '../server/lib/credentials.mjs';

test('BYOK credentials are encrypted at rest and visitor records remain separate',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'scopepay-credentials-')),legacy=path.join(dir,'legacy.json'),key=Buffer.alloc(32,11).toString('base64');
 try{
  const store=new TenantJsonStore(legacy),a='visitor-a',b='visitor-b';
  const aData=await store.loadOwner(a),bData=await store.loadOwner(b);assert.notEqual(aData.projects[0].id,bData.projects[0].id);
  const gemini='AIzaSyExampleSensitiveCredential_123456789';
  await store.setCredentials(a,{geminiKeyEnc:encryptSecret(gemini,{CREDENTIALS_ENCRYPTION_KEY:key}),paypalClientIdEnc:encryptSecret('sandbox-client-id',{CREDENTIALS_ENCRYPTION_KEY:key})});
  const aCreds=await store.getCredentials(a),bCreds=await store.getCredentials(b);
  assert.equal(decryptSecret(aCreds.geminiKeyEnc,{CREDENTIALS_ENCRYPTION_KEY:key}),gemini);assert.deepEqual(bCreds,{});
  const disk=await fs.readFile(`${legacy}.tenants.json`,'utf8');assert.equal(disk.includes(gemini),false);assert.equal(disk.includes('sandbox-client-id'),false);
  await store.clearCredentials(a,['geminiKeyEnc']);assert.equal((await store.getCredentials(a)).geminiKeyEnc,undefined);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('credential encryption rejects missing or invalid keys and detects tampering',()=>{
 assert.throws(()=>encryptSecret('secret',{}),/CREDENTIALS_ENCRYPTION_KEY/);
 assert.throws(()=>encryptSecret('secret',{CREDENTIALS_ENCRYPTION_KEY:'too-short'}),/32 random bytes/);
 const key=Buffer.alloc(32,3).toString('base64'),encrypted=encryptSecret('secret',{CREDENTIALS_ENCRYPTION_KEY:key});
 assert.equal(decryptSecret(encrypted,{CREDENTIALS_ENCRYPTION_KEY:key}),'secret');
 const parts=encrypted.split('.');parts[3]=Buffer.from('tampered').toString('base64url');
 assert.throws(()=>decryptSecret(parts.join('.'),{CREDENTIALS_ENCRYPTION_KEY:key}));
});
