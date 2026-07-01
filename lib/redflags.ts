import type { PlaceReview } from "./places";

/**
 * Keywords that indicate serious quality or safety problems.
 * A single match in ANY review is enough to disqualify a restaurant
 * from being actively suggested (it can still appear in the list).
 */
const CRITICAL_FLAGS = [
  "food poisoning", "food poison", "got sick", "made me sick", "fell sick",
  "food safety", "cockroach", "cockroaches", "roach", "rat ", "rats ",
  "mouse", "mice", "maggot", "mold", "mould",
  "dirty kitchen", "filthy", "unhygienic", "unsanitary",
  "hair in", "foreign object", "vomit", "diarrhea", "diarrhoea",
  "raw chicken", "undercooked", "food was off", "food tasted off",
  "smelled rotten", "rotten",
];

/** Patterns that indicate chronic service/quality failure across multiple reviews. */
const SOFT_FLAGS = [
  "never coming back", "never again", "worst restaurant", "worst food",
  "avoid", "stay away", "do not go", "don't go", "don't eat",
  "terrible food", "disgusting food", "horrible food", "inedible",
  "rude staff", "extremely rude", "very rude",
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/['']/g, "'");
}

/**
 * Returns true if any review contains a critical safety or hygiene red flag.
 * One critical flag = disqualified from suggestion entirely.
 */
export function hasCriticalFlag(reviews: PlaceReview[]): boolean {
  return reviews.some((r) => {
    const text = normalise(r.text);
    return CRITICAL_FLAGS.some((flag) => text.includes(flag));
  });
}

/**
 * Counts how many soft flags appear across all reviews.
 * Used to compute a trust penalty (not an outright ban).
 */
function softFlagCount(reviews: PlaceReview[]): number {
  let count = 0;
  for (const r of reviews) {
    const text = normalise(r.text);
    for (const flag of SOFT_FLAGS) {
      if (text.includes(flag)) count++;
    }
  }
  return count;
}

/**
 * Review consistency: standard deviation of sample review ratings.
 * Low std dev = consistent experience. High std dev = polarising = risky.
 */
function ratingStdDev(reviews: PlaceReview[]): number {
  if (reviews.length < 2) return 0;
  const ratings = reviews.map((r) => r.rating);
  const mean = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  const variance = ratings.reduce((s, r) => s + (r - mean) ** 2, 0) / ratings.length;
  return Math.sqrt(variance);
}

/**
 * 0–1 trust score derived from review content and consistency.
 * 1.0 = fully trustworthy sample, 0.0 = seriously concerning.
 *
 * Factors:
 *   - Rating std dev: ≥1.5 (bimodal) → heavy penalty
 *   - Soft flag count: each flag reduces trust
 *   - Average review rating: sample ratings below 3.5 reduce trust
 */
export function reviewTrustScore(reviews: PlaceReview[]): number {
  if (reviews.length === 0) return 0.75; // no reviews = mild uncertainty, not a ban

  const stdDev = ratingStdDev(reviews);
  const consistencyPenalty = Math.min(stdDev / 2, 1); // 0 at stdDev=0, 1 at stdDev≥2

  const softFlags = softFlagCount(reviews);
  const softFlagPenalty = Math.min(softFlags * 0.15, 0.45); // up to -0.45

  const avgReviewRating =
    reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const ratingPenalty = Math.max(0, (3.5 - avgReviewRating) / 3.5); // 0 if avg≥3.5

  const trust = 1 - consistencyPenalty * 0.4 - softFlagPenalty - ratingPenalty * 0.2;
  return Math.max(0, Math.min(1, trust));
}
