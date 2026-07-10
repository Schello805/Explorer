"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers3, Map as MapIcon, Satellite } from "lucide-react";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import type { Station, Tenant } from "@/lib/types";
import { cn } from "@/lib/utils";

type Layer = "map" | "aerial" | "sitePlan";
const rasterMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap-Mitwirkende"
    }
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }]
};

export function CampMap({
  tenant,
  stations,
  selected,
  onSelect
}: {
  tenant: Tenant;
  stations: Station[];
  selected: Station | null;
  onSelect: (station: Station) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const [layer, setLayer] = useState<Layer>("map");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const validStations = useMemo(() => stations.filter(hasCoordinates), [stations]);
  const center = useMemo<[number, number]>(() => hasLngLat(tenant.map.center) ? tenant.map.center : stationCenter(validStations) ?? [10.5605, 49.1643], [tenant.map.center, validStations]);
  const zoom = Number.isFinite(tenant.map.zoom) ? tenant.map.zoom : 16;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let loaded = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!loaded) setFailed(true);
    }, 7000);

    if (!cancelled && containerRef.current) {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: getMapStyle(tenant.map.styleUrl),
        center,
        zoom,
        attributionControl: false
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.addControl(new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }), "bottom-right");
      map.addControl(new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "© OpenStreetMap-Mitwirkende · OpenFreeMap"
      }), "bottom-left");
      map.on("error", (event) => {
        console.warn("Kartenquelle konnte nicht vollständig geladen werden.", event.error);
      });

      map.on("load", () => {
        loaded = true;
        window.clearTimeout(fallbackTimer);
        setFailed(false);
        if (tenant.map.aerialTiles?.length) {
          map.addSource("aerial", {
            type: "raster",
            tiles: tenant.map.aerialTiles,
            tileSize: 256,
            attribution: tenant.map.aerialAttribution
          });
          map.addLayer({ id: "aerial", source: "aerial", type: "raster", layout: { visibility: "none" } });
        }
        const sitePlan = tenant.map.sitePlan;
        if (hasValidSitePlan(sitePlan)) {
          map.addSource("site-plan", {
            type: "image",
            url: sitePlan.imageUrl,
            coordinates: sitePlan.coordinates
          });
          map.addLayer({
            id: "site-plan",
            source: "site-plan",
            type: "raster",
            paint: { "raster-opacity": 0.92 }
          });
        }

        markersRef.current = validStations.map((station) => {
          const element = document.createElement("button");
          element.className = "grid h-11 w-11 place-items-center rounded-full border-4 border-white bg-[#195f4c] text-white shadow-lg transition hover:scale-110";
          element.setAttribute("aria-label", station.name);
          element.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>';
          element.addEventListener("click", () => onSelect(station));
          return new maplibregl.Marker({ element })
            .setLngLat([station.longitude, station.latitude])
            .addTo(map);
        });
        setReady(true);
      });
      mapRef.current = map;
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      markersRef.current.forEach((marker) => marker.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [tenant, validStations, onSelect, center, zoom]);

  useEffect(() => {
    if (!selected || !mapRef.current || !hasCoordinates(selected)) return;
    mapRef.current.flyTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(zoom, 17) });
  }, [selected, zoom]);

  function switchLayer(next: Layer) {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("aerial")) map.setLayoutProperty("aerial", "visibility", next === "aerial" ? "visible" : "none");
    if (map.getLayer("site-plan")) map.setLayoutProperty("site-plan", "visibility", next === "sitePlan" ? "visible" : "none");
    setLayer(next);
  }

  const choices = [
    { id: "map" as const, label: "Karte", icon: MapIcon, available: true },
    { id: "aerial" as const, label: "Luftbild", icon: Satellite, available: Boolean(tenant.map.aerialTiles?.length) },
    { id: "sitePlan" as const, label: "Platzplan", icon: Layers3, available: hasValidSitePlan(tenant.map.sitePlan) }
  ].filter((choice) => choice.available);

  if (failed) return <FallbackMap tenant={tenant} stations={stations} onSelect={onSelect} />;

  return <div className="relative mt-4 h-[52vh] min-h-[360px] overflow-hidden rounded-[1.5rem] border-4 border-white bg-[#dce8d0] shadow-soft sm:min-h-[440px]">
    <div ref={containerRef} className="absolute inset-0" aria-label={`Interaktive Karte von ${tenant.name}`} />
    {!ready && <div className="absolute inset-0 grid place-items-center bg-[#dce8d0] text-sm font-bold text-[#18332b]/55">Karte wird geladen …</div>}
    {choices.length > 1 && <div className="glass absolute left-3 top-3 z-10 flex rounded-xl p-1 shadow-lg">{choices.map((choice) => <button key={choice.id} onClick={() => switchLayer(choice.id)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold", layer === choice.id && "bg-[var(--primary)] text-white")}><choice.icon size={15} />{choice.label}</button>)}</div>}
  </div>;
}

function FallbackMap({ tenant, stations, onSelect }: { tenant: Tenant; stations: Station[]; onSelect: (station: Station) => void }) {
  return <div className="map-texture relative mt-4 h-[52vh] min-h-[360px] overflow-hidden rounded-[1.5rem] border-4 border-white bg-[#dce8d0] shadow-soft sm:min-h-[440px]" aria-label={`Fallback-Platzplan von ${tenant.name}`}>
    <div className="absolute left-3 top-3 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-[#18332b] shadow">Offline-Plan</div>
    {stations.map((station) => <button
      key={station.id}
      onClick={() => onSelect(station)}
      className="absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-[#195f4c] text-white shadow-lg"
      style={{ left: `${station.position.x}%`, top: `${station.position.y}%` }}
      aria-label={station.name}
    >
      <MapIcon size={18} />
    </button>)}
  </div>;
}

function getMapStyle(styleUrl: string) {
  if (!styleUrl || styleUrl.includes("openfreemap.org")) return rasterMapStyle;
  return styleUrl;
}

function hasCoordinates(station: Station) {
  return Number.isFinite(station.longitude) && Number.isFinite(station.latitude);
}

function hasLngLat(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

function stationCenter(stations: Station[]): [number, number] | null {
  if (!stations.length) return null;
  const totals = stations.reduce((sum, station) => ({
    longitude: sum.longitude + station.longitude,
    latitude: sum.latitude + station.latitude
  }), { longitude: 0, latitude: 0 });
  return [totals.longitude / stations.length, totals.latitude / stations.length];
}

function hasValidSitePlan(sitePlan: Tenant["map"]["sitePlan"]): sitePlan is NonNullable<Tenant["map"]["sitePlan"]> {
  return Boolean(sitePlan?.imageUrl && sitePlan.coordinates.every(hasLngLat));
}
