"use client";
import {useEffect,useRef,useState} from "react";
export function useLeafletMap(){
  const [mapReady,setMapReady]=useState(false);
  const [mapZoom,setMapZoom]=useState(6);
  const [mapViewportToken,setMapViewportToken]=useState(0);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const overlayRef = useRef<import("leaflet").LayerGroup | null>(null);
  const stationLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const routeRendererRef = useRef<import("leaflet").Canvas | null>(null);
  const liveLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const locationLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const walkingLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  useEffect(() => {
    let active = true;
    async function initialiseMap() {
      if (!mapElementRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (!active || !mapElementRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapElementRef.current, { zoomControl: false, minZoom: 4, maxBoundsViscosity: 0.35 }).setView([51.15, 10.35], 6);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18, updateWhenIdle:true, updateWhenZooming:false, attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      map.createPane("rail-routes").style.zIndex = "390";
      routeRendererRef.current = L.canvas({ pane:"rail-routes", padding:.2 });
      overlayRef.current = L.layerGroup().addTo(map);
      stationLayerRef.current = L.layerGroup().addTo(map);
      liveLayerRef.current = L.layerGroup().addTo(map);
      walkingLayerRef.current = L.layerGroup().addTo(map);
      locationLayerRef.current = L.layerGroup().addTo(map);
      const syncViewport = () => {
        setMapZoom(map.getZoom());
        setMapViewportToken((value) => value + 1);
      };
      map.on("movestart", () => mapElementRef.current?.closest(".app-shell")?.classList.add("map-moving"));
      map.on("moveend", () => { syncViewport(); mapElementRef.current?.closest(".app-shell")?.classList.remove("map-moving"); });
      mapRef.current = map;
      setMapReady(true);
    }
    initialiseMap();
    return () => { active = false; mapRef.current?.remove(); mapRef.current = null; };
  }, []);
  return {mapReady,mapZoom,mapViewportToken,mapElementRef,mapRef,overlayRef,stationLayerRef,routeRendererRef,liveLayerRef,locationLayerRef,walkingLayerRef,leafletRef};
}
