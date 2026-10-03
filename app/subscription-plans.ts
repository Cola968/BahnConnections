/** Product preparation. Browser state must never grant paid entitlements. */
export const SUBSCRIPTION_PLANS=[
  {id:"free",name:"Free",availability:"available",features:["Karte und Verbindungssuche","Live-Abfahrten","Lokales Profil und Favoriten"]},
  {id:"plus",name:"Plus",availability:"planned",features:["Profil und Favoriten synchronisieren","Persönliche Reisehinweise","Gespeicherte Pendelstrecken"]},
] as const;
export function currentEntitlements() {
  return {plan:"free" as const,checkoutEnabled:false,accountSync:false};
}
