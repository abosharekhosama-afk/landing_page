/**
 * Landing Page Platform — Ownership Model (Phase 0 Architecture Lock)
 *
 * Encodes which entities are company-scoped (tenant SoT) vs which concepts are
 * site-scoped (presentation/publishing). Commerce stays company-scoped — there
 * is NO site_id migration in Phase 0.
 *
 * See docs/landing-platform/LANDING_PAGE_DATA_OWNERSHIP_MODEL.md for the full
 * ownership matrix this module mirrors in code.
 */

/**
 * Entities that remain company-scoped (tenant boundary). These are the
 * isolation + commerce boundary for existing tenants. Do NOT add site_id
 * migration for these in Phase 0/1.
 */
export const COMPANY_SCOPED_ENTITIES = Object.freeze([
  // Commerce (company-scoped — never site_id in Phase 0)
  "products",
  "variants",
  "categories",
  "brands",
  "bundles",
  "discounts",
  "coupons",
  "inventory",
  "orders",
  "invoices",
  "delivery_zones",
  "contacts",
  "reviews",
  // CRM / content / marketing
  "inbox",
  "website_texts",
  "website_media",
  "homepage_offers",
  "banners",
  "analytics",
  "activity_log",
  // Tenant structure
  "memberships",
  "domains",
  "modules",
  "settings",
]);

/**
 * Concepts that are site-scoped (presentation/publishing identity). These are
 * the future site-owned surface: pages, versions, publish, theme, editor
 * drafts, navigation. They must never become the SoT for catalog/orders.
 */
export const SITE_SCOPED_CONCEPTS = Object.freeze([
  "pages",
  "page_versions",
  "publish",
  "theme",
  "site_editor_drafts",
  "navigation",
]);

/** Commerce entities — a subset of COMPANY_SCOPED_ENTITIES, kept explicit. */
export const COMMERCE_ENTITIES = Object.freeze([
  "products",
  "variants",
  "categories",
  "brands",
  "bundles",
  "discounts",
  "coupons",
  "inventory",
  "orders",
  "invoices",
  "delivery_zones",
  "contacts",
  "reviews",
]);

const companyScopedSet = new Set(COMPANY_SCOPED_ENTITIES);
const siteScopedSet = new Set(SITE_SCOPED_CONCEPTS);
const commerceSet = new Set(COMMERCE_ENTITIES);

/** True when the entity key is company-scoped (tenant SoT). */
export function isCompanyScopedEntity(entityKey) {
  return companyScopedSet.has(String(entityKey || "").trim());
}

/** True when the concept key is site-scoped (presentation/publishing). */
export function isSiteScopedConcept(conceptKey) {
  return siteScopedSet.has(String(conceptKey || "").trim());
}

/** True when the entity key is a commerce entity (company-scoped). */
export function isCommerceEntity(entityKey) {
  return commerceSet.has(String(entityKey || "").trim());
}

/** Returns a fresh copy of the commerce entity list. */
export function listCommerceEntities() {
  return [...COMMERCE_ENTITIES];
}

/** Returns a fresh copy of the company-scoped entity list. */
export function listCompanyScopedEntities() {
  return [...COMPANY_SCOPED_ENTITIES];
}

/** Returns a fresh copy of the site-scoped concept list. */
export function listSiteScopedConcepts() {
  return [...SITE_SCOPED_CONCEPTS];
}