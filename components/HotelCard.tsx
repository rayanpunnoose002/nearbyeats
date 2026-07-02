"use client";

import { useState } from "react";
import type { RestaurantSummary, DistanceUnit } from "@/lib/types";
import { formatDistance, priceLevelToSymbol, googleMapsUrl } from "@/lib/types";

interface HotelCardProps {
  hotel: RestaurantSummary;
  unit: DistanceUnit;
  highlighted?: boolean;
}

export default function HotelCard({ hotel, unit, highlighted }: HotelCardProps) {
  const [imgError, setImgError] = useState(false);

  const photoSrc =
    hotel.photoName && !imgError
      ? `/api/photo?name=${encodeURIComponent(hotel.photoName)}`
      : null;

  function openInMaps() {
    window.open(googleMapsUrl(hotel.placeId, hotel.name), "_blank", "noopener,noreferrer");
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openInMaps}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") openInMaps();
      }}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl transition-all duration-300 ${
        highlighted ? "glass-strong ring-2" : "glass-card"
      }`}
      style={highlighted ? { boxShadow: "0 0 0 2px var(--accent-from)" } : undefined}
    >
      {/* ── Photo hero ── */}
      <div className="relative h-32 shrink-0 overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={hotel.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="accent-gradient h-full w-full opacity-40" />
        )}

        {/* Overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Open / closed badge */}
        {hotel.openNow !== null && (
          <span
            className={`absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm ${
              hotel.openNow ? "bg-green-500/80" : "bg-red-500/75"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                hotel.openNow ? "animate-pulse bg-white" : "bg-white/60"
              }`}
            />
            {hotel.openNow ? "Open" : "Closed"}
          </span>
        )}

        {/* Maps hover hint */}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          Maps ↗
        </span>
      </div>

      {/* ── Info body ── */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {hotel.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {hotel.address}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {hotel.rating !== null && (
              <span className="flex items-center gap-1">
                <span>⭐</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {hotel.rating.toFixed(1)}
                </span>
                <span className="text-zinc-400">
                  ({hotel.userRatingCount.toLocaleString()})
                </span>
              </span>
            )}
            {hotel.priceLevel && (
              <span className="font-medium text-zinc-500 dark:text-zinc-400">
                {priceLevelToSymbol(hotel.priceLevel)}
              </span>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-white/50 px-2 py-0.5 font-medium backdrop-blur-sm dark:bg-black/30">
            {formatDistance(hotel.distanceMeters, unit)}
          </span>
        </div>
      </div>
    </div>
  );
}
