import session from 'express-session';
import crypto from 'node:crypto';

const same = (a,b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());
// Single-process store, matching the existing workspace coordinator. Restarts log out all users.
class ExpiringStore extends session.Store {
  constructor(){super();this.rows=new Map();}
  prune(){for(const [id,row] of this.rows)if(row.expires<=Date.now())this.rows.delete(id);}
  get(id,cb){this.prune();cb(null,this.rows.get(id)?.value||null);}
  set(id,value,cb){this.prune();if(this.rows.size>=1000&&!this.rows.has(id))this.rows.delete(this.rows.keys().next().value);this.rows.set(id,{value:structuredClone(value),expires:new Date(value.cookie.expires).getTime()});cb?.();}
  destroy(id,cb){this.rows.delete(id);cb?.();}
}
export function createAuth(config=process.env){
  const production=config.NODE_ENV==='production'||Boolean(config.RENDER);
  if(production&&!config.ADMIN_PASSWORD)throw Error('Set ADMIN_PASSWORD to protect private workspace operations.');
  if(config.SESSION_SECRET&&config.SESSION_SECRET.length<32)throw Error('SESSION_SECRET must contain at least 32 characters when supplied.');
  const ttl=Number(config.SESSION_TTL_MS)||3600000;
  const middleware=session({name:'scopepay.sid',secret:config.SESSION_SECRET||crypto.randomBytes(48).toString('hex'),store:new ExpiringStore(),resave:false,saveUninitialized:false,proxy:Boolean(config.RENDER),cookie:{httpOnly:true,secure:production,sameSite:'lax',maxAge:ttl,path:'/'}});
  const attempts=new Map();
  return {
    load:(req,res)=>new Promise((resolve,reject)=>middleware(req,res,e=>e?reject(e):resolve())),
    authenticated:req=>Boolean(req.session?.admin&&req.session.expiresAt>Date.now()),
    csrf(req){return typeof req.session?.csrf==='string'&&typeof req.headers['x-csrf-token']==='string'&&same(req.headers['x-csrf-token'],req.session?.csrf||'missing');},
    async login(req,body){
      // Do not trust arbitrary X-Forwarded-For; a shared reverse proxy may share this limit.
      const key=req.socket.remoteAddress||'unknown',time=Date.now();
      for(const [ip,row]of attempts)if(row.until<=time)attempts.delete(ip);
      const row=attempts.get(key)||{count:0,until:time+15*60*1000};
      if(row.count>=10){const e=Error('Too many login attempts. Try again in 15 minutes.');e.status=429;throw e;}
      if(attempts.size>=1000&&!attempts.has(key)){const e=Error('Login service is busy. Try again later.');e.status=429;throw e;}
      row.count++;attempts.set(key,row);
      if(!config.ADMIN_PASSWORD||typeof body?.username!=='string'||typeof body?.password!=='string'||!same(body.username,config.ADMIN_USERNAME||'demo')||!same(body.password,config.ADMIN_PASSWORD)){const e=Error('Invalid username or password.');e.status=401;throw e;}
      await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
      req.session.admin=true;req.session.csrf=crypto.randomBytes(32).toString('base64url');req.session.expiresAt=time+ttl;
      return {csrfToken:req.session.csrf,expiresAt:req.session.expiresAt};
    },
    logout:req=>new Promise((resolve,reject)=>req.session.destroy(e=>e?reject(e):resolve()))
  };
}
