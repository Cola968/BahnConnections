import type { Station } from "./network-data";

export const PASSENGER_SOURCE="https://dserver.bundestag.de/btd/21/025/2102573.pdf";
// DB InfraGO passenger survey 2024, Bundestag 21/2573, page 2, published 2025-11-04.
// These are travellers per day. The response explicitly excludes separately counted visitors.
// One consistent year and definition; never live vehicle occupancy or estimated boarding counts.
export const STATION_PASSENGERS:Record<string,number>={
  hamburg:345084,frankfurt:277043,muenchen:264312,berlin:190845,koeln:179513,
  stuttgart:174534,duesseldorf:152547,hannover:143998,nuernberg:131379,
  berlin_sued:129765,hamburg_altona:91969,mannheim:91882,
  db_bok:254395,db_bfri:228884,db_bgs:156868,db_bale:125452,
  db_mmp:125074,db_mop:96925,db_bzoo:92210,
};
const publishedNames:Record<string,number>={
  "Hamburg Hbf":345084,"Frankfurt (Main) Hbf":277043,"München Hbf":264312,
  "Berlin Ostkreuz":254395,"Berlin-Friedrichstraße":228884,"Berlin Hbf":190845,
  "Köln Hbf":179513,"Stuttgart Hbf":174534,"Berlin Gesundbrunnen":156868,
  "Düsseldorf Hbf":152547,"Hannover Hbf":143998,"Nürnberg Hbf":131379,
  "Berlin Südkreuz":129765,"Berlin Alexanderplatz":125452,"München Marienplatz":125074,
  "Flughafen BER":120478,"München Ost":96925,"Berlin Zoologischer Garten":92210,
  "Hamburg-Altona":91969,"Mannheim Hbf":91882,
};
const normalized=(name:string)=>name.replace(/Hauptbahnhof/gi,"Hbf").replace(/[^\p{L}\p{N}]/gu,"").toLocaleLowerCase("de-DE");
const byName=new Map(Object.entries(publishedNames).map(([name,count])=>[normalized(name),count]));
export function stationPassengerInfo(station:Pick<Station,"id"|"passengerBand"> & {name?:string}) {
  const daily=STATION_PASSENGERS[station.id] ?? (station.name ? byName.get(normalized(station.name)) : undefined);
  if(daily) return {daily,label:`${daily.toLocaleString("de-DE")} Reisende/Tag`,detail:"Erhebung 2024 · DB InfraGO / Bundestag",source:PASSENGER_SOURCE};
  if(station.passengerBand) return {daily:undefined,label:`${station.passengerBand} Reisende/Tag`,detail:"DB-Größenklasse · keine genaue Zählung",source:"https://geovdbn.deutschebahn.com/isr"};
  return {daily:undefined,label:"Fahrgastaufkommen nicht verfügbar",detail:"Keine veröffentlichte Zahl oder Größenklasse",source:undefined};
}
