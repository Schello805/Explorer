"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Layers3, LocateFixed, Map as MapIcon } from "lucide-react";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import { boundsCenter, coordinateToMapPosition, defaultBounds, validBounds, type Bounds } from "@/lib/map-bounds";
import { createStationPinElement } from "@/lib/map-marker";
import type { Station, Tenant } from "@/lib/types";
import { cn } from "@/lib/utils";

type Layer = "map" | "sitePlan";
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
  const markersRef = useRef<Map<string, import("maplibre-gl").Marker>>(new Map());
  const userMarkerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [layer, setLayer] = useState<Layer>("map");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const validStations = useMemo(() => stations.filter(hasCoordinates), [stations]);
  const mapBounds = useMemo(() => validBounds(tenant.map.bounds) ? tenant.map.bounds : null, [tenant.map.bounds]);
  const center = useMemo<[number, number]>(() => mapBounds ? boundsCenter(mapBounds) : hasLngLat(tenant.map.center) ? tenant.map.center : stationCenter(validStations) ?? [10.5605, 49.1643], [mapBounds, tenant.map.center, validStations]);
  const visibleStations = useMemo(() => mapBounds ? validStations.filter((station) => stationWithinBounds(station, mapBounds)) : validStations, [mapBounds, validStations]);
  const zoom = Number.isFinite(tenant.map.zoom) ? tenant.map.zoom : 16;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const markerMap = markersRef.current;
    let cancelled = false;
    let loaded = false;
    let visibleTiles = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!loaded) setFailed(true);
    }, 7000);
    let tileTimer = 0;

    if (!cancelled && containerRef.current) {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: getMapStyle(tenant.map.styleUrl),
        center,
        zoom,
        maxBounds: mapBounds ?? undefined,
        attributionControl: false
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
      map.addControl(new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "© OpenStreetMap-Mitwirkende · OpenFreeMap"
      }), "bottom-left");
      map.on("error", (event) => {
        console.warn("Kartenquelle konnte nicht vollständig geladen werden.", event.error);
      });
      map.on("sourcedata", (event) => {
        if (event.sourceId === "osm" && event.isSourceLoaded) {
          visibleTiles = true;
        }
      });

      map.on("load", () => {
        loaded = true;
        if (getMapStyle(tenant.map.styleUrl) !== rasterMapStyle) {
          visibleTiles = true;
        }
        window.clearTimeout(fallbackTimer);
        setFailed(false);
        map.resize();
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
        if (mapBounds) {
          map.addSource("camp-area", { type: "geojson", data: boundsFeature(mapBounds) });
          map.addLayer({
            id: "camp-area-fill",
            source: "camp-area",
            type: "fill",
            paint: { "fill-color": "#195f4c", "fill-opacity": 0.12 }
          });
          map.addLayer({
            id: "camp-area-outline",
            source: "camp-area",
            type: "line",
            paint: { "line-color": "#195f4c", "line-width": 2, "line-dasharray": [2, 1] }
          });
        }

        if (mapBounds) map.fitBounds(mapBounds, { padding: 48, maxZoom: 18, duration: 0 });
        setReady(true);
        tileTimer = window.setTimeout(() => {
          const canvas = containerRef.current?.querySelector("canvas");
          const hasCanvasSize = Boolean(canvas?.clientWidth && canvas?.clientHeight);
          if (!hasCanvasSize || (!visibleTiles && getMapStyle(tenant.map.styleUrl) === rasterMapStyle)) {
            setFailed(true);
          }
        }, 3500);
      });
      requestAnimationFrame(() => map.resize());
      mapRef.current = map;
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(tileTimer);
      markerMap.forEach((marker) => marker.remove());
      markerMap.clear();
      userMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
    };
  }, [tenant, center, zoom, mapBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visibleIds = new Set(visibleStations.map((station) => station.id));
    markersRef.current.forEach((marker, stationId) => {
      if (!visibleIds.has(stationId)) {
        marker.remove();
        markersRef.current.delete(stationId);
      }
    });
    for (const station of visibleStations) {
      const existingMarker = markersRef.current.get(station.id);
      if (existingMarker) {
        existingMarker.setLngLat([station.longitude, station.latitude]);
        continue;
      }
      const category = tenant.categories.find((item) => item.id === station.categoryId);
      const element = createStationPinElement({ label: station.name, color: category?.color ?? "#195f4c", onClick: () => onSelect(station) });
      const marker = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat([station.longitude, station.latitude])
        .addTo(map);
      markersRef.current.set(station.id, marker);
    }
  }, [ready, tenant.categories, visibleStations, onSelect]);

  useEffect(() => {
    if (!selected || !mapRef.current || !hasCoordinates(selected)) return;
    mapRef.current.flyTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(zoom, 17) });
  }, [selected, zoom]);

  function switchLayer(next: Layer) {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("site-plan")) map.setLayoutProperty("site-plan", "visibility", next === "sitePlan" ? "visible" : "none");
    setLayer(next);
  }

  function locateVisitor() {
    const map = mapRef.current;
    setLocationMessage("");
    if (!map) return;
    if (!("geolocation" in navigator)) {
      setLocationMessage("Dieses Gerät unterstützt keine Standortfreigabe.");
      return;
    }
    if (!window.isSecureContext) {
      setLocationMessage("GPS funktioniert auf iOS und Android nur über HTTPS oder lokal auf localhost.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocating(false);
      setLocationMessage(coords.accuracy > 50 ? `Standort gefunden, Genauigkeit ca. ${Math.round(coords.accuracy)} m.` : "Standort gefunden.");
      map.flyTo({ center: [coords.longitude, coords.latitude], zoom: Math.max(zoom, 18) });
      const element = document.createElement("div");
      element.className = "h-5 w-5 rounded-full border-4 border-white bg-blue-500 shadow-[0_0_0_10px_rgba(59,130,246,.18)]";
      userMarkerRef.current?.remove();
      userMarkerRef.current = new maplibregl.Marker({ element }).setLngLat([coords.longitude, coords.latitude]).addTo(map);
    }, (error) => {
      setLocating(false);
      if (error.code === error.PERMISSION_DENIED) setLocationMessage("Standort wurde nicht freigegeben. Bitte Browser-Berechtigung prüfen.");
      else if (error.code === error.TIMEOUT) setLocationMessage("Standort konnte nicht schnell genug ermittelt werden. Bitte erneut versuchen.");
      else setLocationMessage("Standort konnte nicht ermittelt werden.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30_000 });
  }

  const choices = [
    { id: "map" as const, label: "Karte", icon: MapIcon, available: true },
    { id: "sitePlan" as const, label: "Platzplan", icon: Layers3, available: hasValidSitePlan(tenant.map.sitePlan) }
  ].filter((choice) => choice.available);

  if (failed) return <FallbackMap tenant={tenant} stations={stations} onSelect={onSelect} />;

  return <div className="map-texture relative mt-4 h-[52vh] min-h-[360px] overflow-hidden rounded-[1.5rem] border-4 border-white bg-[#dce8d0] shadow-soft sm:min-h-[440px]">
    <div ref={containerRef} className="absolute inset-0" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-label={`Interaktive Karte von ${tenant.name}`} />
    {!ready && <div className="absolute inset-0 grid place-items-center bg-[#dce8d0] text-sm font-bold text-[#18332b]/55">Karte wird geladen …</div>}
    {choices.length > 1 && <div className="glass absolute left-3 top-3 z-10 flex rounded-xl p-1 shadow-lg">{choices.map((choice) => <button key={choice.id} onClick={() => switchLayer(choice.id)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold", layer === choice.id && "bg-[var(--primary)] text-white")}><choice.icon size={15} />{choice.label}</button>)}</div>}
    <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]">
      <button type="button" onClick={locateVisitor} disabled={!ready || locating} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#18332b] shadow-lg disabled:opacity-60"><LocateFixed size={15} className="mr-1.5 inline" />{locating ? "Standort wird gesucht …" : "Mein Standort"}</button>
      {locationMessage && <p className="mt-2 max-w-xs rounded-xl bg-white/95 px-3 py-2 text-xs font-bold leading-5 text-[#18332b] shadow-lg"><AlertCircle size={14} className="mr-1 inline text-[#c9653d]" />{locationMessage}</p>}
    </div>
  </div>;
}

function FallbackMap({ tenant, stations, onSelect }: { tenant: Tenant; stations: Station[]; onSelect: (station: Station) => void }) {
  const fallbackBounds = validBounds(tenant.map.bounds) ? tenant.map.bounds : defaultBounds(tenant.map.center);
  const fallbackStations = stations.filter((station) => hasCoordinates(station) && stationWithinBounds(station, fallbackBounds));
  return <div className="map-texture relative mt-4 h-[52vh] min-h-[360px] overflow-hidden rounded-[1.5rem] border-4 border-white bg-[#dce8d0] shadow-soft sm:min-h-[440px]" aria-label={`Fallback-Platzplan von ${tenant.name}`}>
    <div className="absolute left-3 top-3 z-10 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-[#18332b] shadow">Offline-Plan</div>
    <StaticTilePreview center={boundsCenter(fallbackBounds)} zoom={16} />
    {fallbackStations.map((station) => <button
      key={station.id}
      onClick={() => onSelect(station)}
      className="absolute z-10 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-[#195f4c] text-white shadow-lg"
      style={projectStation(station, fallbackBounds)}
      aria-label={station.name}
    >
      <MapIcon size={18} />
    </button>)}
  </div>;
}

function StaticTilePreview({ center, zoom }: { center: [number, number]; zoom: number }) {
  const tiles = useMemo(() => staticTiles(center, zoom), [center, zoom]);
  return <div className="absolute inset-0 opacity-90">
    {tiles.map((tile) => <div
      key={`${tile.x}-${tile.y}`}
      className="absolute h-1/3 w-1/3 bg-cover bg-center"
      style={{ left: `${tile.left}%`, top: `${tile.top}%`, backgroundImage: `url(https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png)` }}
    />)}
  </div>;
}

function getMapStyle(styleUrl: string) {
  if (!styleUrl) return rasterMapStyle;
  return styleUrl;
}

function hasCoordinates(station: Station) {
  return Number.isFinite(station.longitude) && Number.isFinite(station.latitude) && (station.longitude !== 0 || station.latitude !== 0);
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

function boundsFeature(bounds: Bounds) {
  const [[west, south], [east, north]] = bounds;
  const coordinates = [[west, north], [east, north], [east, south], [west, south], [west, north]];
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coordinates] }
  };
}

function projectStation(station: Station, bounds: Bounds | null) {
  const position = coordinateToMapPosition(bounds ?? defaultBounds([station.longitude, station.latitude]), [station.longitude, station.latitude]);
  return { left: `${position.x}%`, top: `${position.y}%` };
}

function stationWithinBounds(station: Station, bounds: Bounds) {
  const [[west, south], [east, north]] = bounds;
  return station.longitude >= west && station.longitude <= east && station.latitude >= south && station.latitude <= north;
}

function staticTiles(center: [number, number], zoom: number) {
  const main = lonLatToTile(center[0], center[1], zoom);
  return [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({
    x: main.x + dx,
    y: main.y + dy,
    left: (dx + 1) * 33.333,
    top: (dy + 1) * 33.333
  })));
}

function lonLatToTile(longitude: number, latitude: number, zoom: number) {
  const scale = 2 ** zoom;
  const x = Math.floor((longitude + 180) / 360 * scale);
  const radians = latitude * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2 * scale);
  return { x, y };
}
