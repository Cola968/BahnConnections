/** A Google Play launcher must not open a sleeping free web-service origin. */
export type PlayOriginAssessment={ok:boolean;reason:string;origin:string|null};
export function assessPlayOrigin(value:unknown):PlayOriginAssessment{
 const invalid=(reason:string):PlayOriginAssessment=>({ok:false,reason,origin:null});
 if(typeof value!=="string"||!value.trim())return invalid("Es fehlt die produktive HTTPS-Adresse.");
 if(value!==value.trim())return invalid("Die Adresse darf keine Leerzeichen enthalten.");
 let url:URL;
 try{url=new URL(value);}catch{return invalid("Ungültige URL.");}
 if(url.protocol!=="https:")return invalid("Google-Play-Hosting erfordert eine HTTPS-Adresse.");
 if(url.username||url.password||url.port)return invalid("Benutzerdaten und Sonderports sind für den App-Ursprung unzulässig.");
 if(url.pathname!=="/"||url.search||url.hash)return invalid("Nur den App-Ursprung verwenden, keinen Pfad oder Suchparameter.");
 const host=url.hostname.toLowerCase().replace(/\.$/,"");
 if(!host||host==="localhost"||host.endsWith(".localhost")||host==="127.0.0.1"||host==="::1")return invalid("Die App muss unter einer öffentlichen Adresse erreichbar sein.");
 if(host==="onrender.com"||host.endsWith(".onrender.com"))return invalid("Render kann im kostenlosen Tarif einschlafen und eine Hosting-Ladeseite zeigen. Für den Play-Start Cloudflare Workers oder garantiert immer aktives Hosting benutzen.");
 if(host==="chatgpt.site"||host.endsWith(".chatgpt.site"))return invalid("Die bisherige Sites-Origin ist nicht der geplante unabhängige Play-Store-Host.");
 if(host==="github.io"||host.endsWith(".github.io"))return invalid("Die App benötigt serverseitige Fahrplan-APIs; GitHub Pages ist für dieses Deployment ungeeignet.");
 if(!host.includes("."))return invalid("Kein öffentliches Domainformat.");
 return {ok:true,reason:"HTTPS-App-Ursprung ohne Render-Ladeseite vorbereitet.",origin:url.origin};
}
