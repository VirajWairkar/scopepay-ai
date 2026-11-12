/** Pure, bounded helpers for advisory options. No financial amounts are accepted from AI. */
export const cents = n => Math.round(Number(n)*100);
export const dollars = n => Math.round(n*100)/100;
const short = (v,max=220) => typeof v==='string'?v.trim().slice(0,max):'';
const halfHours = n => Math.round(n*2)/2;

export function verifiedEvidence(raw, scope) {
  if (!Array.isArray(raw)) return [];
  const result=[];
  for (const item of raw.slice(0,8)) {
    const quote=short(typeof item==='string'?item:item?.quote,240);
    const rationale=short(item?.reason,240);
    // Evidence must be copied verbatim from the user's actual agreement.
    const index=scope.toLocaleLowerCase().indexOf(quote.toLocaleLowerCase());
    if (quote.length<8 || index<0) continue;
    const exactQuote=scope.slice(index,index+quote.length);
    if (!result.some(x=>x.quote.toLowerCase()===exactQuote.toLowerCase())) result.push({quote:exactQuote,reason:rationale||'This term appears in the original agreement.'});
    if (result.length===4)break;
  }
  return result;
}

export function effortBreakdown(raw, totalHours) {
  if (!totalHours) return [];
  const entries=Array.isArray(raw)?raw.slice(0,8).map(x=>({task:short(x?.task,100),hours:halfHours(Number(x?.hours))}))
    .filter(x=>x.task&&Number.isFinite(x.hours)&&x.hours>0&&x.hours<=300).slice(0,6):[];
  const sum=entries.reduce((n,x)=>n+x.hours,0);
  return Math.abs(sum-totalHours)<0.001?entries:[{task:'Total estimated work — itemization requires freelancer review',hours:totalHours}];
}

export function negotiationOptions(raw, project, extraHours, additionalWork) {
  if (!extraHours) return [];
  const options=Array.isArray(raw)?raw:[];
  const original=kind=>options.find(x=>x&&x.kind===kind)||{};
  const full=original('full'), lean=original('lean'), swap=original('swap');
  const fullHours=halfHours(extraHours);
  const aiLeanHours=halfHours(Number(lean.hours));
  const leanHours=Number.isFinite(aiLeanHours)&&aiLeanHours>=0.5&&aiLeanHours<fullHours?aiLeanHours:Math.max(0.5,halfHours(fullHours/2));
  const base=[
    {id:'full',kind:'full',name:'Full implementation',hours:fullHours,description:short(full.description)||`Implement the additional deliverables: ${additionalWork.join(', ')||'the newly requested features'}.`,tradeoff:short(full.tradeoff)||'Full requested scope; additional budget and delivery time are required.'},
    {id:'lean',kind:'lean',name:'Lean alternative',hours:leanHours,description:short(lean.description)||'Deliver a simpler first version of the requested feature, with reduced functionality.',tradeoff:short(lean.tradeoff)||'Less functionality than the full request; confirm the excluded features.'},
    {id:'swap',kind:'swap',name:'Scope exchange',hours:0,description:short(swap.description)||'Replace a mutually agreed existing deliverable with a simplified version of the new request.',tradeoff:short(swap.tradeoff)||'Requires a written agreement on what will be removed. No payment is due if both parties approve the trade.'}
  ];
  return base.map(o=>({...o,amount:dollars(o.hours*project.hourlyRate),currency:'USD', source:options.some(x=>x?.kind===o.kind)?'gemini':'estimated-template'}));
}

export function validateOffers(input, suggested) {
  if (!Array.isArray(input)||!input.length||input.length>3) throw Object.assign(new Error('Select one to three options.'),{status:400});
  const used=new Set();
  return input.map(raw=>{
    const base=suggested.find(x=>x.id===raw?.id);
    if (!base||used.has(raw.id))throw Object.assign(new Error('Invalid or duplicate negotiation option.'),{status:400});
    used.add(raw.id);
    const amount=Number(raw.amount);
    if (!Number.isFinite(amount)||amount<0||amount>250000||Math.abs(cents(amount)-amount*100)>0.000001)
      throw Object.assign(new Error('Option price must be between $0 and $250,000, with at most 2 decimal places.'),{status:400});
    if (base.kind!=='swap' && amount<1)throw Object.assign(new Error('Paid options must cost at least $1.'),{status:400});
    return {...base,amount:dollars(amount)};
  });
}
