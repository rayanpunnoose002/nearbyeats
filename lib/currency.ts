export interface CurrencyInfo {
  code: string;
  symbol: string;
  label: string;
  /** Approximate units of this currency per 1 USD. Static and only for ballpark display. */
  perUsd: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", symbol: "$", label: "US Dollar", perUsd: 1 },
  { code: "GBP", symbol: "£", label: "British Pound", perUsd: 0.79 },
  { code: "EUR", symbol: "€", label: "Euro", perUsd: 0.92 },
  { code: "INR", symbol: "₹", label: "Indian Rupee", perUsd: 83 },
  { code: "CAD", symbol: "$", label: "Canadian Dollar", perUsd: 1.36 },
  { code: "AUD", symbol: "$", label: "Australian Dollar", perUsd: 1.52 },
  { code: "JPY", symbol: "¥", label: "Japanese Yen", perUsd: 151 },
];

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  IN: "INR",
  CA: "CAD",
  AU: "AUD",
  JP: "JPY",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  IE: "EUR",
  PT: "EUR",
  BE: "EUR",
  AT: "EUR",
  FI: "EUR",
  GR: "EUR",
};

export function currencyForCountry(countryCode: string | null): CurrencyInfo {
  const code = countryCode ? COUNTRY_TO_CURRENCY[countryCode] : undefined;
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** Rough per-person cost range in USD for each Google price level. Approximate, for display only. */
const PRICE_LEVEL_USD_RANGE: Record<string, [number, number]> = {
  PRICE_LEVEL_FREE: [0, 0],
  PRICE_LEVEL_INEXPENSIVE: [10, 20],
  PRICE_LEVEL_MODERATE: [20, 40],
  PRICE_LEVEL_EXPENSIVE: [40, 80],
  PRICE_LEVEL_VERY_EXPENSIVE: [80, 160],
};

export function priceLevelToSymbol(level: string | null): string {
  switch (level) {
    case "PRICE_LEVEL_FREE":
      return "Free";
    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";
    case "PRICE_LEVEL_MODERATE":
      return "$$";
    case "PRICE_LEVEL_EXPENSIVE":
      return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$$";
    default:
      return "";
  }
}

export function formatPriceRange(
  level: string | null,
  currency: CurrencyInfo,
): string | null {
  if (!level || level === "PRICE_LEVEL_UNSPECIFIED") return null;
  const range = PRICE_LEVEL_USD_RANGE[level];
  if (!range) return null;
  if (level === "PRICE_LEVEL_FREE") return "Free";

  const [lowUsd, highUsd] = range;
  const low = Math.round(lowUsd * currency.perUsd);
  const high = Math.round(highUsd * currency.perUsd);
  return `~${currency.symbol}${low}–${high}/person`;
}
