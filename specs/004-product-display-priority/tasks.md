# Tasks: Product Display Priority

**Status**: D1-D5 approved 2026-10-06. Awaiting approval of this task plan. No implementation.

**Tests**: Required by Constitution Principle VII.

**Organization**: Do not edit the Velvet storefront repository. Do not apply migrations to Staging or Production. Do not hardcode featured, bestseller, and manual as the only options.

**Constitution**: `.specify/memory/constitution.md`. The migration file is approved to be written. Applying it outside a disposable local test database requires a new explicit approval.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

- API: `api/src/`, `api/test/`, `api/supabase/migrations/`
- CPanel: `cpanel/src/`

## Phase 1: Setup

**Purpose**: Lock the inspected status rule and migration number before any write.

- [ ] T001 Confirm `api/supabase/migrations/` has no `040_*.sql` and that the next file is `api/supabase/migrations/040_product_display_priority.sql`. Stop if 040 is already taken and pick the next free number. Record the chosen filename in the migration task notes inside that file's header comment only.
- [ ] T002 [P] Re-read `cpanel/src/utils/sales.js` `ORDER_STATUSES` and `api/src/analytics/dashboardInsights.js` `orderStatusBucket`. Stop if `Completed` is no longer the CPanel completed status, or if retail `orders` gained a payment-status column in `api/src/data/postgresStore.js` `orderRow`. Do not write code in this task. The allow-list remains `completed`, `complete`, and `delivered` only.

---

## Phase 2: Foundational (blocks all stories)

**Purpose**: Tenant-scoped storage and pure ranking. No admin route and no CPanel yet.

**Checkpoint**: Migration file exists and is not applied to Staging or Production. Pure tests for inheritance, match mode, ordering keys, and verified units pass on fixtures.

- [ ] T003 Add `api/supabase/migrations/040_product_display_priority.sql` (or the free number from T001) creating `product_display_modes` and `product_display_order` as specified in `specs/004-product-display-priority/data-model.md`. Store nullable selection and nullable ordering so a brand can inherit each field independently. Follow `api/supabase/migrations/024_product_relations.sql` for `(company_id, product_id)` foreign keys. Header must say the file must not be applied to Staging or Production in this change. *(Migration file approved. Application to shared environments is not approved.)*
- [ ] T004 Persist configuration and position rows with a tenant catalog write lock in `api/src/data/postgresStore.js` and export them through `api/src/data/store.js`. A configuration row is company, surface (`home` or `shop`), nullable brand id, nullable ordering key, selection match, and selection references. Position rows store product ids only for `manual`. Every query includes `company_id`. Do not copy product fields.
- [ ] T005 [P] Implement field inheritance and eligibility in `api/src/products/displayPriority.js`. A null brand selection inherits global selection for that surface. A null brand ordering key inherits global ordering for that surface. Home does not inherit shop. Brand results include only that brand. Eligible products are active, visible, and not trashed. Reject unknown brands.
- [ ] T006 [P] Implement `verifiedUnitsByProductId` in `api/src/products/verifiedSales.js`. Count `quantity` or `qty` only when `orders.status` lowercases to `completed`, `complete`, or `delivered`. Ignore `payment_method`, invoice status, dropshipping rows, and `api/src/products/salesCount.js`.
- [ ] T007 Implement selection plus one ordering key in `api/src/products/displayPriority.js`. `match` defaults to `and` and accepts `or`. Rules may cite an existing flag, filter id, promotional collection id, or category id. Empty rules mean all eligible products. Ordering keys are `catalog`, `featured`, `newArrival`, `bestseller` (flag only), `verifiedSales`, `manual`, `newest`, `oldest`, `priceAsc`, `priceDesc`, and `name`. Reject `quickShop`, most-viewed, and random. Depends on T005 and T006.
- [ ] T008 [P] Add unit tests in `api/test/product-display-priority.test.js` for independent inheritance, match-all, match-any, a promotional collection id, brand boundary, bestseller flag versus `verifiedSales`, newest, oldest, price, and name, and the status allow-list. Assert quick shop, most-viewed, and random are rejected. Run `node --test api/test/product-display-priority.test.js`.

---

## Phase 3: User Story 1 - Global shop and brand override (Priority: P1)

**Goal**: Save a global shop selection and ordering key. A brand may override either field and inherit the other.

**Independent Test**: A brand with neither field set matches the global shop inside that brand. A brand that overrides only ordering keeps the global selection. `products` array order is unchanged. Another company is unaffected.

### Tests for User Story 1

- [ ] T009 [P] [US1] Extend `api/test/product-display-priority.test.js` and `api/test/storefront-content.test.js` for global `shop`, inherited fields, and a partial brand override. Use the product-list permission helper. Cover `403` on PUT without `products.update` and cross-company `400`. Confirm failure before T010.

### Implementation for User Story 1

- [ ] T010 [US1] Add `GET`, `PUT`, and `DELETE /api/admin/product-display-priority` on a sibling router mounted from `api/src/server.js` so the path matches `specs/004-product-display-priority/contracts/display-priority-api.md` and `PATCH /api/admin/products/reorder` is unchanged.
- [ ] T011 [US1] On successful PUT or DELETE, write one `product.display_priority_updated` activity entry through `api/src/activityLog/logger.js`.
- [ ] T012 [US1] Add `displayPriority.shop` and `displayPriority.brands[brandId].shop` in `api/src/routes/storefront.js`, including `inheritedSelection` and `inheritedOrdering`. Do not reorder the existing `products` array. Do not add unit counts.

**Checkpoint**: Shop field inheritance works. Home is still absent.

---

## Phase 4: User Story 2 - Global home and brand override (Priority: P1)

**Goal**: Home has its own global configuration and independent brand field overrides. It does not inherit shop.

**Independent Test**: Global home and global shop differ. A brand with no home fields inherits home only. A home ordering override does not change that brand's shop or its inherited home selection.

### Tests for User Story 2

- [ ] T013 [P] [US2] Add home inheritance and home-versus-shop cases to `api/test/product-display-priority.test.js` and `api/test/storefront-content.test.js`. Confirm failure before T014.

### Implementation for User Story 2

- [ ] T014 [US2] Accept `surface=home` on the admin routes from T010 and publish `displayPriority.home` and `displayPriority.brands[brandId].home` from `api/src/routes/storefront.js`.

**Checkpoint**: Home and shop inherit independently.

---

## Phase 5: User Story 3 - Existing selection sources (Priority: P1)

**Goal**: Selection can cite existing flags, filter options, promotional collections, and categories, combined with match-all or match-any. Unknown ids and quick shop are rejected.

**Independent Test**: Match-all returns only products with every cited value. Match-any returns products with at least one. An unknown id returns `400`. Empty rules return all eligible products in the boundary.

### Tests for User Story 3

- [ ] T015 [P] [US3] Add selection cases to `api/test/product-display-priority.test.js` using ids from `api/src/catalog/productFilterAttributes.js`, including `promotions-discounts`, and a fixture category. Confirm failure before T016.

### Implementation for User Story 3

- [ ] T016 [US3] Validate selection sources in the admin PUT against `PRODUCT_FILTER_ATTRIBUTE_OPTIONS`, merchandising flags, existing collection ids, and the company's categories. Default `match` to `and`. Reject `quickShop` and unknown ids.

**Checkpoint**: Selection uses the existing vocabulary only.

---

## Phase 6: User Story 4 - Ordering keys (Priority: P2)

**Goal**: The selected set can be ordered by any approved key. Customer sort is not stored.

**Independent Test**: `newest`, `oldest`, `priceAsc`, `priceDesc`, and `name` follow existing product fields. `bestseller` follows the flag. `verifiedSales` returns `409` without completed units. Manual ids cannot include a product outside the selection. `PATCH /api/admin/products/reorder` does not delete the configuration.

### Tests for User Story 4

- [ ] T017 [P] [US4] Add ordering-key, `409`, manual-boundary, and global-reorder cases to `api/test/product-display-priority.test.js`. Confirm failure before T018.

### Implementation for User Story 4

- [ ] T018 [US4] Enforce every approved ordering key, including `verifiedSales` and `manual`, in the admin PUT and in `api/src/routes/storefront.js`. Fallback to catalog order when verified units disappear after a successful save. Do not call `attachSalesCounts`.
- [ ] T019 [US4] Add read and save helpers in `cpanel/src/utils/productsApi.js`.
- [ ] T020 [US4] Add surface, scope, selection, and ordering controls to `ProductsListPage` in `cpanel/src/pages/AdminDashboardPage.jsx`, populated from existing brands, categories, flags, filter options, and promotional collections. Include newest, oldest, both price directions, and name. Reuse drag controls only for `manual`. Allow selection and ordering to be cleared independently. Wire save through `cpanel/src/CPanelApp.jsx` without a new admin module. Do not render quick shop, most-viewed, or random.
- [ ] T021 [P] [US4] Add English and Arabic labels only where the catalog vocabulary does not already supply them, in `cpanel/src/data/translations.js`.

**Checkpoint**: All four stories work with independent inheritance, match-all and match-any, promotional collections, and the approved ordering keys.

---

## Phase 7: Polish and verification gates

**Purpose**: Prove the platform contract. Do not deploy and do not start the storefront follow-up.

- [ ] T022 Run `node --test api/test/product-display-priority.test.js api/test/storefront-content.test.js`. Fix only failures caused by this feature.
- [ ] T023 Run the CPanel staging build (`npm run build:staging` in `cpanel/`) because `cpanel/src/pages/AdminDashboardPage.jsx` changed. Do not upload the build.
- [ ] T024 Confirm resolved `orderedIds` honor brand boundaries, empty selection, independent inheritance, match mode, and the verified-sales allow-list. Do not open a browser unless the owner has consented in the current conversation.
- [ ] T025 Confirm the diff does not edit a storefront repository, does not apply the migration to Staging or Production, does not add classification ids, and does not change `PATCH /api/admin/products/reorder`.

---

## Dependencies and execution order

- Setup (T001-T002) before Foundational (T003-T008).
- Foundational blocks every story.
- US1 before US2, US3, and US4.
- US3 and US4 after US1. US4 after US3 so manual positions apply to a selected set.
- Default order: US1, then US2, then US3, then US4, then Polish.

## Implementation strategy

MVP is Setup, Foundational, and User Story 1. Then home inheritance, then selection rules, then ordering keys. Storefront application stays a follow-up.

## Notes

- Commit only when the owner asks.
- Browser verification needs explicit consent.
- This file does not authorize an implementation run.
