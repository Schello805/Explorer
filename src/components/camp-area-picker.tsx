"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Crosshair, HelpCircle, MapPinned, RotateCcw, Search } from "lucide-react";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import { boundsCenter, boundsCorners, defaultBounds, defaultMapStyleUrl, normalizeBounds, resizeBoundsFromCorner, validBounds, type Bounds } from "@/lib/map-bounds";
import type { Tenant } from "@/lib/types";

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

type GeocodeResult = {
  label: string;
  center: [number, number];
  bounds?: Bounds;
};

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
  const [addressQuery, setAddressQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
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
      styleUrl: latestMapConfigRef.current.styleUrl || defaultMapStyleUrl,
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
        commitBounds(resizeBoundsFromCorner(nextBounds, index, [movedPoint.lng, movedPoint.lat]), "Fläche aktualisiert.");
      });
      return marker;
    });
  }, [commitBounds]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    let fallbackApplied = false;
    let loaded = false;
    const map = new maplibregl.Map({
      container,
      style: getMapStyle(initialStyleUrlRef.current),
      center: initialCenterRef.current,
      zoom: Math.max(initialZoomRef.current, 15),
      attributionControl: false,
      interactive: true,
      dragPan: true,
      scrollZoom: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
      keyboard: true
    });
    container.style.pointerEvents = "auto";
    container.style.touchAction = "none";
    map.getCanvas().style.pointerEvents = "auto";
    map.getCanvas().style.touchAction = "none";
    function applyRasterFallback() {
      if (fallbackApplied) return;
      fallbackApplied = true;
      map.setStyle(rasterMapStyle);
      setMessage("Kartenstil konnte nicht geladen werden. Stabile OSM-Rasterkarte wurde aktiviert.");
    }
    const fallbackTimer = window.setTimeout(() => {
      if (!loaded) applyRasterFallback();
    }, 4000);
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: "© OpenStreetMap-Mitwirkende · OpenFreeMap"
    }), "bottom-left");
    map.on("error", (event) => {
      console.warn("Kartenstil konnte nicht vollständig geladen werden.", event.error);
      applyRasterFallback();
    });
    map.on("styledata", () => {
      window.requestAnimationFrame(() => {
        map.resize();
        syncAreaLayer(map, latestMapConfigRef.current.bounds && validBounds(latestMapConfigRef.current.bounds) ? latestMapConfigRef.current.bounds : initialBoundsRef.current);
      });
    });
    map.on("load", () => {
      loaded = true;
      window.clearTimeout(fallbackTimer);
      map.resize();
      map.getCanvas().style.pointerEvents = "auto";
      map.getCanvas().style.touchAction = "none";
      syncAreaLayer(map, initialBoundsRef.current);
      renderMarkers(map, initialBoundsRef.current);
      fitBounds(map, initialBoundsRef.current);
    });
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
    map.keyboard.enable();
    const cleanupManualInteraction = enableManualMapInteraction(container, map);
    mapRef.current = map;
    return () => {
      window.clearTimeout(fallbackTimer);
      resizeObserver.disconnect();
      cleanupManualInteraction();
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

  async function searchAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = addressQuery.trim();
    if (query.length < 3) {
      setMessage("Bitte mindestens 3 Zeichen für die Adresssuche eingeben.");
      return;
    }
    setSearching(true);
    setMessage("");
    setResults([]);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const payload = await response.json().catch(() => null) as { results?: GeocodeResult[]; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Adresssuche fehlgeschlagen.");
      setResults(payload?.results ?? []);
      setMessage((payload?.results?.length ?? 0) > 0 ? "Adresse gefunden. Treffer auswählen oder Karte weiter verschieben." : "Keine Adresse gefunden. Bitte Suchbegriff genauer eingeben.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Adresssuche fehlgeschlagen.");
    } finally {
      setSearching(false);
    }
  }

  function selectAddress(result: GeocodeResult) {
    const map = mapRef.current;
    if (!map) return;
    if (result.bounds && validBounds(result.bounds)) fitBounds(map, result.bounds);
    else map.flyTo({ center: result.center, zoom: 17, duration: 600 });
    setAddressQuery(result.label);
    setResults([]);
    setMessage("Adresse übernommen. Verschiebe die Karte fein und klicke dann auf „Ausschnitt übernehmen“.");
  }

  return <section className="space-y-3">
    <form onSubmit={searchAddress} className="rounded-2xl border border-black/10 bg-[#fafaf8] p-3">
      <label htmlFor="camp-area-address-search" className="block text-sm font-bold">Adresse oder Ort suchen</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input id="camp-area-address-search" value={addressQuery} onChange={(event) => setAddressQuery(event.target.value)} placeholder="Campingplatz, Ort oder vollständige Adresse" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none" />
        <button disabled={searching} className="rounded-xl bg-[#173c32] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><Search size={16} className="mr-1.5 inline" />{searching ? "Suche …" : "Suchen"}</button>
      </div>
      {results.length > 0 && <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-white">
        {results.map((result) => <button key={`${result.label}-${result.center.join(",")}`} type="button" onClick={() => selectAddress(result)} className="block w-full border-b border-black/5 px-4 py-3 text-left text-sm leading-5 hover:bg-emerald-50 last:border-b-0">
          <span className="font-bold text-[#173c32]">{result.label.split(",")[0]}</span>
          <span className="mt-1 block text-xs text-black/50">{result.label}</span>
        </button>)}
      </div>}
      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-black/45">
        <span>OpenStreetMap-Suche</span>
        <HelpBubble text="Nach Auswahl den Kartenausschnitt prüfen und mit „Ausschnitt übernehmen“ speichern." />
      </div>
    </form>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="inline-flex items-center gap-2 text-sm font-bold">
          <span>Campingplatzfläche markieren</span>
          <HelpBubble text="Karte verschieben, Rechteck setzen und die Ecken fein ausrichten." />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useCurrentView} className="rounded-xl bg-[#173c32] px-3 py-2 text-xs font-bold text-white"><Crosshair size={15} className="mr-1.5 inline" />Ausschnitt übernehmen</button>
        <button type="button" onClick={resetArea} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold"><RotateCcw size={15} className="mr-1.5 inline" />Zurücksetzen</button>
      </div>
    </div>
    <div className="relative h-[420px] min-h-[55vh] overflow-hidden rounded-2xl border border-black/10 bg-[#dce8d0]">
      <div ref={containerRef} className="absolute inset-0" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-xl bg-white/95 px-3 py-2 text-xs font-bold leading-5 shadow"><MapPinned size={14} className="mr-1 inline" /> OSM-Basiskarte · grünes Rechteck = öffentlicher Platzbereich</div>
    </div>
    {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">{message}</p>}
  </section>;
}

function HelpBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return <span ref={ref} className="relative inline-flex align-middle">
    <button type="button" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }} aria-label="Hilfe anzeigen" className="inline-grid h-6 w-6 place-items-center rounded-full text-[#286551] hover:bg-emerald-50">
      <HelpCircle size={15} />
    </button>
    {open && <span role="tooltip" className="absolute left-1/2 top-7 z-50 w-64 -translate-x-1/2 rounded-xl bg-[#173c32] p-3 text-xs font-bold leading-5 text-white shadow-xl">
      {text}
    </span>}
  </span>;
}

function getMapStyle(styleUrl: string) {
  void styleUrl;
  return rasterMapStyle;
}

function updateAreaSource(map: import("maplibre-gl").Map, bounds: Bounds) {
  syncAreaLayer(map, bounds);
}

function syncAreaLayer(map: import("maplibre-gl").Map, bounds: Bounds) {
  if (!map.isStyleLoaded()) return;
  const source = map.getSource("camp-area") as import("maplibre-gl").GeoJSONSource | undefined;
  if (source) {
    source.setData(boundsFeature(bounds));
    return;
  }
  if (!map.getSource("camp-area")) map.addSource("camp-area", { type: "geojson", data: boundsFeature(bounds) });
  if (!map.getLayer("camp-area-fill")) {
    map.addLayer({
      id: "camp-area-fill",
      type: "fill",
      source: "camp-area",
      paint: { "fill-color": "#195f4c", "fill-opacity": 0.16 }
    });
  }
  if (!map.getLayer("camp-area-outline")) {
    map.addLayer({
      id: "camp-area-outline",
      type: "line",
      source: "camp-area",
      paint: { "line-color": "#195f4c", "line-width": 3, "line-dasharray": [2, 1] }
    });
  }
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

function fitBounds(map: import("maplibre-gl").Map, bounds: Bounds) {
  map.fitBounds(bounds, { padding: 60, maxZoom: 18, duration: 0 });
}

function enableManualMapInteraction(container: HTMLDivElement, map: import("maplibre-gl").Map) {
  let dragging = false;
  let lastPoint: [number, number] | null = null;
  function isMapCanvasTarget(event: Event) {
    const target = event.target;
    return target instanceof HTMLCanvasElement && target.classList.contains("maplibregl-canvas");
  }
  function onPointerDown(event: PointerEvent) {
    if (!isMapCanvasTarget(event)) return;
    dragging = true;
    lastPoint = [event.clientX, event.clientY];
    container.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
  function onPointerMove(event: PointerEvent) {
    if (!dragging || !lastPoint) return;
    const deltaX = event.clientX - lastPoint[0];
    const deltaY = event.clientY - lastPoint[1];
    lastPoint = [event.clientX, event.clientY];
    map.panBy([-deltaX, -deltaY], { duration: 0 });
    event.preventDefault();
  }
  function onPointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    lastPoint = null;
    container.releasePointerCapture?.(event.pointerId);
    event.preventDefault();
  }
  function onWheel(event: WheelEvent) {
    if (!isMapCanvasTarget(event)) return;
    const nextZoom = Math.max(3, Math.min(20, map.getZoom() + (event.deltaY > 0 ? -0.35 : 0.35)));
    map.zoomTo(nextZoom, { duration: 0 });
    event.preventDefault();
  }
  container.addEventListener("pointerdown", onPointerDown, { passive: false });
  container.addEventListener("pointermove", onPointerMove, { passive: false });
  container.addEventListener("pointerup", onPointerUp, { passive: false });
  container.addEventListener("pointercancel", onPointerUp, { passive: false });
  container.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerup", onPointerUp);
    container.removeEventListener("pointercancel", onPointerUp);
    container.removeEventListener("wheel", onWheel);
  };
}
