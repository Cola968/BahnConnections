import { currentEntitlements, SUBSCRIPTION_PLANS } from "../../subscription-plans";
import { PLUS_PRICING } from '../../subscription-plans';
import { billingRuntime,billingAccount } from '../../billing/runtime';
import { approvedSubscription,stripeClient } from '../../billing/core';
/** Anonymous read-only preparation. No billing or paid grants. */
export async function GET(request:Request) {
  const base={plans:SUBSCRIPTION_PLANS,pricing:PLUS_PRICING,entitlements:currentEntitlements(),billing:{mode:'test',configured:false,authenticated:false}};
  const r=await billingRuntime();
  if(r)try {
    const account=await billingAccount(request,r.db);
    if(account){
      const subscriptions=await stripeClient(r.config).subscriptions.list({customer:account.stripe_customer_id,status:'all',limit:100});
      const active=subscriptions.data.find(s=>approvedSubscription(s,r.config));
      return Response.json({...base,billing:{mode:'test',configured:true,authenticated:true},entitlements:{plan:active?'plus':'free',checkoutEnabled:true,accountSync:false},subscription:active?{status:active.status,cancelAtPeriodEnd:active.cancel_at_period_end,periodEnd:active.items.data[0].current_period_end}:null},{headers:{'Cache-Control':'no-store'}});
    }
  }catch{/* Fail closed during provider/auth/database failures. */}
  return Response.json(base,{headers:{"Cache-Control":"no-store"}});
}
