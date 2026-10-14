/** MOTIS v6 uses plain text; older GTFS payloads use translation objects. */
export type TransitAlert={header?:string;description?:string;headerText?:unknown;descriptionText?:unknown;effect?:string|number};
export function transitAlertText(value:unknown,max=6000):string {
 if(typeof value==='string')return value.trim().replace(/\s+/g,' ').slice(0,max);
 if(!value||typeof value!=='object'||Array.isArray(value))return '';
 const translations=(value as {translation?:unknown}).translation;
 if(!Array.isArray(translations))return '';
 const usable=translations.filter((item):item is {text:string;language?:string}=>Boolean(item&&typeof item==='object'&&typeof item.text==='string'&&item.text.trim()));
 const selected=usable.find(item=>typeof item.language==='string'&&/^de(?:-|$)/i.test(item.language))??usable[0];
 return selected?transitAlertText(selected.text,max):'';
}
export function transitAlerts(...values:unknown[]):TransitAlert[] {
 return values.flatMap(value=>Array.isArray(value)?value.filter((item):item is TransitAlert=>Boolean(item&&typeof item==='object'&&!Array.isArray(item))):[]);
}
export function transitAlertContent(alert:TransitAlert){
 const detail=transitAlertText(alert.description)||transitAlertText(alert.descriptionText);
 return {header:transitAlertText(alert.header,360)||transitAlertText(alert.headerText,360)||detail.slice(0,360),detail};
}
