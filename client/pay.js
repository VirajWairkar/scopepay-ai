const root=document.getElementById('checkout');
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const usd=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
const id=location.pathname.split('/')[2];
async function api(url,method='GET',body){const res=await fetch(url,{method,headers:{'Content-Type':'application/json','X-Client-Token':new URLSearchParams(location.search).get('token')||''},...(body?{body:JSON.stringify(body)}:{})});const json=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json.error||'Checkout failed');return json;}
function success(o){root.innerHTML=`<div class="checkout-status"><svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7"/></svg><h2>Payment completed</h2><p>Sandbox capture ID: ${esc(o.captureId||'Processing…')}</p><p>Your freelancer can see this payment in ScopePay.</p></div>`;}
function failure(text){root.innerHTML=`<h2>Checkout unavailable</h2><div class="checkout-error">${esc(text)}</div><a class="btn btn-secondary" style="margin-top:20px" href="/">Return to dashboard</a>`;}
(async()=>{
 try{
  const [order,config]=await Promise.all([api(`/api/public/change-orders/${encodeURIComponent(id)}`),api('/api/config')]);
  if(order.status==='paid')return success(order);
  root.innerHTML=`<span class="eyebrow">CLIENT PAYMENT REQUEST</span><h1>Let's make it official.</h1><p>Review the approved project change below and pay using a <strong>PayPal Sandbox buyer account</strong>.</p>
   <div class="checkout-item"><strong>${esc(order.projectName)}</strong>${esc(order.description)}<br/><small style="color:#91a0b6">Requested by ${esc(order.merchantName)} · for ${esc(order.clientName)}</small></div>
   <div class="checkout-amount"><div><span class="eyebrow" style="margin-bottom:3px">TOTAL DUE</span><small style="color:#a0aab9">USD · one-time change order</small></div><b>${usd(order.amount)}</b></div>
   ${!config.paypalReady?`<div class="integration-info"><b>PayPal Sandbox is not configured</b>The freelancer must add PayPal Sandbox credentials on the server before you can check out.</div>`:
   `<div class="checkout-brand"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg> Secure PayPal Sandbox Checkout</div><div id="pp-buttons" style="margin-top:18px;min-height:30px"></div>`}
   <p class="checkout-foot">This is a test environment. Sandbox payments never move real money.<br/>The freelancer has already reviewed and approved the amount.</p>`;
  if(!config.paypalReady)return;
  const script=document.createElement('script');
  script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.paypalClientId)}&currency=USD&components=buttons&intent=capture`;
  script.onload=()=>{
   window.paypal.Buttons({
    style:{layout:'vertical',shape:'rect',label:'pay',height:46},
    createOrder:async()=>{const response=await api(`/api/change-orders/${encodeURIComponent(id)}/paypal-order`,'POST');return response.id;},
    onApprove:async data=>{try{const result=await api(`/api/change-orders/${encodeURIComponent(id)}/capture`,'POST',{orderId:data.orderID});if(result.status!=='COMPLETED')throw new Error('Capture not confirmed');success(result.order);}catch(error){failure(error.message);}},
    onError:()=>failure('The PayPal Sandbox Checkout could not complete. Try again with a Sandbox Personal account.'),
    onCancel:()=>{const el=document.getElementById('pp-buttons');if(el)el.insertAdjacentHTML('afterend','<p>Checkout cancelled. No charge has been captured.</p>');}
   }).render('#pp-buttons').catch(e=>failure(e.message));
  };
  script.onerror=()=>failure('PayPal JavaScript SDK could not be loaded.');
  document.head.append(script);
 }catch(error){failure(error.message);}
})();
