import { billingAccount,billingRuntime,billingUnavailable } from '../../../billing/runtime';
import { sameOrigin,stripeClient } from '../../../billing/core';
export async function POST(request:Request) {
  const r=billingRuntime();if(!r)return billingUnavailable();
  if(!sameOrigin(request,r.config))return Response.json({error:'Anfrage nicht erlaubt.'},{status:403});
  try {
    const account=await billingAccount(request,r.db);if(!account)return Response.json({error:'Bitte mit deinem Online-Konto anmelden.'},{status:401});
    const session=await stripeClient(r.config).billingPortal.sessions.create({configuration:r.config.portal,customer:account.stripe_customer_id,return_url:r.config.origin});
    return Response.json({url:session.url},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Abo-Verwaltung momentan nicht erreichbar.'},{status:503});}
}
