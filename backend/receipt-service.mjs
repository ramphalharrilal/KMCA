// Server-only. Never import this module into the GitHub Pages frontend.
export function validatePayment(event, capture, order, expected, merchantId) {
  if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') throw Error('Not a completed capture event');
  if (!expected || expected.state !== 'awaiting_payment') throw Error('No matching open association payment record');
  if (!merchantId || capture.status !== 'COMPLETED' || capture.id !== event.resource?.id || capture.final_capture !== true) throw Error('Capture is not final and completed');
  if (order.id !== expected.order_id || order.status !== 'COMPLETED') throw Error('Order mismatch');
  if (capture.supplementary_data?.related_ids?.order_id !== expected.order_id) throw Error('Capture order mismatch');
  if (!Array.isArray(order.purchase_units) || order.purchase_units.length !== 1) throw Error('Unexpected purchase units');
  const unit = order.purchase_units[0];
  if (unit.payee?.merchant_id !== merchantId || unit.invoice_id !== expected.invoice_id) throw Error('Merchant or invoice mismatch');
  if (capture.payee?.merchant_id && capture.payee.merchant_id !== merchantId) throw Error('Capture merchant mismatch');
  if (!unit.payments?.captures?.some(c => c.id === capture.id && c.status === 'COMPLETED')) throw Error('Capture not in expected order');
  if (!/^\d+\.\d{2}$/.test(expected.amount) || Number(expected.amount) <= 0 || expected.currency !== 'USD') throw Error('Invalid association amount');
  for (const amount of [capture.amount, unit.amount]) {
    if (amount?.value !== expected.amount || amount?.currency_code !== expected.currency) throw Error('Amount or currency mismatch');
  }
  if (!expected.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expected.email)) throw Error('Missing receipt recipient');
  if (!capture.create_time || Number.isNaN(Date.parse(capture.create_time))) throw Error('Invalid payment timestamp');
  return {receiptId:`KMCA-${capture.id}`,captureId:capture.id,invoiceId:expected.invoice_id,property:expected.property_reference,email:expected.email,amount:expected.amount,currency:expected.currency,paidAt:capture.create_time};
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function receiptEmail(payment) {
  const date = new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeStyle:'short',timeZone:'America/Chicago'}).format(new Date(payment.paidAt));
  const text = `Kenswick Meadows Community Association, Inc.\nPayment receipt\n\nReceipt: ${payment.receiptId}\nReceived: ${payment.currency} ${payment.amount}\nPayment date: ${date} (Central time)\nProperty reference: ${payment.property}\nAssociation reference: ${payment.invoiceId}\nPayPal transaction: ${payment.captureId}\n\nThis receipt acknowledges the payment above. It does not certify that your account is paid in full.\n\nP.O. Box 745, Humble, TX 77347-0745\n(346) 657-1590\nthenewkenswickmeadows@gmail.com`;
  const rows = [['Receipt',payment.receiptId],['Payment date',`${date} (Central time)`],['Property reference',payment.property],['Association reference',payment.invoiceId],['PayPal transaction',payment.captureId]].map(([k,v])=>`<tr><th style="text-align:left;padding:10px 0;font-weight:400;color:#536765">${escape(k)}</th><td style="padding:10px 0;text-align:right">${escape(v)}</td></tr>`).join('');
  const html = `<html><body style="margin:0;background:#edf2eb;font-family:Arial,sans-serif;color:#123e40"><div style="max-width:580px;margin:30px auto;background:white;padding:32px"><p style="font-size:20px;font-weight:bold">Kenswick Meadows<br><span style="font-size:11px;letter-spacing:2px">COMMUNITY ASSOCIATION, INC.</span></p><hr style="border:0;border-top:1px solid #cbd8cf"><h1 style="font-size:28px">Payment received</h1><p style="font-size:36px">${escape(payment.currency)} ${escape(payment.amount)}</p><table style="width:100%;font-size:13px">${rows}</table><p style="font-size:12px;line-height:1.6">This receipt acknowledges the payment above. It does not certify that your account is paid in full.</p><hr style="border:0;border-top:1px solid #cbd8cf"><p style="font-size:12px;line-height:1.7">P.O. Box 745 · Humble, TX 77347-0745<br>(346) 657-1590<br>thenewkenswickmeadows@gmail.com</p></div></body></html>`;
  return {subject:`KMCA payment receipt · ${payment.receiptId}`,text,html};
}
export async function verifyWebhook(rawBody, headers, env, paypal) {
  const fields = {'auth_algo':'paypal-auth-algo','cert_url':'paypal-cert-url','transmission_id':'paypal-transmission-id','transmission_sig':'paypal-transmission-sig','transmission_time':'paypal-transmission-time'};
  const verification = {webhook_id:env.PAYPAL_WEBHOOK_ID};
  if (!verification.webhook_id) throw Error('Missing webhook configuration');
  for(const [field,header] of Object.entries(fields)){verification[field]=headers.get(header);if(!verification[field])return false;}
  // Preserve the original event bytes as the nested JSON value for PayPal verification.
  JSON.parse(rawBody);
  const body = JSON.stringify(verification).slice(0,-1)+',"webhook_event":'+rawBody+'}';
  const result = await paypal('/v1/notifications/verify-webhook-signature',{method:'POST',body});
  return result.verification_status === 'SUCCESS';
}
export async function processWebhook(rawBody, headers, env, deps) {
  if (!await verifyWebhook(rawBody,headers,env,deps.paypal)) return {status:400,message:'Invalid signature'};
  const event=JSON.parse(rawBody);
  if(event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') return {status:200,message:'No receipt for this event'};
  const captureId=event.resource?.id;
  if(!/^[A-Z0-9]+$/.test(captureId||'')) return {status:400,message:'Invalid capture identifier'};
  if(await deps.hasReceipt(captureId)) return {status:200,message:'Already recorded'};
  const capture=await deps.paypal(`/v2/payments/captures/${captureId}`);
  const orderId=capture.supplementary_data?.related_ids?.order_id;
  if(!/^[A-Z0-9]+$/.test(orderId||'')) return {status:422,message:'Unmatched capture'};
  const order=await deps.paypal(`/v2/checkout/orders/${orderId}`);
  const expected=await deps.findExpected(orderId);
  let payment;
  try{payment=validatePayment(event,capture,order,expected,env.PAYPAL_MERCHANT_ID);}catch{return {status:422,message:'Payment requires association review'};}
  // enqueue must atomically persist a unique receipt and outbox entry before returning.
  await deps.enqueue(payment,event.id);
  return {status:200,message:'Verified payment recorded'};
}
