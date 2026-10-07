/**
 * Dashboard insights — pure aggregation from tenant catalog and orders.
 */

import { inventoryProduct } from "../products/inventory.js";

export const LOW_STOCK_THRESHOLD = 5;
export const LIVE_VISITOR_WINDOW_MS = 5 * 60 * 1000;

export function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeSearchTerm(value = "") {
  return String(value || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function orderStatusBucket(status = "") {
  const normalized = String(status || "").trim().toLocaleLowerCase();
  if (!normalized) return "unknown";
  if (["pending", "awaiting employee review", "awaiting confirmation", "awaiting_confirmation", "new"].includes(normalized)) return "new";
  if (["confirmed", "processing", "confirmation 1", "confirmation 2", "paid"].includes(normalized)) return "confirmed";
  if (["out for delivery", "out_for_delivery", "shipped", "shipping", "awaiting delivery", "awaiting_delivery"].includes(normalized)) return "out_for_delivery";
  if (["delivered", "completed", "complete"].includes(normalized)) return "delivered";
  if (["returned", "refunded", "refund"].includes(normalized)) return "returned";
  if (["cancelled", "canceled", "void", "voided"].includes(normalized)) return "cancelled";
  return "other";
}

export function computeProductMetrics(products = [], { lowStockThreshold = LOW_STOCK_THRESHOLD } = {}) {
  let inStock = 0;
  let outOfStock = 0;
  let lowStock = 0;
  let inactive = 0;
  let partiallyUnavailable = 0;
  let zeroPrice = 0;

  for (const product of products) {
    const active = product.isActive !== false && product.active !== false && product.status !== "Inactive";
    if (!active) inactive += 1;

    const inventory = inventoryProduct(product);
    const variants = inventory.variants || [];
    const stock = inventory.stock;
    const price = safeNumber(product.price ?? product.basePrice, 0);

    if (price <= 0) zeroPrice += 1;

    if (variants.length) {
      const variantStocks = variants.map((variant) => safeNumber(variant.stock, 0));
      const availableVariants = variantStocks.filter((value) => value > 0).length;
      if (availableVariants === 0) outOfStock += 1;
      else if (availableVariants < variants.length) partiallyUnavailable += 1;
      else inStock += 1;
      if (stock > 0 && stock <= lowStockThreshold) lowStock += 1;
      continue;
    }

    if (stock <= 0) outOfStock += 1;
    else if (stock <= lowStockThreshold) {
      lowStock += 1;
      inStock += 1;
    } else {
      inStock += 1;
    }
  }

  return {
    total: products.length,
    inStock,
    outOfStock,
    lowStock,
    inactive,
    partiallyUnavailable,
    zeroPrice,
    comingSoon: 0,
    comingSoonSupported: false,
  };
}

function orderItemsQuantity(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum, item) => sum + safeNumber(item.quantity ?? item.qty, 0), 0);
}

function orderSubtotal(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length) {
    return items.reduce((sum, item) => {
      const qty = safeNumber(item.quantity ?? item.qty, 0);
      const unit = safeNumber(item.price ?? item.unitPrice, 0);
      return sum + qty * unit;
    }, 0);
  }
  return safeNumber(order.subtotal, safeNumber(order.total, 0));
}

function orderDeliveryFee(order = {}) {
  return safeNumber(order.delivery_price ?? order.deliveryPrice ?? order.deliveryFee, 0);
}

export function buildSalesPeriods(orders = [], timezoneOffsetMinutes = 0) {
  const now = new Date();
  const localNow = new Date(now.getTime() + timezoneOffsetMinutes * 60 * 1000);

  function startOfLocalDay(date) {
    const copy = new Date(date);
    copy.setUTCHours(0, 0, 0, 0);
    return copy;
  }

  function endOfLocalDay(date) {
    const copy = new Date(date);
    copy.setUTCHours(23, 59, 59, 999);
    return copy;
  }

  function monthRange(year, monthIndex) {
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    return { start, end };
  }

  const todayStart = startOfLocalDay(localNow);
  const todayEnd = endOfLocalDay(localNow);
  const yesterday = new Date(localNow);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStart = startOfLocalDay(yesterday);
  const yesterdayEnd = endOfLocalDay(yesterday);
  const sevenDaysAgo = new Date(localNow);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(localNow);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
  const currentMonth = monthRange(localNow.getUTCFullYear(), localNow.getUTCMonth());
  const previousMonth = monthRange(
    localNow.getUTCMonth() === 0 ? localNow.getUTCFullYear() - 1 : localNow.getUTCFullYear(),
    localNow.getUTCMonth() === 0 ? 11 : localNow.getUTCMonth() - 1,
  );

  const periods = [
    { key: "today", label: "Today", start: todayStart, end: todayEnd },
    { key: "yesterday", label: "Yesterday", start: yesterdayStart, end: yesterdayEnd },
    { key: "last_7_days", label: "Last 7 days", start: sevenDaysAgo, end: todayEnd },
    { key: "last_30_days", label: "Last 30 days", start: thirtyDaysAgo, end: todayEnd },
    { key: "current_month", label: "Current month", start: currentMonth.start, end: todayEnd },
    { key: "previous_month", label: "Previous month", start: previousMonth.start, end: previousMonth.end },
  ];

  return periods.map((period) => {
    const matched = orders.filter((order) => {
      const created = new Date(order.createdAt || order.created_at || 0);
      if (Number.isNaN(created.getTime())) return false;
      return created >= period.start && created <= period.end;
    });
    const itemsQuantity = matched.reduce((sum, order) => sum + orderItemsQuantity(order), 0);
    const salesSubtotal = matched.reduce((sum, order) => sum + orderSubtotal(order), 0);
    const deliveryFees = matched.reduce((sum, order) => sum + orderDeliveryFee(order), 0);
    const finalTotal = matched.reduce((sum, order) => sum + safeNumber(order.total, 0), 0);
    return {
      key: period.key,
      label: period.label,
      ordersCount: matched.length,
      itemsQuantity,
      salesSubtotal,
      deliveryFees,
      finalTotal,
      profitSupported: false,
    };
  });
}

export function buildOrderStatusCounts(orders = []) {
  const buckets = {
    new: 0,
    confirmed: 0,
    out_for_delivery: 0,
    delivered: 0,
    returned: 0,
    cancelled: 0,
    other: 0,
    unknown: 0,
  };
  for (const order of orders) {
    const bucket = orderStatusBucket(order.status);
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }
  return buckets;
}

export function buildOperationalAlerts({
  products = [],
  orders = [],
  lowStockThreshold = LOW_STOCK_THRESHOLD,
} = {}) {
  const alerts = [];
  const now = new Date().toISOString();

  for (const product of products) {
    const inventory = inventoryProduct(product);
    const name = typeof product.name === "object"
      ? product.name.en || product.name.ar || product.slug || product.id
      : product.name || product.slug || product.id;
    const price = safeNumber(product.price ?? product.basePrice, 0);
    if (price <= 0) {
      alerts.push({
        id: `price-zero-${product.id}`,
        type: "price_zero",
        severity: "high",
        message: `Product "${name}" has price 0.`,
        entityType: "product",
        entityId: product.id,
        entityLabel: String(name),
        timestamp: product.updatedAt || product.updated_at || now,
        href: `/admin/products/${encodeURIComponent(product.id)}/edit`,
      });
    }
    if (inventory.stock <= 0) {
      alerts.push({
        id: `stock-out-${product.id}`,
        type: "out_of_stock",
        severity: "high",
        message: `Product "${name}" is out of stock.`,
        entityType: "product",
        entityId: product.id,
        entityLabel: String(name),
        timestamp: product.updatedAt || product.updated_at || now,
        href: "/admin/inventory",
      });
    } else if (inventory.stock <= lowStockThreshold) {
      alerts.push({
        id: `stock-low-${product.id}`,
        type: "low_stock",
        severity: "medium",
        message: `Product "${name}" is low on stock (${inventory.stock}).`,
        entityType: "product",
        entityId: product.id,
        entityLabel: String(name),
        timestamp: product.updatedAt || product.updated_at || now,
        href: "/admin/inventory",
      });
    }
  }

  for (const order of orders.slice(-100).reverse()) {
    const bucket = orderStatusBucket(order.status);
    if (bucket === "returned") {
      alerts.push({
        id: `order-returned-${order.id}`,
        type: "returned_order",
        severity: "medium",
        message: `Order ${order.id} was returned.`,
        entityType: "order",
        entityId: order.id,
        entityLabel: order.customer?.name || order.id,
        timestamp: order.updatedAt || order.createdAt || now,
        href: "/admin/orders",
      });
    }
    if (bucket === "cancelled") {
      alerts.push({
        id: `order-cancelled-${order.id}`,
        type: "cancelled_order",
        severity: "low",
        message: `Order ${order.id} was cancelled.`,
        entityType: "order",
        entityId: order.id,
        entityLabel: order.customer?.name || order.id,
        timestamp: order.updatedAt || order.createdAt || now,
        href: "/admin/orders",
      });
    }
  }

  return alerts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 25);
}

export function buildLatestSales(orders = [], limit = 8) {
  return [...orders]
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))
    .slice(0, limit)
    .map((order) => ({
      id: order.id,
      orderNumber: order.number || order.orderNumber || order.id,
      customerName: order.customer?.name || "",
      city: order.delivery_city_name || order.customer?.city || order.customer?.area || "",
      quantity: orderItemsQuantity(order),
      finalTotal: safeNumber(order.total, 0),
      createdAt: order.createdAt || order.created_at || "",
      status: order.status || "",
    }));
}

export function buildInventoryMonitor(products = [], { lowStockThreshold = LOW_STOCK_THRESHOLD } = {}) {
  const metrics = computeProductMetrics(products, { lowStockThreshold });
  return {
    current: {
      outOfStock: metrics.outOfStock,
      lowStock: metrics.lowStock,
      partiallyUnavailable: metrics.partiallyUnavailable,
    },
    historicalSupported: false,
    note: "Historical inventory snapshots are not stored; counts reflect current catalog state only.",
  };
}

function approvedReviews(reviews = []) {
  return reviews.filter(
    (review) => review.isActive && review.isApproved !== false && review.status === "approved",
  );
}

function numericRating(review) {
  const parsed = Number(review.rating);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(5, parsed)) : null;
}

function averageRatingOf(reviews = []) {
  const ratings = reviews.map(numericRating).filter((rating) => rating !== null);
  if (!ratings.length) return 0;
  return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
}

function productDisplayName(product, fallbackId) {
  if (!product) return fallbackId;
  if (typeof product.name === "object" && product.name !== null) {
    return product.name.en || product.name.ar || product.slug || fallbackId;
  }
  return product.name || product.slug || fallbackId;
}

export function buildRatingsInsights({ reviews = [], users = [], products = [], limit = 5 } = {}) {
  const approved = approvedReviews(reviews);
  const storeReviews = approved.filter((review) =>
    ["website", "store", "site"].includes(review.type),
  );
  const productReviews = approved.filter((review) => review.type === "product");

  const byProduct = new Map();
  for (const review of productReviews) {
    const key = String(review.productId || "");
    if (!key) continue;
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key).push(review);
  }
  const productIndex = new Map(products.map((product) => [String(product.id), product]));
  const mostRatedProducts = [...byProduct.entries()]
    .map(([productId, items]) => ({
      productId,
      name: productDisplayName(productIndex.get(productId), productId),
      reviewCount: items.length,
      averageRating: averageRatingOf(items),
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount || b.averageRating - a.averageRating)
    .slice(0, limit);

  const favoriteCounts = new Map();
  for (const user of users) {
    const favorites = Array.isArray(user.favoriteProductIds) ? user.favoriteProductIds : [];
    for (const productId of favorites) {
      const key = String(productId);
      favoriteCounts.set(key, (favoriteCounts.get(key) || 0) + 1);
    }
  }
  const mostFavoritedProducts = [...favoriteCounts.entries()]
    .map(([productId, favoriteCount]) => ({
      productId,
      name: productDisplayName(productIndex.get(productId), productId),
      favoriteCount,
    }))
    .sort((a, b) => b.favoriteCount - a.favoriteCount)
    .slice(0, limit);

  return {
    storeAverageRating: averageRatingOf(storeReviews),
    approvedStoreReviewCount: storeReviews.length,
    productReviewCount: productReviews.length,
    mostRatedProducts,
    mostFavoritedProducts,
  };
}

export function buildDashboardInsights({
  products = [],
  orders = [],
  reviews = [],
  users = [],
  liveVisitors = 0,
  searchSummary = null,
  visitorSummary = null,
  timezoneOffsetMinutes = 0,
  lowStockThreshold = LOW_STOCK_THRESHOLD,
} = {}) {
  return {
    generatedAt: new Date().toISOString(),
    products: computeProductMetrics(products, { lowStockThreshold }),
    orders: {
      total: orders.length,
      statusCounts: buildOrderStatusCounts(orders),
    },
    alerts: buildOperationalAlerts({ products, orders, lowStockThreshold }),
    salesPeriods: buildSalesPeriods(orders, timezoneOffsetMinutes),
    latestSales: buildLatestSales(orders),
    inventoryMonitor: buildInventoryMonitor(products, { lowStockThreshold }),
    ratings: buildRatingsInsights({ reviews, users, products }),
    liveVisitors: {
      count: liveVisitors,
      windowMs: LIVE_VISITOR_WINDOW_MS,
      supported: true,
    },
    search: searchSummary,
    visitors: visitorSummary,
    profitSupported: false,
    comingSoonSupported: false,
  };
}
