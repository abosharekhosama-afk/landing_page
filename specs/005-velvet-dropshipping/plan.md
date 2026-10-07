# Implementation Plan: Velvet Dropshipping

**Branch**: `not created (directory only; branch creation requires explicit approval)` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-velvet-dropshipping/spec.md`

## Summary

Reconcile the draft with the Velvet business flow and developer specification.
Build a company-scoped merchant program: open registration, one store, a public
page at `/store/:slug`, generated merchant images with an unbranded fallback,
admin selling and merchant prices, guest checkout, WhatsApp to the buyer, one
atomic stock deduction on merchant confirmation, warehouse replace/remove, and
Thursday settlements in Asia/Hebron.

Keep new tables, routes, and screens. Do not extend iCare dropshipping. Do not
edit Product Display Priority files. This revision does not approve
implementation.

## Technical Context

**Language/Version**: Node.js (`api`, ESM) and React (`cpanel`)

**Primary Dependencies**: Express 4, `pg`, existing `resolveCompany` and auth, existing public storefront surface in `cpanel`, existing `sharp` for image generation, existing delivery-zone prices for the city amount. No new npm dependency.

**Storage**: Proposed PostgreSQL migration `api/supabase/migrations/041_velvet_dropshipping.sql`. Not written and not applied in this revision.

**Testing**: `node --test` in `api/` for domain, stock, images, orders, settlements, and iCare isolation. `cpanel` build after UI tasks. Browser end-to-end only after a later implementation conversation grants consent.

**Target Platform**: iGroup API, CPanel admin, and the public storefront surface already served by `cpanel`.

**Project Type**: Web application (`api/` + `cpanel/`)

**Performance Goals**: Checkout and confirm each complete in one request. Confirm holds one transaction. Image generation failure does not fail the product add.

**Constraints**: Server-side company and session merchant scope. No invented delivery amount, payout, or stock. Arabic and English. Asia/Hebron for the settlement day and the confirmation day. No edits to iCare dropshipping or Product Display Priority files.

**Scale/Scope**: One store per merchant. Many merchants share one catalog quantity. v1 has no coupons, no page builder, and no return after delivery.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (iGroup Platform v1.0.0)

| Gate | Requirement | Status |
| --- | --- | --- |
| G1 Multi-Tenancy | Server-side tenant scope; no browser-trusted `companyId` | Pass. Merchant id comes from the session. The program is company-scoped even though the business subject is Velvet. |
| G2 Existing Code First | Reuse inspected patterns | Pass. Reuse auth, catalog quantity, delivery-zone prices, uploads, and the public storefront shell. Do not reuse iCare dropshipping because the source documents describe a different lifecycle. |
| G3 Data Integrity | No fake amounts; migration not applied here | Pass. Missing delivery prices and unpaid settlements stay explicit. Migration 041 is not applied. |
| G4 Git Safety | No branch, no commit, no Product Display Priority edits | Pass. |
| G5 Deployment Safety | No Production or Staging mutation in this revision | Pass. |
| G6 CPanel Requirements | Arabic, English, existing layout direction | Pass. |
| G7 Quality | Focused tests named in tasks | Pass. Browser proof waits for implementation consent. |
| G8 Scope Safety | New module plus thin registrations | Pass. |

Post-design re-check: the same gates pass. New tables are justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-velvet-dropshipping/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/velvet-dropshipping-api.md
├── tasks.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
api/src/velvetDropshipping/
├── domain.js
├── database.js
├── merchants.js
├── catalog.js
├── images.js
├── orders.js
├── stock.js
├── settlements.js
└── whatsapp.js

api/src/routes/velvetDropshipping.js
api/src/routes/adminVelvetDropshipping.js
api/supabase/migrations/041_velvet_dropshipping.sql
api/test/velvet-dropshipping-*.test.js

cpanel/src/pages/VelvetDropshipping/
├── MerchantStorefrontPage.jsx
├── MerchantVelvetDashboardPage.jsx
└── AdminVelvetDropshippingPage.jsx
cpanel/src/utils/velvetDropshippingApi.js
```

**Structure Decision**: Public `/store/:slug` is a page on the existing public storefront surface, wired from `cpanel/src/App.jsx`. Merchant and admin dashboards stay in the admin shell. Velvet code does not import `api/src/dropshipping/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New program beside iCare dropshipping | Source documents and the owner require a merchant store, buyer confirmation, and Thursday statements | Extending marketer wallets would mix two lifecycles |
| Public store page in this application | The source documents require `/store/:slug`, cart, and checkout inside the current store, and this application already serves public storefront pages | Leaving only an admin preview omitted the required storefront |
| New stock writer | Product Display Priority currently owns `store.js` and `postgresStore.js` | Editing those files would touch the forbidden work |

## Repository Findings

- iCare dropshipping remains the marketer, wallet, and withdrawal program under `/api/dropshipping` and `/admin/dropshipping`.
- `cpanel/src/App.jsx` already serves public storefront pages outside the admin shell. That is where `/store/:slug` belongs.
- Catalog quantity is the shared stock. iCare `available_stock` is a different field and must not be written.
- Company delivery zones already store a city delivery price. The confirmation message reads that price and does not invent one.
- `sharp` is already an API dependency and is the image generator. No new package is required.
- Migration `040_product_display_priority.sql` remains the other in-progress feature. The next number is `041`.
- The two Word documents in Downloads are the source of truth this plan now follows.

## Architecture Decisions

- Schema: [data-model.md](./data-model.md). Prices live on Velvet offers, not on shared product columns.
- HTTP: [contracts/velvet-dropshipping-api.md](./contracts/velvet-dropshipping-api.md).
- Order states and profit rules: [spec.md](./spec.md). Do not substitute the draft fee, merchant-set price, or post-delivery return.
- Confirm transaction: lock order, verify all lines, deduct catalog quantity, insert movements, set `CONFIRMED`, commit. Replay is a no-op. A short line rolls back and is then flagged without a deduction.
- Warehouse miss: one transaction writes a ledger reversal of that line's confirmation deduction and a separate physical discrepancy so the units stay unsellable. Removal zeros profit and does not move stock again. Replacement verifies and deducts the substitute. Other lines stay active.
- Settlements: Thursday in `Asia/Hebron`, all unsettled `DELIVERED_COLLECTED` orders, idempotent per merchant and Thursday date.
- Images: clean source only; fallback is a neutral unbranded asset shipped with the Velvet module.

## Affected Modules

| Area | Change |
| --- | --- |
| API server | Mount the two Velvet routers |
| Module registry | Add `velvet_dropship.*` keys only |
| Public storefront | Add `/store/:slug` |
| CPanel admin | Merchant dashboard and admin dashboard |
| Delivery zones | Read the city price only |
| Catalog stock | Update through `stock.js` only |
| iCare dropshipping | No change |
| Product Display Priority | No change |

## Source-of-Truth Impact

| Concern | Owner |
| --- | --- |
| Company | Existing company resolver |
| Catalog quantity | Existing catalog, changed only by Velvet movements |
| Selling price and merchant price | Velvet offers, admin writer |
| Merchant image | Velvet merchant-product row |
| Delivery amount | Existing city delivery price |
| WhatsApp delivery | Not owned. The program owns the link text only |
| Payout | Not owned. The program stores method, time, and reference |
| iCare balances | Unchanged iCare tables |

## Test Strategy

- Domain tests for profit, the nine order states, Asia/Hebron Thursday, and same-day cancellation dating.
- Stock tests for atomic confirm, replay, conflict with zero deduction, one operational return, warehouse-miss reversal plus discrepancy with no sellable increase, and replacement deduction.
- Image tests for branded-source refusal, failure fallback, and no regeneration on logo change.
- Settlement tests for collected-only inclusion, double close, and delivery excluded from profit.
- Isolation test against iCare imports and relation names.
- CPanel build after the storefront and dashboard tasks.
- The source documents' browser journey is the later end-to-end script: register, create store, add product, checkout, confirm, fulfill, collect, see profit, settle. It waits for browser consent.

## Rollback / Risk

- Migration 041 is additive and unapplied. Rollback after a future apply is to disable routes. Dropping tables needs a later migration.
- Confirm and replacement are the stock risks. Both fail closed inside one transaction.
- Image generation must fail open for the selection and fail closed for branded pixels.

## Files that must not be modified

- `api/src/products/displayPriority.js`
- `api/src/data/postgresStore.js`
- `api/src/data/store.js`
- `api/supabase/migrations/040_product_display_priority.sql`
- `api/test/product-display-priority.test.js`
- `specs/004-product-display-priority/**`
- `api/src/dropshipping/**`
- `api/src/routes/dropshipping.js`
- `api/src/routes/adminDropshipping.js`
- `api/supabase/migrations/010_icare_dropshipping.sql`
- `cpanel/src/pages/AdminDropshippingPage.jsx`
- `cpanel/src/utils/dropshippingApi.js`
- `cpanel/src/utils/dropshippingProducts.js`
- `api/test/dropshipping.test.js`

`api/src/server.js`, `api/src/moduleRegistry.js`, `cpanel/src/App.jsx`, and `cpanel/src/pages/AdminCompaniesPage.jsx` may receive additive Velvet registrations only.

## Implementation gate

The warehouse-miss decision is now specified. No product decision from this reconciliation remains open. Implementation is not approved. Writing or applying migration `041` remains a constitution approval at implementation time.
