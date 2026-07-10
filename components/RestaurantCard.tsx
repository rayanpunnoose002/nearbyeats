"use client";

import { useEffect, useState } from "react";
import type { PlaceDetails, RestaurantSummary, DistanceUnit, CurrencyInfo } from "@/lib/types";
import { formatDistance, priceLevelToSymbol, formatPriceRange, googleMapsUrl } from "@/lib/types";
import { computeBadges } from "@/lib/badges";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

interface AISummary {
  pros: string[];
  cons: string[];
  vibe: string;
}

interface RestaurantCardProps {
  restaurant: RestaurantSummary;
  highlighted?: boolean;
  unit: DistanceUnit;
  currency: CurrencyInfo;
  onFavoriteToggle?: () => void;
  onView?: () => void;
}

export default function RestaurantCard({
  restaurant,
  highlighted,
  unit,
  currency,
  onFavoriteToggle,
  onView,
}: RestaurantCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    setSaved(isFavorite(restaurant.placeId));
  }, [restaurant.placeId]);

  const badges = computeBadges(restaurant);

  const photoSrc =
    restaurant.photoName && !imgError
      ? `/api/photo?name=${encodeURIComponent(restaurant.photoName)}`
      : null;

  async function handleExpand() {
    const isFirstOpen = !expanded && !details;
    setExpanded((prev) => !prev);
    if (isFirstOpen) onView?.();
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

  function handleToggleSave(e: React.MouseEvent) {
    e.stopPropagation();
    const next = toggleFavorite(restaurant.placeId);
    setSaved(next);
    onFavoriteToggle?.();
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = googleMapsUrl(restaurant.placeId, restaurant.name);
    try {
      if (navigator.share) {
        await navigator.share({ title: restaurant.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share dialog — ignore
    }
  }

  async function fetchAISummary(e: React.MouseEvent) {
    e.stopPropagation();
    if (!details || details.reviews.length < 2) return;
    setLoadingAI(true);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: details.reviews, name: restaurant.name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.pros)) setAiSummary(data as AISummary);
      }
    } catch {
      // Silently fail — not critical
    } finally {
      setLoadingAI(false);
    }
  }

  const mapsUri = details?.googleMapsUri ?? googleMapsUrl(restaurant.placeId, restaurant.name);
  const hasServiceInfo = restaurant.dineIn !== null || restaurant.takeout !== null || restaurant.delivery !== null;

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

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Save button */}
        <button
          type="button"
          onClick={handleToggleSave}
          aria-label={saved ? "Remove from favourites" : "Save to favourites"}
          className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm backdrop-blur-sm transition-all duration-200 ${
            saved ? "bg-red-500/90 shadow-md" : "bg-black/30 opacity-0 group-hover:opacity-100"
          }`}
        >
          {saved ? "❤️" : "🤍"}
        </button>

        {/* Open/closed badge */}
        {restaurant.openNow !== null && (
          <span
            className={`absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm ${
              restaurant.openNow ? "bg-green-500/80" : "bg-red-500/75"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${restaurant.openNow ? "animate-pulse bg-white" : "bg-white/60"}`} />
            {restaurant.openNow ? "Open" : "Closed"}
          </span>
        )}

        <span className="absolute bottom-2 left-3 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {formatDistance(restaurant.distanceMeters, unit)} away
        </span>

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

        {/* Quality badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                style={{ background: b.gradient }}
              >
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        )}

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

        {/* Service badges */}
        {hasServiceInfo && (
          <div className="flex flex-wrap gap-1">
            {restaurant.dineIn && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                🪑 Dine-in
              </span>
            )}
            {restaurant.takeout && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                🥡 Takeout
              </span>
            )}
            {restaurant.delivery && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                🛵 Delivery
              </span>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleExpand(); }}
            className="accent-text text-sm font-medium transition hover:underline"
          >
            {expanded ? "Hide reviews" : "See reviews"}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 text-xs text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {copied ? (
                <span className="text-green-500">✓ Copied</span>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z" />
                  </svg>
                  Share
                </>
              )}
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

            {/* AI Summary */}
            {details && (details.reviews.length >= 2) && !aiSummary && !loadingAI && (
              <button
                type="button"
                onClick={fetchAISummary}
                className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-600 transition hover:bg-violet-500/20 dark:text-violet-400"
              >
                ✨ AI Summary
              </button>
            )}
            {loadingAI && (
              <div className="space-y-1.5">
                <div className="shimmer h-3 w-full rounded" />
                <div className="shimmer h-3 w-3/4 rounded" />
                <div className="shimmer h-3 w-5/6 rounded" />
              </div>
            )}
            {aiSummary && (
              <div className="animate-fade-in-up rounded-xl bg-violet-500/10 p-3 dark:bg-violet-500/5">
                <p className="mb-2 text-xs font-semibold text-violet-600 dark:text-violet-400">
                  ✨ AI Summary
                </p>
                <p className="mb-2.5 text-xs italic text-zinc-500 dark:text-zinc-400">
                  {aiSummary.vibe}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    {aiSummary.pros.map((p, i) => (
                      <p key={i} className="flex items-start gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                        <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                        {p}
                      </p>
                    ))}
                  </div>
                  {aiSummary.cons.length > 0 && (
                    <div className="space-y-1">
                      {aiSummary.cons.map((c, i) => (
                        <p key={i} className="flex items-start gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                          <span className="mt-0.5 shrink-0 text-zinc-400">−</span>
                          {c}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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
