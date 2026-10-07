export function parseRequiredStock(value, label = "Stock") {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
    throw new Error(`${label} is required and cannot be empty.`);
  }
  const stock = Number(value);
  if (!Number.isFinite(stock) || stock < 0) throw new Error(`${label} must be zero or a positive number.`);
  return stock;
}

export function preserveLegacySingleVariantStock(product = {}, variants = []) {
  if (variants.length !== 1) return variants;
  const catalogStock = Number(product.stockQty ?? product.stock_qty);
  const variantStock = Number(variants[0]?.stock ?? variants[0]?.stockQty);
  if (!Number.isFinite(catalogStock) || catalogStock <= 0 || variantStock !== 0) return variants;
  return [{ ...variants[0], stock: catalogStock }];
}
