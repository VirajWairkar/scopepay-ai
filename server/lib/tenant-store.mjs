import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Store, initialStore, makeId, now} from './store.mjs';

const FIELDS = ['projects','analyses','changeOrders','negotiations','activities'];
const TABLES = [
  {field:'projects',table:'scopepay_projects'},
  {field:'analyses',table:'scopepay_analyses'},
  {field:'negotiations',table:'scopepay_negotiations'},
  {field:'changeOrders',table:'scopepay_change_orders'},
  {field:'activities',table:'scopepay_activities'}
];
const emptyData = () => ({schemaVersion:3,projects:[],analyses:[],changeOrders:[],negotiations:[],activities:[]});

function visitorInitialStore() {
  const data = initialStore();
  const templates = ['atelier','northstar','solace'];
  data.projects = data.projects.map((project,index) => ({
    ...project,
    id: makeId('proj'),
    sampleKey: templates[index],
    isSample: true
  }));
  data.activities = [{id:makeId('act'),type:'system',message:'Your private ScopePay workspace is ready with three fictional sample projects.',createdAt:now()}];
  data.schemaVersion = 3;
  return data;
}
const hashToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');

/** Local JSON implementation of the visitor-scoped storage contract. */
export class TenantJsonStore {
  constructor(legacyFile) {
    this.legacy = new Store(legacyFile);
    this.file = `${path.resolve(legacyFile)}.tenants.json`;
    this.pending = Promise.resolve();
    this.writePending = Promise.resolve();
    this.state = {tenants:{},credentials:{}};
    this.ready = this.#load();
  }
  async #load() {
    try { this.state = JSON.parse(await fs.readFile(this.file,'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    this.state.tenants ||= {};
    this.state.credentials ||= {};
  }
  async #save() {
    const run=async()=>{
      await fs.mkdir(path.dirname(this.file),{recursive:true});
      const temp=`${this.file}.${process.pid}.tmp`;
      await fs.writeFile(temp,JSON.stringify(this.state,null,2),{mode:0o600});
      await fs.rename(temp,this.file);
    };
    const result=this.writePending.then(run);this.writePending=result.catch(()=>{});return result;
  }
  async loadOwner(ownerId) {
    await this.ready;
    if (ownerId === null) return structuredClone(this.legacy.data);
    if (!this.state.tenants[ownerId]) {
      const run=async()=>{if(!this.state.tenants[ownerId]){this.state.tenants[ownerId]=visitorInitialStore();await this.#save();}};
      const result=this.pending.then(run);this.pending=result.catch(()=>{});await result;
    }
    return structuredClone(this.state.tenants[ownerId]);
  }
  async updateOwner(ownerId, fn) {
    await this.ready;
    const run = async () => {
      if (ownerId === null) return this.legacy.update(fn);
      const before = this.state.tenants[ownerId] || visitorInitialStore();
      const next = structuredClone(before);
      const result = fn(next);
      this.state.tenants[ownerId] = next;
      await this.#save();
      return result;
    };
    const result = this.pending.then(run);
    this.pending = result.catch(()=>{});
    return result;
  }
  async syncCapabilities(ownerId, data) { /* Tokens are resolved by scanning local tenant snapshots. */ }
  async resolveCapability(token, type) {
    await this.ready;await this.pending;
    const field = type === 'negotiation' ? 'token' : 'accessToken';
    const all = [[null,this.legacy.data],...Object.entries(this.state.tenants)];
    for (const [ownerId,data] of all) {
      const rows = type === 'negotiation' ? (data.negotiations||[]) : (data.changeOrders||[]);
      const row = rows.find(item => item[field] && hashToken(item[field]) === hashToken(token));
      if (row) return {ownerId,entityId:row.id,revoked:Boolean(row.revokedAt),expiresAt:row.expiresAt};
    }
    return null;
  }
  async getCredentials(ownerId) {
    await this.ready;await this.pending;
    return structuredClone(this.state.credentials[String(ownerId)] || {});
  }
  async setCredentials(ownerId, values) {
    await this.ready;
    const run=async()=>{const key=String(ownerId);this.state.credentials[key]={...(this.state.credentials[key]||{}),...values,updatedAt:now()};await this.#save();};
    const result=this.pending.then(run);this.pending=result.catch(()=>{});return result;
  }
  async clearCredentials(ownerId, fields) {
    await this.ready;
    const run=async()=>{const key=String(ownerId),row=this.state.credentials[key]||{};for(const field of fields)delete row[field];row.updatedAt=now();this.state.credentials[key]=row;await this.#save();};
    const result=this.pending.then(run);this.pending=result.catch(()=>{});return result;
  }
  async close() { await this.pending; await this.writePending; }
}

/** Supabase PostgreSQL implementation. All tenant reads and writes are owner-scoped. */
export class PostgresTenantStore {
  constructor(pool) { this.pool=pool; this.data=emptyData(); this.pending=Promise.resolve(); }
  static async connect(pool) {
    const store=new PostgresTenantStore(pool);
    const migrationPath=path.resolve(fileURLToPath(new URL('../sql/001_init.sql',import.meta.url)));
    await pool.query(await fs.readFile(migrationPath,'utf8'));
    // Preserve and index existing private (owner_id NULL) client links without making their workspace public.
    for (const {table,type,field} of [
      {table:'scopepay_negotiations',type:'negotiation',field:'token'},
      {table:'scopepay_change_orders',type:'change_order',field:'accessToken'}
    ]) {
      const rows=await pool.query(`SELECT owner_id,id,payload FROM public.${table} WHERE payload->>$1 IS NOT NULL`,[field]);
      for (const row of rows.rows) {
        const token=row.payload?.[field];
        if (token) await pool.query(`INSERT INTO public.scopepay_public_tokens(token_hash,owner_id,entity_type,entity_id,expires_at,revoked_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(token_hash) DO UPDATE SET expires_at=EXCLUDED.expires_at,revoked_at=EXCLUDED.revoked_at`,[hashToken(token),row.owner_id,type,row.id,row.payload.expiresAt||null,row.payload.revokedAt||null]);
      }
    }
    store.data=await store.loadOwner(null);
    if (!store.data.projects.length) {
      const seed=initialStore();
      await store.updateOwner(null,d=>{if(!d.projects.length)d.projects=seed.projects;if(!d.activities.length)d.activities=seed.activities;});
    }
    return store;
  }
  async ensureVisitor(ownerId) {
    if (!ownerId) throw new Error('A visitor session is required.');
    const connection=await this.pool.connect();
    try {
      await connection.query('BEGIN');
      await connection.query('INSERT INTO public.scopepay_visitors(id,initialized) VALUES($1,false) ON CONFLICT(id) DO NOTHING',[ownerId]);
      const visitor=await connection.query('SELECT initialized FROM public.scopepay_visitors WHERE id=$1 FOR UPDATE',[ownerId]);
      if(!visitor.rows[0]?.initialized){
        const seed=visitorInitialStore();
        for(const {field,table} of TABLES){
          for(const [position,item] of seed[field].entries()){
            await connection.query(`INSERT INTO public.${table}(id,owner_id,position,payload) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(id) DO NOTHING`,[item.id,ownerId,position,JSON.stringify(item)]);
          }
        }
        await this.syncCapabilitiesWith(connection,ownerId,seed);
        await connection.query('UPDATE public.scopepay_visitors SET initialized=true WHERE id=$1',[ownerId]);
      }
      await connection.query('COMMIT');
    } catch(error) {try{await connection.query('ROLLBACK');}catch{}throw error;}
    finally {connection.release();}
  }
  async loadOwner(ownerId) {
    const data=emptyData();
    for (const {field,table} of TABLES) {
      const result=ownerId===null
        ? await this.pool.query(`SELECT payload FROM public.${table} WHERE owner_id IS NULL ORDER BY position ASC,id ASC`)
        : await this.pool.query(`SELECT payload FROM public.${table} WHERE owner_id=$1 ORDER BY position ASC,id ASC`,[ownerId]);
      data[field]=result.rows.map(row=>typeof row.payload==='string'?JSON.parse(row.payload):row.payload);
    }
    return data;
  }
  async updateOwner(ownerId, fn) {
    const run=async()=>{
      const connection=await this.pool.connect();
      let next,result;
      try {
        await connection.query('BEGIN');
        await connection.query('SELECT pg_advisory_xact_lock(hashtext($1))',[String(ownerId??'__legacy__')]);
        const before=await this.loadOwnerWith(connection,ownerId);
        next=structuredClone(before);
        result=fn(next);
        for (const {field,table} of TABLES) {
          const previous=new Map((before[field]||[]).map((item,index)=>[item.id,{json:JSON.stringify(item),position:index}]));
          const after=new Set((next[field]||[]).map(item=>item.id));
          for (const id of previous.keys()) if (!after.has(id)) {
            if(ownerId===null) await connection.query(`DELETE FROM public.${table} WHERE id=$1 AND owner_id IS NULL`,[id]);
            else await connection.query(`DELETE FROM public.${table} WHERE id=$1 AND owner_id=$2`,[id,ownerId]);
          }
          for (const [index,item] of (next[field]||[]).entries()) {
            const serialized=JSON.stringify(item),old=previous.get(item.id);
            if(old&&old.json===serialized&&old.position===index) continue;
            await connection.query(`INSERT INTO public.${table}(id,owner_id,position,payload) VALUES($1,$2,$3,$4::jsonb)
              ON CONFLICT(id) DO UPDATE SET position=EXCLUDED.position,payload=EXCLUDED.payload
              WHERE ${table}.owner_id IS NOT DISTINCT FROM EXCLUDED.owner_id`,[item.id,ownerId,index,serialized]);
          }
        }
        await this.syncCapabilitiesWith(connection,ownerId,next);
        await connection.query('COMMIT');
        if(ownerId===null)this.data=next;
        return result;
      } catch(error) {try{await connection.query('ROLLBACK');}catch{}throw error;}
      finally {connection.release();}
    };
    const result=this.pending.then(run);this.pending=result.catch(()=>{});return result;
  }
  async loadOwnerWith(connection,ownerId) {
    const data=emptyData();
    for(const {field,table} of TABLES){
      const result=ownerId===null
        ? await connection.query(`SELECT payload FROM public.${table} WHERE owner_id IS NULL ORDER BY position ASC,id ASC`)
        : await connection.query(`SELECT payload FROM public.${table} WHERE owner_id=$1 ORDER BY position ASC,id ASC`,[ownerId]);
      data[field]=result.rows.map(row=>typeof row.payload==='string'?JSON.parse(row.payload):row.payload);
    }
    return data;
  }
  async syncCapabilitiesWith(connection,ownerId,data) {
    for(const item of data.negotiations||[]) if(item.token) await connection.query(`INSERT INTO public.scopepay_public_tokens(token_hash,owner_id,entity_type,entity_id,expires_at,revoked_at) VALUES($1,$2,'negotiation',$3,$4,$5) ON CONFLICT(token_hash) DO UPDATE SET expires_at=EXCLUDED.expires_at,revoked_at=EXCLUDED.revoked_at`,[hashToken(item.token),ownerId,item.id,item.expiresAt||null,item.revokedAt||null]);
    for(const item of data.changeOrders||[]) if(item.accessToken) await connection.query(`INSERT INTO public.scopepay_public_tokens(token_hash,owner_id,entity_type,entity_id,expires_at,revoked_at) VALUES($1,$2,'change_order',$3,$4,$5) ON CONFLICT(token_hash) DO UPDATE SET expires_at=EXCLUDED.expires_at,revoked_at=EXCLUDED.revoked_at`,[hashToken(item.accessToken),ownerId,item.id,item.expiresAt||null,item.revokedAt||null]);
  }
  async resolveCapability(token,type) {
    const result=await this.pool.query('SELECT owner_id,entity_id,expires_at,revoked_at FROM public.scopepay_public_tokens WHERE token_hash=$1 AND entity_type=$2',[hashToken(token),type]);
    if(!result.rows[0])return null;
    const row=result.rows[0];return {ownerId:row.owner_id,entityId:row.entity_id,expiresAt:row.expires_at,revoked:Boolean(row.revoked_at)};
  }
  async getCredentials(ownerId) {
    if(ownerId===null)return {};
    const result=await this.pool.query('SELECT gemini_key_enc,paypal_client_id_enc,paypal_client_secret_enc FROM public.scopepay_credentials WHERE owner_id=$1',[ownerId]);
    const row=result.rows[0]||{};
    return {geminiKeyEnc:row.gemini_key_enc||null,paypalClientIdEnc:row.paypal_client_id_enc||null,paypalClientSecretEnc:row.paypal_client_secret_enc||null};
  }
  async setCredentials(ownerId,values) {
    if(ownerId===null)throw new Error('Credentials cannot be stored for the legacy workspace.');
    const connection=await this.pool.connect();
    try {
      await connection.query('BEGIN');
      await connection.query('INSERT INTO public.scopepay_credentials(owner_id) VALUES($1) ON CONFLICT(owner_id) DO NOTHING',[ownerId]);
      const result=await connection.query('SELECT gemini_key_enc,paypal_client_id_enc,paypal_client_secret_enc FROM public.scopepay_credentials WHERE owner_id=$1 FOR UPDATE',[ownerId]);
      const row=result.rows[0]||{},next={
        geminiKeyEnc:values.geminiKeyEnc!==undefined?values.geminiKeyEnc:row.gemini_key_enc,
        paypalClientIdEnc:values.paypalClientIdEnc!==undefined?values.paypalClientIdEnc:row.paypal_client_id_enc,
        paypalClientSecretEnc:values.paypalClientSecretEnc!==undefined?values.paypalClientSecretEnc:row.paypal_client_secret_enc
      };
      await connection.query('UPDATE public.scopepay_credentials SET gemini_key_enc=$2,paypal_client_id_enc=$3,paypal_client_secret_enc=$4,updated_at=now() WHERE owner_id=$1',[ownerId,next.geminiKeyEnc||null,next.paypalClientIdEnc||null,next.paypalClientSecretEnc||null]);
      await connection.query('COMMIT');
    } catch(error) {try{await connection.query('ROLLBACK');}catch{}throw error;}
    finally {connection.release();}
  }
  async clearCredentials(ownerId,fields) {
    const values=Object.fromEntries(fields.map(field=>[field,null]));await this.setCredentials(ownerId,values);
  }
  async close(){await this.pool.end();}
}

export async function makePostgresTenantStore(connectionString=process.env.DATABASE_URL) {
  if(!connectionString)throw Error('DATABASE_URL is required for PostgreSQL mode.');
  const module=await import('pg'),Pool=module.Pool||module.default?.Pool;
  if(!Pool)throw Error('PostgreSQL driver not available. Run npm install.');
  const pool=new Pool({connectionString,max:8,connectionTimeoutMillis:15000,idleTimeoutMillis:30000});
  pool.on('error',err=>console.error('[ScopePay PostgreSQL]',err.message));
  try{return await PostgresTenantStore.connect(pool);}catch(error){await pool.end();throw error;}
}
