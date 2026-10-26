// Evidence register validator for the V63 TITAN plan.
// This script verifies structure and non-empty proof metadata; it does NOT
// replace actual review of commits, CI runs, screenshots or live provider data.
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

const allowedStatus=new Set(["todo","in_progress","blocked","implemented","tested","live_verified","deferred"]);
const allowedKind=new Set(["unreviewed","new","upgrade","existing","defer","blocked-data"]);
const allowedScope=new Set(["undecided","web-63","native","later","blocked"]);
const arrayFields=["changed_paths","unit_test_ids","integration_test_ids","browser_test_ids","visual_evidence","live_evidence","blockers"];
const filled=(value)=>typeof value==="string"&&value.trim().length>0;

export function auditRegistry(registry,{release=false}={}){
  const errors=[],summary={total:0,todo:0,in_progress:0,blocked:0,implemented:0,tested:0,live_verified:0,deferred:0,web_scope:0,new_verified:0};
  if(!registry||!Array.isArray(registry.items))return {errors:["Registry fehlt oder items ist kein Array"],summary};
  const list=registry.items;summary.total=list.length;
  if(registry.feature_count!==list.length)errors.push("feature_count stimmt nicht mit items überein");
  if(registry.schema_version!==1)errors.push("Unbekannte schema_version");
  const seen=new Set(),verifiedEpics=new Set(),provenScreens=new Set();
  for(let index=0;index<list.length;index++){
    const item=list[index],id=item?.id??`index-${index}`;
    if(!/^BC63-\d{2}-\d{2}$/.test(id))errors.push(`${id}: ID ungültig`);
    if(seen.has(id))errors.push(`${id}: Doppelte ID`);seen.add(id);
    if(!filled(item.name)||!filled(item.acceptance)||!filled(item.epic))errors.push(`${id}: Feature, Abnahme oder Epic fehlt`);
    if(!allowedStatus.has(item.status))errors.push(`${id}: Status ungültig`);
    else summary[item.status]++;
    if(!allowedKind.has(item.classification))errors.push(`${id}: Klassifikation ungültig`);
    if(!allowedScope.has(item.release_scope))errors.push(`${id}: Release-Scope ungültig`);
    for(const key of arrayFields)if(!Array.isArray(item[key]))errors.push(`${id}: ${key} muss Array sein`);
    const status=item.status,scope=item.release_scope;
    const evidence=[...(item.unit_test_ids??[]),...(item.integration_test_ids??[]),...(item.browser_test_ids??[])];
    const complete=["implemented","tested","live_verified"].includes(status);
    if(complete){
      if(["unreviewed","defer","blocked-data"].includes(item.classification))errors.push(`${id}: Erfolg ohne gültige Klassifikation`);
      if(!(item.changed_paths??[]).length||!/^[a-f0-9]{40}$/.test(item.commit_sha??""))errors.push(`${id}: Implementierung ohne echte Pfad-/Commitangabe`);
    }
    if(["tested","live_verified"].includes(status)&&!evidence.some(filled))errors.push(`${id}: Testnachweis fehlt`);
    if(status==="live_verified"&&!(item.live_evidence??[]).some(filled))errors.push(`${id}: Live-Nachweis fehlt`);
    if(status==="deferred"&&(!filled(item.notes)||scope==="web-63"))errors.push(`${id}: deferred ohne Begründung oder noch im Webrelease`);
    if(status==="blocked"&&!(item.blockers??[]).some(filled))errors.push(`${id}: blocked ohne konkrete Blocker`);
    if(scope==="web-63"){
      summary.web_scope++;
      if(status==="live_verified"&&["new","upgrade"].includes(item.classification)){
        summary.new_verified++;verifiedEpics.add(item.epic);
        for(const entry of item.visual_evidence??[])if(filled(entry))provenScreens.add(entry.trim());
      }
      if(release&&status!=="live_verified")errors.push(`${id}: Web-63 Release-Scope nicht live verifiziert`);
    }
    if(release&&(scope==="undecided"||item.classification==="unreviewed"))errors.push(`${id}: Noch nicht triagiert`);
  }
  if(release){
    if(list.length!==156)errors.push("Release: erwartet 156 katalogisierte Anforderungen");
    if(summary.new_verified<20)errors.push(`Release: nur ${summary.new_verified} von mindestens 20 neuen/verbesserten live verifizierten Webfunktionen`);
    if(verifiedEpics.size<4)errors.push(`Release: nur ${verifiedEpics.size} von mindestens 4 belegten unabhängigen Produktbereichen`);
    if(provenScreens.size<8)errors.push(`Release: nur ${provenScreens.size} von mindestens 8 dokumentierten visuellen Belegen`);
  }
  return {errors,summary:{...summary,new_epics_verified:verifiedEpics.size,visual_proofs:provenScreens.size}};
}

function main(){
  const file=resolve(process.cwd(),"docs/releases/V63-TITAN-STATUS.json");
  const release=process.argv.includes("--release");
  let result;
  try{result=auditRegistry(JSON.parse(readFileSync(file,"utf8")),{release});}
  catch(error){result={errors:[String(error)],summary:{}};}
  process.stdout.write(JSON.stringify({mode:release?"release-readiness":"inventory-only",automated_check:result.errors.length?"FAIL":"PASS",note:"Automated metadata checks are not evidence authenticity verification; review CI, screenshots, live sources and licensing separately.",...result},null,2)+"\n");
  if(result.errors.length)process.exitCode=1;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))main();
