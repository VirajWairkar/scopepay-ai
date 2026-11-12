import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createAuth} from '../server/lib/auth.mjs';
test('Render workspace sessions need no new secret and use Secure cookies over its TLS proxy',async()=>{
 const auth=createAuth({RENDER:'true',ADMIN_PASSWORD:'test-password'});
 const server=http.createServer(async(req,res)=>{await auth.load(req,res);req.session.csrf='test';res.end('ok');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const response=await fetch(`http://127.0.0.1:${server.address().port}`,{headers:{'X-Forwarded-Proto':'https'}});const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/; Secure/);}finally{await new Promise(resolve=>server.close(resolve));}
});
