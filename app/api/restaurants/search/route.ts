import { NextRequest, NextResponse } from "next/server";
import { searchNearby, type PriceLevel } from "@/lib/places";
import { checkRateLimit, getClientIP } from "@/lib/ratelimit";

const MILES_TO_METERS = 1609.34;
const MAX_RADIUS_METERS = 50000;

export async function GET(req: NextRequest) {
  if (!checkRateLimit(getClientIP(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const params = req.nextUrl.searchParams;

  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  const radiusMiles = parseFloat(params.get("radiusMiles") ?? "5");
  const minRating = params.get("minRating");
  const priceLevels = params.get("priceLevels");
  const cuisine = params.get("cuisine");
  const openNow = params.get("openNow");
  const dietaryPref = params.get("dietaryPref") ?? "both";

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params are required" },
      { status: 400 },
    );
  }

  const radiusMeters = Math.min(
    Math.max(radiusMiles, 0.1) * MILES_TO_METERS,
    MAX_RADIUS_METERS,
  );

  try {
    const vegTypes = ["vegetarian_restaurant", "vegan_restaurant"];
    const includedPrimaryTypes =
      dietaryPref === "veg"
        ? vegTypes
        : cuisine
        ? [cuisine]
        : undefined;

    const results = await searchNearby({
      lat,
      lng,
      radiusMeters,
      minRating: minRating ? parseFloat(minRating) : undefined,
      priceLevels: priceLevels
        ? (priceLevels.split(",") as PriceLevel[])
        : undefined,
      includedPrimaryTypes,
      openNow: openNow === "true",
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 502 },
    );
  }
}
