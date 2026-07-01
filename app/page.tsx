"use client";

import { useEffect, useRef, useState } from "react";
import FilterBar from "@/components/FilterBar";
import RestaurantCard from "@/components/RestaurantCard";
import SuggestButton from "@/components/SuggestButton";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Mascot, { type MascotMood } from "@/components/Mascot";
import IOSAlert from "@/components/IOSAlert";
import TabBar, { type AppTab } from "@/components/TabBar";
import JourneyPlanner from "@/components/JourneyPlanner";
import type { Filters, RestaurantSummary, DistanceUnit } from "@/lib/types";
import { getCurrency, currencyForCountry } from "@/lib/types";

type Coords = { lat: number; lng: number };

const DEFAULT_FILTERS: Filters = {
  radiusMiles: 5,
  minRating: null,
  priceLevels: [],
  cuisine: null,
  openNow: false,
  dietaryPref: "both",
};

export default function Home() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<RestaurantSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [suggested, setSuggested] = useState<RestaurantSummary | null>(null);

  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

  const [unit, setUnit] = useState<DistanceUnit>("mi");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const currency = getCurrency(currencyCode);

  const [activeTab, setActiveTab] = useState<AppTab>("eats");

  const [mood, setMood] = useState<MascotMood>("idle");
  const moodTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashMood(next: MascotMood, durationMs: number) {
    if (moodTimeout.current) clearTimeout(moodTimeout.current);
    setMood(next);
    moodTimeout.current = setTimeout(() => setMood("idle"), durationMs);
  }

  useEffect(() => {
    if (activeTab === "eats") setMood(searching ? "thinking" : "idle");
  }, [searching, activeTab]);

  function handleJourneyMood(next: "thinking" | "celebrating" | "idle") {
    if (next === "celebrating") flashMood("celebrating", 1800);
    else if (next === "thinking") setMood("thinking");
    else setMood("idle");
  }

  useEffect(() => {
    if (!searching && results.length > 0) {
      flashMood("waving", 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  useEffect(() => {
    if (suggested) flashMood("celebrating", 1800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested]);

  async function detectCurrencyFromCoords(c: Coords) {
    try {
      const res = await fetch(`/api/geocode?lat=${c.lat}&lng=${c.lng}`);
      const data = await res.json();
      if (res.ok && data.countryCode) {
        setCurrencyCode(currencyForCountry(data.countryCode).code);
      }
    } catch {
      // keep current currency if reverse geocode fails
    }
  }

  function useBrowserLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setLocating(false);
        detectCurrencyFromCoords(next);
      },
      () => {
        setLocationError("Location permission denied. Enter an address instead.");
        setLocating(false);
      },
    );
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addressInput.trim()) {
      setAlertInfo({
        title: "Enter a Location",
        message: "Please enter an address or zip code, or use your current location instead.",
      });
      return;
    }
    setLocating(true);
    setLocationError(null);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(addressInput)}`);
      const data = await res.json();
      if (!res.ok) {
        setLocationError(data.error ?? "Couldn't find that address.");
        return;
      }
      setCoords({ lat: data.lat, lng: data.lng });
      if (data.countryCode) {
        setCurrencyCode(currencyForCountry(data.countryCode).code);
      }
    } catch {
      setLocationError("Something went wrong looking up that address.");
    } finally {
      setLocating(false);
    }
  }

  async function runSearch(currentCoords: Coords, currentFilters: Filters) {
    setSearching(true);
    setSearchError(null);
    setSuggested(null);
    try {
      const params = new URLSearchParams({
        lat: String(currentCoords.lat),
        lng: String(currentCoords.lng),
        radiusMiles: String(currentFilters.radiusMiles),
        openNow: String(currentFilters.openNow),
      });
      if (currentFilters.minRating !== null) {
        params.set("minRating", String(currentFilters.minRating));
      }
      if (currentFilters.priceLevels.length) {
        params.set("priceLevels", currentFilters.priceLevels.join(","));
      }
      if (currentFilters.cuisine) {
        params.set("cuisine", currentFilters.cuisine);
      }
      if (currentFilters.dietaryPref !== "both") {
        params.set("dietaryPref", currentFilters.dietaryPref);
      }

      const res = await fetch(`/api/restaurants/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "Search failed.");
        setResults([]);
        return;
      }
      setResults(data.results);
    } catch {
      setSearchError("Something went wrong fetching restaurants.");
    } finally {
      setSearching(false);
    }
  }

  function handleFiltersChange(next: Filters) {
    setFilters(next);
    if (coords) runSearch(coords, next);
  }

  useEffect(() => {
    if (coords) runSearch(coords, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  return (
    <div className="relative min-h-screen px-4 py-10 sm:px-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <Mascot mood={mood} />
      <IOSAlert
        open={alertInfo !== null}
        title={alertInfo?.title ?? ""}
        message={alertInfo?.message ?? ""}
        onClose={() => setAlertInfo(null)}
      />
      <main className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <header className="animate-fade-in-up">
            <h1 className="accent-gradient-text text-4xl font-bold tracking-tight sm:text-5xl">
              {activeTab === "eats"
                ? "What’s nearby to eat?"
                : "Plan a Journey"}
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              {activeTab === "eats"
                ? "Stop scrolling. Find a spot, or let us pick one for you."
                : "Enter your route and discover the best food spots along the way."}
            </p>
          </header>
          <div className="animate-fade-in-up">
            <ThemeSwitcher />
          </div>
        </div>

        <div className="animate-fade-in-up">
          <TabBar activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "journey" ? (
          <JourneyPlanner
            unit={unit}
            currency={currency}
            onMoodChange={handleJourneyMood}
          />
        ) : !coords ? (
          <div className="glass animate-pop-in flex flex-col gap-3 rounded-2xl p-5">
            <button
              type="button"
              onClick={useBrowserLocation}
              disabled={locating}
              className="accent-gradient self-start rounded-full px-5 py-2.5 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {locating ? "Locating…" : "Use my location"}
            </button>
            <form onSubmit={handleAddressSubmit} className="flex gap-2">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Or enter an address / zip code"
                className="flex-1 rounded-xl border border-white/40 bg-white/40 px-3 py-2 backdrop-blur-sm transition focus:bg-white/70 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:focus:bg-black/40"
              />
              <button
                type="submit"
                className="rounded-xl bg-white/50 px-4 py-2 font-medium backdrop-blur-sm transition hover:bg-white/70 active:scale-95 dark:bg-white/10 dark:hover:bg-white/20"
              >
                Go
              </button>
            </form>
            {locationError && (
              <p className="animate-fade-in-up text-sm text-red-500">{locationError}</p>
            )}
          </div>
        ) : (
          <>
            <div className="animate-fade-in-up">
              <FilterBar
                filters={filters}
                onChange={handleFiltersChange}
                unit={unit}
                onUnitChange={setUnit}
                currency={currency}
                onCurrencyChange={setCurrencyCode}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => runSearch(coords, filters)}
                className="accent-text text-sm font-medium transition hover:underline"
              >
                Refresh results
              </button>
              <SuggestButton coords={coords} filters={filters} onPick={setSuggested} />
            </div>

            {suggested && (
              <div className="animate-pop-in">
                <h2 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  Tonight&apos;s pick:
                </h2>
                <RestaurantCard restaurant={suggested} highlighted unit={unit} currency={currency} />
              </div>
            )}

            {searching && (
              <div className="glass flex items-center gap-3 rounded-2xl p-4 text-zinc-600 dark:text-zinc-300">
                <span className="accent-gradient h-2 w-2 animate-ping rounded-full" />
                Searching nearby restaurants…
              </div>
            )}
            {searchError && (
              <p className="animate-fade-in-up text-red-500">{searchError}</p>
            )}
            {!searching && !searchError && results.length === 0 && (
              <p className="animate-fade-in-up text-zinc-500 dark:text-zinc-400">
                No restaurants found. Try widening your radius or loosening filters.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {results
                .filter((r) => r.placeId !== suggested?.placeId)
                .map((r, i) => (
                  <div
                    key={r.placeId}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  >
                    <RestaurantCard restaurant={r} unit={unit} currency={currency} />
                  </div>
                ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
