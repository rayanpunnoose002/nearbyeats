"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { RestaurantSummary, DistanceUnit, CurrencyInfo, DietaryPref } from "@/lib/types";
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

interface JourneyFilters {
  totalStops: number | null;
  spotsPerStop: number;
  mealType: "any" | "breakfast" | "lunch" | "dinner";
  dietaryPref: DietaryPref;
  minRating: number | null;
  budget: string[];
}

const DEFAULT_FILTERS: JourneyFilters = {
  totalStops: null,
  spotsPerStop: 3,
  mealType: "any",
  dietaryPref: "both",
  minRating: null,
  budget: [],
};

const DIETARY_OPTIONS: { value: DietaryPref; label: string }[] = [
  { value: "both",   label: "🍽️ Both"    },
  { value: "veg",    label: "🥗 Veg"     },
  { value: "nonveg", label: "🍗 Non-Veg" },
];

const MEAL_OPTIONS = [
  { value: "any",       label: "✨ Any time"  },
  { value: "breakfast", label: "🌅 Breakfast" },
  { value: "lunch",     label: "☀️ Lunch"     },
  { value: "dinner",    label: "🌙 Dinner"    },
] as const;

const RATING_OPTIONS: (number | null)[] = [null, 3, 3.5, 4, 4.5];
const BUDGET_OPTIONS = ["$", "$$", "$$$", "$$$$"];

interface JourneyPlannerProps {
  unit: DistanceUnit;
  currency: CurrencyInfo;
  onMoodChange?: (mood: "thinking" | "celebrating" | "idle") => void;
}

export default function JourneyPlanner({
  unit,
  onMoodChange,
}: JourneyPlannerProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [locatingOrigin, setLocatingOrigin] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<JourneyResult | null>(null);
  const [hotelsByStop, setHotelsByStop] = useState<RestaurantSummary[][]>([]);
  const [loadingStops, setLoadingStops] = useState<boolean[]>([]);
  const [journeyFilters, setJourneyFilters] = useState<JourneyFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const fetchRestaurants = useCallback(
    async (waypoints: Waypoint[], filters: JourneyFilters) => {
      if (waypoints.length === 0) return;
      setLoadingStops(waypoints.map(() => true));
      setHotelsByStop(waypoints.map(() => []));

      const budgetParam = filters.budget.length
        ? `&budget=${encodeURIComponent(filters.budget.join(","))}`
        : "";
      const ratingParam = filters.minRating !== null ? `&minRating=${filters.minRating}` : "";
      const dietaryParam = filters.dietaryPref !== "both" ? `&dietaryPref=${filters.dietaryPref}` : "";

      await Promise.all(
        waypoints.map(async (wp, i) => {
          try {
            const hRes = await fetch(
              `/api/journey/hotels?lat=${wp.lat}&lng=${wp.lng}&radius=15000` +
              `&mealType=${filters.mealType}&spots=${filters.spotsPerStop}` +
              ratingParam + budgetParam + dietaryParam,
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
    },
    [],
  );

  // Track previous totalStops so we know when a re-route is needed vs just re-fetch
  const prevTotalStopsRef = useRef<number | null>(journeyFilters.totalStops);
  // Avoid triggering on first render
  const filtersInitialRef = useRef(true);

  useEffect(() => {
    if (filtersInitialRef.current) {
      filtersInitialRef.current = false;
      return;
    }
    if (!journey) return;

    const totalStopsChanged = journeyFilters.totalStops !== prevTotalStopsRef.current;
    prevTotalStopsRef.current = journeyFilters.totalStops;

    if (totalStopsChanged) {
      // Waypoint count changes — need to re-route entirely
      void rePlanRoute();
    } else {
      // Only restaurant filters changed — just re-fetch for existing waypoints
      void fetchRestaurants(journey.waypoints, journeyFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyFilters]);

  async function rePlanRoute() {
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
          ...(journeyFilters.totalStops !== null && { numStops: journeyFilters.totalStops }),
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
      if (result.waypoints.length > 0) {
        await fetchRestaurants(result.waypoints, journeyFilters);
      }
      onMoodChange?.("celebrating");
    } catch {
      setError("Something went wrong planning your journey.");
      onMoodChange?.("idle");
    } finally {
      setPlanning(false);
    }
  }

  async function handlePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;
    filtersInitialRef.current = true; // suppress filter effect after manual plan
    prevTotalStopsRef.current = journeyFilters.totalStops;

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
          ...(journeyFilters.totalStops !== null && { numStops: journeyFilters.totalStops }),
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

      if (result.waypoints.length > 0) {
        await fetchRestaurants(result.waypoints, journeyFilters);
      }
      onMoodChange?.("celebrating");
    } catch {
      setError("Something went wrong planning your journey.");
      onMoodChange?.("idle");
    } finally {
      setPlanning(false);
      filtersInitialRef.current = false; // re-arm filter watching
    }
  }

  function toggleBudget(b: string) {
    setJourneyFilters((f) => ({
      ...f,
      budget: f.budget.includes(b) ? f.budget.filter((x) => x !== b) : [...f.budget, b],
    }));
  }

  const hasJourney = !!journey;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Hero (only before first journey is planned) ── */}
      {!hasJourney && !planning && (
        <div className="animate-fade-in-up flex flex-col items-center gap-4 text-center">
          <div className="glass flex h-16 w-16 items-center justify-center rounded-2xl text-4xl shadow-lg">
            🗺️
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 sm:text-2xl">
              Plan a road trip.<br />Never miss a great meal.
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Enter your start and end points. We&apos;ll find top-rated restaurants at every stop along the way.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { icon: "🗺️", label: "Smart waypoints" },
              { icon: "🍽️", label: "Food every stop" },
              { icon: "⭐", label: "Quality-scored" },
              { icon: "🌿", label: "Veg filter" },
              { icon: "🔄", label: "Live updates" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="glass rounded-full px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Route input card ── */}
      <div className="glass animate-pop-in rounded-2xl p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Your route
        </h2>

        <form onSubmit={handlePlan} className="flex flex-col gap-3">
          {/* From / To with visual connector */}
          <div className="relative flex flex-col gap-3 pl-8">
            {/* Vertical connector line */}
            <div
              className="absolute left-3 top-4 bottom-4 w-0.5 rounded-full"
              style={{ background: "linear-gradient(to bottom, var(--accent-from), var(--accent-to))" }}
              aria-hidden
            />

            {/* Origin */}
            <div className="relative">
              <div
                className="absolute -left-8 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow"
                style={{ background: "var(--accent-from)" }}
                aria-hidden
              >
                A
              </div>
              <PlaceAutocomplete
                label="From"
                value={origin}
                onChange={setOrigin}
                placeholder="e.g. London, UK"
                disabled={planning || locatingOrigin}
              />
            </div>

            {/* Destination */}
            <div className="relative">
              <div
                className="absolute -left-8 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow"
                style={{ background: "var(--accent-to)" }}
                aria-hidden
              >
                B
              </div>
              <PlaceAutocomplete
                label="To"
                value={destination}
                onChange={setDestination}
                placeholder="e.g. Edinburgh, UK"
                disabled={planning}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locatingOrigin || planning}
            className="self-start text-xs font-medium text-indigo-500 transition hover:underline disabled:opacity-50 dark:text-indigo-400"
          >
            {locatingOrigin ? "Locating…" : "📍 Use my current location as start"}
          </button>
          {locationError && <p className="text-xs text-red-500">{locationError}</p>}

          <button
            type="submit"
            disabled={planning || !origin.trim() || !destination.trim()}
            className="shine-btn accent-gradient mt-1 rounded-xl px-5 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {planning ? "Planning your journey…" : "Plan Journey →"}
          </button>
        </form>

        {error && (
          <p className="mt-3 animate-fade-in-up text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* ── Journey preferences (filters) ── */}
      <div className="glass overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => setFiltersOpen((p) => !p)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/20 dark:hover:bg-white/5"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            ⚙️ Journey Preferences
            {(journeyFilters.totalStops !== null ||
              journeyFilters.mealType !== "any" ||
              journeyFilters.dietaryPref !== "both" ||
              journeyFilters.minRating !== null ||
              journeyFilters.budget.length > 0 ||
              journeyFilters.spotsPerStop !== 3) && (
              <span className="accent-gradient rounded-full px-2 py-0.5 text-xs text-white">
                Active
              </span>
            )}
          </span>
          <span
            className={`text-zinc-400 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>

        {filtersOpen && (
          <div className="animate-fade-in-up space-y-5 border-t border-white/30 px-5 pb-5 pt-4 dark:border-white/10">

            {/* Total stops along the route */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                🗺️ Total food stops on journey
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`filter-pill ${journeyFilters.totalStops === null ? "active" : ""}`}
                  onClick={() => setJourneyFilters((f) => ({ ...f, totalStops: null }))}
                >
                  Auto
                </button>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`filter-pill ${journeyFilters.totalStops === n ? "active" : ""}`}
                    onClick={() => setJourneyFilters((f) => ({ ...f, totalStops: n }))}
                  >
                    {n} stop{n > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                Auto picks stops based on route distance.
              </p>
            </div>

            {/* Spots per stop */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                🍽️ Food spots per stop
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`filter-pill ${journeyFilters.spotsPerStop === n ? "active" : ""}`}
                    onClick={() => setJourneyFilters((f) => ({ ...f, spotsPerStop: n }))}
                  >
                    {n} spot{n > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal type */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                🕐 Meal preference
              </p>
              <div className="flex flex-wrap gap-2">
                {MEAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`filter-pill ${journeyFilters.mealType === opt.value ? "active" : ""}`}
                    onClick={() =>
                      setJourneyFilters((f) => ({ ...f, mealType: opt.value }))
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary preference */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                🥗 Dietary preference
              </p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`filter-pill ${journeyFilters.dietaryPref === opt.value ? "active" : ""}`}
                    onClick={() => setJourneyFilters((f) => ({ ...f, dietaryPref: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Min rating */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                ⭐ Minimum rating
              </p>
              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map((r) => (
                  <button
                    key={r ?? "any"}
                    type="button"
                    className={`filter-pill ${journeyFilters.minRating === r ? "active" : ""}`}
                    onClick={() => setJourneyFilters((f) => ({ ...f, minRating: r }))}
                  >
                    {r === null ? "Any" : `${r}★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                💰 Budget{" "}
                <span className="normal-case font-normal text-zinc-400 dark:text-zinc-500">
                  (select multiple)
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={`filter-pill ${journeyFilters.budget.includes(b) ? "active" : ""}`}
                    onClick={() => toggleBudget(b)}
                  >
                    {b}
                  </button>
                ))}
                {journeyFilters.budget.length > 0 && (
                  <button
                    type="button"
                    className="filter-pill text-zinc-400"
                    onClick={() => setJourneyFilters((f) => ({ ...f, budget: [] }))}
                  >
                    × Clear
                  </button>
                )}
              </div>
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={() => setJourneyFilters(DEFAULT_FILTERS)}
              className="text-xs font-medium text-zinc-400 transition hover:text-zinc-600 hover:underline dark:hover:text-zinc-200"
            >
              Reset all preferences
            </button>
          </div>
        )}
      </div>

      {/* ── Empty-state route preview (before planning) ── */}
      {!hasJourney && !planning && (
        <div className="glass animate-fade-in-up overflow-hidden rounded-2xl p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            What you&apos;ll get
          </p>
          {/* Stylised route spine */}
          <div className="relative flex flex-col gap-6 pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-orange-300 via-purple-300 to-pink-300 opacity-60" aria-hidden />

            {[
              { dot: "🟠", label: "Start", note: "Your origin" },
              { dot: "🟣", label: "Stop 1", note: "Top restaurants near this waypoint" },
              { dot: "🟣", label: "Stop 2", note: "More great spots along the way" },
              { dot: "🩷", label: "Destination", note: "Your end point" },
            ].map(({ dot, label, note }, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 text-sm" aria-hidden>{dot}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
                  <p className="text-xs text-zinc-400">{note}</p>
                  {(i === 1 || i === 2) && (
                    <div className="mt-2 flex gap-2">
                      {[1, 2, 3].map((k) => (
                        <div
                          key={k}
                          className="h-10 flex-1 rounded-xl shimmer"
                          style={{ animationDelay: `${k * 150}ms` }}
                          aria-hidden
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-zinc-400">
            Enter your route above to see real restaurant picks ↑
          </p>
        </div>
      )}

      {/* ── Route map ── */}
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

      {/* ── Food stops ── */}
      {journey?.waypoints.map((wp, i) => (
        <div key={`${wp.lat}-${wp.lng}`} className="flex flex-col gap-4">

          {/* Stop section header */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 stop-divider" />
            <div className="glass flex items-center gap-2.5 rounded-full px-4 py-2 shadow-md">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
              >
                {i + 1}
              </span>
              <span className="accent-gradient-text whitespace-nowrap text-sm font-semibold">
                {wp.label}
              </span>
            </div>
            <div className="h-px flex-1 stop-divider" />
          </div>

          {loadingStops[i] && (
            <div className="glass flex items-center gap-3 rounded-2xl p-4 text-zinc-600 dark:text-zinc-300">
              <span className="accent-gradient h-2 w-2 animate-ping rounded-full" />
              Finding the best restaurants nearby…
            </div>
          )}

          {!loadingStops[i] && (hotelsByStop[i]?.length ?? 0) === 0 && (
            <div className="glass animate-fade-in-up flex flex-col items-center gap-2 rounded-2xl p-5 text-center">
              <p className="text-2xl">🤔</p>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                No restaurants found near this stop
              </p>
              <p className="text-xs text-zinc-400">
                Try adjusting your filters or loosening the budget/rating requirements.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(hotelsByStop[i] ?? []).map((hotel, j) => (
              <div
                key={hotel.placeId}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(j * 80, 400)}ms` }}
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
