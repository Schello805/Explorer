"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, LocateFixed, MapPin } from "lucide-react";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
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

export function StationLocationPicker({ mapConfig, longitude, latitude, onChange }: {
  mapConfig: Tenant["map"];
  longitude: number;
  latitude: number;
  onChange: (position: { longitude: number; latitude: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const onChangeRef = useRef(onChange);
  const initialPositionRef = useRef<[number, number]>(
    longitude || latitude ? [longitude, latitude] : mapConfig.center
  );
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [positionMessage, setPositionMessage] = useState("");

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
    if (!longitude && !latitude) return;
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [longitude, latitude]);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    if (!cancelled && containerRef.current) {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: getMapStyle(mapConfig.styleUrl),
        center: initialPositionRef.current,
        zoom: Math.max(mapConfig.zoom, 17),
        attributionControl: false
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "© OpenStreetMap-Mitwirkende · OpenFreeMap"
      }), "bottom-left");
      map.on("load", () => {
        if (!hasValidBounds(mapConfig.bounds)) return;
        map.addSource("camp-area", { type: "geojson", data: boundsFeature(mapConfig.bounds) });
        map.addLayer({
          id: "camp-area-fill",
          source: "camp-area",
          type: "fill",
          paint: { "fill-color": "#195f4c", "fill-opacity": 0.10 }
        });
        map.addLayer({
          id: "camp-area-outline",
          source: "camp-area",
          type: "line",
          paint: { "line-color": "#195f4c", "line-width": 2, "line-dasharray": [2, 1] }
        });
      });
      const marker = new maplibregl.Marker({ color: "#c44f34", draggable: true })
        .setLngLat(initialPositionRef.current)
        .addTo(map);
      marker.on("dragend", () => {
        const point = marker.getLngLat();
        onChangeRef.current({ longitude: point.lng, latitude: point.lat });
        setPositionMessage("Marker verschoben und Position übernommen.");
      });
      map.on("click", (event) => {
        marker.setLngLat(event.lngLat);
        onChangeRef.current({ longitude: event.lngLat.lng, latitude: event.lngLat.lat });
        setPositionMessage("Klickposition übernommen.");
      });
      markerRef.current = marker;
      mapRef.current = map;
    }
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapConfig]);

  function useCurrentLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Dieses Gerät unterstützt keine Standortfreigabe.");
      return;
    }
    if (!window.isSecureContext) {
      setLocationMessage("GPS funktioniert auf iOS und Android nur über HTTPS oder lokal auf localhost.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next = { longitude: coords.longitude, latitude: coords.latitude };
      markerRef.current?.setLngLat([next.longitude, next.latitude]);
      mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 19 });
      onChangeRef.current(next);
      setLocationMessage(coords.accuracy > 50 ? `Standort gefunden, Genauigkeit ca. ${Math.round(coords.accuracy)} m.` : "Standort gefunden.");
      setPositionMessage("GPS-Position übernommen.");
      setLocating(false);
    }, (error) => {
      if (error.code === error.PERMISSION_DENIED) setLocationMessage("Standort wurde nicht freigegeben. Bitte Browser-Berechtigung prüfen.");
      else if (error.code === error.TIMEOUT) setLocationMessage("Standort konnte nicht schnell genug ermittelt werden. Bitte erneut versuchen.");
      else setLocationMessage("Standort konnte nicht ermittelt werden.");
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30_000 });
  }

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-bold">Position auf dem Platz</p><p className="mt-1 text-xs font-normal text-black/45">Karte anklicken, Marker ziehen oder GPS direkt vor Ort nutzen.</p></div>
      <button type="button" onClick={useCurrentLocation} disabled={locating} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-50"><LocateFixed size={15} className="mr-1.5 inline" />{locating ? "GPS wird ermittelt …" : "Aktuellen Standort nutzen"}</button>
    </div>
    <div className="relative mt-3 h-72 overflow-hidden rounded-2xl border border-black/10 bg-[#dce8d0]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-lg bg-white/90 px-3 py-2 text-xs font-bold leading-5 shadow"><Crosshair size={14} className="mr-1 inline" /> Marker anklicken/ziehen · Karte zoomen · speichern</div>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold text-black/55">Breitengrad<input title="Nord-Süd-Koordinate als Dezimalzahl. Kann per Karte, Marker oder GPS gesetzt werden." type="number" step="any" value={latitude} onChange={(event) => onChange({ latitude: Number(event.target.value), longitude })} className="mt-1 w-full rounded-xl border p-3 text-sm text-black" /></label>
      <label className="text-xs font-bold text-black/55">Längengrad<input title="Ost-West-Koordinate als Dezimalzahl. Kann per Karte, Marker oder GPS gesetzt werden." type="number" step="any" value={longitude} onChange={(event) => onChange({ longitude: Number(event.target.value), latitude })} className="mt-1 w-full rounded-xl border p-3 text-sm text-black" /></label>
    </div>
    {(locationMessage || positionMessage) && <p className="mt-2 rounded-xl bg-[#f7f7f4] p-3 text-xs font-bold leading-5 text-black/60">{locationMessage || positionMessage}</p>}
    <p className="mt-2 flex items-start gap-2 text-xs font-normal leading-5 text-black/45"><MapPin size={14} className="mt-0.5 shrink-0" /> GPS funktioniert am besten direkt an der Station und auf einem Smartphone.</p>
  </section>;
}

function getMapStyle(styleUrl: string) {
  if (!styleUrl) return rasterMapStyle;
  return styleUrl;
}

function hasLngLat(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
}

function hasValidBounds(bounds: Tenant["map"]["bounds"]): bounds is NonNullable<Tenant["map"]["bounds"]> {
  return Boolean(bounds && bounds.every(hasLngLat));
}

function boundsFeature(bounds: NonNullable<Tenant["map"]["bounds"]>) {
  const [[west, south], [east, north]] = bounds;
  const coordinates = [[west, north], [east, north], [east, south], [west, south], [west, north]];
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coordinates] }
  };
}
