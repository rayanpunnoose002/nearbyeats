"use client";

import { useState } from "react";
import type { PlaceDetails, RestaurantSummary, DistanceUnit, CurrencyInfo } from "@/lib/types";
import { formatDistance, priceLevelToSymbol, formatPriceRange, googleMapsUrl } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: RestaurantSummary;
  highlighted?: boolean;
  unit: DistanceUnit;
  currency: CurrencyInfo;
}

export default function RestaurantCard({
  restaurant,
  highlighted,
  unit,
  currency,
}: RestaurantCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExpand() {
    setExpanded((prev) => !prev);
    if (details || expanded) return;

    setLoadingDetails(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurant.placeId}?lat=${restaurant.lat}&lng=${restaurant.lng}`,
      );
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      setDetails(data);
    } catch {
      setError("Couldn't load reviews. Try again.");
    } finally {
      setLoadingDetails(false);
    }
  }

  function openInMaps() {
    window.open(googleMapsUrl(restaurant.placeId, restaurant.name), "_blank", "noopener,noreferrer");
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openInMaps}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") openInMaps();
      }}
      className={`group cursor-pointer rounded-2xl p-4 transition-all duration-300 ${
        highlighted ? "glass-strong ring-2" : "glass-card"
      }`}
      style={highlighted ? { boxShadow: "0 0 0 2px var(--accent-from)" } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-900 transition-colors dark:text-white">
            {restaurant.name}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{restaurant.address}</p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-white/50 px-2 py-0.5 text-sm font-medium backdrop-blur-sm dark:bg-black/30">
          {formatDistance(restaurant.distanceMeters, unit)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm">
        {restaurant.rating !== null && (
          <span>
            ⭐ {restaurant.rating.toFixed(1)} ({restaurant.userRatingCount})
          </span>
        )}
        {restaurant.priceLevel && (
          <span className="flex items-baseline gap-1">
            <span>{priceLevelToSymbol(restaurant.priceLevel)}</span>
            {formatPriceRange(restaurant.priceLevel, currency) && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatPriceRange(restaurant.priceLevel, currency)}
              </span>
            )}
          </span>
        )}
        {restaurant.openNow !== null && (
          <span
            className={`flex items-center gap-1 ${
              restaurant.openNow ? "text-green-600 dark:text-green-400" : "text-red-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                restaurant.openNow ? "animate-pulse bg-green-500" : "bg-red-500"
              }`}
            />
            {restaurant.openNow ? "Open now" : "Closed"}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleExpand();
          }}
          className="accent-text text-sm font-medium transition hover:underline"
        >
          {expanded ? "Hide reviews" : "Show reviews"}
        </button>
        <span className="text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
          Open in Maps ↗
        </span>
      </div>

      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-fade-in-up mt-3 space-y-3 border-t border-white/30 pt-3 dark:border-white/10"
        >
          {loadingDetails && (
            <div className="space-y-2">
              <div className="shimmer h-3 w-3/4 rounded" />
              <div className="shimmer h-3 w-1/2 rounded" />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {details?.reviews.length === 0 && (
            <p className="text-sm text-zinc-500">No reviews available.</p>
          )}
          {details?.reviews.map((review, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium">
                {review.authorName} · ⭐ {review.rating}{" "}
                <span className="text-zinc-400">
                  · {review.relativePublishTimeDescription}
                </span>
              </p>
              <p className="text-zinc-600 dark:text-zinc-300">{review.text}</p>
            </div>
          ))}
          {details && (
            <p className="text-xs text-zinc-400">
              Reviews via{" "}
              <a
                href={details.googleMapsUri}
                target="_blank"
                rel="noreferrer"
                className="underline"
                onClick={(e) => e.stopPropagation()}
              >
                Google Maps
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
