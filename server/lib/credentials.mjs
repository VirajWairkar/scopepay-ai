import crypto from 'node:crypto';

function encryptionKey(config=process.env) {
  const raw=String(config.CREDENTIALS_ENCRYPTION_KEY||'').trim();
  if(!raw) {const error=new Error('Credential encryption is not configured. Set CREDENTIALS_ENCRYPTION_KEY on the server.');error.status=503;throw error;}
  let key;
  if(/^[a-f0-9]{64}$/i.test(raw))key=Buffer.from(raw,'hex');
  else key=Buffer.from(raw,'base64');
  if(key.length!==32){const error=new Error('CREDENTIALS_ENCRYPTION_KEY must be 32 random bytes encoded as base64 or 64-character hex.');error.status=503;throw error;}
  return key;
}
export function encryptSecret(value,config=process.env) {
  if(typeof value!=='string'||!value)throw new Error('A non-empty credential is required.');
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(config),iv);
  const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
}
export function decryptSecret(value,config=process.env) {
  if(!value)return null;
  const [version,ivText,tagText,cipherText]=String(value).split('.');
  if(version!=='v1'||!ivText||!tagText||!cipherText)throw new Error('Stored credential format is invalid.');
  const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(config),Buffer.from(ivText,'base64url'));
  decipher.setAuthTag(Buffer.from(tagText,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(cipherText,'base64url')),decipher.final()]).toString('utf8');
}
export async function validateGeminiKey(apiKey,model='gemini-2.5-flash') {
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,{headers:{'x-goog-api-key':apiKey},signal:AbortSignal.timeout(15000)});
  if(response.ok)return true;
  const body=await response.json().catch(()=>({}));
  const message=body.error?.message||`Google AI Studio rejected this key (${response.status}).`;
  const error=new Error(String(message).slice(0,220));error.status=400;throw error;
}
