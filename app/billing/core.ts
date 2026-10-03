import Stripe from 'stripe';
export const STRIPE_API_VERSION='2026-08-26.dahlia';
export type BillingConfig={key:string;webhookSecret:string;month:string;year:string;origin:string;portal:string};
export function billingConfig(env:Record<string,string|undefined>):BillingConfig|null {
  const {STRIPE_SECRET_KEY:key,STRIPE_WEBHOOK_SECRET:webhookSecret,STRIPE_PRICE_MONTH:month,STRIPE_PRICE_YEAR:year,BILLING_ORIGIN:origin,STRIPE_PORTAL_CONFIGURATION:portal}=env;
  // Development is sandbox-only. A live key cannot silently start charging.
  if(env.BILLING_MODE!=='test'||!key||!/^([sr]k)_test_/.test(key)||!webhookSecret?.startsWith('whsec_')||!month?.startsWith('price_')||!year?.startsWith('price_')||!portal?.startsWith('bpc_')||!origin) return null;
  try {if(new URL(origin).origin!==origin||!origin.startsWith('https://')) return null;} catch {return null;}
  return {key,webhookSecret,month,year,origin,portal};
}
export function stripeClient(c:BillingConfig) {
  return new Stripe(c.key,{apiVersion:STRIPE_API_VERSION,httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2,timeout:12000});
}
export function approvedSubscription(subscription:Stripe.Subscription,c:BillingConfig) {
  const item=subscription.items.data[0];
  return !subscription.livemode && subscription.status==='active' && subscription.items.data.length===1 && item?.quantity===1 && [c.month,c.year].includes(item.price.id) && item.current_period_end>Date.now()/1000;
}
export function sameOrigin(request:Request,c:BillingConfig) {
  return request.headers.get('origin')===c.origin;
}
export async function verifiedEvent(raw:string,signature:string,c:BillingConfig) {
  return stripeClient(c).webhooks.constructEventAsync(raw,signature,c.webhookSecret,undefined,Stripe.createSubtleCryptoProvider());
}
