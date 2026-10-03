/** Product preparation. Browser state must never grant paid entitlements. */
export const SUBSCRIPTION_PLANS=[
  {id:"free",name:"Free",availability:"available",features:["Karte und Verbindungssuche","Live-Abfahrten","Lokales Profil, Favoriten und Pendelstrecken"]},
  {id:"plus",name:"Plus",availability:"planned",features:["Profil und Favoriten synchronisieren","Persönliche Reisehinweise","Pendelstrecken geräteübergreifend nutzen"]},
] as const;
export function currentEntitlements() {
  return {plan:"free" as const,checkoutEnabled:false,accountSync:false};
}
export const PLUS_PRICING={currency:'eur',month:399,year:2999} as const;
