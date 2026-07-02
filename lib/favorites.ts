const KEY = "nearbyeats-favorites-v1";

function load(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persist(favs: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...favs]));
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

export function isFavorite(placeId: string): boolean {
  return load().has(placeId);
}

/** Returns the new saved state (true = now saved, false = now removed). */
export function toggleFavorite(placeId: string): boolean {
  const favs = load();
  if (favs.has(placeId)) {
    favs.delete(placeId);
    persist(favs);
    return false;
  }
  favs.add(placeId);
  persist(favs);
  return true;
}

export function getFavoriteIds(): string[] {
  return [...load()];
}
