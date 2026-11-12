import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal DOM bridge catches synchronous template / state wiring errors without requiring a browser.
test('dashboard, analyzer, change orders, projects, activity and integrations render',async()=>{
 const listeners=new Map();
 const root={innerHTML:''};
 const project={id:'proj_atelier',name:'Atelier Website',client:'Atelier Studio',category:'Web design',scope:'Five pages only; booking excluded',budget:2400,hourlyRate:65,deadline:'2026-12-04',createdAt:new Date().toISOString()};
 const analysis={id:'analysis_test',projectId:'proj_atelier',source:'sample',outOfScope:true,category:'Feature request',summary:'Booking is new work.',reasoning:'No booking in agreement.',requestText:'Add bookings.',additionalWork:['Calendar'],extraHours:6,estimatedPrice:390,rateCalculation:'6 hours × $65/hour',confidence:85,risk:'medium',originalIncludes:['Five pages'],suggestedReply:'We can quote extra work.',createdAt:new Date().toISOString(),negotiationOptions:[
 {id:'full',kind:'full',name:'Full implementation',hours:6,amount:390,description:'Full scope',tradeoff:'Higher cost'},
 {id:'lean',kind:'lean',name:'Lean alternative',hours:3,amount:195,description:'Reduced scope',tradeoff:'Fewer features'},
 {id:'swap',kind:'swap',name:'Scope exchange',hours:0,amount:0,description:'Trade scope',tradeoff:'Remove agreed work'}]};
 const fixture={projects:[project,
  {id:'proj_northstar',name:'Northstar App',client:'Northstar Labs',scope:'Prototype excludes payment integrations, production push services, and team accounts.',budget:4800,hourlyRate:85,deadline:'2026-12-18',createdAt:new Date().toISOString()},
  {id:'proj_solace',name:'Solace Content',client:'Solace Wellness',scope:'Rewrite 8 pages and create 4 SEO blog posts. Excludes translation and video scripts.',budget:920,hourlyRate:55,deadline:'2026-11-28',createdAt:new Date().toISOString()}
 ],analyses:[analysis],changeOrders:[],negotiations:[],activities:[]};
 global.document={getElementById:(id)=>id==='app'?root:null,addEventListener:(name,cb)=>listeners.set(name,cb),createElement:()=>({}),body:{append(){}}};
 global.window={scrollTo(){}};
 global.fetch=async(url)=>({ok:true,json:async()=>url==='/api/config'?{aiReady:false,paypalReady:false,aiModel:'gemini-2.5-flash'}:fixture});
 await import('../client/app.js');
 await new Promise(r=>setTimeout(r,30));
 assert.match(root.innerHTML,/Good to see you/);
 const nav=page=>listeners.get('click')({target:{closest:()=>({dataset:{action:'nav',page}})}});
 for(const [page,title] of [['analyzer','Scope analyzer'],['negotiate','Negotiation Studio'],['orders','Change orders'],['projects','My projects'],['activity','Activity log'],['integrations','Integrations'],['overview','Good to see you']]){
  nav(page);assert.match(root.innerHTML,new RegExp(title,'i'),`page ${page} failed to render`);
  if(page==='negotiate'){assert.match(root.innerHTML,/Publish client options/);assert.match(root.innerHTML,/Scope exchange/);}
 }
 nav('analyzer');
 for(const [id,example] of [
  ['proj_atelier','online booking calendar'],
  ['proj_northstar','connect Stripe'],
  ['proj_solace','translate all 8 pages into Spanish']
 ]){
  listeners.get('change')({target:{id:'project-select',value:id}});
  const exampleButton=root.innerHTML.match(/<button class="btn btn-secondary" data-action="fill-sample"[^>]*>/);
  assert.ok(exampleButton&&!exampleButton[0].includes('disabled'),`${id} example request button should be enabled`);
  listeners.get('click')({target:{closest:()=>({dataset:{action:'fill-sample'}})}});
  assert.ok(root.innerHTML.includes(example),`${id} should fill its tailored example request`);
 }
});
