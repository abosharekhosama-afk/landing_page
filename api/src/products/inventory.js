import { normalizeStockValue } from "./productStock.js";

export function normalizeInventoryTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

export function inventoryProduct(product = {}) {
  const variants = (Array.isArray(product.variants) ? product.variants : []).map((variant) => ({
    id: String(variant.id || ""),
    sku: String(variant.sku || product.sku || ""),
    colorName: variant.colorName || variant.color_name || "Default",
    size: variant.size || "",
    stock: normalizeStockValue(variant.stock ?? variant.stockQty, { fallback: 0, label: "Variant stock" }),
    image: variant.image_url || variant.imageUrl || variant.image || "",
  }));
  const stock = variants.length
    ? variants.reduce((total, variant) => total + variant.stock, 0)
    : normalizeStockValue(product.stockQty, { fallback: 0, label: "Product stock" });
  return {
    id: product.id, slug: product.slug, sku: product.sku || "", name: product.name,
    brandId: product.brandId || null, mainCategoryId: product.mainCategoryId || null,
    subcategoryId: product.subcategoryId || product.categoryId || null,
    stock, variants, updatedAt: normalizeInventoryTimestamp(product.updatedAt ?? product.updated_at),
  };
}

export function applyInventoryUpdate(existing, body = {}) {
  const existingVariants = Array.isArray(existing.variants) ? existing.variants : [];
  if (existingVariants.length) {
    if (!Array.isArray(body.variants) || !body.variants.length) {
      const error = new Error("Variant stock values are required for this product."); error.statusCode = 400; throw error;
    }
    const incoming = new Map(body.variants.map((variant) => [String(variant.id || ""), variant]));
    for (const id of incoming.keys()) {
      if (!existingVariants.some((variant) => String(variant.id) === id)) {
        const error = new Error(`Unknown product variant: ${id}`); error.statusCode = 400; throw error;
      }
    }
    const variants = existingVariants.map((variant) => {
      const value = incoming.get(String(variant.id));
      return value ? { ...variant, stock: normalizeStockValue(value.stock, { label: "Variant stock" }) } : variant;
    });
    return { ...existing, variants, stockQty: variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0), updatedAt: new Date().toISOString() };
  }
  return { ...existing, stockQty: normalizeStockValue(body.stock, { label: "Product stock" }), updatedAt: new Date().toISOString() };
}
