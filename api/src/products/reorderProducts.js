/**
 * Global product ordering via product.sortOrder (Phase C / Decision 1–2).
 *
 * Contract: { productIds: string[] } — ordered list of tenant product IDs.
 * Each listed product receives sortOrder = its index (0..n-1).
 * Products omitted from the request keep their existing sortOrder.
 * The CPanel UI sends the complete catalog order for deterministic global sorting.
 */

function reorderError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Validate and normalize the reorder request body.
 * @param {unknown} body
 * @returns {string[]}
 */
export function parseReorderProductIds(body) {
  const raw = body && typeof body === "object" ? body.productIds : null;
  if (!Array.isArray(raw)) {
    throw reorderError("productIds must be an array of product id strings.");
  }
  if (raw.length === 0) {
    throw reorderError("productIds must not be empty.");
  }

  const productIds = [];
  const seen = new Set();
  for (const entry of raw) {
    if (typeof entry !== "string" || !entry.trim()) {
      throw reorderError("Each product id must be a non-empty string.");
    }
    const id = entry.trim();
    if (seen.has(id)) {
      throw reorderError("productIds must not contain duplicate ids.");
    }
    seen.add(id);
    productIds.push(id);
  }
  return productIds;
}

/**
 * Build sortOrder patches for a validated ordered id list.
 * @param {Map<string, object>|Record<string, object>} productsById tenant products keyed by id
 * @param {string[]} productIds ordered ids
 * @returns {{ id: string, sortOrder: number, previousSortOrder: number, product: object }[]}
 */
export function buildReorderPatches(productsById, productIds) {
  const lookup = productsById instanceof Map
    ? productsById
    : new Map(Object.entries(productsById || {}));

  const missing = productIds.filter((id) => !lookup.has(id));
  if (missing.length) {
    throw reorderError(
      "One or more product IDs are invalid or do not belong to this company.",
      400,
    );
  }

  const now = new Date().toISOString();
  return productIds.map((id, index) => {
    const product = lookup.get(id);
    const previousSortOrder = Number(product.sortOrder ?? 0);
    return {
      id,
      sortOrder: index,
      previousSortOrder: Number.isFinite(previousSortOrder) ? previousSortOrder : 0,
      product: {
        ...product,
        sortOrder: index,
        updatedAt: now,
      },
    };
  });
}

export { reorderError };
