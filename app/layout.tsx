import type { Metadata, Viewport } from "next";
import "@glass-sdk/liquid-glass/styles.css";
import "./globals.css";
import "./styles/tokens.css";
import "./styles/controls.css";
import "./styles/workspace.css";
import "./styles/transport.css";
import "./desktop-workspace.css";
import "./styles/liquid-glass.css";
import "./styles/profile.css";
import "./styles/content-layout.css";
import "./styles/designer-v48.css";
import "./styles/v49-ui.css";
import "./styles/material-surfaces.css";
import "./styles/station-sheet.css";
import "./styles/live-map.css";
import "./styles/planner.css";
import "./styles/navigation.css";
import "./styles/v52-polish.css";
import "./styles/v53-mobile-glass.css";
import "./styles/v53-desktop-usability.css";
import "./styles/v54-mobile-refine.css";
import "./styles/v54-train-inspector.css";
import "./styles/v55-train-cockpit.css";
import "./styles/v56-experience.css";
import "./styles/v56-feature-polish.css";
import "./styles/v56-travel-tools.css";
import "./styles/v56-1-interactions.css";
import "./styles/v57-station-radar.css";
import "./styles/v57-2-turnaround.css";
import "./styles/v58-liquid-relaunch.css";
import "./styles/v58-mobile-sheet-repair.css";
import "./styles/v58-mobile-layout-hotfix.css";
import "./styles/v60-motion.css";
import "./styles/v60-premium.css";
import { PwaRegister } from "./pwa-register";
import { BrowserChrome } from "./browser-chrome";

// Keep preview, installed PWA and future Play Store origins aligned with the real host.
// Without an explicit HTTPS origin, framework metadata should use the request host.
const configuredAppOrigin=process.env.NEXT_PUBLIC_APP_ORIGIN;
const configuredMetadataBase=(()=>{
 if(!configuredAppOrigin)return undefined;
 try{
  const url=new URL(configuredAppOrigin);
  return url.protocol==="https:"&&!url.username&&!url.password&&url.pathname==="/"&&!url.search&&!url.hash?url:undefined;
 }catch{return undefined;}
})();

export const metadata: Metadata = {
  metadataBase: configuredMetadataBase,
  title: "BahnConnections – Bahnnetz, Live-Züge & Bahnhofstafeln",
  description: "Interaktive Bahnkarte mit exakten Fahrtverläufen, Live-Abfahrten und vollständigen Halten für Fernverkehr, Regio, S- und U-Bahn.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable:true, statusBarStyle:"default", title:"BahnConnections" },
  icons: { icon:[{ url:"/app-icon.svg", type:"image/svg+xml" },{ url:"/app-icon-192.png", sizes:"192x192", type:"image/png" }], apple:"/app-icon-192.png" },
  openGraph: {
    title: "BahnConnections",
    description: "Live-Züge, exakte Fahrtverläufe und Bahnhofstafeln für Fernverkehr, Regio, S- und U-Bahn.",
    type: "website",
    locale: "de_DE",
    images: [{ url: "/og.png", width: 1792, height: 1024, alt: "BahnConnections – Fernverkehr direkt entdecken" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BahnConnections",
    description: "Live-Züge, exakte Fahrtverläufe und Bahnhofstafeln für Fernverkehr, Regio, S- und U-Bahn.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width:"device-width",
  initialScale:1,
  viewportFit:"cover",
  themeColor:"#e7eff0",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}<PwaRegister /><BrowserChrome /></body></html>;
}
