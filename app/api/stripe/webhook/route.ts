import { billingRuntime,billingUnavailable } from '../../../billing/runtime';
import { verifiedEvent } from '../../../billing/core';
export async function POST(request:Request) {
  const r=await billingRuntime();if(!r)return billingUnavailable();
  const signature=request.headers.get('stripe-signature');if(!signature)return Response.json({error:'Signatur fehlt.'},{status:400});
  const raw=await request.text();if(raw.length>1_000_000)return new Response(null,{status:413});
  let event;
  try {event=await verifiedEvent(raw,signature,r.config);}
  catch {return Response.json({error:'Ungültige Signatur.'},{status:400});}
  try {
    if(event.livemode)return Response.json({error:'Live-Ereignisse sind nicht freigeschaltet.'},{status:400});
    // No paid flag is copied from event payloads. GET reads authoritative Stripe state,
    // so duplicate or out-of-order events can never reinstate a cancelled subscription.
    await r.db.prepare('INSERT OR IGNORE INTO billing_webhook_events(event_id,processed_at) VALUES (?,?)').bind(event.id,Math.floor(Date.now()/1000)).run();
    return Response.json({received:true});
  } catch {return Response.json({error:'Ereignis konnte nicht sicher verarbeitet werden.'},{status:500});}
}
