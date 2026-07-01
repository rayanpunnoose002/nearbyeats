import { NextRequest, NextResponse } from "next/server";
import { searchNearby, getPlaceDetails, type PriceLevel, type RestaurantSummary } from "@/lib/places";
import { hasCriticalFlag, reviewTrustScore } from "@/lib/redflags";
import { bayesianRating, scoreRestaurant } from "@/lib/score";

const MILES_TO_METERS = 1609.34;
const MAX_RADIUS_METERS = 50000;
// Fetch details for top N candidates to check review content
const VERIFY_TOP_N = 6;

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
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
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

    const excludeSet = new Set(exclude as string[]);
    const topCandidates = results
      .filter((r) => !excludeSet.has(r.placeId))
      .slice(0, VERIFY_TOP_N);

    if (topCandidates.length === 0) {
      return NextResponse.json(
        { error: "No restaurants found matching your filters" },
        { status: 404 },
      );
    }

    // Fetch Place Details for each candidate in parallel to access review content
    const detailResults = await Promise.allSettled(
      topCandidates.map((r) => getPlaceDetails(r.placeId, lat, lng)),
    );

    // Build a scored pool with red-flag filtering and trust weighting
    interface Candidate { restaurant: RestaurantSummary; weight: number }
    const pool: Candidate[] = [];

    for (let i = 0; i < topCandidates.length; i++) {
      const r = topCandidates[i];
      const detail = detailResults[i];
      const reviews = detail.status === "fulfilled" ? detail.value.reviews : [];

      // Hard exclusion: critical hygiene/safety keywords in any review
      if (reviews.length > 0 && hasCriticalFlag(reviews)) continue;

      const trust = reviewTrustScore(reviews); // 0–1; penalises polarising review patterns
      const score = scoreRestaurant(r);
      const br = bayesianRating(r);

      // Suggestion weight: score³ × trust — safe, high-quality places dominate
      const weight = Math.max(score, 0) ** 3 * trust * (br >= 4.0 ? 1 : 0.3);
      pool.push({ restaurant: r, weight });
    }

    // Fallback: if red-flag filtering removed everyone, use the top candidate
    const finalPool = pool.length > 0 ? pool : [{ restaurant: topCandidates[0], weight: 1 }];

    // Weighted-random selection
    const total = finalPool.reduce((s, c) => s + c.weight, 0);
    let roll = Math.random() * total;
    let pick = finalPool[finalPool.length - 1].restaurant;
    for (const c of finalPool) {
      roll -= c.weight;
      if (roll <= 0) { pick = c.restaurant; break; }
    }

    return NextResponse.json({ pick });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to suggest a restaurant" }, { status: 502 });
  }
}
