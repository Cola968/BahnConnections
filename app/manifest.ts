import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:"BahnConnections Pulse – deine Live-Bahnreise",
    short_name:"BahnConnections",
    description:"Pulse begleitet deine aktive Bahnreise mit Live-Fahrt, Anschlusswächter und persönlichem Passport.",
    id:"/pulse",
    start_url:"/pulse?source=pwa",
    scope:"/",
    display:"standalone",
    background_color:"#f3f4f5",
    theme_color:"#ec0016",
    lang:"de-DE",
    orientation:"any",
    categories:["travel","navigation","utilities"],
    shortcuts:[
      { name:"Meine Fahrt", short_name:"Pulse", url:"/pulse?source=pwa" },
      { name:"Passport", short_name:"Passport", url:"/passport?source=pwa" },
      { name:"Atlas öffnen", short_name:"Atlas", url:"/?source=pwa" },
    ],
    icons:[
      { src:"/app-icon-192.png", sizes:"192x192", type:"image/png", purpose:"any" },
      { src:"/app-icon-512.png", sizes:"512x512", type:"image/png", purpose:"any" },
      { src:"/app-icon-maskable-512.png", sizes:"512x512", type:"image/png", purpose:"maskable" },
      { src:"/app-icon.svg", sizes:"any", type:"image/svg+xml", purpose:"any" },
      { src:"/app-icon-maskable.svg", sizes:"any", type:"image/svg+xml", purpose:"maskable" },
    ],
  };
}
