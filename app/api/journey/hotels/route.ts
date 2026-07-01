import { NextRequest, NextResponse } from "next/server";
import { searchNearby } from "@/lib/places";
import type { PriceLevel } from "@/lib/places";

const MEAL_TYPE_MAP: Record<string, string[]> = {
  any:       ["restaurant"],
  breakfast: ["breakfast_restaurant", "brunch_restaurant", "cafe", "bakery"],
  lunch:     ["restaurant", "fast_food_restaurant", "cafe"],
  dinner:    ["restaurant", "fine_dining_restaurant"],
};

const VEG_MEAL_TYPE_MAP: Record<string, string[]> = {
  any:       ["vegetarian_restaurant", "vegan_restaurant"],
  breakfast: ["vegetarian_restaurant", "vegan_restaurant", "cafe", "bakery"],
  lunch:     ["vegetarian_restaurant", "vegan_restaurant", "cafe"],
  dinner:    ["vegetarian_restaurant", "vegan_restaurant"],
};

const BUDGET_TO_PRICE_LEVEL: Record<string, PriceLevel> = {
  "$":    "PRICE_LEVEL_INEXPENSIVE",
  "$$":   "PRICE_LEVEL_MODERATE",
  "$$$":  "PRICE_LEVEL_EXPENSIVE",
  "$$$$": "PRICE_LEVEL_VERY_EXPENSIVE",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat        = parseFloat(searchParams.get("lat") ?? "");
  const lng        = parseFloat(searchParams.get("lng") ?? "");
  const radiusMeters = Math.min(parseInt(searchParams.get("radius") ?? "15000", 10), 50_000);
  const mealType    = (searchParams.get("mealType") ?? "any") as keyof typeof MEAL_TYPE_MAP;
  const dietaryPref = searchParams.get("dietaryPref") ?? "both";
  const spots       = Math.min(Math.max(parseInt(searchParams.get("spots") ?? "3", 10), 1), 6);
  const minRating  = searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : undefined;
  const budgetRaw  = searchParams.get("budget") ?? "";
  const priceLevels: PriceLevel[] = budgetRaw
    ? budgetRaw.split(",").map(b => BUDGET_TO_PRICE_LEVEL[b]).filter(Boolean)
    : [];

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required." }, { status: 400 });
  }

  try {
    const restaurants = await searchNearby({
      lat,
      lng,
      radiusMeters,
      minRating,
      priceLevels: priceLevels.length ? priceLevels : undefined,
      includedPrimaryTypes:
        dietaryPref === "veg"
          ? (VEG_MEAL_TYPE_MAP[mealType] ?? VEG_MEAL_TYPE_MAP.any)
          : (MEAL_TYPE_MAP[mealType] ?? MEAL_TYPE_MAP.any),
    });
    return NextResponse.json({ results: restaurants.slice(0, spots) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Restaurant search failed." },
      { status: 500 },
    );
  }
}
