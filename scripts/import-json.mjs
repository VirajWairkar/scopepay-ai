/**
 * Optional, explicit one-time import from a LOCAL store.json file to Supabase.
 * Usage: npm run import:json -- --file server/data/store.json --apply
 * By default prints a safe preview; refuses to overwrite an initialized database.
 */
import fs from 'node:fs';
import path from 'node:path';
import {makePostgresTenantStore} from '../server/lib/tenant-store.mjs';
import {initialStore} from '../server/lib/store.mjs';

function readEnv(){
 const file=path.resolve('.env');
 if(!fs.existsSync(file))return;
 for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){
  const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if(match&&process.env[match[1]]===undefined)process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
 }
}
readEnv();
const args=process.argv.slice(2),file=args[args.indexOf('--file')+1];
if(!args.includes('--file')||!file||file.startsWith('--'))throw Error('Use --file path/to/store.json [--apply]');
const input=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
for(const key of ['projects','analyses','negotiations','changeOrders','activities']) {
 if(!Array.isArray(input[key]))throw Error(`Input JSON missing ${key} array`);
}
const counts=Object.fromEntries(['projects','analyses','negotiations','changeOrders','activities'].map(k=>[k,input[k].length]));
console.log('Local file:',path.resolve(file),'\nRecords:',counts);
if(!args.includes('--apply')){console.log('Preview only. Add --apply to import into a NEW/empty PostgreSQL workspace.');process.exit(0);}
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL missing in .env');
const store=await makePostgresTenantStore();
try {
 const data=await store.loadOwner(null);
 const example=initialStore();
 const hasAnyHistory=data.analyses.length||data.changeOrders.length||data.negotiations.length||data.activities.length>example.activities.length;
 const customProjects=data.projects.some(p=>!example.projects.some(x=>x.id===p.id));
 if(hasAnyHistory||customProjects)throw Error('Target PostgreSQL database already contains user records. Refusing to overwrite.');
 await store.updateOwner(null,d=>{for(const key of ['projects','analyses','negotiations','changeOrders','activities'])d[key]=structuredClone(input[key]);});
 console.log('Imported records successfully. Restart your application.');
}finally{await store.close();}
