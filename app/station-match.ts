export type NamedPoint = { name?:string; lat:number; lon:number };
export function stationNameKey(value = "") {
  return value.toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s*[–—]\s*(?:zugang|eingang).*$/,"").replace(/\((?:s\+u|s|u)\)/g,"")
    .replace(/^(?:s\+u|s|u)\s+/,"").replace(/hauptbahnhof|hbf\.?/g,"hbf")
    .replace(/[^a-z0-9]+/g," ").trim();
}
export function stationDistanceMeters(a:NamedPoint,b:NamedPoint) {
  const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
  return 6371000*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function chooseStationMatch<T extends NamedPoint>(station:NamedPoint,candidates:T[]):T|null {
  const key=stationNameKey(station.name);
  if(!key)return null;
  const ranked=candidates.flatMap(item=>{
    if(!Number.isFinite(item.lat)||!Number.isFinite(item.lon))return [];
    const name=stationNameKey(item.name),distance=stationDistanceMeters(station,item);
    // Never use proximity alone: neighbouring bus/rail stops can be closer.
    const exact=name===key;
    const qualified=key.length>=8&&name.length>=8&&(name.startsWith(key+' ')||key.startsWith(name+' '));
    return distance<=1200&&(exact||qualified)?[{item,distance,score:exact?2:1}]:[];
  }).sort((a,b)=>b.score-a.score||a.distance-b.distance);
  const [first]=ranked;
  if(!first)return null;
  if(ranked.slice(1).some(candidate=>candidate.score===first.score&&Math.abs(candidate.distance-first.distance)<75&&stationDistanceMeters(first.item,candidate.item)>150))return null;
  return first.item;
}
