"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import { boundsCenter, boundsCorners, defaultBounds, validBounds } from "@/lib/map-bounds";
import { createStationPinElement } from "@/lib/map-marker";
import type { Category, Station, Tenant } from "@/lib/types";

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

export function StationTemplateMap({
  stations,
  categories,
  mapConfig,
  onEdit,
  onDropTemplate
}: {
  stations: Station[];
  categories: Category[];
  mapConfig: Tenant["map"];
  onEdit: (station: Station) => void;
  onDropTemplate: (stationId: string, coordinate: { longitude: number; latitude: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const bounds = useMemo(() => validBounds(mapConfig.bounds) ? mapConfig.bounds : defaultBounds(mapConfig.center), [mapConfig.bounds, mapConfig.center]);
  const center = useMemo(() => boundsCenter(bounds), [bounds]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterMapStyle,
      center,
      zoom: Math.max(mapConfig.zoom, 15),
      attributionControl: false
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: "© OpenStreetMap-Mitwirkende · OpenFreeMap"
    }), "bottom-left");
    map.on("load", () => {
      map.resize();
      syncCampArea(map, bounds);
      syncSitePlan(map, mapConfig.sitePlan);
      map.fitBounds(bounds, { padding: 55, maxZoom: 18, duration: 0 });
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [bounds, center, mapConfig.sitePlan, mapConfig.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncCampArea(map, bounds);
    syncSitePlan(map, mapConfig.sitePlan);
    map.fitBounds(bounds, { padding: 55, maxZoom: 18, duration: 0 });
  }, [bounds, mapConfig.sitePlan]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = stations.filter((station) => !station.isTemplate && hasCoordinates(station)).map((station) => {
      const category = categories.find((item) => item.id === station.categoryId);
      const element = createStationPinElement({ label: station.name, color: category?.color ?? "#173c32", onClick: () => onEdit(station) });
      return new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([station.longitude, station.latitude]).addTo(map);
    });
  }, [categories, onEdit, stations]);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const map = mapRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    const stationId = event.dataTransfer.getData("text/plain");
    if (!map || !rect || !stationId) return;
    const point = map.unproject([event.clientX - rect.left, event.clientY - rect.top]);
    onDropTemplate(stationId, {
      longitude: Number(point.lng.toFixed(6)),
      latitude: Number(point.lat.toFixed(6))
    });
  }

  return <div onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} className="relative min-h-[360px] overflow-hidden rounded-2xl border-4 border-white bg-[#dce9cf] shadow-inner">
    <div ref={containerRef} className="absolute inset-0" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#173c32] shadow-sm">Echte Karte / Platzplan</div>
    <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-xl bg-white/90 p-3 text-xs leading-5 text-black/60 shadow-sm">Tipp: Vorlage hierher ziehen. Station anklicken zum Bearbeiten.</div>
  </div>;
}

function syncCampArea(map: import("maplibre-gl").Map, bounds: [[number, number], [number, number]]) {
  const data = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [[...boundsCorners(bounds), boundsCorners(bounds)[0]]] }
  };
  const source = map.getSource("admin-camp-area") as import("maplibre-gl").GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource("admin-camp-area", { type: "geojson", data });
  map.addLayer({ id: "admin-camp-area-fill", type: "fill", source: "admin-camp-area", paint: { "fill-color": "#195f4c", "fill-opacity": 0.16 } });
  map.addLayer({ id: "admin-camp-area-outline", type: "line", source: "admin-camp-area", paint: { "line-color": "#195f4c", "line-width": 3, "line-dasharray": [2, 1] } });
}

function syncSitePlan(map: import("maplibre-gl").Map, sitePlan: Tenant["map"]["sitePlan"]) {
  if (!sitePlan?.imageUrl || !validSitePlanCoordinates(sitePlan.coordinates)) return;
  if (map.getLayer("admin-site-plan")) return;
  map.addSource("admin-site-plan", { type: "image", url: sitePlan.imageUrl, coordinates: sitePlan.coordinates });
  map.addLayer({ id: "admin-site-plan", source: "admin-site-plan", type: "raster", paint: { "raster-opacity": 0.86 } });
}

function validSitePlanCoordinates(value: unknown): value is [[number, number], [number, number], [number, number], [number, number]] {
  return Array.isArray(value) && value.length === 4 && value.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
}

function hasCoordinates(station: Station) {
  return Number.isFinite(station.longitude) && Number.isFinite(station.latitude) && station.longitude !== 0 && station.latitude !== 0;
}
