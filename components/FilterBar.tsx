"use client";

import {
  CUISINE_OPTIONS,
  PRICE_LEVEL_OPTIONS,
  type Filters,
  type DistanceUnit,
  type CurrencyInfo,
  type DietaryPref,
  CURRENCIES,
  formatPriceRange,
  milesToKm,
  kmToMiles,
} from "@/lib/types";

const DIETARY_OPTIONS: { value: DietaryPref; label: string }[] = [
  { value: "both",   label: "🍽️ Both"    },
  { value: "veg",    label: "🥗 Veg"     },
  { value: "nonveg", label: "🍗 Non-Veg" },
];

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  unit: DistanceUnit;
  onUnitChange: (unit: DistanceUnit) => void;
  currency: CurrencyInfo;
  onCurrencyChange: (code: string) => void;
}

export default function FilterBar({
  filters,
  onChange,
  unit,
  onUnitChange,
  currency,
  onCurrencyChange,
}: FilterBarProps) {
  function togglePriceLevel(value: string) {
    const has = filters.priceLevels.includes(value);
    const next = has
      ? filters.priceLevels.filter((v) => v !== value)
      : [...filters.priceLevels, value];
    onChange({ ...filters, priceLevels: next });
  }

  const MIN_MILES = 0.5;
  const MAX_MILES = 25;
  const displayValue = unit === "mi" ? filters.radiusMiles : milesToKm(filters.radiusMiles);
  const displayMin = unit === "mi" ? MIN_MILES : Math.round(milesToKm(MIN_MILES));
  const displayMax = unit === "mi" ? MAX_MILES : Math.round(milesToKm(MAX_MILES));
  const percent = ((displayValue - displayMin) / (displayMax - displayMin)) * 100;

  function handleRadiusInput(value: number) {
    const miles = unit === "mi" ? value : kmToMiles(value);
    onChange({ ...filters, radiusMiles: miles });
  }

  return (
    <div className="glass flex flex-col gap-5 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Distance
            </span>
            <span className="accent-text text-sm font-bold">
              {displayValue.toFixed(1)} {unit}
            </span>
          </div>
          <input
            type="range"
            min={displayMin}
            max={displayMax}
            step={unit === "mi" ? 0.5 : 1}
            value={displayValue}
            onChange={(e) => handleRadiusInput(parseFloat(e.target.value))}
            className="ios-slider w-full"
            style={{
              background: `linear-gradient(to right, var(--accent-from) ${percent}%, rgba(120,120,128,0.24) ${percent}%)`,
            }}
          />
        </div>

        <div className="segmented">
          {(["mi", "km"] as DistanceUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => onUnitChange(u)}
              className={unit === u ? "active" : ""}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-200">Min rating</span>
          <select
            value={filters.minRating ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                minRating: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="rounded-lg border border-white/40 bg-white/50 px-2 py-1.5 backdrop-blur-sm transition focus:outline-none dark:border-white/10 dark:bg-black/20"
          >
            <option value="">Any</option>
            <option value="3">3.0+</option>
            <option value="3.5">3.5+</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-200">Cuisine</span>
          <select
            value={filters.cuisine ?? ""}
            onChange={(e) =>
              onChange({ ...filters, cuisine: e.target.value || null })
            }
            className="rounded-lg border border-white/40 bg-white/50 px-2 py-1.5 backdrop-blur-sm transition focus:outline-none dark:border-white/10 dark:bg-black/20"
          >
            {CUISINE_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-200">Currency</span>
          <select
            value={currency.code}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="rounded-lg border border-white/40 bg-white/50 px-2 py-1.5 backdrop-blur-sm transition focus:outline-none dark:border-white/10 dark:bg-black/20"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 self-center text-sm font-medium text-zinc-700 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={filters.openNow}
            onChange={(e) => onChange({ ...filters, openNow: e.target.checked })}
            className="h-4 w-4"
            style={{ accentColor: "var(--accent-from)" }}
          />
          Open now
        </label>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-200">Dietary preference</span>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...filters, dietaryPref: opt.value })}
              className={`filter-pill ${filters.dietaryPref === opt.value ? "active" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-200">Price range</span>
        <div className="flex flex-wrap gap-2">
          {PRICE_LEVEL_OPTIONS.map((p) => {
            const active = filters.priceLevels.includes(p.value);
            const range = formatPriceRange(p.value, currency);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePriceLevel(p.value)}
                className={`flex flex-col items-center rounded-xl border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-90 ${
                  active
                    ? "accent-gradient border-transparent text-white shadow-md"
                    : "border-white/40 bg-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-black/20 dark:hover:bg-black/30"
                }`}
              >
                <span>{p.label}</span>
                {range && (
                  <span className={`text-[10px] font-normal ${active ? "text-white/80" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {range}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Price ranges are rough estimates based on Google's price level, not live pricing.
        </span>
      </div>
    </div>
  );
}
