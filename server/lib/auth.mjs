import session from 'express-session';
import crypto from 'node:crypto';

const same=(a,b)=>crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(),crypto.createHash('sha256').update(String(b)).digest());

class ExpiringStore extends session.Store {
  constructor(){super();this.rows=new Map();}
  prune(){for(const [id,row] of this.rows)if(row.expires<=Date.now())this.rows.delete(id);}
  get(id,cb){this.prune();cb(null,this.rows.get(id)?.value||null);}
  set(id,value,cb){this.prune();if(this.rows.size>=5000&&!this.rows.has(id))this.rows.delete(this.rows.keys().next().value);this.rows.set(id,{value:structuredClone(value),expires:new Date(value.cookie.expires||Date.now()+604800000).getTime()});cb?.();}
  touch(id,value,cb){this.set(id,value,cb);}
  destroy(id,cb){this.rows.delete(id);cb?.();}
}

class PostgresSessionStore extends session.Store {
  constructor(pool){super();this.pool=pool;}
  get(id,cb){this.pool.query('SELECT sess FROM public.scopepay_sessions WHERE sid=$1 AND expire>now()',[id]).then(r=>cb(null,r.rows[0]?.sess||null)).catch(cb);}
  set(id,value,cb){
    const expiry=value.cookie?.expires?new Date(value.cookie.expires):new Date(Date.now()+Number(value.cookie?.maxAge||604800000));
    this.pool.query(`INSERT INTO public.scopepay_sessions(sid,sess,expire) VALUES($1,$2::json,$3)
      ON CONFLICT(sid) DO UPDATE SET sess=EXCLUDED.sess,expire=EXCLUDED.expire`,[id,JSON.stringify(value),expiry]).then(()=>cb?.()).catch(cb);
  }
  touch(id,value,cb){
    const expiry=value.cookie?.expires?new Date(value.cookie.expires):new Date(Date.now()+Number(value.cookie?.maxAge||604800000));
    this.pool.query('UPDATE public.scopepay_sessions SET expire=$2 WHERE sid=$1',[id,expiry]).then(()=>cb?.()).catch(cb);
  }
  destroy(id,cb){this.pool.query('DELETE FROM public.scopepay_sessions WHERE sid=$1',[id]).then(()=>cb?.()).catch(cb);}
}

export function createAuth(config=process.env,pool=null){
  const production=config.NODE_ENV==='production'||Boolean(config.RENDER);
  if(config.SESSION_SECRET&&config.SESSION_SECRET.length<32)throw Error('SESSION_SECRET must contain at least 32 characters.');
  if(production&&!config.SESSION_SECRET)throw Error('Set a persistent SESSION_SECRET on Render (at least 32 characters).');
  const ttl=Number(config.SESSION_TTL_MS)||7*24*60*60*1000;
  const store=pool?new PostgresSessionStore(pool):new ExpiringStore();
  const middleware=session({name:'scopepay.sid',secret:config.SESSION_SECRET||crypto.randomBytes(48).toString('hex'),store,resave:false,saveUninitialized:false,rolling:true,proxy:Boolean(config.RENDER),cookie:{httpOnly:true,secure:production,sameSite:'lax',maxAge:ttl,path:'/'}});
  const attempts=new Map();
  return {
    load:(req,res)=>new Promise((resolve,reject)=>middleware(req,res,e=>e?reject(e):resolve())),
    ensureVisitor:async req=>{
      req.session.visitorId ||= crypto.randomUUID();
      req.session.csrf ||= crypto.randomBytes(32).toString('base64url');
      req.session.createdAt ||= Date.now();
      await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
      return {visitorId:req.session.visitorId,csrfToken:req.session.csrf,authenticated:Boolean(req.session.admin&&req.session.expiresAt>Date.now())};
    },
    ownerId:req=>req.session?.admin&&req.session.expiresAt>Date.now()?null:req.session?.visitorId,
    authenticated:req=>Boolean(req.session?.admin&&req.session.expiresAt>Date.now()),
    csrf(req){return typeof req.session?.csrf==='string'&&typeof req.headers['x-csrf-token']==='string'&&same(req.headers['x-csrf-token'],req.session.csrf);},
    async login(req,body){
      const key=req.socket.remoteAddress||'unknown',time=Date.now();
      for(const [ip,row]of attempts)if(row.until<=time)attempts.delete(ip);
      const row=attempts.get(key)||{count:0,until:time+15*60*1000};
      if(row.count>=10){const error=Error('Too many login attempts. Try again in 15 minutes.');error.status=429;throw error;}
      if(attempts.size>=1000&&!attempts.has(key)){const error=Error('Login service is busy. Try again later.');error.status=429;throw error;}
      row.count++;attempts.set(key,row);
      if(!config.ADMIN_PASSWORD||typeof body?.username!=='string'||typeof body?.password!=='string'||!same(body.username,config.ADMIN_USERNAME||'admin')||!same(body.password,config.ADMIN_PASSWORD)){const error=Error('Invalid username or password.');error.status=401;throw error;}
      const visitorId=req.session.visitorId||crypto.randomUUID();
      await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
      req.session.visitorId=visitorId;req.session.admin=true;req.session.csrf=crypto.randomBytes(32).toString('base64url');req.session.expiresAt=time+ttl;
      await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
      return {csrfToken:req.session.csrf,expiresAt:req.session.expiresAt};
    },
    async logout(req){
      const visitorId=req.session.visitorId||crypto.randomUUID();
      await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
      req.session.visitorId=visitorId;req.session.csrf=crypto.randomBytes(32).toString('base64url');
      await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
      return {csrfToken:req.session.csrf};
    }
  };
}
