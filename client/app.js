const ICONS = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  spark:'<path d="m12 3-1.8 6.2L4 11l6.2 1.8L12 19l1.8-6.2L20 11l-6.2-1.8L12 3Z"/><path d="m19 17-.7 2.3L16 20l2.3.7L19 23l.7-2.3L22 20l-2.3-.7L19 17Z"/>',
  files:'<rect x="7" y="3" width="14" height="17" rx="2"/><path d="M3 7v14a1 1 0 0 0 1 1h12"/><path d="M11 8h6m-6 4h6"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M10 3h4l.6 2.4 1.8.8 2.1-1.2 2.8 2.8-1.2 2.1.8 1.8L23 12v0l-2.4.6-.8 1.8 1.2 2.1-2.8 2.8-2.1-1.2-1.8.8L14 21h-4l-.6-2.4-1.8-.8-2.1 1.2-2.8-2.8 1.2-2.1-.8-1.8L1 12l2.4-.6.8-1.8L3 7.5l2.8-2.8 2.1 1.2 1.8-.8L10 3Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  dollar:'<circle cx="12" cy="12" r="9"/><path d="M15 8h-5a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H9m3-10v12"/>',
  chart:'<path d="M4 20V11m5 9V4m5 16v-7m5 7V8"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v5m0-8h.01"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  external:'<path d="M13 5h6v6m0-6-9 9"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
  down:'<path d="M12 3v12m-5-5 5 5 5-5M5 18v3h14v-3"/>',
  close:'<path d="M18 6 6 18M6 6l12 12"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  alert:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4m0 4h.01"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  credit:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-15-3L3 10m0-5v5h5M4 13a8 8 0 0 0 15 3l2-2m0 5v-5h-5"/>',
  message:'<path d="M20 11.5a8 8 0 0 1-8 8H5l-3 3v-11a10 10 0 1 1 18 0Z"/>',
  link:'<path d="M10 13a5 5 0 0 0 7 .6l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.6l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'
};
const icon=(name,size=20)=>`<svg class="ic" style="width:${size}px;height:${size}px" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.info}</svg>`;
const esc=(v)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const usd=(v)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2,minimumFractionDigits:2}).format(Number(v||0));
const date=(s)=>s?new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Not set';
const relative=(s)=>{const d=Date.now()-new Date(s).getTime(); if(d<0)return date(s);if(d<60000)return 'Just now';if(d<3600000)return `${Math.floor(d/60000)} min ago`;if(d<86400000)return `${Math.floor(d/3600000)} hr ago`;return date(s);};
const SAMPLE_REQUEST='Can we also add an online booking calendar where customers choose available slots, pay a deposit, and automatically receive a confirmation email? It would be great to have this ready at launch.';
const EXAMPLE_REQUESTS={
 proj_atelier:SAMPLE_REQUEST,
 proj_northstar:'Could we connect Stripe so users can pay for a subscription in the app, and add real push notifications for team accounts? We would like this included in the launch version.',
 proj_solace:'Could you translate all 8 pages into Spanish and also write 4 short video scripts to promote the new content?'
};
const app=document.getElementById('app');
let data={projects:[],analyses:[],changeOrders:[],negotiations:[],activities:[]};
let config={aiReady:false,paypalReady:false,paypalClientId:null,aiModel:'gemini-2.5-flash',storageMode:'Local JSON'};
let page='overview', selectedProjectId='proj_atelier', activeAnalysisId=null,activeOrderId=null,modal=null,working=false,draftRequest='',toastTimeout=null;

async function request(route,method='GET',body) {
  const res=await fetch(route,{method,headers:{'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const payload=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(payload.error||`Request failed (${res.status})`);
  return payload;
}
async function load(){
  [config,data]=await Promise.all([request('/api/config'),request('/api/state')]);
  if(!data.projects.some(p=>p.id===selectedProjectId))selectedProjectId=data.projects[0]?.id;
  if(!activeOrderId&&data.changeOrders.length)activeOrderId=data.changeOrders[0].id;
}
function notify(message,error=false){
  let el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';document.body.append(el);}
  el.className=`toast show${error?' error':''}`;el.innerHTML=`${icon(error?'alert':'check')} <span>${esc(message)}</span>`;
  clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.className='toast',4600);
}
function navButton(p,label,ic,count){return `<button type="button" data-action="nav" data-page="${p}" class="${page===p?'active':''}">${icon(ic)}<span>${label}</span>${count?`<span class="nav-count">${count}</span>`:''}</button>`;}
function aside(){return `<aside class="sidebar"><div class="brand"><img src="/logo.svg" class="brand-icon" alt="ScopePay logo"/><span class="brand-name">scopepay<b>.</b></span></div>
  <span class="sidebar-section">Workspace</span><nav class="nav" aria-label="Main navigation">
  ${navButton('overview','Overview','grid')}${navButton('analyzer','AI Scope Analyzer','spark')}
  ${navButton('negotiate','Negotiation Studio','message',(data.negotiations||[]).filter(n=>n.status==='countered').length)}
  ${navButton('orders','Change Orders','files',data.changeOrders.filter(o=>o.status!=='paid').length)}
  ${navButton('projects','My Projects','folder')}
  <span class="sidebar-section" style="padding:22px 15px 9px;margin:0">Manage</span>
  ${navButton('activity','Activity log','clock')}${navButton('integrations','Integrations','settings')}
  </nav><div class="sidebar-spacer"></div><div class="tip-card"><div class="tip-mark">${icon('spark')}</div><b>Don't let extra work go unpaid.</b><p>Analyze new requests against the original brief in seconds.</p><button data-action="nav" data-page="analyzer">Try the analyzer ${icon('arrow',12)}</button></div>
  <div class="sidebar-profile"><div class="avatar">SP</div><div><strong>Demo workspace</strong><span>PayPal Sandbox · USD</span></div></div>
  </aside>`;}
const titles={overview:'Overview',analyzer:'AI Scope Analyzer',negotiate:'Negotiation Studio',orders:'Change Orders',projects:'My Projects',activity:'Activity log',integrations:'Integrations'};
function header(){return `<header class="topbar"><div class="breadcrumb">Workspace &nbsp; / &nbsp; <strong>${titles[page]}</strong></div><div class="top-actions"><div class="status-top"><span class="live-dot"></span><span>Sandbox workspace</span></div><button class="top-icon-btn" data-action="nav" data-page="activity" aria-label="View activity">${icon('bell')}</button><div class="avatar">SP</div></div></header>`;}
function heading(kicker,title,description,action=''){return `<div class="page-heading"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p class="subheading">${description}</p></div>${action}</div>`;}
function projectColor(i){return ['','mint','violet','orange'][i%4];}
function projectCard(p,i){return `<div class="card project-card" data-action="open-project" data-id="${esc(p.id)}" tabindex="0" role="button"><div class="project-square ${projectColor(i)}">${esc(p.name.charAt(0))}</div><div class="project-details"><strong>${esc(p.name)}</strong><small>${esc(p.client)} &nbsp;·&nbsp; ${esc(p.category)}</small></div><div class="project-end"><strong>${usd(p.budget)}</strong><small>Due ${esc(date(p.deadline))}</small></div>${icon('chevron',16)}</div>`;}
function recentActivity(limit){const events=data.activities.slice(0,limit);return events.length?`<div class="activity-list">${events.map(a=>`<div class="activity-item"><span class="timeline-dot ${a.type}">${icon(a.type==='payment'?'credit':a.type==='analysis'?'spark':a.type==='order'?'file':'clock',16)}</span><div><div class="message">${esc(a.message)}</div><small>${esc(relative(a.createdAt))}</small></div></div>`).join('')}</div>`:empty('No activity yet','Your changes will appear here.');}
function empty(title,desc){return `<div class="empty"><span class="empty-icon">${icon('file',26)}</span><h4>${title}</h4><p>${desc}</p></div>`;}
function overview(){
 const paid=data.changeOrders.filter(o=>o.status==='paid');const pending=data.changeOrders.filter(o=>o.status!=='paid');const protectedValue=data.changeOrders.reduce((sum,o)=>sum+o.amount,0);
 return `${heading('YOUR FREELANCE COMMAND CENTER','Good to see you. 👋','Turn requests into clear agreements, and clear agreements into payments.',`<button class="btn btn-primary" data-action="nav" data-page="analyzer">${icon('spark')} Analyze a request</button>`)}
 <div class="stats-grid">
  <div class="card stat"><div class="stat-head"><span>Revenue collected</span><span class="stat-icon green">${icon('dollar')}</span></div><div class="stat-value">${usd(paid.reduce((s,o)=>s+o.amount,0))}</div><div class="stat-footer">Verified sandbox captures only</div></div>
  <div class="card stat"><div class="stat-head"><span>Change orders</span><span class="stat-icon">${icon('files')}</span></div><div class="stat-value">${data.changeOrders.length.toString().padStart(2,'0')}</div><div class="stat-footer"><b>${pending.length} pending</b> &nbsp;·&nbsp; ${paid.length} paid</div></div>
  <div class="card stat"><div class="stat-head"><span>Value identified</span><span class="stat-icon purple">${icon('chart')}</span></div><div class="stat-value">${usd(protectedValue)}</div><div class="stat-footer">Approved changes, not guaranteed earnings</div></div>
 </div>
 <section class="hero"><div class="hero-copy"><span class="eyebrow">INTRODUCING THE SMARTER WORKFLOW</span><h2>Great work deserves<br/>a clear price.</h2><p>Let Gemini explain scope changes, offer fair negotiation choices, and collect the approved extra charge with PayPal Sandbox.</p><button class="btn btn-light" data-action="nav" data-page="analyzer">Analyze new request ${icon('arrow',15)}</button></div><div class="hero-art" aria-hidden="true"><div class="paper"><div class="line sm"></div><div class="line"></div><div class="line"></div><div class="line sm"></div><div class="line"></div></div><div class="art-check">${icon('check')}</div></div></section>
 <div class="dashboard-grid"><section><div class="section-row"><div><h3>Active projects</h3><span class="section-sub">Your current client engagements</span></div><button class="link" data-action="nav" data-page="projects">View all ${icon('arrow',13)}</button></div><div class="project-list">${data.projects.slice(0,4).map(projectCard).join('')}</div></section>
 <section><div class="section-row"><div><h3>Recent activity</h3><span class="section-sub">What has been happening</span></div><button class="link" data-action="nav" data-page="activity">View all ${icon('arrow',13)}</button></div><div class="white-panel">${recentActivity(5)}</div></section></div>`;
}
function currentProject(){return data.projects.find(p=>p.id===selectedProjectId)||data.projects[0];}
function currentAnalysis(){return data.analyses.find(a=>a.id===activeAnalysisId) || data.analyses.find(a=>a.projectId===selectedProjectId);}
function workflow(step){return `<div class="workflow">${['Choose project','Analyze request','Negotiate / approve','Get paid'].map((x,i)=>`<div class="workflow-step ${i<step?'done':i===step?'current':''}"><span class="step-number">${i<step?icon('check',15):i+1}</span><span>${x}</span></div>`).join('')}</div>`;}
function resultPanel(a){if(!a)return `<div class="result-placeholder"><div><div class="visual">${icon('spark',40)}</div><h3>Your AI analysis<br/>appears here</h3><p>Select a project, paste a client request, and discover what falls outside the original scope.</p></div></div>`;
 const isOos=a.outOfScope;const existing=data.changeOrders.find(o=>o.analysisId===a.id);
 return `<div class="card result-card"><div class="result-top"><div><span class="badge ${isOos?'orange':'green'}">${icon(isOos?'alert':'check',13)} ${isOos?'Outside agreed scope':'Within agreed scope'}</span><h3>${esc(a.category)}</h3><p>${esc(a.summary)}</p></div><div class="score-box"><strong class="confidence-label">${a.confidence>=75?'High':a.confidence>=45?'Moderate':'Low'}</strong>Model confidence*</div></div>
 <div class="result-section"><h4>${icon('target',16)} Why this matters</h4><p>${esc(a.reasoning)}</p></div>
 <div class="result-section"><h4>${icon('check',16)} Original agreement includes</h4><ul class="tiny-bullets">${a.originalIncludes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
 ${isOos?`<div class="result-section"><h4>${icon('plus',16)} Newly requested deliverables</h4><ul class="tiny-bullets">${a.additionalWork.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
 <div class="result-section"><h4>${icon('file',16)} Verified agreement evidence</h4>${a.evidence?.length?`<div class="evidence-list">${a.evidence.map(e=>`<div class="evidence-item">“${esc(e.quote)}”<small>${esc(e.reason)}</small></div>`).join('')}</div>`:`<div class="small-muted">No exact clause excerpt verified. Review the original agreement manually.</div>`}</div>
 <div class="result-section"><h4>${icon('clock',16)} Estimated effort breakdown</h4><ul class="effort-lines">${(a.effortItems||[]).map(i=>`<li><span>${esc(i.task)}</span><b>${esc(i.hours)} h</b></li>`).join('')}</ul><p class="small-muted">Advisory estimates, subject to freelancer review.</p></div>
 <div class="estimate-box"><div><span>ESTIMATED ADDITIONAL FEE</span><strong>${usd(a.estimatedPrice)}</strong><small>${esc(a.rateCalculation)} · editable before approval</small></div><span class="badge ${a.risk==='high'?'orange':'blue'}">${esc(a.risk)} risk</span></div>
 <div class="result-action"><button class="btn btn-primary" data-action="open-negotiation" data-id="${esc(a.id)}">${icon('message',16)} Open AI Negotiation Studio ${icon('arrow',16)}</button></div>
 <div class="result-action">${existing?`<button class="btn btn-primary" data-action="view-order" data-id="${esc(existing.id)}">View change order ${icon('arrow',16)}</button>`:`<button class="btn btn-primary" data-action="open-change" data-id="${esc(a.id)}">Create change order ${icon('arrow',16)}</button>`}</div>`:
 `<div class="notice">${icon('check')} <span>This looks like an agreed deliverable or a normal revision. No extra charge is recommended.</span></div>`}
 <div class="divider"></div><div class="result-section"><h4>${icon('message',16)} Draft reply to client</h4><div class="reply-box">${esc(a.suggestedReply)}</div><div class="reply-actions"><button class="btn btn-ghost" data-action="copy-reply" data-id="${esc(a.id)}">${icon('copy',13)} Copy reply</button></div></div>
 <div class="sample-watermark">${icon('info',12)} ${a.source==='sample'?'Sample fixture — not a live AI result':`Generated using ${esc(a.model)} · review before sending`}. *Model-provided confidence is not a calibrated probability.</div>
 </div>`;
}
function analyzer(){const p=currentProject(),a=currentAnalysis();if(!p)return empty('No projects','Create a project to analyze its scope.');
 return `${heading('AI-POWERED WORKFLOW','Scope analyzer','Compare a new client request against the original project agreement.')}${workflow(a?2:1)}
 <div class="analyzer-grid"><div class="card form-panel"><span class="eyebrow">STEP 01 · INPUT</span><h3>What did the client ask for?</h3><p>Choose an agreement and paste the request you received.</p>
 <div class="field"><label for="project-select">Select project</label><select id="project-select" class="select">${data.projects.map(pr=>`<option value="${esc(pr.id)}" ${pr.id===p.id?'selected':''}>${esc(pr.name)} — ${esc(pr.client)}</option>`).join('')}</select></div>
 <div class="scope-preview"><div class="scope-title">${icon('file',14)} ORIGINAL AGREED SCOPE</div><p>${esc(p.scope)}</p></div>
 <div class="field"><label for="client-request">New client message</label><textarea id="client-request" class="textarea" placeholder="Paste the client's message or new feature request here…">${esc(draftRequest)}</textarea><span class="hint">The model compares the two texts, not just keywords.</span></div>
 <div class="form-actions"><button class="btn btn-secondary" data-action="fill-sample" ${!EXAMPLE_REQUESTS[p.id]?'disabled title="No example request is available for this project"':''}>${icon('file',15)} Example request</button><button class="btn btn-primary" data-action="analyze" ${working?'disabled':''}>${working?'<span class="spinner"></span> Analyzing…':`${icon('spark',16)} Analyze with Gemini`}</button></div>
 ${!config.aiReady?`<div class="sample-note"><b>AI key not connected.</b> For a real analysis, add <code>GEMINI_API_KEY</code> to your server's .env. ${p.id==='proj_atelier'?`<button class="link" data-action="preview" ${working?'disabled':''}>See a labeled example analysis ${icon('arrow',12)}</button>`:'Choose Atelier to preview a sample result.'}</div>`:`<div class="sample-note">${icon('shield',13)} AI suggestions are advisory. Approve the scope and amount yourself before requesting payment.</div>`}
 </div><div>${resultPanel(a)}</div></div>`;}
function currentNegAnalysis(){return data.analyses.find(a=>a.id===activeAnalysisId&&a.outOfScope)||data.analyses.find(a=>a.outOfScope);}
function negotiationPage(){
 const a=currentNegAnalysis();if(!a)return `${heading('AI NEGOTIATION STUDIO','Make scope changes collaborative','Start with an out-of-scope analysis, then invite the client to choose a fair option.')}<div class="card negotiate-panel">${empty('Nothing to negotiate yet','Run an out-of-scope Gemini analysis to create client-ready options.')}<button class="btn btn-primary" data-action="nav" data-page="analyzer">Open scope analyzer ${icon('arrow',15)}</button></div>`;
 const existing=(data.negotiations||[]).find(n=>n.analysisId===a.id),p=data.projects.find(x=>x.id===a.projectId);
 const optionList=a.negotiationOptions?.length?a.negotiationOptions:[
  {id:'full',kind:'full',name:'Full implementation',hours:a.extraHours,description:`Implement the full request: ${(a.additionalWork||[]).join(', ')}`,tradeoff:'Full additional scope and budget',amount:a.estimatedPrice},
  {id:'lean',kind:'lean',name:'Lean alternative',hours:Math.max(0.5,Math.round(a.extraHours)/2),description:'A smaller first version without the complete feature set.',tradeoff:'Less functionality than the complete request',amount:Math.round(a.estimatedPrice/2*100)/100},
  {id:'swap',kind:'swap',name:'Scope exchange',hours:0,description:'Replace a mutually agreed existing deliverable with a simpler new request.',tradeoff:'Requires written agreement on what is removed',amount:0}
 ];
 return `${heading('AI-ASSISTED COMMERCE','Negotiation Studio','Offer a full build, a lean alternative, or a written scope trade. The client chooses; PayPal handles an accepted paid option.',`<button class="btn btn-secondary" data-action="nav" data-page="analyzer">${icon('spark',15)} Analyze another request</button>`)}
 <div class="negotiate-grid"><section class="card negotiate-panel"><span class="eyebrow">SOURCE ANALYSIS</span><div class="field"><label for="negotiation-analysis">Select client request</label><select id="negotiation-analysis" class="select">${data.analyses.filter(x=>x.outOfScope).map(x=>`<option value="${esc(x.id)}" ${x.id===a.id?'selected':''}>${esc(data.projects.find(p=>p.id===x.projectId)?.client||'Client')} · ${esc(x.category)} (${date(x.createdAt)})</option>`).join('')}</select></div>
 <div class="neg-summary"><strong>${esc(p?.name||'Project')}</strong><p style="margin:8px 0">${esc(a.summary)}</p>${esc(a.reasoning)}</div>
 <h3 style="margin-top:24px">Agreement evidence</h3>${a.evidence?.length?`<div class="evidence-list">${a.evidence.map(e=>`<div class="evidence-item">“${esc(e.quote)}”<small>${esc(e.reason)}</small></div>`).join('')}</div>`:`<p>No exact excerpt verified. Confirm contract terms manually.</p>`}
 <h3 style="margin-top:24px">Transparent effort estimate</h3><ul class="effort-lines">${(a.effortItems||[]).map(i=>`<li><span>${esc(i.task)}</span><b>${esc(i.hours)}h</b></li>`).join('')}</ul>
 <div class="notice">${icon('shield',16)} <span>${a.source==='sample'?'Sample fixture: AI options here are not a live Gemini result.':'Gemini proposed options; all terms require your review.'} This is advisory, not legal or pricing advice.</span></div>
 </section><section class="card negotiate-panel"><span class="eyebrow">FREELANCER CONTROL</span><h3>${existing?'Published negotiation':'Review & publish alternatives'}</h3><p>${existing?'The client can respond using this private invitation link.':'Choose which proposals the client can see and adjust the prices before publishing.'}</p>
 ${existing?`${existing.options.map(o=>`<div class="studio-option"><div class="deal-badge"><b>${esc(o.name)}</b><strong>${usd(o.amount)}</strong></div><p>${esc(o.description)}</p></div>`).join('')}
 <div class="notice">${icon('link',16)}<span>Share this invitation with your client. Anyone with the link can respond; this demo has no client identity verification.</span></div><div class="share-link">${esc(`${location.origin}/negotiate/${existing.token}`)}</div>
 <div class="studio-steps"><button class="btn btn-primary" data-action="open-client-invite" data-id="${esc(existing.token)}">${icon('external',15)} Open client view</button><button class="btn btn-secondary" data-action="copy-client-invite" data-id="${esc(existing.token)}">${icon('copy',15)} Copy invitation link</button></div>
 <div class="divider"></div><div class="deal-badge"><span>Negotiation status</span><span class="badge ${existing.status==='accepted'?'green':existing.status==='countered'?'orange':'blue'}">${existing.status==='accepted'?'Client accepted':existing.status==='countered'?'Counteroffer received':'Awaiting client'}</span></div>
 ${existing.status==='countered'?`<div class="counter-box"><h3>Client counteroffer: ${usd(existing.counter.amount)}</h3><p>“${esc(existing.counter.note)}”</p><div class="proposal-actions"><button class="btn btn-primary" data-action="resolve-counter" data-id="${esc(existing.id)}" data-accept="true">Accept client offer</button><button class="btn btn-secondary" data-action="resolve-counter" data-id="${esc(existing.id)}" data-accept="false">Decline</button></div></div>`:''}
 ${existing.status==='accepted'?`<div class="receipt-box"><b>Accepted amount: ${usd(existing.decidedAmount)}</b>${existing.changeOrderId?`<p>PayPal checkout is available through the approved change order.</p><button class="btn btn-primary" style="margin-top:12px" data-action="view-order" data-id="${esc(existing.changeOrderId)}">View payment ${icon('arrow',16)}</button>`:'<p>Zero-fee scope exchange accepted. No payment is due.</p>'}</div>`:''}`:
 `<form id="publish-negotiation" data-id="${esc(a.id)}">${optionList.map(o=>`<div class="studio-option"><div class="studio-option-head"><label><input type="checkbox" name="include-${esc(o.id)}" checked/>${esc(o.name)}</label><span class="badge ${o.kind==='swap'?'green':'blue'}">${o.kind==='swap'?'Trade':'Paid'}</span></div><p>${esc(o.description)}</p><div class="small-muted">${o.source==='estimated-template'?'Template fallback — review carefully':o.source==='sample'?'Sample fixture — not a real AI proposal':'Gemini-suggested option — human reviewed'}</div><div class="minor"><b>Trade-off:</b> ${esc(o.tradeoff)}</div><div class="studio-price"><label for="price-${esc(o.id)}">${o.hours} estimated hours · final option price</label><div class="number-input"><span>$</span><input class="input" id="price-${esc(o.id)}" name="price-${esc(o.id)}" type="number" min="${o.kind==='swap'?0:1}" max="250000" step=".01" value="${o.amount.toFixed(2)}" required/></div></div></div>`).join('')}
 <div class="notice">${icon('info',16)} <span>A $0 scope exchange requires a real, mutually approved removal or substitution. It is not an automatic free feature.</span></div>
 <button class="btn btn-primary" style="width:100%" type="submit" ${working?'disabled':''}>${icon('link',16)} Publish client options ${icon('arrow',16)}</button></form>`}</section></div>`;
}
function orderBadge(o){return o.status==='paid'?'<span class="badge green">Paid</span>':o.status==='awaiting_payment'?'<span class="badge orange">Checkout started</span>':'<span class="badge blue">Approved</span>';}
function selectedOrder(){return data.changeOrders.find(o=>o.id===activeOrderId)||data.changeOrders[0];}
function invoice(o){if(!o)return `<div class="card no-order">${icon('files')}<h3>No change order selected</h3><p>Run an analysis, then approve additional work to create a payable change order.</p><button class="btn btn-primary" data-action="nav" data-page="analyzer">Analyze a request</button></div>`;
 const p=data.projects.find(x=>x.id===o.projectId);const a=data.analyses.find(x=>x.id===o.analysisId);
 return `<section class="card invoice"><div class="invoice-top"><div><div class="invoice-title">Change order</div><div class="invoice-num">${esc(o.id.toUpperCase())} · ${esc(date(o.createdAt))}</div></div><div class="invoice-logo">${icon('file',21)}</div></div>
 <div class="invoice-items"><div class="invoice-line"><span>Project</span><strong>${esc(p?.name||'Project')}</strong></div><div class="invoice-line"><span>Client</span><strong>${esc(p?.client||'Client')}</strong></div><div class="invoice-line"><span>New deliverables</span><strong>${esc(a?.category||'Additional work')}</strong></div><div class="invoice-line"><span>Estimate</span><strong>${esc(a?.extraHours||0)} additional hours</strong></div><div class="invoice-line"><span>Source</span><strong>${o.source==='sample'?'Sample fixture':'Gemini AI review'}</strong></div><div class="invoice-line"><span>Status</span>${orderBadge(o)}</div></div>
 <div class="invoice-total"><span style="font-size:12px;font-weight:800;color:#6b7891">TOTAL DUE</span><b>${usd(o.amount)}</b></div>
 ${o.status==='paid'?`<div class="receipt-box">${icon('check')}<b>Sandbox payment completed</b><p>PayPal capture ID: ${esc(o.captureId||'—')}</p><p>Paid on ${esc(date(o.paidAt))}</p></div>`:
 `<div class="invoice-actions"><button class="btn btn-secondary" data-action="copy-pay-link" data-id="${esc(o.id)}">${icon('link',16)} Copy client payment link</button><button class="btn btn-secondary" data-action="open-pay" data-id="${esc(o.id)}">${icon('external',16)} Open client checkout</button>
 ${!config.paypalReady?`<div class="integration-info"><b>${icon('alert',14)} PayPal sandbox not configured</b>Add your PayPal sandbox client ID and secret to <code>.env</code> to accept a test payment. The link works after configuration.</div>`:`<div class="pay-frame"><p style="font-size:11px;margin:1px 0 10px">Or complete the checkout below with a PayPal sandbox personal buyer account:</p><div id="paypal-container" class="paypal-container"></div></div>`}</div>`}
 <div class="notice">${icon('shield',17)} <span><strong>Safe by design:</strong> PayPal credentials stay on the server. The server determines the amount and verifies PayPal's captured currency and total before marking it paid. Sandbox only.</span></div>
 </section>`;
}
function orders(){const o=selectedOrder();return `${heading('FROM SCOPE TO PAYMENT','Change orders','Every approved extra request gets its own clear, payable record.',`<button class="btn btn-primary" data-action="nav" data-page="analyzer">${icon('plus')} New change order</button>`)}<div class="order-layout"><section class="white-panel"><div class="panel-head"><h3>All change orders</h3><span class="badge gray">${data.changeOrders.length} total</span></div>
 ${data.changeOrders.length?data.changeOrders.map(co=>{const p=data.projects.find(x=>x.id===co.projectId);return `<div class="order-row ${o?.id===co.id?'selected':''}" data-action="select-order" data-id="${esc(co.id)}"><div class="order-top"><strong>${esc(p?.client||'Client')}</strong>${orderBadge(co)}</div><p>${esc(co.description)}</p><div style="display:flex;justify-content:space-between;align-items:center"><small>${esc(date(co.createdAt))}</small><strong>${usd(co.amount)}</strong></div></div>`;}).join(''):empty('No change orders yet','Analyze a new client request and approve additional work to create one.')}
 </section>${invoice(o)}</div>`;}
function projects(){return `${heading('YOUR CLIENT WORK','My projects','Every project starts with a clear agreement.',`<button class="btn btn-primary" data-action="new-project">${icon('plus')} New project</button>`)}
 <div class="projects-grid">${data.projects.map((p,i)=>`<article class="card project-tile"><div class="tile-top"><div class="project-square ${projectColor(i)}">${esc(p.name.charAt(0))}</div><span class="badge green">Active</span></div><h3>${esc(p.name)}</h3><p>${esc(p.scope)}</p><div class="tile-meta"><div>PROJECT BUDGET<strong>${usd(p.budget)}</strong></div><div>HOURLY RATE<strong>${usd(p.hourlyRate)}/hr</strong></div></div><button class="btn btn-secondary" data-action="open-project" data-id="${esc(p.id)}">Analyze a request ${icon('arrow',15)}</button></article>`).join('')}</div>`;}
function activityPage(){return `${heading('EVERY STEP RECORDED','Activity log','A simple timeline of your projects, analysis, and sandbox payment milestones.')}<div class="white-panel"><div class="panel-head"><h3>Workspace events</h3><span class="badge gray">Latest ${data.activities.length}</span></div>${recentActivity(100)}</div>`;}
function integrations(){return `${heading('YOUR TOOLKIT','Integrations','Add your own API keys to unlock real AI decisions and PayPal test payments.')}<div class="integration-grid">
 <div class="card integration-card"><div class="int-header"><div class="integration-logo gemini">✦</div><span class="badge ${config.aiReady?'green':'orange'}">${config.aiReady?'Connected':'Needs API key'}</span></div><h3>Google Gemini AI</h3><p>Analyzes agreements, detects scope changes, estimates extra hours, and generates a client-ready reply.</p><div class="divider"></div><h4>Activate Gemini</h4><ol class="setup-steps"><li>Get an API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>.</li><li>Add <span class="code-inline">GEMINI_API_KEY=your_key</span> to <span class="code-inline">.env</span>.</li><li>Restart <span class="code-inline">npm start</span>.</li></ol><div class="small-muted">Model: ${esc(config.aiModel)} · Keys stay on the backend.</div></div>
 <div class="card integration-card"><div class="int-header"><div class="integration-logo paypal">P<span style="color:#4397e4">P</span></div><span class="badge ${config.paypalReady?'green':'orange'}">${config.paypalReady?'Sandbox connected':'Needs credentials'}</span></div><h3>PayPal Sandbox</h3><p>Creates real PayPal sandbox orders, displays PayPal Checkout, and verifies captured payment totals.</p><div class="divider"></div><h4>Activate PayPal</h4><ol class="setup-steps"><li>Create a Sandbox REST app on <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" rel="noopener">PayPal Developer</a>.</li><li>Put <span class="code-inline">PAYPAL_CLIENT_ID</span> and <span class="code-inline">PAYPAL_CLIENT_SECRET</span> in <span class="code-inline">.env</span>.</li><li>Restart the server and pay using a Sandbox Personal account.</li></ol><div class="small-muted">Environment: Sandbox only · Currency: USD.</div></div></div><div class="small-muted" style="margin-top:16px">Project storage: ${esc(config.storageMode||'Local JSON')} · secrets remain on the backend.</div>
 <div class="notice">${icon('info',19)}<span><strong>Hackathon-ready integration:</strong> This app uses actual third-party APIs when credentials are supplied. The example analysis is intentionally labeled as sample data and never presented as a model response. No live money is accepted.</span></div>`;}
function modalMarkup(){if(!modal)return '';
 if(modal.type==='project')return `<div class="modal-backdrop" data-action="overlay-close"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">Create a project</h2><button class="close-btn" data-action="close-modal" aria-label="Close">${icon('close')}</button></div><form id="project-form"><div class="modal-inner"><p>Set the original agreement before asking AI to compare future changes.</p>
 <div class="form-two"><div class="field"><label for="name">Project name *</label><input class="input" name="name" id="name" placeholder="e.g. Olive website" required maxlength="100"/></div><div class="field"><label for="client">Client name *</label><input class="input" name="client" id="client" placeholder="e.g. Olive Studio" required maxlength="100"/></div></div>
 <div class="field"><label for="scope">Original agreed scope *</label><textarea class="textarea" id="scope" name="scope" required maxlength="10000" style="min-height:140px" placeholder="Describe exactly what you agreed to deliver, including revisions, exclusions, and deliverables…"></textarea></div>
 <div class="form-two"><div class="field"><label for="budget">Project budget (USD) *</label><div class="number-input"><span>$</span><input class="input" name="budget" id="budget" type="number" min="1" max="250000" step="0.01" value="1200" required/></div></div><div class="field"><label for="hourlyRate">Hourly rate (USD) *</label><div class="number-input"><span>$</span><input class="input" name="hourlyRate" id="hourlyRate" type="number" min="1" max="250000" step="0.01" value="65" required/></div></div></div>
 <div class="form-two"><div class="field"><label for="category">Category</label><select class="select" name="category" id="category"><option>Web design</option><option>App development</option><option>Content & copy</option><option>Branding</option><option>Consulting</option><option>Other</option></select></div><div class="field"><label for="deadline">Due date</label><input class="input" type="date" id="deadline" name="deadline"/></div></div></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" ${working?'disabled':''}>${working?'<span class="spinner"></span>':'Create project'} ${icon('arrow',15)}</button></div></form></div></div>`;
 if(modal.type==='change'){const a=data.analyses.find(x=>x.id===modal.id);const p=data.projects.find(x=>x.id===a?.projectId);if(!a)return '';
 return `<div class="modal-backdrop" data-action="overlay-close"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">Approve change order</h2><button class="close-btn" data-action="close-modal" aria-label="Close">${icon('close')}</button></div><form id="change-form" data-id="${esc(a.id)}"><div class="modal-inner"><p>You're in control. Review the scope and choose the amount before creating a PayPal payment request.</p><div class="scope-preview"><div class="scope-title">${icon('files',14)} ADDITIONAL DELIVERABLES</div><ul class="tiny-bullets">${a.additionalWork.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
 <div class="form-two"><div class="field"><label>Client</label><div class="input" style="background:#f7f9fd">${esc(p?.client||'Client')}</div></div><div class="field"><label>Estimated effort</label><div class="input" style="background:#f7f9fd">${a.extraHours} hours</div></div></div>
 <div class="field"><label for="approved-amount">Final approved amount (USD) *</label><div class="number-input"><span>$</span><input class="input" id="approved-amount" name="amount" type="number" step="0.01" min="1" max="250000" value="${a.estimatedPrice||1}" required/></div><span class="hint">AI suggests the hours; the price is calculated at your agreed rate. You can edit it.</span></div>
 <div class="notice">${icon('shield')}<span>No PayPal payment occurs when you approve this change. A client must explicitly authorize the sandbox checkout.</span></div></div>
 <div class="modal-footer"><button class="btn btn-secondary" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" ${working?'disabled':''}>${working?'<span class="spinner"></span>':'Approve & create'} ${icon('arrow',16)}</button></div></form></div></div>`;
 }return '';
}
function render(){app.innerHTML=`<div class="app-shell">${aside()}<div class="main">${header()}<main class="content">${page==='overview'?overview():page==='analyzer'?analyzer():page==='negotiate'?negotiationPage():page==='orders'?orders():page==='projects'?projects():page==='activity'?activityPage():integrations()}</main></div></div>${modalMarkup()}`;
 if(page==='orders'&&config.paypalReady&&selectedOrder()?.status!=='paid')setTimeout(mountPaypal,0);
}
function switchPage(p){if(!titles[p])return;page=p;modal=null;render();window.scrollTo({top:0,behavior:'smooth'});}
async function reload(){await load();render();}
async function busy(action){if(working)return;working=true;render();try{await action();}catch(e){notify(e.message,true);}finally{working=false;render();}}
function copyText(t){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(t).then(()=>notify('Copied to clipboard')).catch(()=>fallbackCopy(t));fallbackCopy(t);}
function fallbackCopy(t){const area=document.createElement('textarea');area.value=t;document.body.append(area);area.select();document.execCommand('copy');area.remove();notify('Copied to clipboard');}
function payUrl(id){return `${location.origin}/pay/${encodeURIComponent(id)}`;}
function sdkReady(){if(window.paypal?.Buttons)return Promise.resolve();if(window.__paypalLoading)return window.__paypalLoading;
 window.__paypalLoading=new Promise((resolve,reject)=>{
 const script=document.createElement('script');script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.paypalClientId)}&currency=USD&components=buttons&intent=capture`;script.onload=()=>window.paypal?.Buttons?resolve():reject(new Error('PayPal buttons unavailable'));script.onerror=()=>reject(new Error('Could not load PayPal Checkout SDK'));document.head.append(script);
 });return window.__paypalLoading;}
async function mountPaypal(){const o=selectedOrder();const target=document.getElementById('paypal-container');if(!target||!o||!config.paypalReady)return;
 target.innerHTML='<div class="small-muted">Loading PayPal checkout…</div>';
 try{await sdkReady();if(!target.isConnected||selectedOrder()?.id!==o.id)return;target.innerHTML='';
 window.paypal.Buttons({
  style:{layout:'vertical',shape:'rect',label:'paypal',height:42},
  createOrder:async()=>{const p=await request(`/api/change-orders/${o.id}/paypal-order`,'POST');return p.id;},
  onApprove:async(payload)=>{try{const result=await request(`/api/change-orders/${o.id}/capture`,'POST',{orderId:payload.orderID});if(result.status==='COMPLETED'){await reload();notify('PayPal sandbox payment verified!');}else notify('Capture not confirmed. Please retry.',true);}catch(e){notify(e.message,true);}},
  onError:()=>notify('PayPal checkout failed. Please try again or review your sandbox accounts.',true),
  onCancel:()=>notify('PayPal checkout cancelled. No payment was collected.')
 }).render(target);
 }catch(e){if(target.isConnected)target.innerHTML=`<div class="integration-info">${esc(e.message)}</div>`;}
}

document.addEventListener('input',e=>{if(e.target?.id==='client-request')draftRequest=e.target.value;});
document.addEventListener('change',e=>{if(e.target?.id==='negotiation-analysis'){activeAnalysisId=e.target.value;render();}if(e.target?.id==='project-select'){selectedProjectId=e.target.value;activeAnalysisId=null;draftRequest='';render();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal){modal=null;render();}if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('project-card')){e.preventDefault();e.target.click();}});
document.addEventListener('submit',async e=>{
 if(e.target.id==='project-form'){
  e.preventDefault();const fd=Object.fromEntries(new FormData(e.target).entries());await busy(async()=>{const p=await request('/api/projects','POST',fd);selectedProjectId=p.id;activeAnalysisId=null;draftRequest='';modal=null;await load();switchPage('analyzer');notify('Project created. Paste a client request to analyze.');});
 }
 if(e.target.id==='publish-negotiation'){
  e.preventDefault();const form=e.target,id=form.dataset.id;const a=data.analyses.find(x=>x.id===id);
  const options=['full','lean','swap'].filter(id=>form.elements.namedItem('include-'+id)?.checked).map(id=>({id,amount:Number(form.elements.namedItem('price-'+id)?.value)}));
  if(!options.length){notify('Choose at least one client option.',true);return;}
  await busy(async()=>{await request(`/api/analyses/${id}/negotiation`,'POST',{options});await load();notify('Negotiation published! Copy the invitation link for your client.');});return;
 }
 if(e.target.id==='change-form'){
  e.preventDefault();const id=e.target.dataset.id;const amount=Number(new FormData(e.target).get('amount'));await busy(async()=>{const o=await request(`/api/analyses/${id}/change-order`,'POST',{amount});modal=null;activeOrderId=o.id;await load();switchPage('orders');notify('Change order approved. Share the payment link with your client.');});
 }
});
document.addEventListener('click',async e=>{
 const target=e.target.closest('[data-action]');if(!target)return;const act=target.dataset.action;
 if(act==='overlay-close'&&e.target===target){modal=null;render();return;}
 if(act==='nav'){switchPage(target.dataset.page);return;}
 if(act==='new-project'){modal={type:'project'};render();return;}
 if(act==='close-modal'){modal=null;render();return;}
 if(act==='open-project'){selectedProjectId=target.dataset.id;activeAnalysisId=null;draftRequest='';switchPage('analyzer');return;}
 if(act==='fill-sample'){draftRequest=EXAMPLE_REQUESTS[selectedProjectId];if(!draftRequest)return notify('No example request is available for this project.',true);render();document.getElementById('client-request')?.focus();return;}
 if(act==='preview'){
  if(selectedProjectId!=='proj_atelier')return notify('Preview uses the Atelier project only.',true);
  draftRequest=SAMPLE_REQUEST;
  await busy(async()=>{const result=await request(`/api/projects/${selectedProjectId}/analyze/sample`,'POST',{requestText:SAMPLE_REQUEST});activeAnalysisId=result.id;await load();notify('Labeled sample analysis loaded (not Gemini output).');});return;
 }
 if(act==='analyze'){
  const requestText=(document.getElementById('client-request')?.value||draftRequest).trim();
  if(requestText.length<10)return notify('Enter a client request of at least 10 characters.',true);
  await busy(async()=>{const result=await request(`/api/projects/${selectedProjectId}/analyze`,'POST',{requestText});activeAnalysisId=result.id;draftRequest=requestText;await load();notify('Gemini scope analysis completed.');});return;
 }
 if(act==='copy-reply'){const a=data.analyses.find(a=>a.id===target.dataset.id);if(a)copyText(a.suggestedReply);return;}
 if(act==='open-negotiation'){activeAnalysisId=target.dataset.id;switchPage('negotiate');return;}
 if(act==='open-change'){modal={type:'change',id:target.dataset.id};render();return;}
 if(act==='select-order'){activeOrderId=target.dataset.id;render();return;}
 if(act==='view-order'){activeOrderId=target.dataset.id;switchPage('orders');return;}
 if(act==='open-client-invite'){window.open(`${location.origin}/negotiate/${encodeURIComponent(target.dataset.id)}`,'_blank','noopener,noreferrer');return;}
 if(act==='copy-client-invite'){copyText(`${location.origin}/negotiate/${encodeURIComponent(target.dataset.id)}`);return;}
 if(act==='resolve-counter'){
  const id=target.dataset.id,accept=target.dataset.accept==='true';
  if(accept&&!confirm('Approve this client-proposed amount? This creates a payable change order.'))return;
  await busy(async()=>{await request(`/api/negotiations/${id}/resolve-counter`,'POST',{accept});await load();notify(accept?'Counteroffer accepted. Payment request ready.':'Counteroffer declined; client may select a published option.');});return;
 }
 if(act==='copy-pay-link'){copyText(payUrl(target.dataset.id));return;}
 if(act==='open-pay'){window.open(payUrl(target.dataset.id),'_blank','noopener,noreferrer');return;}
});

load().then(render).catch(e=>{
 app.innerHTML=`<div class="loading-screen" style="flex-direction:column;gap:10px"><h2>Couldn't load ScopePay AI</h2><p>${esc(e.message)}</p><p>Check that the Node server is running, then refresh the page.</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div>`;
});
