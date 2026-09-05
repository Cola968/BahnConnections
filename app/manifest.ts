import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:"BahnConnections – Live-Fahrplan und Bahnkarte",
    short_name:"BahnConnections",
    description:"Live-Abfahrten, vollständige Halte und exakte Fahrtverläufe für Fernverkehr, Regio, S- und U-Bahn.",
    id:"/",
    start_url:"/",
    scope:"/",
    display:"standalone",
    background_color:"#f3f4f5",
    theme_color:"#ec0016",
    lang:"de-DE",
    orientation:"any",
    categories:["travel","navigation","utilities"],
    shortcuts:[
      { name:"Bahnkarte öffnen", short_name:"Karte", url:"/?source=pwa" },
      { name:"App-Hilfe", short_name:"Hilfe", url:"/install?source=pwa" },
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
