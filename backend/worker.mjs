import {processWebhook,receiptEmail} from './receipt-service.mjs';
function paypalClient(env){
  if(!['sandbox','live'].includes(env.PAYPAL_ENV))throw Error('Invalid PayPal environment');
  const base=env.PAYPAL_ENV==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';let token;
  return async(path,options={})=>{if(!token){const auth=await fetch(base+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(env.PAYPAL_CLIENT_ID+':'+env.PAYPAL_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});if(!auth.ok)throw Error('PayPal authentication failed');token=(await auth.json()).access_token;}
    const response=await fetch(base+path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});if(!response.ok)throw Error('PayPal request failed');return response.json();};
}
export function database(env){return {
  hasReceipt:async id=>Boolean(await env.DB.prepare('SELECT capture_id FROM receipts WHERE capture_id=?').bind(id).first()),
  findExpected:id=>env.DB.prepare('SELECT * FROM expected_payments WHERE order_id=?').bind(id).first(),
  enqueue:async(p,eventId)=>{const data=JSON.stringify(p);await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO receipts(capture_id,invoice_id,event_id,payload) VALUES(?,?,?,?)').bind(p.captureId,p.invoiceId,eventId,data),
    env.DB.prepare('INSERT OR IGNORE INTO receipt_outbox(capture_id,payload) SELECT capture_id,payload FROM receipts WHERE capture_id=?').bind(p.captureId),
    env.DB.prepare("UPDATE expected_payments SET state='paid' WHERE invoice_id=? AND EXISTS(SELECT 1 FROM receipts WHERE capture_id=? AND invoice_id=?)").bind(p.invoiceId,p.captureId,p.invoiceId)
  ]);}
};}
export async function deliverReceipts(env){
  if(env.RECEIPTS_ENABLED!=='true')return;
  // Resend deduplicates an idempotency key for 24 hours. Stop uncertain retries at 23 hours.
  await env.DB.prepare("UPDATE receipt_outbox SET state='manual_review' WHERE state IN ('pending','sending') AND first_attempt IS NOT NULL AND first_attempt < unixepoch()-82800").run();
  const {results}=await env.DB.prepare("SELECT capture_id,payload FROM receipt_outbox WHERE state='pending' OR (state='sending' AND lease_until<unixepoch()) LIMIT 20").all();
  for(const row of results){const claim=await env.DB.prepare("UPDATE receipt_outbox SET state='sending',lease_until=unixepoch()+300,first_attempt=COALESCE(first_attempt,unixepoch()),attempts=attempts+1 WHERE capture_id=? AND (state='pending' OR (state='sending' AND lease_until<unixepoch())) RETURNING capture_id").bind(row.capture_id).first();if(!claim)continue;
    try{const payment=JSON.parse(row.payload);const email=receiptEmail(payment);const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`kmca-receipt-${row.capture_id}`},body:JSON.stringify({from:env.RECEIPT_FROM,to:[payment.email],reply_to:'thenewkenswickmeadows@gmail.com',...email}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Email delivery failed');const result=await response.json();await env.DB.prepare("UPDATE receipt_outbox SET state='sent',provider_id=?,sent_at=unixepoch(),lease_until=NULL WHERE capture_id=?").bind(result.id,row.capture_id).run();
    }catch{await env.DB.prepare("UPDATE receipt_outbox SET state='pending',lease_until=NULL WHERE capture_id=? AND state='sending'").bind(row.capture_id).run();}
  }
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);if(url.pathname!=='/webhooks/paypal')return new Response('Not found',{status:404});
    if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});
    if(env.RECEIPTS_ENABLED!=='true')return new Response('Receipt service not configured',{status:503});
    if(!env.PAYPAL_CLIENT_ID||!env.PAYPAL_CLIENT_SECRET||!env.PAYPAL_WEBHOOK_ID||!env.PAYPAL_MERCHANT_ID||!env.RECEIPT_FROM||!env.RESEND_API_KEY||!env.DB)return new Response('Receipt service not configured',{status:503});
    const reader=request.body?.getReader();if(!reader)return new Response('Missing body',{status:400});let length=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>262144){await reader.cancel();return new Response('Payload too large',{status:413});}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const raw=new TextDecoder().decode(bytes);
    try{JSON.parse(raw);}catch{return new Response('Invalid JSON',{status:400});}
    try{const result=await processWebhook(raw,request.headers,env,{paypal:paypalClient(env),...database(env)});return new Response(result.message,{status:result.status});}catch{return new Response('Temporary verification or storage failure',{status:503});}
  },
  async scheduled(event,env,ctx){ctx.waitUntil(deliverReceipts(env));}
};
