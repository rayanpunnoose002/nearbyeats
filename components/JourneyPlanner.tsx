"use client";

import { useState } from "react";
import type { RestaurantSummary, DistanceUnit, CurrencyInfo } from "@/lib/types";
import HotelCard from "@/components/HotelCard";
import JourneyMap from "@/components/JourneyMap";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";

interface Waypoint {
  lat: number;
  lng: number;
  label: string;
}

interface JourneyResult {
  distanceMeters: number;
  durationSeconds: number;
  waypoints: Waypoint[];
  encodedPolyline: string;
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
}

interface JourneyPlannerProps {
  unit: DistanceUnit;
  currency: CurrencyInfo;
  onMoodChange?: (mood: "thinking" | "celebrating" | "idle") => void;
}


export default function JourneyPlanner({
  unit,
  currency,
  onMoodChange,
}: JourneyPlannerProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [locatingOrigin, setLocatingOrigin] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported by your browser.");
      return;
    }
    setLocatingOrigin(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          setOrigin(
            res.ok && data.formattedAddress
              ? data.formattedAddress
              : `${lat.toFixed(5)},${lng.toFixed(5)}`,
          );
        } catch {
          setLocationError("Couldn't determine your location name.");
        } finally {
          setLocatingOrigin(false);
        }
      },
      () => {
        setLocationError("Location permission denied.");
        setLocatingOrigin(false);
      },
    );
  }
  const [journey, setJourney] = useState<JourneyResult | null>(null);
  const [hotelsByStop, setHotelsByStop] = useState<RestaurantSummary[][]>([]);
  const [loadingStops, setLoadingStops] = useState<boolean[]>([]);

  async function handlePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;

    setPlanning(true);
    setError(null);
    setJourney(null);
    setHotelsByStop([]);
    setLoadingStops([]);
    onMoodChange?.("thinking");

    try {
      const res = await fetch("/api/journey/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: origin.trim(),
          destination: destination.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Journey planning failed.");
        onMoodChange?.("idle");
        return;
      }

      const result = data as JourneyResult;
      setJourney(result);
      setPlanning(false);

      if (result.waypoints.length === 0) {
        onMoodChange?.("celebrating");
        return;
      }

      setLoadingStops(result.waypoints.map(() => true));
      setHotelsByStop(result.waypoints.map(() => []));

      await Promise.all(
        result.waypoints.map(async (wp, i) => {
          try {
            const hRes = await fetch(
              `/api/journey/hotels?lat=${wp.lat}&lng=${wp.lng}&radius=15000`,
            );
            const hData = await hRes.json();
            setHotelsByStop((prev) => {
              const next = [...prev];
              next[i] = hData.results ?? [];
              return next;
            });
          } catch {
            // keep empty array for this stop
          } finally {
            setLoadingStops((prev) => {
              const next = [...prev];
              next[i] = false;
              return next;
            });
          }
        }),
      );

      onMoodChange?.("celebrating");
    } catch {
      setError("Something went wrong planning your journey.");
      onMoodChange?.("idle");
    } finally {
      setPlanning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Input card */}
      <div className="glass animate-pop-in rounded-2xl p-5">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          Where are you heading?
        </h2>
        <form onSubmit={handlePlan} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <PlaceAutocomplete
              label="From"
              value={origin}
              onChange={setOrigin}
              placeholder="e.g. London, UK"
              disabled={planning || locatingOrigin}
            />
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locatingOrigin || planning}
              className="self-start text-xs font-medium text-indigo-500 transition hover:underline disabled:opacity-50 dark:text-indigo-400"
            >
              {locatingOrigin ? "Locating…" : "📍 Use my current location"}
            </button>
            {locationError && (
              <p className="text-xs text-red-500">{locationError}</p>
            )}
          </div>
          <PlaceAutocomplete
            label="To"
            value={destination}
            onChange={setDestination}
            placeholder="e.g. Edinburgh, UK"
            disabled={planning}
          />
          <button
            type="submit"
            disabled={planning || !origin.trim() || !destination.trim()}
            className="accent-gradient mt-1 rounded-xl px-5 py-2.5 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {planning ? "Planning your journey…" : "Plan Journey →"}
          </button>
        </form>
        {error && (
          <p className="mt-3 animate-fade-in-up text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      {/* Route map */}
      {journey && (
        <>
          <JourneyMap
            key={journey.encodedPolyline}
            encodedPolyline={journey.encodedPolyline}
            originCoords={journey.originCoords}
            destCoords={journey.destCoords}
            waypoints={journey.waypoints}
            originName={origin}
            destName={destination}
            distanceMeters={journey.distanceMeters}
            durationSeconds={journey.durationSeconds}
            unit={unit}
          />
          {journey.waypoints.length === 0 && (
            <p className="animate-fade-in-up text-sm text-zinc-500 dark:text-zinc-400">
              Short trip — no stops needed!
            </p>
          )}
        </>
      )}

      {/* Hotel stops */}
      {journey?.waypoints.map((wp, i) => (
        <div key={`${wp.lat}-${wp.lng}`} className="flex flex-col gap-3">
          {/* Stop divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/30 dark:bg-white/10" />
            <span className="accent-text whitespace-nowrap text-sm font-semibold">
              🍽️ {wp.label}
            </span>
            <div className="h-px flex-1 bg-white/30 dark:bg-white/10" />
          </div>

          {loadingStops[i] && (
            <div className="glass flex items-center gap-3 rounded-2xl p-4 text-zinc-600 dark:text-zinc-300">
              <span className="accent-gradient h-2 w-2 animate-ping rounded-full" />
              Finding restaurants nearby…
            </div>
          )}

          {!loadingStops[i] && (hotelsByStop[i]?.length ?? 0) === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No restaurants found near this stop. Try widening your search radius.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(hotelsByStop[i] ?? []).map((hotel, j) => (
              <div
                key={hotel.placeId}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(j * 50, 300)}ms` }}
              >
                <HotelCard hotel={hotel} unit={unit} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
