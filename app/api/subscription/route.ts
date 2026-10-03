import { currentEntitlements, SUBSCRIPTION_PLANS } from "../../subscription-plans";
/** Anonymous read-only preparation. No billing or paid grants. */
export function GET() {
  return Response.json({plans:SUBSCRIPTION_PLANS,entitlements:currentEntitlements()},{headers:{"Cache-Control":"no-store"}});
}
