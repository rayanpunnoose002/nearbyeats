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
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const photoSrc =
    restaurant.photoName && !imgError
      ? `/api/photo?name=${encodeURIComponent(restaurant.photoName)}`
      : null;

  async function handleExpand() {
    setExpanded((prev) => !prev);
    if (details || expanded) return;
    setLoadingDetails(true);
    setDetailsError(null);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurant.placeId}?lat=${restaurant.lat}&lng=${restaurant.lng}`,
      );
      if (!res.ok) throw new Error("Failed");
      setDetails(await res.json());
    } catch {
      setDetailsError("Couldn't load reviews. Try again.");
    } finally {
      setLoadingDetails(false);
    }
  }

  function openInMaps(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    window.open(googleMapsUrl(restaurant.placeId, restaurant.name), "_blank", "noopener,noreferrer");
  }

  const mapsUri = details?.googleMapsUri ?? googleMapsUrl(restaurant.placeId, restaurant.name);

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 ${
        highlighted ? "glass-strong ring-2" : "glass-card"
      }`}
      style={highlighted ? { boxShadow: "0 0 0 2px var(--accent-from)" } : undefined}
    >
      {/* ── Photo / gradient hero ── */}
      <div className="relative h-40 shrink-0 overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={restaurant.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="accent-gradient h-full w-full opacity-40" />
        )}

        {/* Overlay gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Open/closed badge */}
        {restaurant.openNow !== null && (
          <span
            className={`absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm ${
              restaurant.openNow ? "bg-green-500/80" : "bg-red-500/75"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                restaurant.openNow ? "animate-pulse bg-white" : "bg-white/60"
              }`}
            />
            {restaurant.openNow ? "Open" : "Closed"}
          </span>
        )}

        {/* Distance badge */}
        <span className="absolute bottom-2 left-3 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {formatDistance(restaurant.distanceMeters, unit)} away
        </span>

        {/* Maps shortcut on hover */}
        <button
          type="button"
          onClick={openInMaps}
          aria-label="Open in Google Maps"
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
        >
          Maps ↗
        </button>
      </div>

      {/* ── Info body ── */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="truncate font-semibold text-zinc-900 dark:text-white">
            {restaurant.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {restaurant.address}
          </p>
        </div>

        {/* Rating + price row */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {restaurant.rating !== null && (
            <span className="flex items-center gap-1">
              <span>⭐</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {restaurant.rating.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-400">
                ({restaurant.userRatingCount.toLocaleString()})
              </span>
            </span>
          )}
          {restaurant.priceLevel && (
            <span className="text-zinc-600 dark:text-zinc-400">
              {priceLevelToSymbol(restaurant.priceLevel)}
              {formatPriceRange(restaurant.priceLevel, currency) && (
                <span className="ml-1 text-xs text-zinc-500">
                  {formatPriceRange(restaurant.priceLevel, currency)}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Actions row */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleExpand(); }}
            className="accent-text text-sm font-medium transition hover:underline"
          >
            {expanded ? "Hide reviews" : "See reviews"}
          </button>
          <a
            href={mapsUri}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            Open in Maps
          </a>
        </div>

        {/* ── Expandable reviews ── */}
        {expanded && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in-up space-y-3 border-t border-white/30 pt-3 dark:border-white/10"
          >
            {loadingDetails && (
              <div className="space-y-2">
                <div className="shimmer h-3 w-3/4 rounded" />
                <div className="shimmer h-3 w-1/2 rounded" />
                <div className="shimmer h-3 w-5/6 rounded" />
              </div>
            )}
            {detailsError && <p className="text-sm text-red-500">{detailsError}</p>}
            {details?.reviews.length === 0 && (
              <p className="text-sm text-zinc-500">No reviews available.</p>
            )}
            {details?.reviews.map((review, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {review.authorName}
                  </span>
                  <span className="text-xs text-zinc-400">
                    ⭐ {review.rating} · {review.relativePublishTimeDescription}
                  </span>
                </div>
                <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">{review.text}</p>
              </div>
            ))}
            {/* Google attribution — required by Places API ToS */}
            {details && (
              <a
                href={details.googleMapsUri}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-1 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Reviews via Google Maps
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
