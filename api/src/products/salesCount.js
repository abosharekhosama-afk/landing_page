/**
 * Tenant-scoped sales aggregation for product list (Phase B / Decision 12).
 * Backend is authoritative — do not recompute in the CPanel.
 */

function safeQuantity(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function itemProductId(item = {}) {
  return String(item.productId || item.product_id || "").trim();
}

/**
 * Build a map of productId → total sold quantity from tenant orders.
 * Counts item quantities only; does not invent a sales table.
 */
export function buildSalesCountByProductId(orders = []) {
  const counts = new Map();
  for (const order of orders) {
    const items = Array.isArray(order?.items) ? order.items : [];
    for (const item of items) {
      const productId = itemProductId(item);
      if (!productId) continue;
      const quantity = safeQuantity(item.quantity ?? item.qty);
      if (!quantity) continue;
      counts.set(productId, (counts.get(productId) || 0) + quantity);
    }
  }
  return counts;
}

export function salesCountForProduct(counts, productId) {
  if (!productId) return 0;
  return counts.get(String(productId)) || 0;
}

export function attachSalesCounts(products = [], orders = []) {
  const counts = buildSalesCountByProductId(orders);
  return products.map((product) => ({
    ...product,
    salesCount: salesCountForProduct(counts, product?.id),
  }));
}
