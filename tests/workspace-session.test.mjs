import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createAuth} from '../server/lib/auth.mjs';

test('Render visitor sessions use persistent secret and Secure HttpOnly SameSite cookies over TLS proxy',async()=>{
 const auth=createAuth({RENDER:'true',SESSION_SECRET:'test-session-secret-at-least-32-characters'});
 const server=http.createServer(async(req,res)=>{await auth.load(req,res);await auth.ensureVisitor(req);res.end('ok');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const response=await fetch(`http://127.0.0.1:${server.address().port}`,{headers:{'X-Forwarded-Proto':'https'}});const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/; Secure/);}
 finally{await new Promise(resolve=>server.close(resolve));}
});
