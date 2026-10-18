/**
 * Fail closed on an independently documented, time-bounded contradiction
 * between a journey provider's stop sequence and an operator diversion.
 *
 * This is NOT a general live-disruption feed. Rules must cite the operator,
 * apply only to their verified window, and expire automatically.
 */
type StopShape={name:string};
type LegShape={
  category:string;
  name:string;
  startTime:string;
  scheduledStartTime:string;
  from:StopShape;
  to:StopShape;
  stops:readonly StopShape[];
};
type JourneyShape={transitLegs:readonly LegShape[]};

const DRESDEN_WORKS_START=Date.parse("2026-10-09T18:00:00Z"); // 20:00 CEST
const DRESDEN_WORKS_END=Date.parse("2026-10-24T01:30:00Z"); // 03:30 CEST, exclusive
const DRESDEN_SOURCE="https://www.dvb.de/de-de/meta/aktuelle-meldungen/gleisbau-pirnaischer-platz-26";

function stopName(value:string):string{
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/ß/g,"ss").toLocaleLowerCase("de").replace(/^dresden\s+/,"")
    .replace(/[^a-z0-9]+/g," ").trim();
}
function isLine129(value:string){
  return /^(?:linie\s*)?(?:1|2|9)$/.test(stopName(value));
}
function hasStop(stops:readonly StopShape[],name:string){
  const key=stopName(name);
  return stops.some(stop=>stopName(stop.name)===key);
}

/** Returns a precise reason only for proven contradictions, never invents substitute trips. */
export function journeyIntegrityConflict(journey:JourneyShape):string|null{
  for(const leg of journey.transitLegs){
    if(leg.category!=="tram"||!isLine129(leg.name))continue;
    const departure=Date.parse(leg.scheduledStartTime||leg.startTime);
    if(!Number.isFinite(departure)||departure<DRESDEN_WORKS_START||departure>=DRESDEN_WORKS_END)continue;
    const stops=leg.stops.length?leg.stops:[leg.from,leg.to];
    // Names are deliberately exact after normalization; don't block e.g. other cities' "Altmarkt".
    const anchors=["Straßburger Platz","Postplatz","Georg-Arnhold-Bad","Lennéplatz",
      "Hauptbahnhof Nord","Prager Straße","Altmarkt","Pirnaischer Platz","Deutsches Hygiene-Museum"];
    const touchesDresdenRoute=stops.some(stop=>/\bdresden\b/i.test(stop.name)||anchors.filter(anchor=>anchor!=="Altmarkt").some(anchor=>stopName(stop.name)===stopName(anchor)));
    if(!touchesDresdenRoute)continue;
    const forbidden=["Altmarkt","Pirnaischer Platz","Deutsches Hygiene-Museum"];
    if(forbidden.some(name=>hasStop(stops,name))){
      return `DVB-Umleitung: Linie ${leg.name} bedient diesen Halt vom 09.10. bis 24.10.2026 nicht. Die gelieferte Haltefolge widerspricht der DVB-Baustellenmeldung (${DRESDEN_SOURCE}).`;
    }
    const from=stops.findIndex(stop=>stopName(stop.name)===stopName("Straßburger Platz"));
    const to=stops.findIndex(stop=>stopName(stop.name)===stopName("Postplatz"));
    if(from===-1||to===-1)continue;
    const between=stops.slice(Math.min(from,to),Math.max(from,to)+1);
    const via=["Georg-Arnhold-Bad","Lennéplatz","Hauptbahnhof Nord","Prager Straße"];
    if(!via.every(name=>hasStop(between,name))){
      return `DVB-Umleitung: Linie ${leg.name} zwischen Straßburger Platz und Postplatz muss vom 09.10. bis 24.10.2026 über Georg-Arnhold-Bad, Lennéplatz, Hauptbahnhof Nord und Prager Straße führen. Die Datenquelle liefert diese Haltefolge nicht (${DRESDEN_SOURCE}).`;
    }
  }
  return null;
}

/** Apply the same safeguard when users open a whole trip outside the journey planner. */
export function transitousTripIntegrityConflict(input:readonly {
  mode?:string;displayName?:string;tripShortName?:string;routeShortName?:string;
  startTime?:string;scheduledStartTime?:string;
  from?:{name?:string};to?:{name?:string};intermediateStops?:{name?:string}[];
}[]):string|null{
  const legs=input.filter(item=>item.mode==="TRAM"&&item.from?.name&&item.to?.name)
    .map(item=>{
      const from={name:item.from!.name!},to={name:item.to!.name!};
      return {category:"tram",name:item.displayName||item.tripShortName||item.routeShortName||"",
        startTime:item.startTime||"",scheduledStartTime:item.scheduledStartTime||item.startTime||"",
        from,to,stops:[from,...(item.intermediateStops??[]).filter(stop=>Boolean(stop.name)).map(stop=>({name:stop.name!})),to]};
    });
  return journeyIntegrityConflict({transitLegs:legs});
}
