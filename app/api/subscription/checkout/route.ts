import { billingAccount,billingRuntime,billingUnavailable } from '../../../billing/runtime';
import { sameOrigin,stripeClient } from '../../../billing/core';
import { PLUS_PRICING } from '../../../subscription-plans';
export async function POST(request:Request) {
  const r=billingRuntime();if(!r)return billingUnavailable();
  if(!sameOrigin(request,r.config))return Response.json({error:'Anfrage nicht erlaubt.'},{status:403});
  try {
    const account=await billingAccount(request,r.db);if(!account)return Response.json({error:'Ein bestätigtes Online-Konto ist erforderlich.'},{status:401});
    const body=await request.json() as {interval?:unknown};if(body?.interval!=='month'&&body?.interval!=='year')return Response.json({error:'Ungültiger Tarif.'},{status:400});
    const stripe=stripeClient(r.config),priceId=body.interval==='month'?r.config.month:r.config.year;
    const price=await stripe.prices.retrieve(priceId);
    if(price.livemode||!price.active||price.currency!=='eur'||price.unit_amount!==PLUS_PRICING[body.interval as 'month'|'year']||price.recurring?.interval!==body.interval||price.recurring?.interval_count!==1) return billingUnavailable();
    const subscriptions=await stripe.subscriptions.list({customer:account.stripe_customer_id,status:'all',limit:100});
    if(subscriptions.has_more||subscriptions.data.some(s=>!['canceled','incomplete_expired'].includes(s.status)))return Response.json({error:'Bitte verwalte dein bestehendes Abonnement.'},{status:409});
    // Reuse one open checkout per customer instead of creating duplicate subscriptions.
    const sessions=await stripe.checkout.sessions.list({customer:account.stripe_customer_id,status:'open',limit:100});
    const open=sessions.data.find(s=>s.metadata?.bahn_interval===body.interval);
    if(open?.url)return Response.json({url:open.url},{headers:{'Cache-Control':'no-store'}});
    if(sessions.data.length||sessions.has_more)return Response.json({error:'Bitte beende zuerst deinen offenen Checkout.'},{status:409});
    const suffix=Array.from(crypto.getRandomValues(new Uint8Array(8)),v=>String.fromCharCode(97+v%26)).join('');
    const session=await stripe.checkout.sessions.create({mode:'subscription',customer:account.stripe_customer_id,line_items:[{price:priceId,quantity:1}],success_url:r.config.origin+'/?billing=returned',cancel_url:r.config.origin+'/?billing=cancelled',subscription_data:{billing_mode:{type:'flexible'}},client_reference_id:account.account_id,metadata:{bahn_interval:body.interval},integration_identifier:'bahnconnections_'+suffix},{idempotencyKey:`bahn-checkout-${account.account_id}-${body.interval}-${Math.floor(Date.now()/600000)}`});
    return Response.json({url:session.url},{headers:{'Cache-Control':'no-store'}});
  } catch {return Response.json({error:'Checkout momentan nicht erreichbar. Bitte erneut versuchen.'},{status:503});}
}
