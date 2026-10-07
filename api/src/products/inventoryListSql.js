import {
  buildAdminProductListWhere,
  productEffectiveStockSql,
  productSortOrderSql,
} from "./productListSql.js";

export const DEFAULT_INVENTORY_PAGE_LIMIT = 25;
export const MAX_INVENTORY_PAGE_LIMIT = 100;

export function parseInventoryListQuery(query = {}, { lowStockThreshold = 5 } = {}) {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const wantsPagination = query.page !== undefined || query.limit !== undefined;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(MAX_INVENTORY_PAGE_LIMIT, Math.floor(rawLimit))
    : DEFAULT_INVENTORY_PAGE_LIMIT;

  return {
    wantsPagination,
    page,
    limit,
    q: String(query.q || query.search || "").trim().toLowerCase(),
    brand: String(query.brand || query.brandId || "all"),
    mainCategory: String(query.mainCategory || query.mainCategoryId || query.main || "all"),
    stock: String(query.stock || query.status || "all"),
    lowStockThreshold: Number.isFinite(Number(lowStockThreshold))
      ? Number(lowStockThreshold)
      : 5,
  };
}

/**
 * Inventory list WHERE — tenant + search + brand + main category + stock bucket.
 * Main category is stored primarily on data.mainCategoryId (JSONB).
 */
export function buildInventoryListWhere(filters = {}, { startIndex = 1, alias = "p" } = {}) {
  const base = buildAdminProductListWhere({
    companyId: filters.companyId,
    trashOnly: false,
    q: filters.q,
    brand: filters.brand,
    category: "all",
    status: "all",
    stock: filters.stock,
    merchandising: "all",
    lowStockThreshold: filters.lowStockThreshold,
  }, { startIndex, alias });

  const params = [...base.params];
  let index = base.nextIndex;
  const clauses = [base.whereSql];

  function push(value) {
    params.push(value);
    const placeholder = `$${index}`;
    index += 1;
    return placeholder;
  }

  if (filters.mainCategory && filters.mainCategory !== "all") {
    const main = push(String(filters.mainCategory));
    clauses.push(`(
      ${alias}.data->>'mainCategoryId' = ${main}
      OR ${alias}.data->>'main_category_id' = ${main}
    )`);
  }

  return {
    whereSql: clauses.filter(Boolean).join(" AND "),
    params,
    nextIndex: index,
  };
}

export function buildInventoryListPageSql(filters = {}) {
  const alias = "p";
  const { whereSql, params, nextIndex } = buildInventoryListWhere(filters, { startIndex: 1, alias });
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(MAX_INVENTORY_PAGE_LIMIT, Number(filters.limit) || DEFAULT_INVENTORY_PAGE_LIMIT));
  const offset = (page - 1) * limit;
  const sortSql = productSortOrderSql(alias);
  const stockExpr = productEffectiveStockSql(alias);
  const threshold = Number.isFinite(Number(filters.lowStockThreshold))
    ? Number(filters.lowStockThreshold)
    : 5;

  // Summary ignores stock-status filter so KPIs reflect the broader filtered set
  // (search/brand/main) while the page list still respects stock status.
  const summaryFilters = { ...filters, stock: "all" };
  const summaryWhere = buildInventoryListWhere(summaryFilters, { startIndex: 1, alias });

  const summarySql = `SELECT
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE (${stockExpr}) > ${threshold})::integer AS in_stock,
      COUNT(*) FILTER (WHERE (${stockExpr}) > 0 AND (${stockExpr}) <= ${threshold})::integer AS low_stock,
      COUNT(*) FILTER (WHERE (${stockExpr}) <= 0)::integer AS out_stock
    FROM public.products ${alias}
    WHERE ${summaryWhere.whereSql}`;

  const countSql = `SELECT COUNT(*)::integer AS count
    FROM public.products ${alias}
    WHERE ${whereSql}`;

  let index = nextIndex;
  const pageParams = [...params];
  pageParams.push(limit);
  const limitPlaceholder = `$${index}`;
  index += 1;
  pageParams.push(offset);
  const offsetPlaceholder = `$${index}`;

  const pageSql = `SELECT ${alias}.*
    FROM public.products ${alias}
    WHERE ${whereSql}
    ORDER BY ${sortSql} ASC, ${alias}.id ASC
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`;

  return {
    countSql,
    pageSql,
    summarySql,
    countParams: params,
    pageParams,
    summaryParams: summaryWhere.params,
    page,
    limit,
    offset,
  };
}
