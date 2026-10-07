# Tasks: Velvet Dropshipping

**Input**: Design documents from `/specs/005-velvet-dropshipping/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/velvet-dropshipping-api.md, quickstart.md

**Tests**: Included. Constitution Principle VII requires focused tests for the new behavior.

**Organization**: Tasks follow the reconciled source documents. Do not start them until implementation is approved. Do not modify Product Display Priority files or iCare dropshipping files listed in `plan.md`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add Velvet locations without changing iCare navigation or Product Display Priority.

- [x] T001 Create `api/src/velvetDropshipping/` and `cpanel/src/pages/VelvetDropshipping/`
- [x] T002 [P] Add `velvet_dropship.*` module definitions and permission names in `api/src/moduleRegistry.js` without changing existing `dropshipping.*` entries
- [x] T003 [P] Add the public `/store/:slug` route and the Velvet admin and merchant dashboard paths in `cpanel/src/App.jsx` and `cpanel/src/CPanelApp.jsx` without changing `admin-dropshipping*` keys
- [x] T004 [P] Add Velvet module keys to the company module list in `cpanel/src/pages/AdminCompaniesPage.jsx` without changing iCare dropshipping keys

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared rules and routers. No user story starts before this phase.

**Critical**: Do not write or apply `041` until implementation approval explicitly includes the migration. Do not edit `040_product_display_priority.sql`.

- [x] T005 Write additive tables from `specs/005-velvet-dropshipping/data-model.md` into `api/supabase/migrations/041_velvet_dropshipping.sql` *(APPROVAL REQUIRED: constitution III — do not apply to Staging or Production)*
- [x] T006 Implement the Velvet query helper in `api/src/velvetDropshipping/database.js` so it does not import `api/src/dropshipping/database.js`
- [x] T007 Implement selling-minus-merchant profit, the order states from `specs/005-velvet-dropshipping/spec.md`, and Asia/Hebron Thursday and same-day bounds in `api/src/velvetDropshipping/domain.js`
- [x] T008 Mount `/api/velvet-dropshipping` and `/api/admin/velvet-dropshipping` in `api/src/server.js` using the existing `resolveCompany` middleware
- [x] T009 Add profit, state, and Asia/Hebron tests in `api/test/velvet-dropshipping-domain.test.js`

**Checkpoint**: Domain rules match the source documents, and routers are mounted.

---

## Phase 3: User Story 1 - Merchant registration, store, and dashboard (Priority: P1)

**Goal**: Open registration creates an active merchant and one store. The dashboard shows overview, store, payout settings, and empty orders. Deactivation blocks checkout.

**Independent Test**: Register, save a payout method, confirm a duplicate slug is refused, deactivate the store, and confirm another merchant cannot read the first store.

- [x] T010 [P] [US1] Implement merchant and store create, slug stability, activation, and payout settings in `api/src/velvetDropshipping/merchants.js`
- [x] T011 [US1] Implement `POST /register`, `GET /me`, `PATCH /store`, and `PUT /payout` in `api/src/routes/velvetDropshipping.js` per `specs/005-velvet-dropshipping/contracts/velvet-dropshipping-api.md`
- [x] T012 [US1] Implement merchant and store activation routes in `api/src/routes/adminVelvetDropshipping.js`
- [x] T013 [P] [US1] Build overview, My Store, and payout settings in `cpanel/src/pages/VelvetDropshipping/MerchantVelvetDashboardPage.jsx` with Arabic and English labels
- [x] T014 [US1] Add registration, deactivation, and cross-merchant tests in `api/test/velvet-dropshipping-merchants.test.js`

**Checkpoint**: An active merchant has one stable store link and a dashboard that shows only their own data.

---

## Phase 4: User Story 2 - Storefront, selection, and branded images (Priority: P1)

**Goal**: Merchants add any active offer. Images generate from the clean source or fall back unbranded. `/store/:slug` shows the fixed store page and cart.

**Independent Test**: Add a product with a clean image and see `ready`. Add one with no clean image and see the unbranded fallback without a branded catalog URL. Change the logo and confirm the old image URL is unchanged.

- [x] T015 [P] [US2] Implement offers, merchant-product selection, and removal that leaves existing order snapshots unchanged in `api/src/velvetDropshipping/catalog.js`
- [x] T016 [P] [US2] Implement clean-source generation, branded-source refusal, and fallback in `api/src/velvetDropshipping/images.js` using the existing `sharp` dependency
- [x] T017 [US2] Implement catalog, merchant-product, retry, and public store read routes in `api/src/routes/velvetDropshipping.js`
- [x] T018 [P] [US2] Build the fixed public store, cart, original catalog category grouping, and product list in `cpanel/src/pages/VelvetDropshipping/MerchantStorefrontPage.jsx`, plus Catalog and My Products in `cpanel/src/pages/VelvetDropshipping/MerchantVelvetDashboardPage.jsx` with stock, both prices, expected profit, and Add to Store
- [x] T019 [US2] Add image fallback, branded-source refusal, and shop visibility tests in `api/test/velvet-dropshipping-catalog.test.js`

**Checkpoint**: The public store shows selling price, shared quantity, and only a generated image or the unbranded fallback.

---

## Phase 5: User Story 3 - Admin selling price and merchant price (Priority: P1)

**Goal**: Administrators set both prices. Profit is selling price minus merchant price. Merchants cannot edit prices. Snapshots are defined before checkout.

**Independent Test**: Save 100 and 80, reject a merchant price above the selling price, and reject a merchant price edit from the merchant role.

- [x] T020 [US3] Enforce admin-only price saves and non-negative profit in `api/src/velvetDropshipping/catalog.js` and `api/src/routes/adminVelvetDropshipping.js`
- [x] T021 [US3] Add price snapshot and merchant-edit refusal tests in `api/test/velvet-dropshipping-pricing.test.js`

**Checkpoint**: Every saved offer has profit equal to selling price minus merchant price, with no fee and no discount.

---

## Phase 6: User Story 4 - Orders and WhatsApp buyer confirmation (Priority: P2)

**Goal**: Guest checkout creates a pending order on both dashboards and does not deduct stock. WhatsApp addresses the customer. Confirm deducts once, atomically.

**Independent Test**: Checkout twice with one idempotency key. Confirm stock is unchanged until confirm. Replay confirm and confirm the quantity changes once. A short line returns `STOCK_CONFLICT` and deducts nothing. Cancel is refused before two recorded WhatsApp attempts and accepted after the second attempt on the same Asia/Hebron day.

- [x] T022 [P] [US4] Implement checkout, snapshots, cancel-unconfirmed, and idempotent confirm in `api/src/velvetDropshipping/orders.js`
- [x] T023 [P] [US4] Implement the customer `wa.me` message, including the city delivery amount from the existing delivery-zone price, and record each attempt in `api/src/velvetDropshipping/whatsapp.js`
- [x] T024 [US4] Implement conditional catalog deduction and movement rows in `api/src/velvetDropshipping/stock.js` without editing `api/src/data/store.js`, `api/src/data/postgresStore.js`, or `api/src/products/displayPriority.js`
- [x] T025 [US4] Implement checkout, WhatsApp, confirm, and cancel routes in `api/src/routes/velvetDropshipping.js`, refusing `CANCELLED_UNCONFIRMED` before two same-day attempts, and the admin order read route in `api/src/routes/adminVelvetDropshipping.js`
- [x] T039 [US4] Build the merchant orders screen with customer name, phone, city, full address, items, totals, WhatsApp, Confirm, and Cancel in `cpanel/src/pages/VelvetDropshipping/MerchantVelvetDashboardPage.jsx`
- [x] T026 [US4] Add checkout, WhatsApp, atomic confirm, and iCare isolation tests in `api/test/velvet-dropshipping-orders.test.js`

**Checkpoint**: Stock moves only on the first successful confirmation. Delivery is visible to the customer and excluded from merchant profit.

---

## Phase 7: User Story 5 - Fulfillment and missing-stock resolution (Priority: P2)

**Goal**: Administrators move orders through the source-document states. Marking a confirmed line unavailable reverses that line's confirmation deduction and records a separate physical discrepancy so the units stay unsellable. Removal zeros that line's profit. Replacement verifies and deducts only the substitute. Other lines stay active. Every stock change is atomic, idempotent, and audited. Operational cancel returns stock once for lines still held by the order. No return exists after delivery.

**Independent Test**: Advance to delivered-and-collected and refuse a return. Mark one confirmed line unavailable and confirm one reversal, one discrepancy, no increase in sellable quantity, and no change on a second mark. Remove that line and confirm its profit is zero while another line stays active. Replace a different line only when the substitute has stock, and confirm a short substitute is refused with no deduction.

- [x] T027 [US5] Implement fulfillment transitions, operational cancel, warehouse-miss reversal plus separate physical discrepancy, replace, remove, and a readable merchant notification in `api/src/velvetDropshipping/orders.js` and `api/src/velvetDropshipping/stock.js`. Keep each adjustment atomic and idempotent, and do not edit `api/src/data/store.js`, `api/src/data/postgresStore.js`, or `api/src/products/displayPriority.js`.
- [x] T028 [US5] Implement fulfillment, operational cancel, missing-line, and merchant resolve routes in `api/src/routes/adminVelvetDropshipping.js` and `api/src/routes/velvetDropshipping.js`
- [x] T029 [US5] Add state, replay, reversal-plus-discrepancy, removal-profit, and replacement-stock tests in `api/test/velvet-dropshipping-stock.test.js`

**Checkpoint**: Sellable quantity, order profit, and the audit trail agree after every warehouse exception. A repeated miss or replacement does not move stock twice.

---

## Phase 8: User Story 6 - Thursday settlements in Asia/Hebron (Priority: P3)

**Goal**: Thursday close includes only unsettled delivered-and-collected orders. Paying records the merchant payout method and does not transfer money.

**Independent Test**: Close the same Thursday twice and get one statement. A pending order is absent. A second close after pay does not change the total.

- [x] T030 [US6] Implement Asia/Hebron Thursday close and pay in `api/src/velvetDropshipping/settlements.js`
- [x] T031 [US6] Implement settlement list, close, and pay routes in `api/src/routes/adminVelvetDropshipping.js` and the merchant earnings route in `api/src/routes/velvetDropshipping.js`, including order number, selling total, merchant price, profit, payment state, and Thursday-settlement membership
- [x] T040 [US6] Build the merchant earnings and settlement history screen in `cpanel/src/pages/VelvetDropshipping/MerchantVelvetDashboardPage.jsx`
- [x] T032 [US6] Add idempotent close and profit-formula tests in `api/test/velvet-dropshipping-settlements.test.js`

**Checkpoint**: Statement profit equals the sum of per-unit merchant profit times eligible quantity, with delivery excluded.

---

## Phase 9: User Story 7 - Admin management (Priority: P2)

**Goal**: Administrators manage merchants, stores, both prices, orders, fulfillment, missing items, and settlements. Merchants cannot.

**Independent Test**: A merchant token receives 403 on price, stock, fulfillment, and pay routes. An administrator can filter orders by store.

- [x] T033 [P] [US7] Add the Velvet API client in `cpanel/src/utils/velvetDropshippingApi.js`
- [x] T034 [US7] Build merchants, stores, offers, orders, fulfillment, missing items, settlements, and real sales and merchant-profit totals in `cpanel/src/pages/VelvetDropshipping/AdminVelvetDropshippingPage.jsx` with Arabic and English labels and honest empty states
- [x] T035 [US7] Add permission and cross-company refusal tests in `api/test/velvet-dropshipping-admin.test.js`

**Checkpoint**: Admin screens call only `/api/admin/velvet-dropshipping` and do not link to `/admin/dropshipping`.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Prove separation and that the reconciled rules are what the tests execute.

- [x] T036 Add a source isolation test in `api/test/velvet-dropshipping-isolation.test.js` that fails if Velvet route or module files import `api/src/dropshipping/` or name the iCare relations listed in `specs/005-velvet-dropshipping/contracts/velvet-dropshipping-api.md`
- [x] T037 Run the Velvet `node --test` files listed in `specs/005-velvet-dropshipping/quickstart.md` and `npm run build` in `cpanel/`
- [x] T038 Record any behavior that differs from `specs/005-velvet-dropshipping/spec.md` back into that spec before calling the feature complete
- [x] T041 When browser consent exists in the implementation conversation, run the journey in `specs/005-velvet-dropshipping/spec.md` SC-011 on the local or staging store. Do not open a browser before that consent.

---

## Dependencies

```text
Phase 1 → Phase 2 → US1 → US2 → US3 → US4 → US5 → US6
                              ↘ US7 settings and merchant activation after US1;
                                 order, fulfillment, and settlement panels after US4–US6
```

- US1 depends on Phase 2.
- US2 depends on US1.
- US3 depends on US2.
- US4 depends on US3. T039 depends on T025.
- US6 earnings screen T040 depends on T031.
- US5 depends on US4.
- US6 depends on US5.
- US7 merchant and store screens depend on US1. Price screens depend on US3. Order screens depend on US4 and US5. Settlement screens depend on US6.

## Parallel execution examples

- After Phase 2: T010 and T013 can proceed together.
- US2: T015 and T016 can proceed together, then T017.
- US4: T022 and T023 can proceed together, then T024 and T025.
- US7: T033 can proceed once the contract is stable.

## Implementation strategy

MVP is stories 1 through 3: a store, a public page, a safe image, and legal admin prices. Checkout, atomic confirm, warehouse resolution, and Thursday settlement follow in that order. Do not start OpenCode `imkan-coder` until implementation is approved.

## Task counts

| Phase | Tasks | IDs |
| --- | --- | --- |
| Setup | 4 | T001–T004 |
| Foundational | 5 | T005–T009 |
| US1 | 5 | T010–T014 |
| US2 | 5 | T015–T019 |
| US3 | 2 | T020–T021 |
| US4 | 6 | T022–T026, T039 |
| US5 | 3 | T027–T029 |
| US6 | 4 | T030–T032, T040 |
| US7 | 3 | T033–T035 |
| Polish | 4 | T036–T038, T041 |
| **Total** | **41** | T001–T041 |

Format check: every task has a checkbox, sequential ID, file path, and a story label only on user-story phases.
