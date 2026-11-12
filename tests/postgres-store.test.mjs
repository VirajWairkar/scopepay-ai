import test from 'node:test';
import assert from 'node:assert/strict';
import {PostgresStore} from '../server/lib/postgres-store.mjs';

function fakePg() {
 const state=new Map();
 let failNextInsert=false;
 const clone=()=>new Map([...state].map(([k,v])=>[k,new Map([...v].map(([id,item])=>[id,structuredClone(item)]))]));
 return {
  injectFailure(){failNextInsert=true;},
  async query(sql) {
   if(sql.startsWith('SELECT payload')) {
    const table=sql.match(/FROM (scopepay_\w+)/)?.[1];
    return {rows:[...(state.get(table)||new Map()).values()].sort((a,b)=>a.position-b.position).map(x=>({payload:x.payload}))};
   }
   return {rows:[]}; // schema creation
  },
  async connect() {
   let tx=null;
   return {
    async query(sql,values=[]) {
     if(sql==='BEGIN'){tx=clone();return {};}
     if(sql==='COMMIT'){state.clear();for(const [k,v] of tx)state.set(k,v);tx=null;return {};}
     if(sql==='ROLLBACK'){tx=null;return {};}
     const table=sql.match(/(?:INSERT INTO|DELETE FROM) (scopepay_\w+)/)?.[1];
     if (!table)throw Error('Unexpected SQL: '+sql);
     if(sql.startsWith('INSERT INTO')) {
      if(failNextInsert){failNextInsert=false;throw Error('simulated PostgreSQL failure');}
      if(!tx.has(table))tx.set(table,new Map());
      tx.get(table).set(values[0],{position:values[1],payload:JSON.parse(values[2])});
     } else tx.get(table)?.delete(values[0]);
     return {rowCount:1};
    },
    release(){}
   };
  }
 };
}

test('Supabase PostgreSQL adapter seeds workspace and persists change orders across reconnect',async()=>{
 const pool=fakePg();
 const original=await PostgresStore.connect(pool);
 assert.equal(original.data.projects.length,3);
 assert.equal(original.data.analyses.length,0);
 await original.update(db=>{
  db.projects.unshift({id:'proj_custom',name:'Custom',createdAt:'2026-11-12T10:00:00.000Z'});
  db.analyses.unshift({id:'analysis_custom',projectId:'proj_custom',createdAt:'2026-11-12T10:01:00.000Z'});
  db.negotiations.unshift({id:'neg_custom',projectId:'proj_custom',analysisId:'analysis_custom',status:'accepted'});
  db.changeOrders.unshift({id:'co_custom',projectId:'proj_custom',status:'paid',amount:10,captureId:'sandbox_capture'});
  original.activity('payment','Example sandbox payment','proj_custom');
 });
 const reloaded=await PostgresStore.connect(pool);
 assert.equal(reloaded.data.projects[0].id,'proj_custom');
 assert.equal(reloaded.data.changeOrders[0].captureId,'sandbox_capture');
 assert.equal(reloaded.data.negotiations[0].status,'accepted');
 assert.equal(reloaded.data.activities[0].type,'payment');
});

test('PostgreSQL transaction rollback does not mutate live state or stored records',async()=>{
 const pool=fakePg();
 const s=await PostgresStore.connect(pool);
 const before=s.data.projects.length;
 pool.injectFailure();
 await assert.rejects(()=>s.update(db=>db.projects.unshift({id:'proj_failed',createdAt:'2026-11-12T00:00:00.000Z'})),/simulated PostgreSQL failure/);
 assert.equal(s.data.projects.length,before);
 const reload=await PostgresStore.connect(pool);
 assert.equal(reload.data.projects.length,before);
});

test('PostgreSQL concurrent writes are queued in a single Node process',async()=>{
 const s=await PostgresStore.connect(fakePg());
 await Promise.all([s.update(d=>d.projects.unshift({id:'proj_alpha'})),s.update(d=>d.projects.unshift({id:'proj_beta'}))]);
 assert.equal(s.data.projects[0].id,'proj_beta');
 assert.equal(s.data.projects[1].id,'proj_alpha');
});
