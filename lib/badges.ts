import type { RestaurantSummary } from "./places";
import { bayesianRating } from "./score";

export interface Badge {
  icon: string;
  label: string;
  gradient: string;
}

/**
 * Returns up to 2 badges for a restaurant based on computed quality signals.
 * Priority: Must Try → Top Rated → Hidden Gem → Popular → Best Value
 */
export function computeBadges(r: RestaurantSummary): Badge[] {
  const br = bayesianRating(r);
  const n = r.userRatingCount;
  const raw = r.rating ?? 0;
  const badges: Badge[] = [];

  // 🏆 Must Try: very high Bayesian + substantial review volume
  if (br >= 4.3 && n >= 250) {
    badges.push({
      icon: "🏆",
      label: "Must Try",
      gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    });
  }

  // ⭐ Top Rated: high Bayesian quality + solid review base
  if (br >= 4.2 && n >= 150 && badges.length === 0) {
    badges.push({
      icon: "⭐",
      label: "Top Rated",
      gradient: "linear-gradient(135deg, #f59e0b, #f97316)",
    });
  }

  // 💎 Hidden Gem: exceptional raw rating, still under the radar
  if (raw >= 4.6 && n >= 8 && n <= 80 && badges.length < 2) {
    badges.push({
      icon: "💎",
      label: "Hidden Gem",
      gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)",
    });
  }

  // 🔥 Popular: extremely well reviewed with consistent quality
  if (n >= 500 && br >= 3.9 && badges.length < 2) {
    badges.push({
      icon: "🔥",
      label: "Popular",
      gradient: "linear-gradient(135deg, #f97316, #ef4444)",
    });
  }

  // 💰 Best Value: inexpensive price + good quality
  if (
    (r.priceLevel === "PRICE_LEVEL_INEXPENSIVE" || r.priceLevel === "PRICE_LEVEL_FREE") &&
    br >= 4.0 &&
    n >= 25 &&
    badges.length < 2
  ) {
    badges.push({
      icon: "💰",
      label: "Best Value",
      gradient: "linear-gradient(135deg, #10b981, #3b82f6)",
    });
  }

  return badges;
}
