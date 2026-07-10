const HISTORY_KEY = "nearbyeats-history-v1";
const MAX_HISTORY = 8;

export interface HistoryItem {
  placeId: string;
  name: string;
  rating: number | null;
  address: string;
  viewedAt: number;
}

function load(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function persist(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

export function addToHistory(
  item: Pick<HistoryItem, "placeId" | "name" | "rating" | "address">,
): void {
  const existing = load().filter((h) => h.placeId !== item.placeId);
  existing.unshift({ ...item, viewedAt: Date.now() });
  persist(existing.slice(0, MAX_HISTORY));
}

export function getHistory(): HistoryItem[] {
  return load();
}
