"use client";

import type { RestaurantSummary, DistanceUnit } from "@/lib/types";
import { formatDistance, priceLevelToSymbol, googleMapsUrl } from "@/lib/types";

interface HotelCardProps {
  hotel: RestaurantSummary;
  unit: DistanceUnit;
  highlighted?: boolean;
}

export default function HotelCard({ hotel, unit, highlighted }: HotelCardProps) {
  function openInMaps() {
    window.open(
      googleMapsUrl(hotel.placeId, hotel.name),
      "_blank",
      "noopener,noreferrer",
    );
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
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 shrink-0 text-xl">🍽️</span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-zinc-900 dark:text-white">
              {hotel.name}
            </h3>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {hotel.address}
            </p>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium backdrop-blur-sm dark:bg-black/30">
          {formatDistance(hotel.distanceMeters, unit)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm">
        {hotel.rating !== null && (
          <span>
            ⭐ {hotel.rating.toFixed(1)}{" "}
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({hotel.userRatingCount.toLocaleString()})
            </span>
          </span>
        )}
        {hotel.priceLevel && (
          <span className="text-zinc-500 dark:text-zinc-400">
            {priceLevelToSymbol(hotel.priceLevel)}
          </span>
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <span className="text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
          View on Maps ↗
        </span>
      </div>
    </div>
  );
}
