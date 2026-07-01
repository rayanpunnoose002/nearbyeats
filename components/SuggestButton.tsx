"use client";

import { useState } from "react";
import type { RestaurantSummary, Filters } from "@/lib/types";

interface SuggestButtonProps {
  coords: { lat: number; lng: number } | null;
  filters: Filters;
  onPick: (restaurant: RestaurantSummary | null) => void;
}

export default function SuggestButton({
  coords,
  filters,
  onPick,
}: SuggestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<string[]>([]);

  async function handleSuggest() {
    if (!coords) {
      setError("We need your location to suggest a spot.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          radiusMiles: filters.radiusMiles,
          minRating: filters.minRating,
          priceLevels: filters.priceLevels.length ? filters.priceLevels : undefined,
          cuisine: filters.cuisine,
          openNow: filters.openNow,
          exclude: shown,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No matching restaurants found.");
        onPick(null);
        setShown([]);
        return;
      }

      setShown((prev) => [...prev, data.pick.placeId]);
      onPick(data.pick);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleSuggest}
        disabled={loading}
        className="accent-gradient relative overflow-hidden rounded-full px-6 py-2.5 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
      >
        <span className={loading ? "animate-pulse" : ""}>
          {loading ? "Picking…" : shown.length > 0 ? "Suggest again" : "✨ Suggest a spot for me"}
        </span>
      </button>
      {error && <p className="animate-fade-in-up text-sm text-red-500">{error}</p>}
    </div>
  );
}
