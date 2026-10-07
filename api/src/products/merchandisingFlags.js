/**
 * Phase J — merchandising flag normalization.
 * Canonical public keys: featured, newArrival, bestseller.
 * Admin/legacy aliases: isFeatured, isNewArrival, isBestseller.
 * No limitedOffer field (Decision 8).
 */

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function readFlag(product, canonical, alias) {
  if (!product || typeof product !== "object") return false;
  // Explicit canonical wins when present so `featured: false` clears a stale alias.
  if (hasOwn(product, canonical)) return product[canonical] === true;
  if (hasOwn(product, alias)) return product[alias] === true;
  return false;
}

export function productIsFeatured(product) {
  return readFlag(product, "featured", "isFeatured");
}

export function productIsNewArrival(product) {
  return readFlag(product, "newArrival", "isNewArrival");
}

export function productIsBestseller(product) {
  return readFlag(product, "bestseller", "isBestseller");
}

/**
 * Write both canonical and alias keys so admin UI and public serializer stay aligned.
 */
export function applyMerchandisingFlags(product = {}) {
  const featured = productIsFeatured(product);
  const newArrival = productIsNewArrival(product);
  const bestseller = productIsBestseller(product);
  return {
    ...product,
    featured,
    newArrival,
    bestseller,
    isFeatured: featured,
    isNewArrival: newArrival,
    isBestseller: bestseller,
  };
}

export function merchandisingFlagSnapshot(product = {}) {
  return {
    featured: productIsFeatured(product),
    newArrival: productIsNewArrival(product),
    bestseller: productIsBestseller(product),
  };
}

export function merchandisingFlagsChanged(before, after) {
  const a = merchandisingFlagSnapshot(before);
  const b = merchandisingFlagSnapshot(after);
  return a.featured !== b.featured
    || a.newArrival !== b.newArrival
    || a.bestseller !== b.bestseller;
}

/**
 * Decision 15 — when sale price is active and lower than regular, expose sale as price.
 */
export function resolvePublicSalePrice(regularPrice, salePrice) {
  const regular = Number(regularPrice);
  const sale = Number(salePrice);
  if (!Number.isFinite(regular) || regular < 0) {
    return { price: 0, originalPrice: null };
  }
  if (Number.isFinite(sale) && sale >= 0 && sale < regular) {
    return { price: sale, originalPrice: regular };
  }
  return { price: regular, originalPrice: null };
}
