"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";
import type { DistanceUnit } from "@/lib/types";

function decodePolylinePts(encoded: string): { lat: number; lng: number }[] {
  const pts: { lat: number; lng: number }[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let b: number, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

interface Waypoint {
  lat: number;
  lng: number;
  label: string;
}

interface JourneyMapProps {
  encodedPolyline: string;
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
  waypoints: Waypoint[];
  originName: string;
  destName: string;
  distanceMeters: number;
  durationSeconds: number;
  unit: DistanceUnit;
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

export default function JourneyMap({
  encodedPolyline,
  originCoords,
  destCoords,
  waypoints,
  originName,
  destName,
  distanceMeters,
  durationSeconds,
  unit,
}: JourneyMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const initMap = useCallback(() => {
    if (initializedRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google?.maps;
    if (!G || !mapDivRef.current) return;
    initializedRef.current = true;

    const pts = decodePolylinePts(encodedPolyline);

    const map = new G.Map(mapDivRef.current, {
      zoom: 8,
      center: originCoords,
      mapId: "DEMO_MAP_ID",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "cooperative",
    });

    new G.Polyline({
      path: pts,
      strokeColor: "#6366F1",
      strokeOpacity: 0.9,
      strokeWeight: 5,
      map,
    });

    const bounds = new G.LatLngBounds();
    pts.forEach((p: { lat: number; lng: number }) => bounds.extend(p));
    map.fitBounds(bounds, 48);

    // AdvancedMarkerElement is available via G.marker because we load
    // the marker library explicitly in the script URL (&libraries=marker)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { AdvancedMarkerElement, PinElement } = (G as any).marker;

    function pin(glyph: string, bg: string) {
      return new PinElement({ glyph, glyphColor: "white", background: bg, borderColor: bg }).element;
    }

    new AdvancedMarkerElement({ position: originCoords, map, title: originName, content: pin("A", "#4285F4"), zIndex: 10 });
    new AdvancedMarkerElement({ position: destCoords,   map, title: destName,   content: pin("B", "#EA4335"), zIndex: 10 });

    waypoints.forEach((wp, i) => {
      new AdvancedMarkerElement({
        position: { lat: wp.lat, lng: wp.lng },
        map,
        title: wp.label,
        content: pin(String(i + 1), "#6366F1"),
        zIndex: 9,
      });
    });
  }, [encodedPolyline, originCoords, destCoords, waypoints, originName, destName]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps) initMap();
  }, [initMap]);

  const dist =
    unit === "km"
      ? `${(distanceMeters / 1000).toFixed(0)} km`
      : `${(distanceMeters / 1609.34).toFixed(0)} mi`;

  const h = Math.floor(durationSeconds / 3600);
  const m = Math.floor((durationSeconds % 3600) / 60);
  const dur =
    h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m} min`;

  return (
    <div className="glass animate-fade-in-up overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-white">
          {originName} → {destName}
        </span>
        <span className="rounded-full bg-white/50 px-2.5 py-1 text-xs font-medium backdrop-blur-sm dark:bg-black/30">
          📍 {dist}
        </span>
        <span className="rounded-full bg-white/50 px-2.5 py-1 text-xs font-medium backdrop-blur-sm dark:bg-black/30">
          ⏱ {dur} driving
        </span>
        {waypoints.length > 0 && (
          <span className="rounded-full bg-white/50 px-2.5 py-1 text-xs font-medium backdrop-blur-sm dark:bg-black/30">
            🍽️ {waypoints.length} stop{waypoints.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!MAPS_KEY ? (
        <div className="flex h-64 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          Set{" "}
          <code className="mx-1 rounded bg-black/10 px-1 dark:bg-white/10">
            NEXT_PUBLIC_GOOGLE_MAPS_KEY
          </code>{" "}
          in .env.local to view the map.
        </div>
      ) : (
        <>
          <div ref={mapDivRef} className="h-72 w-full sm:h-80" />
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=marker`}
            strategy="lazyOnload"
            onReady={initMap}
          />
        </>
      )}
    </div>
  );
}
