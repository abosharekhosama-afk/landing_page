# Phase J — Featured / New Arrivals / Limited Offers — Implementation / Audit Scope

**Status:** Implemented (Phase J). **No migration required.** Production was **not** touched.  
**Parent plan:** `specs/002-product-merchandising-upgrade/plan.md`  
**Execution scope:** **Phase J ONLY**  
**Prior completed phases:** A, B, C, D, G, H, E, F  
**Next after J:** I → K + L  

**Do not:** start I / K / L; introduce `limitedOffer`; build a recommendation engine; build discount/coupon engines; apply migrations to Production; broadly refactor CPanel.

---

## A. Existing merchandising architecture

### Product flags (already present)

| Concept | Admin form / document | DB | Public serializer (pre-J) |
|---------|----------------------|-----|---------------------------|
| Featured | `isFeatured` written by `buildProductFromForm`; schema key `featured` | Column `products.is_featured` + JSONB `data` | `featured: product.featured === true` only |
| New Arrival | `isNewArrival` / schema `newArrival` | JSONB only (no dedicated column) | **Not exposed** |
| Bestseller | `isBestseller` / schema `bestseller` | JSONB only | **Not exposed** |
| Limited Offer | **No product field** (Decision 8) | — | — |

**Critical gap:** CPanel persists `isFeatured` / `isNewArrival` / `isBestseller`, but `serializePublicProduct` checks `product.featured === true`. Featured can silently fail on the storefront for products saved via the wizard.

### Collection filter attributes (Velvet / catalog)

`productFilterAttributes` already defines collection options:

- `featured`
- `new-arrivals`
- `promotions-discounts`

These are **multi-select catalog tags** on the product document (`collection` array), distinct from the boolean merchandising flags. Phase J reuses them for Limited Offer / promotions merchandising placement; does **not** replace the boolean flags.

### Site editor collections

`productCollection` nodes use `content.source` keys such as `"featured"`. Resolution is client-side against public product payloads (expects `featured` boolean). No separate merchandising ranking table.

### Ordering

Global `sortOrder` (Phase C) remains the only product order. No homepage-specific or Featured-specific sort table.

---

## B. Existing homepage offers

| Item | Finding |
|------|---------|
| Table | `public.homepage_offers` (`id`, `company_id`, `display_order`, `is_active`, `data` JSONB) |
| Routes | `api/src/routes/homeOffers.js` — `GET /`, `GET /all`, `POST /`, `PUT /:id`, `DELETE /:id` (+ category cards) |
| Auth | Mutations: `requireAuth` + `requireAdmin` (tenant admin role). No new permission keys. |
| Shape | Banner offers: `title`, `description`, `image`, `ctaText`, `ctaLink`, `displayOrder`, `isActive` |
| Product attach | **None today** — CTA is a free-text link (`ctaLink`), not a product FK |
| Public | `GET /api/home-offers` (active only); storefront `App.jsx` loads via `fetchHomepageOffers` |
| Admin UI | `HomeContentManager.jsx` wired from `CPanelApp.jsx` |
| Tenant | `offerRepository` is company-scoped |

**Phase J extension (minimal):** optional `productIds: string[]` on offer `data`, validated tenant-safe + non-trashed on write; scrubbed on permanent product delete; filtered on public read.

---

## C. Existing promotions/discounts

| Item | Finding |
|------|---------|
| Collection tag | `promotions-discounts` in product `collection` filter attributes |
| Automatic discounts | **Placeholder only** (`AdminCatalogPage` → Phase K) |
| Coupons | **Placeholder only** (Phase L) |
| Order discounts today | Points redemption only (`discount_from_points`) |

Phase J **reuses** the `promotions-discounts` collection attribute for Limited Offer product tagging. Does **not** implement discount application, coupon validation, or stacking.

---

## D. Existing Featured behavior

- Wizard Advanced Settings: checkbox `featured` → saves `isFeatured`
- Product list shows Featured badge when `product.isFeatured`
- DB column `is_featured` synced on persist from `isFeatured || featured`
- Public: serializer field `featured` (broken alias gap — fix in J)
- Storefront homepage heuristic (`HomePage.getPromotedProducts`) also checks `product.featured`
- Trash: public product lists already exclude trashed (`isProductTrashed`)

---

## E. Existing New Arrival behavior

- Explicit boolean merchandising flag (`newArrival` / `isNewArrival`), **not** a time-window algorithm
- Managed in ProductWizard Advanced Settings (same checkbox grid as Featured)
- Collection option `new-arrivals` exists as a separate catalog tag
- Public serializer does **not** expose `newArrival` yet (Decision 9)

**Canonical Phase J rule:** New Arrival = explicit product boolean. Do not invent cron/time-window logic. Do not create a second control path that competes with the checkbox.

---

## F. Required data changes

| Change | Required? |
|--------|-----------|
| New `limitedOffer` column/field | **No — rejected (Decision 8)** |
| New merchandising / offers table | **No** |
| New migration for flags | **No** — flags + `is_featured` already exist |
| Offer `productIds` in JSONB `data` | Additive document field only — **no migration** |
| Sale price variant mapping in public serializer | Decision 15 alignment (additive behavior on existing `price` / `originalPrice`) |

---

## G. API changes

### Products (existing `POST/PUT /api/products`)

- Normalize merchandising flags to both canonical (`featured`, `newArrival`, `bestseller`) and legacy admin aliases (`isFeatured`, `isNewArrival`, `isBestseller`) on write.
- Activity log: when flags change, record a meaningful merchandising summary (reuse `product.updated` or dedicated merchandising metadata — follow existing `recordActivityLog` patterns; no new audit system).
- Permissions unchanged: `products.create` / `products.update` / `products.view`.

### Public serializer (`serializePublicProduct`)

Additive fields:

- `featured` (boolean) — read `featured || isFeatured`
- `newArrival` (boolean) — read `newArrival || isNewArrival`
- `bestseller` (boolean) — read `bestseller || isBestseller`

Never expose: `limitedOffer`, cost price, internal admin metadata.

Variant-aware sale (Decision 15): when a variant has an active sale price, public `price` = sale, `originalPrice` = regular (product summary + variants).

### Homepage offers (`/api/home-offers`)

- Accept optional `productIds` on create/update.
- Validate: IDs belong to `req.companyId`, product exists, **not trashed**.
- Reject cross-tenant and trashed assignments with 4xx.
- Public GET: strip/filter productIds that are trashed/inactive/missing.
- Activity log on offer create/update/delete when product assignment changes.
- Permissions: keep existing `requireAdmin` (no new `products.*.manage` merchandising permissions).

### Permanent delete

- When a product is permanently deleted, remove its id from any tenant homepage offer `productIds` (mirror relation scrub pattern). Soft trash does **not** clear flags or offer refs; public surfaces already exclude trashed products.

### Restore

- Restore clears only trash markers. **Preserve** Featured / New Arrival / Bestseller / offer `productIds` as stored. Do not invent merchandising state on restore.

---

## H. Admin UI changes

| Surface | Change |
|---------|--------|
| ProductWizard Advanced | Keep existing Featured / New Arrival / Bestseller checkboxes (single control path). Ensure save payload writes canonical + alias keys. |
| Products list | Badges for New Arrival / Bestseller (Featured already); optional merchandising filter select (`all` / `featured` / `newArrival` / `bestseller` / `promotions`). |
| HomeContentManager | Reuse `ProductPicker` for optional offer product attachment. |
| Attributes / collection | Existing `promotions-discounts` option remains the Limited Offer product tag path. |
| Discounts / Coupons pages | Untouched placeholders (K / L). |

No new standalone Featured/New Arrival admin pages. No second ProductPicker component.

---

## I. Storefront changes

- Public product list + detail via existing storefront routes use updated serializer.
- Featured / New Arrival / Bestseller consistent across `/content` and `/products/:slug`.
- Homepage offers continue via `/home-offers`; attached `productIds` (when present) only include eligible public products.
- Collection filtering by `collection` attributes remains available to storefront clients.
- No `limitedOffer` product property.

---

## J. Trash integration

| Surface | Behavior |
|---------|----------|
| Public products | Already exclude trashed |
| Featured / New Arrival / Bestseller public flags | Only visible if product is in public set |
| Offer productIds write | Backend rejects trashed targets |
| Offer productIds public read | Drop trashed / inactive / missing |
| Permanent delete | Scrub offer productIds |
| Restore | Preserve prior merchandising metadata |

---

## K. Tenant isolation

- Product flag mutations: existing company-scoped product repository.
- Offer mutations: company-scoped offer repository + product ID validation against `req.companyId`.
- Public storefront: company context + site id (existing).
- ProductPicker: caller supplies tenant catalog; picker already skips trashed/inactive.
- Tests: negative cross-tenant offer product attach + flag isolation.

---

## L. Activity logging

Reuse `recordActivityLog`. Meaningful events:

| Action | When |
|--------|------|
| `product.updated` (with merchandising before/after) | Featured / New Arrival / Bestseller toggled via product save |
| `homepage_offer.created` / `.updated` / `.deleted` | Offer CRUD; include `productIds` in afterData when relevant |

No new audit subsystem.

---

## M. Tests

New focused suite: `api/test/product-merchandising-phase-j.test.js` (+ storefront serializer assertions).

Cover:

- Featured enable/disable + persistence
- Public `featured` / `newArrival` / `bestseller`
- List + detail consistency
- Permission / tenant isolation
- Trashed product rejected on offer attach
- Trashed featured product absent from public content
- Inactive follows existing public active filter
- No `limitedOffer` on product payloads
- Permanent delete scrubs offer productIds
- Cost price still absent from public output

Regression: `storefront-content`, auth-membership, trash, relations, phase-h as applicable.

---

## N. Explicitly rejected architecture

Do **not** introduce:

- `limitedOffer` / `isLimitedOffer` product field or column
- Second homepage-offer or merchandising system
- Generic recommendation / AI / analytics ranking
- New Featured/New Arrival sortOrder tables
- Cron / scheduled New Arrival expiry jobs
- Automatic discount engine (Phase K)
- Coupon engine (Phase L)
- Product Condition business logic (Phase I)
- New permissions such as `products.featured.manage`
- Broad CPanel refactor

**Confirmed:** No `limitedOffer` product field is being introduced.

---

## Implementation checklist (Phase J)

1. [x] Merchandising flag normalizer + product write path
2. [x] Public serializer: `featured` / `newArrival` / `bestseller` + sale-price mapping
3. [x] Homepage offers: optional `productIds` validation + public filter + activity logs
4. [x] Permanent delete offer scrub
5. [x] CPanel: payload aliases, list badges/filter, HomeContentManager ProductPicker
6. [x] Focused + regression tests
7. [x] `cpanel` build
8. [x] Production **not** touched; no unnecessary migration
