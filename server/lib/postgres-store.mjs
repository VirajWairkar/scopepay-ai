/**
 * Supabase PostgreSQL adapter for ScopePay AI.
 * Uses one Node process as the state coordinator and persists each mutation in a
 * PostgreSQL transaction to separate JSONB-backed tables.
 * Not a production multi-tenant or multi-instance coordination layer.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initialStore,makeId,now} from './store.mjs';

const TABLES = [
  {field:'projects',table:'scopepay_projects'},
  {field:'analyses',table:'scopepay_analyses'},
  {field:'negotiations',table:'scopepay_negotiations'},
  {field:'changeOrders',table:'scopepay_change_orders'},
  {field:'activities',table:'scopepay_activities'}
];

export class PostgresStore {
  constructor(pool) {
    this.pool = pool;
    this.data = {schemaVersion:2,projects:[],analyses:[],changeOrders:[],negotiations:[],activities:[]};
    this.pending = Promise.resolve();
    this.draft = null;
  }
  static async connect(pool) {
    const store = new PostgresStore(pool);
    const migrationPath = path.resolve(fileURLToPath(new URL('../sql/001_init.sql',import.meta.url)));
    await pool.query(await fs.readFile(migrationPath,'utf8'));
    for(const {field,table} of TABLES) {
      const result=await pool.query(`SELECT payload FROM ${table} ORDER BY position ASC, id ASC`);
      store.data[field]=result.rows.map(r=>typeof r.payload==='string'?JSON.parse(r.payload):r.payload);
    }
    if (!store.data.projects.length) {
      const demo = initialStore();
      await store.update(d=>Object.assign(d,demo));
    }
    return store;
  }
  activity(type,message,projectId=null) {
    const target=this.draft||this.data;
    target.activities.unshift({id:makeId('act'),type,message,projectId,createdAt:now()});
    target.activities=target.activities.slice(0,150);
  }
  update(fn) {
    const work=async()=>{
      const before=this.data;
      const next=structuredClone(before);
      this.draft=next;
      let result;
      try {result=fn(next);}finally{this.draft=null;}
      const connection=await this.pool.connect();
      try {
        await connection.query('BEGIN');
        for(const {field,table} of TABLES){
          const previous = new Map((before[field]||[]).map((x,i)=>[x.id,{json:JSON.stringify(x),position:i}]));
          const after = new Set((next[field]||[]).map(x=>x.id));
          for (const id of previous.keys()) {
            if (!after.has(id)) await connection.query(`DELETE FROM ${table} WHERE id = $1`,[id]);
          }
          for (const [i,item] of (next[field]||[]).entries()) {
            const serialized=JSON.stringify(item);
            const old=previous.get(item.id);
            if(old && old.json===serialized && old.position===i) continue;
            await connection.query(`INSERT INTO ${table} (id,position,payload) VALUES ($1,$2,$3::jsonb)
              ON CONFLICT (id) DO UPDATE SET position=EXCLUDED.position,payload=EXCLUDED.payload`,
              [item.id,i,serialized]);
          }
        }
        await connection.query('COMMIT');
        this.data=next;
        return result;
      } catch (err) {
        try{await connection.query('ROLLBACK');}catch{}
        throw err;
      } finally {connection.release();}
    };
    const result=this.pending.then(work);
    this.pending=result.catch(()=>{});
    return result;
  }
  async close(){await this.pool.end();}
}

export async function makePostgresStore(connectionString=process.env.DATABASE_URL) {
  if (!connectionString) throw Error('DATABASE_URL is required for PostgreSQL mode.');
  const module=await import('pg');
  const Pool=module.Pool || module.default?.Pool;
  if (!Pool) throw Error('PostgreSQL driver not available. Run npm install.');
  const pool=new Pool({connectionString,max:4,connectionTimeoutMillis:15000,idleTimeoutMillis:30000});
  pool.on('error',err=>console.error('[ScopePay PostgreSQL]',err.message));
  try {return await PostgresStore.connect(pool);}catch(err){await pool.end();throw err;}
}
