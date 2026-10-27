export type NamedPoint = { name?:string; lat:number; lon:number };
export function stationNameKey(value = "") {
  return value.toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s*[–—]\s*(?:zugang|eingang).*$/,"").replace(/\((?:s\+u|s|u)\)/g,"")
    .replace(/^(?:s\+u|s|u)\s+/,"").replace(/hauptbahnhof|hbf\.?/g,"hbf")
    // Actual provider aliases: "Hermannstr. (Berlin)" ↔ "Berlin Hermannstraße";
    // "Gesundbrunnen Bhf (Berlin)" ↔ "Berlin Gesundbrunnen".
    // Keep Hbf (main station) distinct from the generic "Bhf" suffix.
    .replace(/([a-z])str\.?(?=\s|\(|$)/g,"$1strasse")
    .replace(/\bbhf\b(?=\s|\(|$)/g,"")
    .replace(/[^a-z0-9]+/g," ").trim();
}
export function stationDistanceMeters(a:NamedPoint,b:NamedPoint) {
  const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
  return 6371000*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
// Secondary aliases are accepted only at the station's coordinates. Keep
// platform-independent roles (especially airport Fern-/Regionalbahnhof) intact.
function stationAlias(value = "") {
  return stationNameKey(value.replace(/\([^)]*\)/g," ")
    .replace(/\bFernb(?:f)?\.?\b/gi,"Fernbahnhof"))
    .replace(/\b(?:bahnhof|bf|hbf|markt)\b/g," ").replace(/\s+/g," ").trim();
}
function compatibleStationRoles(a:string,b:string) {
  const roles=/\b(?:hbf|fern[a-z]*|regional[a-z]*|nord|sued|ost|west|mitte)\b/g;
  const roleKey=(value:string)=>value.replace(/\b(nord|sued|ost|west)bahnhof\b/g,'$1').replace(/\bfernb(?:f)?\b/g,'fernbahnhof');
  const left:string[]=roleKey(a).match(roles)??[],right:string[]=roleKey(b).match(roles)??[];
  return left.every(role=>right.includes(role)) && right.every(role=>left.includes(role)||role==="hbf");
}
export function chooseStationMatch<T extends NamedPoint>(station:NamedPoint,candidates:T[]):T|null {
  const key=stationNameKey(station.name);
  if(!key)return null;
  const ranked=candidates.flatMap(item=>{
    if(!Number.isFinite(item.lat)||!Number.isFinite(item.lon))return [];
    const name=stationNameKey(item.name),distance=stationDistanceMeters(station,item);
    // Never use proximity alone: neighbouring bus/rail stops can be closer.
    // Providers put the city before the name or in parentheses after it.
    // Require the same complete words and the existing geographic bound.
    const exact=name===key||name.split(' ').sort().join(' ')===key.split(' ').sort().join(' ');
    const qualified=key.length>=8&&name.length>=8&&(name.startsWith(key+' ')||key.startsWith(name+' '));
    // A provider may omit a city prefix ("S+U Hermannstraße") while the
    // curated station has one ("Berlin Hermannstraße"). Accept only whole
    // word suffixes and a much tighter bound than exact-name matches.
    const cityPrefixVariant=distance<=450&&key.length>=8&&name.length>=8&&
      (key.endsWith(' '+name)||name.endsWith(' '+key));
    const alias=stationAlias(station.name),otherAlias=stationAlias(item.name);
    const aliasWords=alias.split(' '),otherWords=otherAlias.split(' ');
    const sameAlias=alias===otherAlias||aliasWords.slice().sort().join(' ')===otherWords.slice().sort().join(' ');
    const municipalAlias=alias.endsWith(' '+otherAlias)||otherAlias.endsWith(' '+alias);
    const safeAlias=distance<=450&&alias.length>=4&&otherAlias.length>=4&&
      compatibleStationRoles(stationNameKey((station.name??'').replace(/\bFernbf\b/gi,'Fernbahnhof')),name)&&
      (sameAlias||municipalAlias);
    return distance<=1200&&(exact||qualified||cityPrefixVariant||safeAlias)?[{item,distance,score:exact?3:qualified?2:cityPrefixVariant?1:0}]:[];
  }).sort((a,b)=>b.score-a.score||a.distance-b.distance);
  const [first]=ranked;
  if(!first)return null;
  if(ranked.slice(1).some(candidate=>candidate.score===first.score&&Math.abs(candidate.distance-first.distance)<75&&stationDistanceMeters(first.item,candidate.item)>150))return null;
  return first.item;
}
