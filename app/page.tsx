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
import SplashScreen from "@/components/SplashScreen";
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

  const [splashDone, setSplashDone] = useState(false);
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

  const FOOD_PARTICLES = [
    { emoji: "🍕", left: "8%",  duration: "18s", delay: "0s"   },
    { emoji: "🌮", left: "20%", duration: "23s", delay: "3s"   },
    { emoji: "🍜", left: "34%", duration: "19s", delay: "7s"   },
    { emoji: "🍣", left: "47%", duration: "25s", delay: "1s"   },
    { emoji: "🍔", left: "61%", duration: "21s", delay: "9s"   },
    { emoji: "🍱", left: "73%", duration: "17s", delay: "4s"   },
    { emoji: "🍩", left: "85%", duration: "22s", delay: "12s"  },
    { emoji: "🥗", left: "14%", duration: "26s", delay: "15s"  },
    { emoji: "🍛", left: "55%", duration: "20s", delay: "6s"   },
    { emoji: "🧆", left: "91%", duration: "24s", delay: "10s"  },
  ];

  return (
    <div className="relative min-h-screen px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      {/* Floating food particles */}
      <div className="pointer-events-none" aria-hidden>
        {FOOD_PARTICLES.map((p, i) => (
          <span
            key={i}
            className="food-particle"
            style={{ left: p.left, animationDuration: p.duration, animationDelay: p.delay }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <Mascot mood={splashDone ? mood : "idle"} />
      <IOSAlert
        open={alertInfo !== null}
        title={alertInfo?.title ?? ""}
        message={alertInfo?.message ?? ""}
        onClose={() => setAlertInfo(null)}
      />
      <main className="mx-auto flex max-w-4xl flex-col gap-5">
        {/* ── Brand nav bar ── */}
        <div className="animate-fade-in-up flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="glass flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-md">
              🍽️
            </div>
            <div>
              <p className="accent-gradient-text text-2xl font-extrabold leading-none tracking-tight">
                NearbyEats
              </p>
              <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Smart restaurant finder
              </p>
            </div>
          </div>
          <ThemeSwitcher />
        </div>

        {/* ── Centered tab bar ── */}
        <div className="animate-fade-in-up flex justify-center">
          <TabBar activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "journey" ? (
          <JourneyPlanner
            unit={unit}
            currency={currency}
            onMoodChange={handleJourneyMood}
          />
        ) : !coords ? (
          /* ── Landing hero (no location yet) ── */
          <div className="flex flex-col items-center gap-7 py-4 text-center">
            {/* Tagline */}
            <div className="animate-pop-in">
              <p className="text-6xl">🍽️</p>
              <h2 className="mt-3 text-2xl font-bold text-zinc-800 dark:text-zinc-100 sm:text-3xl">
                Stop wondering.<br />Start eating.
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Smart restaurant picks using live ratings, real reviews, and food-safety data — not just Google&apos;s default sort.
              </p>
            </div>

            {/* Feature chips */}
            <div className="animate-fade-in-up flex flex-wrap justify-center gap-2" style={{ animationDelay: "80ms" }}>
              {[
                { icon: "⚡", label: "Smart picks" },
                { icon: "🌿", label: "Veg friendly" },
                { icon: "🗺️", label: "Journey planner" },
                { icon: "🛡️", label: "Safety checked" },
                { icon: "⭐", label: "Top rated only" },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="glass rounded-full px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {icon} {label}
                </span>
              ))}
            </div>

            {/* Location input card */}
            <div
              className="glass animate-fade-in-up w-full max-w-md rounded-2xl p-5"
              style={{ animationDelay: "160ms" }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Find restaurants near you
              </p>
              <button
                type="button"
                onClick={useBrowserLocation}
                disabled={locating}
                className="shine-btn accent-gradient flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                📍 {locating ? "Finding you…" : "Use my location"}
              </button>
              <div className="my-3 flex items-center gap-3 text-xs text-zinc-400">
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                or enter an address
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              </div>
              <form onSubmit={handleAddressSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="City, address or zip code…"
                  className="flex-1 rounded-xl border border-white/40 bg-white/40 px-3 py-2 text-sm backdrop-blur-sm transition focus:bg-white/70 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:focus:bg-black/40"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-white/60 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/80 active:scale-95 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  Go →
                </button>
              </form>
              {locationError && (
                <p className="animate-fade-in-up mt-2 text-center text-sm text-red-500">{locationError}</p>
              )}
            </div>

            {/* How it works */}
            <div
              className="animate-fade-in-up grid w-full max-w-md grid-cols-3 gap-3"
              style={{ animationDelay: "240ms" }}
            >
              {[
                { emoji: "📍", title: "Set location", desc: "GPS or type an address" },
                { emoji: "🔍", title: "Browse eats", desc: "Top-scored spots near you" },
                { emoji: "✨", title: "Pick or let us", desc: "One-tap if you're stuck" },
              ].map(({ emoji, title, desc }) => (
                <div key={title} className="glass rounded-xl p-3">
                  <p className="text-2xl">{emoji}</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{title}</p>
                  <p className="mt-0.5 text-xs leading-tight text-zinc-500 dark:text-zinc-400">{desc}</p>
                </div>
              ))}
            </div>
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => runSearch(coords, filters)}
                  className="accent-text text-sm font-medium transition hover:underline"
                >
                  Refresh
                </button>
                {!searching && results.length > 0 && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {results.length} spot{results.length !== 1 ? "s" : ""} found
                  </span>
                )}
              </div>
              <SuggestButton coords={coords} filters={filters} onPick={setSuggested} />
            </div>

            {suggested && (
              <div className="animate-pop-in">
                <h2 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  Tonight&apos;s pick ✨
                </h2>
                <RestaurantCard restaurant={suggested} highlighted unit={unit} currency={currency} />
              </div>
            )}

            {searching && (
              <div className="glass flex items-center gap-3 rounded-2xl p-4 text-zinc-600 dark:text-zinc-300">
                <span className="accent-gradient h-2 w-2 animate-ping rounded-full" />
                Finding the best spots near you…
              </div>
            )}
            {searchError && (
              <p className="animate-fade-in-up text-red-500">{searchError}</p>
            )}
            {!searching && !searchError && results.length === 0 && (
              <div className="glass animate-fade-in-up rounded-2xl p-6 text-center">
                <p className="text-2xl">🔍</p>
                <p className="mt-2 font-medium text-zinc-700 dark:text-zinc-300">No restaurants found</p>
                <p className="mt-1 text-sm text-zinc-500">Try widening your radius or loosening filters.</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {results
                .filter((r) => r.placeId !== suggested?.placeId)
                .map((r, i) => (
                  <div
                    key={r.placeId}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i * 50, 500)}ms` }}
                  >
                    <RestaurantCard restaurant={r} unit={unit} currency={currency} />
                  </div>
                ))}
            </div>

            {/* Google attribution — required by Places API ToS */}
            {!searching && results.length > 0 && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Powered by Google
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
