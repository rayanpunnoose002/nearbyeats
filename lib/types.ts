export type { RestaurantSummary, PlaceDetails, PlaceReview, PriceLevel } from "./places";
export { priceLevelToSymbol, formatPriceRange, CURRENCIES, getCurrency, currencyForCountry } from "./currency";
export type { CurrencyInfo } from "./currency";

export type DistanceUnit = "mi" | "km";

export type DietaryPref = "both" | "veg" | "nonveg";

export interface Filters {
  radiusMiles: number;
  minRating: number | null;
  priceLevels: string[];
  cuisine: string | null;
  openNow: boolean;
  dietaryPref: DietaryPref;
}

export const CUISINE_OPTIONS: { label: string; value: string }[] = [
  { label: "Any", value: "" },
  { label: "Italian", value: "italian_restaurant" },
  { label: "Sushi", value: "sushi_restaurant" },
  { label: "Mexican", value: "mexican_restaurant" },
  { label: "Chinese", value: "chinese_restaurant" },
  { label: "Indian", value: "indian_restaurant" },
  { label: "Pizza", value: "pizza_restaurant" },
  { label: "Burger", value: "hamburger_restaurant" },
  { label: "Thai", value: "thai_restaurant" },
  { label: "American", value: "american_restaurant" },
];

export const PRICE_LEVEL_OPTIONS: { label: string; value: string }[] = [
  { label: "$", value: "PRICE_LEVEL_INEXPENSIVE" },
  { label: "$$", value: "PRICE_LEVEL_MODERATE" },
  { label: "$$$", value: "PRICE_LEVEL_EXPENSIVE" },
  { label: "$$$$", value: "PRICE_LEVEL_VERY_EXPENSIVE" },
];

export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

export function kmToMiles(km: number): number {
  return km / 1.60934;
}

export function formatDistance(meters: number, unit: DistanceUnit): string {
  const value = unit === "mi" ? metersToMiles(meters) : metersToKm(meters);
  return `${value.toFixed(1)} ${unit}`;
}

export function googleMapsUrl(placeId: string, name: string): string {
  const query = encodeURIComponent(name);
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${placeId}`;
}
