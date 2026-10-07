/**
 * SQL WHERE builder for admin Products list pagination.
 * Pure / unit-testable — used by postgresStore listProductsPageFromSupabase.
 */

export function productEffectiveStockSql(alias = "p") {
  return `CASE
    WHEN EXISTS (
      SELECT 1 FROM public.product_variants v
      WHERE v.company_id = ${alias}.company_id AND v.product_id = ${alias}.id
    )
    THEN COALESCE((
      SELECT SUM(v.stock)::numeric
      FROM public.product_variants v
      WHERE v.company_id = ${alias}.company_id AND v.product_id = ${alias}.id
    ), 0)
    ELSE COALESCE(${alias}.stock_qty, 0)
  END`;
}

export function productSortOrderSql(alias = "p") {
  return `COALESCE(
    NULLIF(${alias}.data->>'sortOrder', '')::numeric,
    NULLIF(${alias}.data->>'sort_order', '')::numeric,
    2147483647
  )`;
}

/**
 * @returns {{ whereSql: string, params: any[], nextIndex: number }}
 */
export function buildAdminProductListWhere(filters = {}, { startIndex = 1, alias = "p" } = {}) {
  const params = [];
  const clauses = [];
  let index = startIndex;

  function push(value) {
    params.push(value);
    const placeholder = `$${index}`;
    index += 1;
    return placeholder;
  }

  const companyId = String(filters.companyId || "").trim();
  if (!companyId) {
    throw new Error("companyId is required for product list SQL.");
  }
  clauses.push(`${alias}.company_id = ${push(companyId)}`);

  if (filters.trashOnly) {
    clauses.push(`${alias}.deleted_at IS NOT NULL`);
  } else {
    clauses.push(`${alias}.deleted_at IS NULL`);
  }

  const q = String(filters.q || "").trim().toLowerCase();
  if (q) {
    const like = push(`%${q}%`);
    clauses.push(`(
      lower(${alias}.id) LIKE ${like}
      OR lower(coalesce(${alias}.slug, '')) LIKE ${like}
      OR lower(coalesce(${alias}.name, '')) LIKE ${like}
      OR lower(coalesce(${alias}.name_ar, '')) LIKE ${like}
      OR lower(coalesce(${alias}.data->>'sku', '')) LIKE ${like}
      OR lower(coalesce(${alias}.data->>'barcode', '')) LIKE ${like}
      OR EXISTS (
        SELECT 1 FROM public.product_variants v
        WHERE v.company_id = ${alias}.company_id
          AND v.product_id = ${alias}.id
          AND (
            lower(coalesce(v.data->>'sku', '')) LIKE ${like}
            OR lower(coalesce(v.id, '')) LIKE ${like}
          )
      )
    )`);
  }

  if (filters.brand && filters.brand !== "all") {
    clauses.push(`${alias}.brand_id = ${push(String(filters.brand))}`);
  }

  if (filters.category && filters.category !== "all") {
    clauses.push(`${alias}.category_id = ${push(String(filters.category))}`);
  }

  if (filters.status === "active") {
    clauses.push(`${alias}.is_active IS DISTINCT FROM FALSE`);
  } else if (filters.status === "inactive") {
    clauses.push(`${alias}.is_active = FALSE`);
  }

  const stock = String(filters.stock || "all");
  if (stock === "out" || stock === "low" || stock === "in") {
    const stockExpr = productEffectiveStockSql(alias);
    const threshold = Number.isFinite(Number(filters.lowStockThreshold))
      ? Number(filters.lowStockThreshold)
      : 5;
    if (stock === "out") {
      clauses.push(`(${stockExpr}) <= 0`);
    } else if (stock === "low") {
      const thr = push(threshold);
      clauses.push(`(${stockExpr}) > 0 AND (${stockExpr}) <= ${thr}`);
    } else {
      const thr = push(threshold);
      clauses.push(`(${stockExpr}) > ${thr}`);
    }
  }

  const merch = String(filters.merchandising || "all");
  if (merch === "featured") {
    clauses.push(`(
      ${alias}.is_featured = TRUE
      OR coalesce((${alias}.data->>'featured')::boolean, FALSE) = TRUE
      OR coalesce((${alias}.data->>'isFeatured')::boolean, FALSE) = TRUE
    )`);
  } else if (merch === "newArrival") {
    clauses.push(`(
      coalesce((${alias}.data->>'newArrival')::boolean, FALSE) = TRUE
      OR coalesce((${alias}.data->>'isNewArrival')::boolean, FALSE) = TRUE
    )`);
  } else if (merch === "bestseller") {
    clauses.push(`(
      coalesce((${alias}.data->>'bestseller')::boolean, FALSE) = TRUE
      OR coalesce((${alias}.data->>'isBestseller')::boolean, FALSE) = TRUE
    )`);
  } else if (merch === "promotions") {
    clauses.push(`${alias}.data->'collection' @> ${push(JSON.stringify(["promotions-discounts"]))}::jsonb`);
  }

  const costStatus = String(filters.costStatus || filters.cost_status || "ALL").trim().toUpperCase();
  if (costStatus === "HAS_COST" || costStatus === "MISSING_COST") {
    const costExpr = (source) => `(${source} ~ '^-?[0-9]+(\\.[0-9]+)?$' AND (${source})::numeric >= 0)`;
    const productCost = `COALESCE(${alias}.data->>'costPrice', ${alias}.data->>'cost_price', '')`;
    const hasVariantCost = `EXISTS (
      SELECT 1 FROM public.product_variants v
      WHERE v.company_id = ${alias}.company_id AND v.product_id = ${alias}.id
        AND (${costExpr(`COALESCE(v.data->>'costPrice', v.data->>'cost_price', '')`)})
    )`;
    const hasProductCost = costExpr(productCost);
    const costPresent = `(CASE
      WHEN EXISTS (
        SELECT 1 FROM public.product_variants v
        WHERE v.company_id = ${alias}.company_id AND v.product_id = ${alias}.id
      ) THEN (${hasVariantCost})
      ELSE (${hasProductCost})
    END)`;
    clauses.push(costStatus === "HAS_COST" ? `(${costPresent}) = TRUE` : `(${costPresent}) = FALSE`);
  }

  return {
    whereSql: clauses.join(" AND "),
    params,
    nextIndex: index,
  };
}

export function buildAdminProductListPageSql(filters = {}) {
  const alias = "p";
  const { whereSql, params, nextIndex } = buildAdminProductListWhere(filters, { startIndex: 1, alias });
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 25));
  const offset = (page - 1) * limit;
  const sortSql = productSortOrderSql(alias);

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

  const idsSql = `SELECT ${alias}.id
    FROM public.products ${alias}
    WHERE ${whereSql}
    ORDER BY ${sortSql} ASC, ${alias}.id ASC`;

  return {
    countSql,
    pageSql,
    idsSql,
    countParams: params,
    pageParams,
    idsParams: params,
    page,
    limit,
    offset,
  };
}
