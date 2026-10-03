export type SubscriptionPlanId = "free" | "plus";
export type SubscriptionEntitlement =
  | "journey_search"
  | "live_departures"
  | "live_map"
  | "favorites"
  | "profile_local"
  | "profile_sync"
  | "advanced_alerts"
  | "journey_history"
  | "custom_themes"
  | "data_export";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  priceLabel: string;
  available: boolean;
  entitlements: SubscriptionEntitlement[];
  highlights: string[];
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id:"free",
    name:"Free",
    description:"Die Kernfunktionen von BahnConnections bleiben frei.",
    priceLabel:"0 €",
    available:true,
    entitlements:["journey_search","live_departures","live_map","favorites","profile_local"],
    highlights:["Verbindungen & Live-Abfahrten","Live-Karte","Favoriten","Lokales Profil"],
  },
  {
    id:"plus",
    name:"Plus",
    description:"Vorbereitet für Komfortfunktionen, Synchronisierung und persönliche Reisefeatures.",
    priceLabel:"Preis folgt",
    available:false,
    entitlements:["journey_search","live_departures","live_map","favorites","profile_local","profile_sync","advanced_alerts","journey_history","custom_themes","data_export"],
    highlights:["Profil-Sync auf mehreren Geräten","Erweiterte Verspätungs- & Abfahrtsalarme","Reiseverlauf / Bahn-Passport","Eigene Themes & Datenexport"],
  },
];

export const DEFAULT_PLAN: SubscriptionPlanId = "free";

export function planHasEntitlement(planId: SubscriptionPlanId, entitlement: SubscriptionEntitlement) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId)?.entitlements.includes(entitlement) ?? false;
}
