import crypto from "node:crypto";
const BASE = 'https://api-m.sandbox.paypal.com';

export function paypalReady(config = process.env) {
  return Boolean(config.PAYPAL_CLIENT_ID && config.PAYPAL_CLIENT_SECRET && (config.PAYPAL_ENV || 'sandbox') === 'sandbox');
}

export class PayPalSandbox {
  constructor(config = process.env) {
    this.config = config;
    this.cachedToken = null;
    if (config.PAYPAL_ENV && config.PAYPAL_ENV !== 'sandbox') throw new Error('ScopePay is sandbox-only. Set PAYPAL_ENV=sandbox.');
  }
  async token() {
    if (!paypalReady(this.config)) {const e=new Error('PayPal Sandbox credentials are not configured.');e.status=503;throw e;}
    if (this.cachedToken?.expires > Date.now() + 30000) return this.cachedToken.value;
    const authorization = Buffer.from(`${this.config.PAYPAL_CLIENT_ID}:${this.config.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${BASE}/v1/oauth2/token`,{
      method:'POST', headers:{Authorization:`Basic ${authorization}`,'Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=client_credentials',signal:AbortSignal.timeout(20000)
    });
    const payload = await response.json().catch(()=>({}));
    if (!response.ok || !payload.access_token) {const e=new Error(`PayPal OAuth failed (${response.status}). Check your Sandbox credentials.`);e.status=502;throw e;}
    this.cachedToken={value:payload.access_token, expires:Date.now()+(payload.expires_in||240)*1000};
    return payload.access_token;
  }
  async request(path, options = {}) {
    const response = await fetch(`${BASE}${path}`,{
      method:options.method||'GET',
      headers:{Authorization:`Bearer ${await this.token()}`,'Content-Type':'application/json', 'PayPal-Request-Id': crypto.createHash('sha256').update(options.requestId || crypto.randomUUID()).digest('hex').slice(0,36)},
      ...(options.body ? {body:JSON.stringify(options.body)} : {}), signal:AbortSignal.timeout(25000)
    });
    const payload = await response.json().catch(()=>({}));
    if (!response.ok) {
      const detail = payload.details?.[0]?.description || payload.message || `HTTP ${response.status}`;
      const e=new Error(`PayPal Sandbox: ${String(detail).slice(0,250)}`);e.status=502;throw e;
    }
    return payload;
  }
  async createOrder(changeOrder, project) {
    const description=`ScopePay change order · ${project.name}`.slice(0,127);
    return this.request('/v2/checkout/orders',{
      method:'POST',requestId:`create-${changeOrder.id}`,
      body:{intent:'CAPTURE',purchase_units:[{
        reference_id:changeOrder.id,
        description,
        custom_id:changeOrder.id,
        amount:{currency_code:'USD',value:Number(changeOrder.amount).toFixed(2)}
      }]}
    });
  }
  async captureOrder(orderId, changeOrderId) {
    return this.request(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,{
      method:'POST', requestId:`capture-${changeOrderId}-${orderId}`, body:{}
    });
  }
}

export function verifiedCapture(paypalCapture, changeOrder) {
  if(paypalCapture.status!=='COMPLETED'||(changeOrder.currency&&changeOrder.currency!=='USD'))return null;
  const captures=(paypalCapture.purchase_units||[]).flatMap(p=>p.payments?.captures||[]);
  return captures.find(c=>typeof c.id==='string'&&c.id.length>0&&c.status==='COMPLETED'&&c.amount?.currency_code==='USD'&&
    Number.isFinite(Number(c.amount.value))&&Math.abs(Number(c.amount.value)*100-Math.round(Number(c.amount.value)*100))<1e-6&&Math.round(Number(c.amount.value)*100)===Math.round(changeOrder.amount*100))||null;
}
