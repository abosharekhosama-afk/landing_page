/**
 * Phase J — homepage offer product attachment helpers.
 * Limited Offers merchandising reuses homepage_offers (Decision 8).
 * No limitedOffer product field.
 */

import { isProductTrashed } from "./trashLifecycle.js";

export function normalizeOfferProductIds(raw) {
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const seen = new Set();
  const ids = [];
  for (const entry of list) {
    const id = String(entry || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * Validate offer productIds against the current tenant catalog.
 * Rejects missing, cross-tenant (by absence in map), and trashed products.
 */
export function validateOfferProductIds(productIds, productsById) {
  const ids = normalizeOfferProductIds(productIds);
  for (const id of ids) {
    const product = productsById.get(id);
    if (!product) {
      const error = new Error(`Product not found for offer attachment: ${id}`);
      error.statusCode = 400;
      throw error;
    }
    if (isProductTrashed(product)) {
      const error = new Error(`Trashed products cannot be attached to homepage offers: ${id}`);
      error.statusCode = 400;
      throw error;
    }
  }
  return ids;
}

/**
 * Public-safe productIds: drop missing, trashed, and inactive products.
 */
export function filterPublicOfferProductIds(productIds, productsById) {
  return normalizeOfferProductIds(productIds).filter((id) => {
    const product = productsById.get(id);
    if (!product) return false;
    if (isProductTrashed(product)) return false;
    if (product.isActive === false || product.active === false || product.visible === false) return false;
    return true;
  });
}

/**
 * Remove a permanently deleted product id from every offer in the tenant list.
 * Mutates offer documents in place via the provided update callback pattern —
 * returns the list of offers that changed.
 */
export function scrubProductIdFromOffers(offers, productId) {
  const id = String(productId || "").trim();
  if (!id) return [];
  const changed = [];
  for (const offer of offers) {
    const current = normalizeOfferProductIds(offer.productIds);
    if (!current.includes(id)) continue;
    const next = current.filter((entry) => entry !== id);
    changed.push({ ...offer, productIds: next });
  }
  return changed;
}
