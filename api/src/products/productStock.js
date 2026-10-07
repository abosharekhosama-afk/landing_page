function stockError(label) {
  return Object.assign(new Error(`${label} must be zero or a positive number.`), { statusCode: 400 });
}

export function normalizeStockValue(value, { fallback = 0, label = "Stock" } = {}) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && !value.trim()) throw stockError(label);
  const stock = Number(value);
  if (!Number.isFinite(stock) || stock < 0) throw stockError(label);
  return stock;
}

export function preserveOmittedVariantStock(existingVariant = {}, incomingVariant = {}) {
  const hasIncomingStock = Object.prototype.hasOwnProperty.call(incomingVariant, "stock")
    || Object.prototype.hasOwnProperty.call(incomingVariant, "stockQty");
  if (hasIncomingStock) return incomingVariant;
  const existingStock = existingVariant.stock ?? existingVariant.stockQty;
  return existingStock === undefined ? incomingVariant : { ...incomingVariant, stock: existingStock };
}
