"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, LocateFixed, MapPin } from "lucide-react";
import maplibregl from "maplibre-gl";
import type { Tenant } from "@/lib/types";

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

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    if (!cancelled && containerRef.current) {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: mapConfig.styleUrl,
        center: initialPositionRef.current,
        zoom: Math.max(mapConfig.zoom, 17),
        attributionControl: false
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "© OpenStreetMap-Mitwirkende · OpenFreeMap"
      }), "bottom-left");
      const marker = new maplibregl.Marker({ color: "#c44f34", draggable: true })
        .setLngLat(initialPositionRef.current)
        .addTo(map);
      marker.on("dragend", () => {
        const point = marker.getLngLat();
        onChangeRef.current({ longitude: point.lng, latitude: point.lat });
      });
      map.on("click", (event) => {
        marker.setLngLat(event.lngLat);
        onChangeRef.current({ longitude: event.lngLat.lng, latitude: event.lngLat.lat });
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
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next = { longitude: coords.longitude, latitude: coords.latitude };
      markerRef.current?.setLngLat([next.longitude, next.latitude]);
      mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 19 });
      onChangeRef.current(next);
      setLocating(false);
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 15000 });
  }

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-bold">Position auf dem Platz</p><p className="mt-1 text-xs font-normal text-black/45">Karte anklicken oder Marker verschieben.</p></div>
      <button type="button" onClick={useCurrentLocation} disabled={locating} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-50"><LocateFixed size={15} className="mr-1.5 inline" />{locating ? "GPS wird ermittelt …" : "Aktuellen Standort nutzen"}</button>
    </div>
    <div className="relative mt-3 h-72 overflow-hidden rounded-2xl border border-black/10 bg-[#dce8d0]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/90 px-3 py-2 text-xs font-bold shadow"><Crosshair size={14} className="mr-1 inline" /> Bis auf den Stellplatz zoomen</div>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold text-black/55">Breitengrad<input type="number" step="any" value={latitude} onChange={(event) => onChange({ latitude: Number(event.target.value), longitude })} className="mt-1 w-full rounded-xl border p-3 text-sm text-black" /></label>
      <label className="text-xs font-bold text-black/55">Längengrad<input type="number" step="any" value={longitude} onChange={(event) => onChange({ longitude: Number(event.target.value), latitude })} className="mt-1 w-full rounded-xl border p-3 text-sm text-black" /></label>
    </div>
    <p className="mt-2 flex items-start gap-2 text-xs font-normal leading-5 text-black/45"><MapPin size={14} className="mt-0.5 shrink-0" /> GPS funktioniert am besten direkt an der Station und auf einem Smartphone.</p>
  </section>;
}
