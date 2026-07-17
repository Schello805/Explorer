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
  positioningStationName,
  onEdit,
  onDropTemplate,
  onPositionStation,
  onMoveStation
}: {
  stations: Station[];
  categories: Category[];
  mapConfig: Tenant["map"];
  positioningStationName?: string;
  onEdit: (station: Station) => void;
  onDropTemplate: (stationId: string, coordinate: { longitude: number; latitude: number }) => void;
  onPositionStation?: (coordinate: { longitude: number; latitude: number }) => void;
  onMoveStation: (station: Station, coordinate: { longitude: number; latitude: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<Map<string, import("maplibre-gl").Marker>>(new Map());
  const bounds = useMemo(() => validBounds(mapConfig.bounds) ? mapConfig.bounds : defaultBounds(mapConfig.center), [mapConfig.bounds, mapConfig.center]);
  const center = useMemo(() => boundsCenter(bounds), [bounds]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const markerMap = markersRef.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterMapStyle,
      center,
      zoom: Math.max(mapConfig.zoom, 15),
      maxBounds: bounds,
      dragPan: false,
      scrollZoom: false,
      boxZoom: false,
      doubleClickZoom: false,
      keyboard: false,
      attributionControl: false
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: "© OpenStreetMap-Mitwirkende · OpenFreeMap"
    }), "bottom-left");
    map.on("load", () => {
      map.resize();
      lockMapInteractions(map, bounds);
      syncCampArea(map, bounds);
      syncSitePlan(map, mapConfig.sitePlan);
      fitAndLockBounds(map, bounds);
    });
    mapRef.current = map;
    return () => {
      markerMap.forEach((marker) => marker.remove());
      markerMap.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [bounds, center, mapConfig.sitePlan, mapConfig.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncCampArea(map, bounds);
    syncSitePlan(map, mapConfig.sitePlan);
    lockMapInteractions(map, bounds);
    fitAndLockBounds(map, bounds);
  }, [bounds, mapConfig.sitePlan]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = onPositionStation ? "crosshair" : "";
    const handleClick = (event: maplibregl.MapMouseEvent) => {
      if (!onPositionStation) return;
      onPositionStation({
        longitude: Number(event.lngLat.lng.toFixed(6)),
        latitude: Number(event.lngLat.lat.toFixed(6))
      });
    };
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
      map.getCanvas().style.cursor = "";
    };
  }, [onPositionStation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const visibleStations = stations.filter((station) => !station.isTemplate && hasCoordinates(station));
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
      const category = categories.find((item) => item.id === station.categoryId);
      const element = createStationPinElement({ label: station.name, color: category?.color ?? "#173c32", onClick: () => onEdit(station) });
      const marker = new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([station.longitude, station.latitude]).addTo(map);
      enableMarkerPointerDrag(map, marker, element, station, onMoveStation);
      markersRef.current.set(station.id, marker);
    }
  }, [categories, onEdit, onMoveStation, stations]);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const map = mapRef.current;
    const rect = map?.getCanvasContainer().getBoundingClientRect();
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
    <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#173c32] shadow-sm">Fixierter Platz-Ausschnitt</div>
    {positioningStationName && <div className="pointer-events-none absolute left-4 right-4 top-16 rounded-xl bg-[#173c32] p-3 text-sm font-bold text-white shadow-lg">Positioniermodus aktiv: Klicke auf die neue Stelle für „{positioningStationName}“.</div>}
    <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-xl bg-white/90 p-3 text-xs leading-5 text-black/60 shadow-sm">{positioningStationName ? "Karte anklicken zum Speichern. Abbrechen über die Stationsliste." : "Tipp: Vorlage hierher ziehen. Bestehende Marker direkt verschieben oder per „Position setzen“ exakt platzieren."}</div>
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

function lockMapInteractions(map: import("maplibre-gl").Map, bounds: [[number, number], [number, number]]) {
  map.setMaxBounds(bounds);
  map.dragPan.disable();
  map.scrollZoom.disable();
  map.boxZoom.disable();
  map.doubleClickZoom.disable();
  map.keyboard.disable();
  map.touchZoomRotate.disable();
}

function fitAndLockBounds(map: import("maplibre-gl").Map, bounds: [[number, number], [number, number]]) {
  map.setMinZoom(0);
  map.setMaxZoom(24);
  map.fitBounds(bounds, { padding: 55, maxZoom: 18, duration: 0 });
  const fixedZoom = map.getZoom();
  map.setMinZoom(fixedZoom);
  map.setMaxZoom(fixedZoom);
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

function enableMarkerPointerDrag(
  map: import("maplibre-gl").Map,
  marker: import("maplibre-gl").Marker,
  element: HTMLElement,
  station: Station,
  onMoveStation: (station: Station, coordinate: { longitude: number; latitude: number }) => void
) {
  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    startMarkerDrag(map, marker, element, station, onMoveStation, event.clientX, event.clientY, "pointer");
  }, { capture: true });
  element.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || element.classList.contains("platzguide-station-pin--dragging")) return;
    event.preventDefault();
    event.stopPropagation();
    startMarkerDrag(map, marker, element, station, onMoveStation, event.clientX, event.clientY, "mouse");
  }, { capture: true });
}

function startMarkerDrag(
  map: import("maplibre-gl").Map,
  marker: import("maplibre-gl").Marker,
  element: HTMLElement,
  station: Station,
  onMoveStation: (station: Station, coordinate: { longitude: number; latitude: number }) => void,
  startX: number,
  startY: number,
  eventType: "pointer" | "mouse"
) {
  const start = { x: startX, y: startY };
  const rect = map.getCanvasContainer().getBoundingClientRect();
  const anchor = map.project(marker.getLngLat());
  const grabOffset = { x: start.x - rect.left - anchor.x, y: start.y - rect.top - anchor.y };
  let moved = false;
  map.dragPan.disable();
  element.dataset.dragged = "false";
  element.classList.add("platzguide-station-pin--dragging");

  const move = (moveEvent: PointerEvent | MouseEvent) => {
    const distance = Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y);
    if (distance > 3) {
      moved = true;
      element.dataset.dragged = "true";
    }
    if (!moved) return;
    const rect = map.getCanvasContainer().getBoundingClientRect();
    const point = map.unproject([
      moveEvent.clientX - rect.left - grabOffset.x,
      moveEvent.clientY - rect.top - grabOffset.y
    ]);
    marker.setLngLat(point);
  };

  const up = () => {
    window.removeEventListener(eventType === "pointer" ? "pointermove" : "mousemove", move);
    window.removeEventListener(eventType === "pointer" ? "pointerup" : "mouseup", up);
    map.dragPan.disable();
    element.classList.remove("platzguide-station-pin--dragging");
    if (!moved) return;
    const point = marker.getLngLat();
    onMoveStation(station, {
      longitude: Number(point.lng.toFixed(6)),
      latitude: Number(point.lat.toFixed(6))
    });
    window.setTimeout(() => {
      element.dataset.dragged = "false";
    }, 0);
  };

  window.addEventListener(eventType === "pointer" ? "pointermove" : "mousemove", move);
  window.addEventListener(eventType === "pointer" ? "pointerup" : "mouseup", up, { once: true });
}
