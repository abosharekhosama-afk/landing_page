/**
 * Product trash lifecycle helpers (Phase G).
 * Soft-delete uses deletedAt / deleted_at; restore clears it; permanent delete is separate.
 */

export function isProductTrashed(product = {}) {
  const value = product?.deletedAt ?? product?.deleted_at ?? null;
  if (value == null || value === false || value === "") return false;
  return true;
}

export function filterActiveProducts(products = []) {
  return products.filter((product) => !isProductTrashed(product));
}

export function filterTrashedProducts(products = []) {
  return products.filter((product) => isProductTrashed(product));
}

export function findActiveSlugOrSkuConflict(products, { slug, sku, excludeProductId } = {}) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const normalizedSku = String(sku || "").trim().toLowerCase();
  for (const product of products) {
    if (excludeProductId && String(product.id) === String(excludeProductId)) continue;
    if (isProductTrashed(product)) continue;
    const productSlug = String(product.slug || "").trim().toLowerCase();
    const productSku = String(product.sku || "").trim().toLowerCase();
    if (normalizedSlug && productSlug && productSlug === normalizedSlug) {
      return { field: "slug", value: product.slug, productId: product.id };
    }
    if (normalizedSku && productSku && productSku === normalizedSku) {
      return { field: "sku", value: product.sku, productId: product.id };
    }
  }
  return null;
}
