# Implementation Plan: Product Display Priority

**Branch**: `not created` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-product-display-priority/spec.md`

**Status**: D1–D5 approved 2026-10-06. Awaiting approval of this task plan before implementation. Do not apply the migration to Staging or Production.

## Summary

Company admins configure two surfaces, home and shop. Each surface has a global configuration and optional per-brand overrides. A missing override inherits that surface's global configuration.

Each configuration has two parts. Selection chooses which eligible products appear, using classifications, categories, and merchandising flags the catalog already stores. Ordering sequences that set with one existing key. The key list is not limited to featured, bestseller, and manual.

Verified sales remains one ordering key, using completed and delivered retail orders only. The bestseller flag is a different existing key. Manual positions store product ids only. Customer filters narrow the selected set. An explicit customer sort wins for that visit and does not rewrite the saved configuration.

## Technical Context

**Language/Version**: Node.js API (`api/`), React/Vite CPanel (`cpanel/`)

**Primary Dependencies**: Express routes, existing `store.js` / `postgresStore.js`, existing product permissions, existing activity log

**Storage**: PostgreSQL. Product document JSONB already holds `sortOrder`, `featured` / `isFeatured`, `bestseller` / `isBestseller`. Column `products.is_featured` mirrors the featured flag. Orders and `order_items` are the only sales source. `company_settings.settings` holds small company product settings.

**Testing**: Node test runner, `node --test`, beside existing `api/test/storefront-content.test.js` and product reorder tests. CPanel unit tests for ordering helpers.

**Target Platform**: CPanel admin and public `GET /api/storefront/content`

**Project Type**: Multi-tenant admin API plus CPanel

**Performance Goals**: One storefront content response still returns the catalog once. Ranking metadata is id lists, not copied products. Velvet-scale catalog is hundreds of products and about a dozen brands.

**Constraints**: Server-side company scope. No browser-trusted company id. No sales quantities on the public payload. No new admin module. Arabic and English. Migration and Production are separately approved.

**Scale/Scope**: Three place kinds per company. Brand places are one home section and one shop per existing brand.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (iGroup Platform v1.0.0)

| Gate | Requirement | Status |
| --- | --- | --- |
| G1 Multi-Tenancy | Places are keyed by server `companyId`. Brand ids are checked against that company's brands. Public content stays on the existing storefront tenant resolver. | Pass |
| G2 Existing Code First | Reuses product flags, company-wide `sortOrder`, Products list reorder UI, `products.view` / `products.update`, activity log, and `GET /api/storefront/content`. | Pass |
| G3 Data Integrity | No fabricated ranks. Best-selling refused without verified sales. Recommended table is not created until approved. | Pass, with approval hold |
| G4 Git Safety | Spec artifacts only. No product code, no branch, no commit. | Pass |
| G5 Deployment Safety | No environment mutation in this phase. | Pass |
| G6 CPanel Requirements | Extend Products admin labels in both languages. No new module. | Pass |
| G7 Quality | Test list is in quickstart. Not run, because there is no implementation. | Pass as a plan |
| G8 Scope Safety | Storefront repository changes are a follow-up dependency, not hidden in this repo's first change. | Pass |

Post-design re-check: the same gates hold. The ordering table is a justified addition only if Decision A is approved. It is not a constitution violation when documented here and left unbuilt.

## Project Structure

### Documentation (this feature)

```text
specs/004-product-display-priority/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/display-priority-api.md
└── checklists/requirements.md
```

`tasks.md` is the implementation checklist. Do not start it until the owner approves that task plan.

### Source Code (repository root)

```text
api/src/products/                # ranking rules, sales eligibility
api/src/routes/                  # admin read/write beside existing product routes
api/src/storefront/publicContent.js
api/src/routes/storefront.js     # additive displayPriority on GET /content
api/src/data/postgresStore.js    # persistence after migration approval
api/src/tenancy/company.js       # only if mode fallback settings are stored on the company
cpanel/src/pages/AdminDashboardPage.jsx
cpanel/src/utils/productOrdering.js
cpanel/src/utils/productsApi.js
api/test/                        # focused ranking and storefront contract tests
```

**Structure Decision**: Extend the existing API and Products admin. Do not add a CPanel module, a second product route family for shoppers, or storefront source in this repository.

## Source of truth

| Fact | Owner | Storage | Writer | Readers |
| --- | --- | --- | --- | --- |
| Product record (name, price, images, stock, brand) | Catalog | `products` row + JSONB `data` | Existing product APIs | Admin, storefront content |
| Featured marker | Catalog | `featured` / `isFeatured` and `products.is_featured` | Product save | Featured-first sort, public `featured` |
| Manual bestseller badge | Catalog | `bestseller` / `isBestseller` in JSONB | Product save | Badge only. Not a rank. |
| Company-wide order | Catalog | JSONB `data.sortOrder` | `PATCH /api/admin/products/reorder` | Fallback when a place has no mode |
| Place mode and manual sequence | Merchandising | Approved tables `product_display_modes` and `product_display_order`. Product ids and positions only. | New admin write on `products.update` | Admin GET, public content |
| Verified units | Orders | Existing orders and order lines | Existing order flow | Best-selling sort on the server only |
| Shopper ranking | Storefront content | Computed into `displayPriority` on `GET /api/storefront/content` | Content builder | Storefront application |

Tenant boundary: every read and write uses the authenticated company or the resolved storefront company. Permission gate: `products.view` to read, `products.update` to write. Company admins keep their existing bypass. Activity: one `product.display_priority_updated` log per successful save.

## What already exists (inspected)

- `GET /api/storefront/content` returns one `products` array sorted by `sortOrder`, then slug. Each product includes `featured`, `bestseller`, `sortOrder`, and `brandId`. No per-place order and no sales counts.
- `PATCH /api/admin/products/reorder` rewrites company-wide `sortOrder` under `products.update`, in one transaction, with one `product.reordered` activity entry. It cannot represent three independent places.
- Products admin drag and up/down controls call that reorder endpoint (`ProductsListPage` in `AdminDashboardPage.jsx`).
- Featured and bestseller checkboxes already persist on the product. Public `bestseller` is the badge, not a sales rank.
- Authenticated `GET /api/products` adds `salesCount` by summing every order line quantity. Status is ignored. That helper must not be reused as the public best-selling rank.
- Order status buckets already exist in dashboard insights: delivered/completed, cancelled, returned/refunded, and in-progress states.
- `company_settings.settings` is the existing home for small product settings (`lowStockThreshold`, flags). It is a poor home for hundreds of ids times a dozen brands.
- Spec `002` Decision 1 explicitly left homepage-specific and category-specific order out of scope. This feature is that missing capability, not a change to the global reorder contract.

## Configuration model

Surfaces are `home` and `shop`. Scopes are global (`brand_id` null) or one existing brand. A missing brand row inherits that surface's global row. A missing global row keeps today's catalog membership and `sortOrder`. Home does not inherit shop.

Global home is applied inside each brand section, then limited to that brand. A brand shop is limited to that brand. The global shop is not brand-limited.

### Selection

Rules may cite only existing sources:

| Source | Existing data |
| --- | --- |
| Merchandising flag | `featured`, `newArrival`, `bestseller` |
| Filter group | `age`, `gender`, `skill`, `occasion`, `material`, `productType`, `theme`, `collection`, ids from `PRODUCT_FILTER_ATTRIBUTE_OPTIONS` |
| Category | Existing main category or subcategory for the company |

No rules means all eligible products in the boundary. Unknown ids are rejected. Several rules use `match: "and"` by default or `match: "or"` when saved. Quick shop is rejected. Promotional collection ids from the existing collection vocabulary are allowed.

### Ordering

One key per saved configuration. A brand may leave the key unset and inherit the global key for that surface.

| Key | Source |
| --- | --- |
| `catalog` | Existing `sortOrder`, then slug |
| `featured` | Featured flag |
| `newArrival` | New-arrival flag |
| `bestseller` | Bestseller flag, not sales |
| `verifiedSales` | Completed or delivered order lines only |
| `manual` | Product ids and positions for the selected set |
| `newest` | Existing created time, newest first |
| `oldest` | Existing created time, oldest first |
| `priceAsc` | Existing public price, low to high |
| `priceDesc` | Existing public price, high to low |
| `name` | Existing product name |

Most-viewed and random are not keys.

`verifiedSales` uses `completed`, `complete`, and `delivered` only. It refuses to save when the selected set has no verified units. If units later disappear, display falls back to `catalog`. Do not use `salesCount.js`, `payment_method`, invoice status, or dropshipping status.

The admin UI loads flags, categories, and filter options from the existing catalog. It must not hardcode featured, bestseller, and manual as the only choices.

### Public payload

Keep the `products` array and its catalog sort. Add resolved `displayPriority` for global home, global shop, and each brand's resolved home and shop. Report `inheritedSelection` and `inheritedOrdering` separately. Include `orderedIds` after selection. No unit counts. Customer filters and an explicit customer sort are applied by the storefront on top of this payload and are not stored here.

## Recommended design

1. Store one configuration row per company, surface, and optional brand. Store each selection rule as source plus existing id. Store manual positions in the child table. Do not copy product fields.
2. Build the chooser from the product form's brands, categories, merchandising flags, and filter vocabulary.
3. Keep `PATCH /api/admin/products/reorder` as company-wide `sortOrder` only.
4. Reject quick shop, most-viewed, and random. Accept existing promotional collection ids as selection sources.

## Approved decisions (2026-10-06)

### Decision A — Storage: approved

Tenant-scoped tables. `product_display_modes` stores surface, optional brand, ordering key, and selection-rule references. `product_display_order` stores product ids and positions for the `manual` key. No copied product fields. Migration file may be added during implementation. Applying it to Staging or Production remains a separate approval. Company-settings JSON is not the store.

### Decision B — Verified sales: approved and inspected

Count retail order line quantities only when `orders.status` is completed delivery. This is the `verifiedSales` ordering key, not the bestseller flag, and not the only ordering key.

Allow-list (case-insensitive): `completed`, `complete`, `delivered`.

The live CPanel order list (`cpanel/src/utils/sales.js` `ORDER_STATUSES`) has no Delivered value. Its completed value is `Completed`. `delivered` remains an accepted legacy alias because dashboard insights already maps it to the delivered bucket.

Exclude in-progress CPanel statuses: `Awaiting Employee Review`, `Confirmation 1`, `Confirmation 2`, `Awaiting Delivery`, plus aliases `pending` and `processing`.

Exclude `Returned`, `Cancelled`, and aliases `refunded`, `canceled`, `void`, `voided`.

Exclude `paid` and `confirmed` even though `cpanel/src/utils/sales.js` `COMPLETED_ORDER_STATUSES` lists them. Those are not completed delivery. Do not reuse `isCountableOrder`, `NON_COUNTABLE_STATUSES`, or `salesCount.js`.

Do not use `orders.payment_method`. Retail orders have no payment-status column. Invoice `paid` and dropshipping `delivery_status` are different records and do not count.

### Decision C — Storefront: approved as follow-up

This repository implements and verifies the platform API and CPanel only. The Velvet storefront applies `orderedIds`, then existing customer filters and an explicit customer sort, in a later task. No storefront repository edits in this task plan.

## Dependencies

- Existing catalog brands, products, featured flag, and company-wide `sortOrder`.
- Existing orders and order lines. No new sales table.
- Existing `GET /api/storefront/content` tenant resolution (`X-Site-Id`, origin, company).
- Existing `products.view` and `products.update`.
- Storefront repository change (Decision C) before shoppers see the new order on the live Velvet site.
- Decision A is approved. The migration file is in scope. Running it on Staging or Production is not.
- Decision B allow-list above is the test oracle.
- Decision C: no Velvet storefront edits until this platform contract is verified.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| New tables, approved in Decision A | One product cannot hold three independent orders in a single `sortOrder` | Reusing company-wide `sortOrder` collapses home, general shop, and brand shops into one list. Copying products violates the spec. |

## Out of scope until this task plan is approved

- Implementation and deployment.
- Editing the storefront repository.
- Applying migrations to any shared database.
- New classification values, most-viewed, random, quick shop, and homepage-offer product lists.
