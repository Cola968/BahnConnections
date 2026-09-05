import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./desktop-workspace.css";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL("https://bahnconnections-de.a-stad.chatgpt.site"),
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
  themeColor:"#ec0016",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}<PwaRegister /></body></html>;
}
