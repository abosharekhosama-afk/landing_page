/**
 * Verified sales units for product display priority (Spec 004 / T006).
 *
 * Counts order line quantities only from orders whose status lowercases to
 * the inspected allow-list: completed, complete, delivered.
 *
 * Ignores payment method, invoice status, dropshipping delivery status, and
 * everything in api/src/products/salesCount.js (that helper sums every order
 * line regardless of status and must not drive a sales rank).
 */

export const VERIFIED_ORDER_STATUSES = Object.freeze(["completed", "complete", "delivered"]);

/** Case-insensitive membership check against the allow-list. */
export function isVerifiedOrderStatus(status) {
  if (status === null || status === undefined) return false;
  const normalized = String(status).trim().toLowerCase();
  return VERIFIED_ORDER_STATUSES.includes(normalized);
}

function safeQuantity(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function itemProductId(item = {}) {
  return String(item.productId || item.product_id || "").trim();
}

function orderLineItems(order = {}) {
  if (Array.isArray(order?.items)) return order.items;
  if (Array.isArray(order?.order_items)) return order.order_items;
  return [];
}

/**
 * Build a map of productId → verified units sold.
 * Counts `quantity` (or `qty`) on allow-listed order statuses only.
 */
export function verifiedUnitsByProductId(orders = []) {
  const counts = new Map();
  if (!Array.isArray(orders)) return counts;
  for (const order of orders) {
    if (!isVerifiedOrderStatus(order?.status)) continue;
    for (const item of orderLineItems(order)) {
      const productId = itemProductId(item);
      if (!productId) continue;
      const quantity = safeQuantity(item.quantity ?? item.qty);
      if (!quantity) continue;
      counts.set(productId, (counts.get(productId) || 0) + quantity);
    }
  }
  return counts;
}

export function verifiedUnitsForProduct(counts, productId) {
  if (!productId || !(counts instanceof Map)) return 0;
  return counts.get(String(productId)) || 0;
}
