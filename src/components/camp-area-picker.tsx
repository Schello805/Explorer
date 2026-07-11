"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, MapPinned, RotateCcw } from "lucide-react";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import type { Tenant } from "@/lib/types";

const openFreeMapStyle = "https://tiles.openfreemap.org/styles/liberty";
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

type Bounds = [[number, number], [number, number]];

export function CampAreaPicker({ mapConfig, onChange }: {
  mapConfig: Tenant["map"];
  onChange: (mapConfig: Tenant["map"]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const latestMapConfigRef = useRef(mapConfig);
  const onChangeRef = useRef(onChange);
  const [message, setMessage] = useState("");
  const bounds = useMemo(() => validBounds(mapConfig.bounds) ? mapConfig.bounds : defaultBounds(mapConfig.center), [mapConfig.bounds, mapConfig.center]);
  const initialBoundsRef = useRef(bounds);
  const initialCenterRef = useRef(mapConfig.center);
  const initialZoomRef = useRef(mapConfig.zoom);
  const initialStyleUrlRef = useRef(mapConfig.styleUrl);

  useEffect(() => {
    latestMapConfigRef.current = mapConfig;
    onChangeRef.current = onChange;
  }, [mapConfig, onChange]);

  const commitBounds = useCallback((nextBounds: Bounds, nextMessage: string) => {
    const center = boundsCenter(nextBounds);
    const map = mapRef.current;
    const nextZoom = map ? Math.round(map.getZoom() * 10) / 10 : latestMapConfigRef.current.zoom;
    onChangeRef.current({
      ...latestMapConfigRef.current,
      styleUrl: openFreeMapStyle,
      configured: true,
      center,
      zoom: nextZoom,
      bounds: nextBounds
    });
    setMessage(nextMessage);
  }, []);

  const renderMarkers = useCallback((map: import("maplibre-gl").Map, nextBounds: Bounds) => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = boundsCorners(nextBounds).map((corner, index) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#195f4c] text-white shadow-lg";
      element.setAttribute("aria-label", `Ecke ${index + 1} verschieben`);
      element.innerHTML = '<span style="font-size:14px;font-weight:800;line-height:1">+</span>';
      const marker = new maplibregl.Marker({ element, draggable: true })
        .setLngLat(corner)
        .addTo(map);
      marker.on("dragend", () => {
        const movedPoint = marker.getLngLat();
        const corners = boundsCorners(nextBounds);
        corners[index] = [movedPoint.lng, movedPoint.lat];
        commitBounds(boundsFromCorners(corners), "Fläche aktualisiert.");
      });
      return marker;
    });
  }, [commitBounds]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(initialStyleUrlRef.current),
      center: initialCenterRef.current,
      zoom: Math.max(initialZoomRef.current, 15),
      attributionControl: false
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: "© OpenStreetMap-Mitwirkende · OpenFreeMap"
    }), "bottom-left");
    map.on("load", () => {
      map.resize();
      map.addSource("camp-area", { type: "geojson", data: boundsFeature(initialBoundsRef.current) });
      map.addLayer({
        id: "camp-area-fill",
        type: "fill",
        source: "camp-area",
        paint: { "fill-color": "#195f4c", "fill-opacity": 0.16 }
      });
      map.addLayer({
        id: "camp-area-outline",
        type: "line",
        source: "camp-area",
        paint: { "line-color": "#195f4c", "line-width": 3, "line-dasharray": [2, 1] }
      });
      renderMarkers(map, initialBoundsRef.current);
      fitBounds(map, initialBoundsRef.current);
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [renderMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    updateAreaSource(map, bounds);
    renderMarkers(map, bounds);
  }, [bounds, renderMarkers]);

  function useCurrentView() {
    const map = mapRef.current;
    if (!map) return;
    const visibleBounds = map.getBounds();
    const west = visibleBounds.getWest();
    const east = visibleBounds.getEast();
    const south = visibleBounds.getSouth();
    const north = visibleBounds.getNorth();
    const longitudePadding = (east - west) * 0.18;
    const latitudePadding = (north - south) * 0.18;
    commitBounds(normalizeBounds([
      [west + longitudePadding, south + latitudePadding],
      [east - longitudePadding, north - latitudePadding]
    ]), "Aktueller Kartenausschnitt wurde als Campingplatzfläche gesetzt.");
  }

  function resetArea() {
    const nextBounds = defaultBounds(latestMapConfigRef.current.center);
    commitBounds(nextBounds, "Fläche wurde auf den Kartenmittelpunkt zurückgesetzt.");
    if (mapRef.current) fitBounds(mapRef.current, nextBounds);
  }

  return <section className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-bold">Campingplatzfläche markieren</p>
        <p className="mt-1 text-xs font-normal leading-5 text-black/50">Karte auf den Platz verschieben, Rechteck setzen und die Ecken fein ausrichten.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useCurrentView} className="rounded-xl bg-[#173c32] px-3 py-2 text-xs font-bold text-white"><Crosshair size={15} className="mr-1.5 inline" />Ausschnitt übernehmen</button>
        <button type="button" onClick={resetArea} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold"><RotateCcw size={15} className="mr-1.5 inline" />Zurücksetzen</button>
      </div>
    </div>
    <div className="relative h-[420px] min-h-[55vh] overflow-hidden rounded-2xl border border-black/10 bg-[#dce8d0]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-xl bg-white/95 px-3 py-2 text-xs font-bold leading-5 shadow"><MapPinned size={14} className="mr-1 inline" /> OpenFreeMap-Basiskarte · grünes Rechteck = öffentlicher Platzbereich</div>
    </div>
    <div className="grid gap-3 rounded-xl bg-[#f7f7f4] p-3 text-xs leading-5 text-black/60 sm:grid-cols-3">
      <p><strong>Mittelpunkt:</strong><br />{boundsCenter(bounds).map((value) => value.toFixed(6)).join(", ")}</p>
      <p><strong>Südwest:</strong><br />{bounds[0].map((value) => value.toFixed(6)).join(", ")}</p>
      <p><strong>Nordost:</strong><br />{bounds[1].map((value) => value.toFixed(6)).join(", ")}</p>
    </div>
    {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">{message}</p>}
  </section>;
}

function getMapStyle(styleUrl: string) {
  if (!styleUrl) return rasterMapStyle;
  return styleUrl;
}

function updateAreaSource(map: import("maplibre-gl").Map, bounds: Bounds) {
  const source = map.getSource("camp-area") as import("maplibre-gl").GeoJSONSource | undefined;
  source?.setData(boundsFeature(bounds));
}

function boundsFeature(bounds: Bounds) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [[...boundsCorners(bounds), boundsCorners(bounds)[0]]]
    }
  };
}

function boundsCorners(bounds: Bounds): [number, number][] {
  const [[west, south], [east, north]] = bounds;
  return [[west, north], [east, north], [east, south], [west, south]];
}

function boundsFromCorners(corners: [number, number][]): Bounds {
  const longitudes = corners.map((point) => point[0]);
  const latitudes = corners.map((point) => point[1]);
  return normalizeBounds([
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)]
  ]);
}

function normalizeBounds(bounds: Bounds): Bounds {
  const west = Math.max(-180, Math.min(bounds[0][0], bounds[1][0]));
  const east = Math.min(180, Math.max(bounds[0][0], bounds[1][0]));
  const south = Math.max(-90, Math.min(bounds[0][1], bounds[1][1]));
  const north = Math.min(90, Math.max(bounds[0][1], bounds[1][1]));
  return [[west, south], [east, north]];
}

function defaultBounds(center: [number, number]): Bounds {
  return normalizeBounds([
    [center[0] - 0.004, center[1] - 0.0025],
    [center[0] + 0.004, center[1] + 0.0025]
  ]);
}

function boundsCenter(bounds: Bounds): [number, number] {
  return [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
}

function validBounds(value: unknown): value is Bounds {
  return Array.isArray(value) && value.length === 2 && value.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
}

function fitBounds(map: import("maplibre-gl").Map, bounds: Bounds) {
  map.fitBounds(bounds, { padding: 60, maxZoom: 18, duration: 0 });
}
