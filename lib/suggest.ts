import type { RestaurantSummary } from "./places";

export function weightOf(restaurant: RestaurantSummary): number {
  const rating = restaurant.rating ?? 3;
  const ratingCount = restaurant.userRatingCount;
  const distanceMeters = Math.max(restaurant.distanceMeters, 50);

  return (rating ** 2 * Math.log(ratingCount + 1)) / distanceMeters;
}

export function pickWeightedRandom(
  restaurants: RestaurantSummary[],
  exclude: Set<string> = new Set(),
  random: () => number = Math.random,
): RestaurantSummary | null {
  const candidates = restaurants.filter((r) => !exclude.has(r.placeId));
  const pool = candidates.length > 0 ? candidates : restaurants;
  if (pool.length === 0) return null;

  const weights = pool.map(weightOf);
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return pool[Math.floor(random() * pool.length)];

  let roll = random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
