/**
 * Attach relatedProducts + frequentlyBoughtTogether onto public product payloads.
 */

import {
  companyRepository,
  listCompanyProductRelations,
  listProductRelations,
  productRepository,
} from "../data/store.js";
import { serializePublicProduct } from "../storefront/publicContent.js";
import { publicProductSerializeOptions } from "./productSettings.js";
import {
  FBT_MAX,
  resolveFrequentlyBoughtTogether,
  resolveRelatedProducts,
} from "./productRelations.js";
import { isProductTrashed } from "./trashLifecycle.js";

function publicCatalogProducts(companyId) {
  return productRepository.getByCompany(companyId).filter(
    (product) => !isProductTrashed(product)
      && product.isActive !== false
      && product.active !== false
      && product.visible !== false,
  );
}

function productsByIdMap(products) {
  return new Map(products.map((product) => [product.id, product]));
}

function stripNestedRelations(item) {
  const { relatedProducts: _r, frequentlyBoughtTogether: _f, ...rest } = item;
  return rest;
}

function indexRelationTargets(allRows) {
  const relatedBySource = new Map();
  const fbtBySource = new Map();
  const sorted = allRows
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  for (const row of sorted) {
    const map = row.type === "fbt" ? fbtBySource : row.type === "related" ? relatedBySource : null;
    if (!map) continue;
    if (!map.has(row.sourceProductId)) map.set(row.sourceProductId, []);
    map.get(row.sourceProductId).push(row.targetProductId);
  }
  return { relatedBySource, fbtBySource };
}

function serializeRelatedPublicProduct(item, company) {
  return serializePublicProduct(item, publicProductSerializeOptions(company));
}

function enrichOne(product, source, byId, catalog, relatedIds, fbtIds, company) {
  const related = resolveRelatedProducts({
    sourceProductId: product.id,
    manualTargetIds: relatedIds,
    productsById: byId,
  }).map((item) => stripNestedRelations(serializeRelatedPublicProduct(item, company)));

  const fbt = resolveFrequentlyBoughtTogether({
    sourceProduct: source,
    manualTargetIds: fbtIds,
    productsById: byId,
    allCompanyProducts: catalog,
    max: FBT_MAX,
  }).products.map((item) => stripNestedRelations(serializeRelatedPublicProduct(item, company)));

  return {
    ...product,
    relatedProducts: related,
    frequentlyBoughtTogether: fbt,
  };
}

/**
 * Enrich a single serialized (or raw) public product object.
 */
export async function attachPublicProductRelations(companyId, product) {
  if (!product?.id) {
    return {
      ...product,
      relatedProducts: [],
      frequentlyBoughtTogether: [],
    };
  }

  const catalog = publicCatalogProducts(companyId);
  const byId = productsByIdMap(catalog);
  const source = productRepository.findByCompany(companyId, product.id) || product;
  const company = companyRepository.getCompanyById(companyId);

  const [relatedRows, fbtRows] = await Promise.all([
    listProductRelations(companyId, product.id, "related"),
    listProductRelations(companyId, product.id, "fbt"),
  ]);

  return enrichOne(
    product,
    source,
    byId,
    catalog,
    relatedRows.map((row) => row.targetProductId),
    fbtRows.map((row) => row.targetProductId),
    company,
  );
}

/**
 * Enrich many public products without N+1 relation queries.
 */
export async function attachPublicProductRelationsBatch(companyId, publicProducts = []) {
  const catalog = publicCatalogProducts(companyId);
  const byId = productsByIdMap(catalog);
  const fullById = productsByIdMap(productRepository.getByCompany(companyId));
  const company = companyRepository.getCompanyById(companyId);
  const { relatedBySource, fbtBySource } = indexRelationTargets(
    await listCompanyProductRelations(companyId),
  );

  return publicProducts.map((product) => enrichOne(
    product,
    fullById.get(product.id) || product,
    byId,
    catalog,
    relatedBySource.get(product.id) || [],
    fbtBySource.get(product.id) || [],
    company,
  ));
}
