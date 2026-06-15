export type RegionalPrice = {
  symbol: string;
  amount: string;
  currency: string;
  label: string;
  note: string;
};

const PRICES: Record<string, RegionalPrice> = {
  USD: { symbol: "$",  amount: "9.99",  currency: "USD", label: "$9.99 / mo",  note: "" },
  MUR: { symbol: "Rs", amount: "450",   currency: "MUR", label: "Rs 450 / mo", note: "≈ $9.99 USD" },
  EUR: { symbol: "€",  amount: "9.50",  currency: "EUR", label: "€9.50 / mo",  note: "" },
  SCR: { symbol: "₨",  amount: "135",   currency: "SCR", label: "₨135 / mo",   note: "≈ $9.99 USD" },
};

const TZ_CURRENCY: Record<string, string> = {
  "Indian/Mauritius": "MUR",
  "Indian/Reunion":   "EUR",
  "Indian/Mahe":      "SCR", // Seychelles
};

export function getRegionalProPrice(): RegionalPrice {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return PRICES[TZ_CURRENCY[tz] ?? "USD"] ?? PRICES.USD;
  } catch {
    return PRICES.USD;
  }
}
