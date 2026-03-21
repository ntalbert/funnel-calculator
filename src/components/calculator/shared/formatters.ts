/** Shared formatting utilities — single source of truth for the entire calculator */

/** Abbreviated currency: $1.2M, $150K, $50 */
export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

/** Hybrid currency for input fields: $2.0M for millions, $75,000 for thousands */
export function formatCurrencyInput(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(0)}`;
}

/** Full-precision currency for data tables: $1,234,567 */
export function formatCurrencyFull(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

/** Abbreviated number: 1.2M, 1.5K, 50 */
export function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

/** Precise number for data tables: 0.55 for fractional, 42 for whole */
export function formatNumPrecise(n: number): string {
  return n < 1 && n > 0 ? n.toFixed(2) : n.toFixed(0);
}

/** Percentage from a 0–1 decimal: "50.0%" */
export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/** Whole-number percentage from a 0–1 decimal: "50%" */
export function formatPercentWhole(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

/** Locale-formatted integer: "1,500" */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}
