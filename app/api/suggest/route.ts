import { NextRequest, NextResponse } from "next/server";
import { searchNearby, type PriceLevel } from "@/lib/places";
import { pickWeightedRandom } from "@/lib/suggest";

const MILES_TO_METERS = 1609.34;
const MAX_RADIUS_METERS = 50000;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    lat,
    lng,
    radiusMiles = 5,
    minRating,
    priceLevels,
    cuisine,
    openNow,
    exclude = [],
  } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );
  }

  const radiusMeters = Math.min(
    Math.max(radiusMiles, 0.1) * MILES_TO_METERS,
    MAX_RADIUS_METERS,
  );

  try {
    const results = await searchNearby({
      lat,
      lng,
      radiusMeters,
      minRating,
      priceLevels: priceLevels as PriceLevel[] | undefined,
      includedPrimaryTypes: cuisine ? [cuisine] : undefined,
      openNow,
    });

    const pick = pickWeightedRandom(results, new Set(exclude as string[]));

    if (!pick) {
      return NextResponse.json(
        { error: "No restaurants found matching your filters" },
        { status: 404 },
      );
    }

    return NextResponse.json({ pick });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to suggest a restaurant" },
      { status: 502 },
    );
  }
}
