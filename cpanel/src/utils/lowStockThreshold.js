/**
 * Company-level low stock threshold (Phase H Decision 6).
 * Default matches historical temporary constant (5).
 */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export function resolveLowStockThreshold(companyOrSettings) {
  const settings = companyOrSettings?.settings && typeof companyOrSettings.settings === "object"
    ? companyOrSettings.settings
    : companyOrSettings;
  const value = settings?.lowStockThreshold;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
  return parsed;
}

/** @deprecated Use resolveLowStockThreshold(company) — kept as default fallback only. */
export const TEMPORARY_LOW_STOCK_THRESHOLD = DEFAULT_LOW_STOCK_THRESHOLD;
