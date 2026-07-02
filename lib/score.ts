import type { RestaurantSummary, PriceLevel } from "./places";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIOR_MEAN = 3.8;
// 180 phantom reviews: raises the bar so a restaurant needs more real-world
// validation before its raw rating pulls away from the global average.
// This keeps very-low-volume places (< ~50 reviews) from polluting the top.
const PRIOR_WEIGHT = 180;

const POPULARITY_CAP = 15_000;
const PROXIMITY_HALF_LIFE_M = 1_500;

// Hard quality floor — Bayesian rating must clear this to appear at all.
// Raised from 3.65 → 3.80 to filter out genuinely mediocre places.
// With PRIOR_WEIGHT=180 a raw 4.5★ from 5 reviews only reaches ~3.84,
// so a place needs real volume to climb above this floor.
const MIN_BAYESIAN_RATING = 3.80;

// Minimum reviews required to show — relaxed automatically when results are scarce.
const MIN_REVIEW_COUNT = 20;

// Confirmed-closed places have their score multiplied by this factor so they
// sink below any open restaurant of comparable quality.
const CLOSED_MULTIPLIER = 0.50;

const PRICE_VALUE_FACTOR: Record<PriceLevel | "UNKNOWN", number> = {
  PRICE_LEVEL_UNSPECIFIED:    0.95,
  PRICE_LEVEL_FREE:           1.10,
  PRICE_LEVEL_INEXPENSIVE:    1.05,
  PRICE_LEVEL_MODERATE:       1.00,
  PRICE_LEVEL_EXPENSIVE:      0.88,
  PRICE_LEVEL_VERY_EXPENSIVE: 0.72,
  UNKNOWN:                    0.95,
};

// ─── Individual components (each returns 0-1) ─────────────────────────────────

export function bayesianRating(r: RestaurantSummary): number {
  const raw = r.rating ?? PRIOR_MEAN;
  const n = r.userRatingCount;
  return (n * raw + PRIOR_WEIGHT * PRIOR_MEAN) / (n + PRIOR_WEIGHT);
}

function qualityScore(r: RestaurantSummary): number {
  return bayesianRating(r) / 5;
}

function popularityScore(r: RestaurantSummary): number {
  const capped = Math.min(r.userRatingCount, POPULARITY_CAP);
  return Math.log10(capped + 1) / Math.log10(POPULARITY_CAP + 1);
}

function valueScore(r: RestaurantSummary): number {
  const factor =
    PRICE_VALUE_FACTOR[
      (r.priceLevel as PriceLevel | null) ?? ("UNKNOWN" as const)
    ] ?? 0.95;
  return qualityScore(r) * factor;
}

function proximityScore(r: RestaurantSummary): number {
  return PROXIMITY_HALF_LIFE_M / (PROXIMITY_HALF_LIFE_M + r.distanceMeters);
}

// ─── Combined score ────────────────────────────────────────────────────────────

/**
 * Composite score (higher = better).
 *
 *   57% quality    — Bayesian-smoothed rating (raised; quality matters most)
 *   18% popularity — log-scale review count (reduced; chains shouldn't dominate)
 *   12% value      — quality relative to price level
 *    9% proximity  — soft preference for nearby places
 *    4% open bonus — currently open
 *   +2% photo      — has at least one photo (mild establishment-quality signal)
 *
 * Confirmed-closed restaurants are multiplied by CLOSED_MULTIPLIER (0.5)
 * so they always rank below open places of comparable quality.
 */
export function scoreRestaurant(r: RestaurantSummary): number {
  const open = r.openNow === true ? 1 : 0;
  const photoBonus = r.photoName ? 0.02 : 0;

  const raw =
    0.57 * qualityScore(r) +
    0.18 * popularityScore(r) +
    0.12 * valueScore(r) +
    0.09 * proximityScore(r) +
    0.04 * open +
    photoBonus;

  // Halve the score for confirmed-closed places
  return r.openNow === false ? raw * CLOSED_MULTIPLIER : raw;
}

// ─── Public helpers ────────────────────────────────────────────────────────────

/**
 * Apply hard-floor filters then sort by score.
 * Falls back gracefully if the strict filters leave too few results:
 *   pass 1 — MIN_REVIEW_COUNT + MIN_BAYESIAN_RATING
 *   pass 2 — MIN_BAYESIAN_RATING only (relax review floor)
 *   pass 3 — original list (last resort for very sparse areas)
 */
export function rankRestaurants(
  restaurants: RestaurantSummary[],
): RestaurantSummary[] {
  const byScore = (a: RestaurantSummary, b: RestaurantSummary) =>
    scoreRestaurant(b) - scoreRestaurant(a);

  // Pass 1: full quality + volume gate
  const strict = restaurants.filter(
    (r) =>
      r.userRatingCount >= MIN_REVIEW_COUNT &&
      bayesianRating(r) >= MIN_BAYESIAN_RATING,
  );
  if (strict.length >= 3) return [...strict].sort(byScore);

  // Pass 2: relax review floor but keep quality gate
  const qualityOnly = restaurants.filter(
    (r) => bayesianRating(r) >= MIN_BAYESIAN_RATING,
  );
  if (qualityOnly.length >= 2) return [...qualityOnly].sort(byScore);

  // Pass 3: sparse area — rank everything, at least it'll be best-first
  return [...restaurants].sort(byScore);
}

/**
 * Hard minimums for anything that can be actively suggested.
 * The list view is more lenient; the suggestion button only fires on places
 * we are genuinely confident about.
 * Raised: 4.0→4.1 Bayesian, 40→60 reviews — only suggest truly great places.
 */
const SUGGEST_MIN_BAYESIAN_RATING = 4.1;
const SUGGEST_MIN_REVIEWS = 60;

export function suggestionWeight(r: RestaurantSummary): number {
  // Never suggest permanently/temporarily closed or operationally unknown places
  if (r.businessStatus != null && r.businessStatus !== "OPERATIONAL") return 0;
  // Never suggest places below the confidence floor
  if (bayesianRating(r) < SUGGEST_MIN_BAYESIAN_RATING) return 0;
  if (r.userRatingCount < SUGGEST_MIN_REVIEWS) return 0;
  return Math.max(scoreRestaurant(r), 0) ** 3;
}
