# Implementation Plan: CPanel Invoice Management

**Branch**: `001-cpanel-invoice-management` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cpanel-invoice-management/spec.md`

## Summary

Complete the existing **Getting Paid → Invoices** page by extending `AdminGettingPaidPage.jsx` and `invoices.js` into a full invoice management UI: client-side search/filter list, create/edit modals with customer prefill and line-item totals, detail view, cancel (PATCH), and void (POST `/void`). Reuse existing tenant invoice APIs, `apiRequest`, Getting Paid CSS, and bilingual copy—no backend or migration changes.

## Technical Context

**Language/Version**: JavaScript (ES modules), React 19, Node.js test runner  
**Primary Dependencies**: Vite 7, lucide-react, existing CPanel utilities (`api.js`, `gettingPaid.js`, `customersApi.js`, `sales.js` currency)  
**Storage**: Tenant invoice records via existing API (`company_invoices` table server-side); no CPanel-local persistence  
**Testing**: `node --test cpanel/test/*.test.js` (workspace root script)  
**Target Platform**: CPanel web app (desktop + responsive mobile)  
**Project Type**: Web application — `cpanel/` frontend only  
**Performance Goals**: Client-side filter/search responsive for ≤500 invoices per spec SC-001  
**Constraints**: No backend edits; no fake data; preserve uncommitted work; fix `invoices.js` syntax error; void via POST; no void list filter  
**Scale/Scope**: 2 primary source files + CSS + 2 test files; Invoices sub-page only within Getting Paid

## Constitution Check

*GATE: Passed before Phase 0 research. Re-checked after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (iGroup Platform v1.0.0)

| Gate | Requirement | Status |
| --- | --- | --- |
| G1 Multi-Tenancy | All data access uses server-side tenant scope; no browser-trusted `companyId`; CPanel/API stay tenant-generic | ✅ Pass |
| G2 Existing Code First | Extends `AdminGettingPaidPage.jsx`, `invoices.js`, Getting Paid CSS; reuses `apiRequest`, `fetchCustomers` | ✅ Pass |
| G3 Data Integrity | Real API records only; honest empty/error states; no migrations | ✅ Pass |
| G4 Git Safety | Minimal file set; no git operations in this phase | ✅ Pass |
| G5 Deployment Safety | Validate via local tests + `cpanel` staging build before any deploy | ✅ Pass |
| G6 CPanel Requirements | `invoiceCopy()` AR/EN; `gettingPaidDirection()` RTL/LTR; existing design tokens | ✅ Pass |
| G7 Quality | Focused tests + build identified in quickstart | ✅ Pass |
| G8 Scope Safety | No Sales/Orders/Customers module edits; other Getting Paid pages untouched | ✅ Pass |

## Project Structure

### Documentation (this feature)

```text
specs/001-cpanel-invoice-management/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Entities and lifecycle
├── quickstart.md        # Validation guide
├── contracts/
│   └── invoice-api.md   # CPanel-facing API contract
└── tasks.md             # (/speckit-tasks — not yet created)
```

### Source Code (files to touch)

```text
cpanel/
├── src/
│   ├── pages/
│   │   └── AdminGettingPaidPage.jsx    # Primary UI: list, modals, state
│   ├── utils/
│   │   └── invoices.js                 # Fix syntax; helpers; API wrappers; filter
│   └── styles/
│       └── global.css                  # Invoice toolbar/form/modal extensions (scoped)
└── test/
    ├── getting-paid-pages.test.js      # Update empty-state / wiring assertions
    └── invoices-utils.test.js          # NEW: validation, totals, filter helpers
```

**Structure Decision**: Single-package CPanel extension. No new routes, pages, or backend files. Optional thin API wrappers live in `invoices.js` to keep `AdminGettingPaidPage.jsx` focused on UI.

---

## 1. Exact Files Expected to Change

| File | Change type | Purpose |
| --- | --- | --- |
| `cpanel/src/utils/invoices.js` | **Fix + extend** | Remove extra `}`; add `filterInvoiceRows`, `invoiceEditable`, `customerDisplayName`, status filter options (drop void); API wrappers; `editStatusOptions` (draft, issued, paid only) |
| `cpanel/src/pages/AdminGettingPaidPage.jsx` | **Extend** | Wire utilities; replace onboarding; list toolbar; modals for create/edit/detail/confirm; lifecycle actions |
| `cpanel/src/styles/global.css` | **Extend** | Add classes inside `/* Tenant Getting Paid pages */` block only: toolbar, form grid, line-item table, detail layout, wider modal variant, action buttons column |
| `cpanel/test/getting-paid-pages.test.js` | **Update** | Empty state expects create CTA; assert void POST path string; filter/search helpers referenced |
| `cpanel/test/invoices-utils.test.js` | **Add** | Unit tests for validation, totals, filtering, `invoiceEditable` |

**Files explicitly NOT changed**: `api/**`, `cpanel/src/utils/gettingPaid.js` (unless a one-line export is truly unnecessary), other Getting Paid page components, Customers/Sales modules, navigation, routing.

---

## 2. Existing API Endpoints & Frontend Utilities to Reuse

### API endpoints (via `apiRequest`)

| Method | Path | Use |
| --- | --- | --- |
| GET | `/admin/invoices` | List load + refresh after mutations |
| POST | `/admin/invoices` | Create |
| GET | `/admin/invoices/:id` | Detail + edit prefill |
| PATCH | `/admin/invoices/:id` | Update + cancel (`status: "cancelled"`) |
| POST | `/admin/invoices/:id/void` | **Void (preferred)** |

Verified compatible with `apiRequest(path, { method, body: JSON.stringify(...) })` — same pattern as `customersApi.js` and `dropshippingApi.js`.

### Frontend utilities

| Module | Symbols |
| --- | --- |
| `cpanel/src/utils/api.js` | `apiRequest` |
| `cpanel/src/utils/invoices.js` | `invoiceCopy`, `invoiceStatusLabel`, `emptyInvoiceForm`, `invoiceToForm`, `lineTotalValue`, `computeInvoiceTotals`, `validateInvoiceForm`, `buildInvoicePayload` + **new** wrappers/filters |
| `cpanel/src/utils/gettingPaid.js` | `normalizeInvoiceRows`, `invoiceView`, `gettingPaidCurrency`, `gettingPaidDirection`, `canViewGettingPaid` |
| `cpanel/src/utils/customersApi.js` | `fetchCustomers` (read-only picker) |
| `cpanel/src/utils/sales.js` | `formatCompanyCurrency` (via `gettingPaidCurrency`) |

### UI patterns to mirror

| Pattern | Source |
| --- | --- |
| Modal backdrop + Escape close | `UnsupportedDialog`, `AdminSalesPage` dialogs |
| Toolbar search/filter | `SalesToolbar`, `OrdersPage` filter state |
| `message-panel error/success` | `AdminSalesPage`, `AdminFeaturePage` |
| `admin-primary-button`, `secondary-action`, `StatusPill` | Existing Getting Paid page |
| Table wrap | `.getting-paid-table-wrap` |

---

## 3. UI / State Architecture

### Top-level (unchanged)

`AdminGettingPaidPage` keeps invoice fetch in `useEffect` when `activePage === "admin-invoices"`. Passes `invoiceState` + `reloadInvoices` callback into `InvoicesPage`.

### `InvoicesPage` state machine

```text
┌─────────────────────────────────────────────────────────────┐
│ InvoicesPage                                                 │
│  invoiceState: { loading, error, rows }                     │
│  filters: { query, status }                                 │
│  ui: { modal, selectedId, detail, form, dialog, notice }    │
└─────────────────────────────────────────────────────────────┘
```

| State field | Type | Description |
| --- | --- | --- |
| `filters.query` | string | Client search |
| `filters.status` | string | `all` \| `draft` \| `issued` \| `paid` \| `cancelled` |
| `modal` | `null` \| `"create"` \| `"edit"` \| `"detail"` | Active overlay |
| `selectedId` | string | Invoice id for detail/edit/void/cancel |
| `formValues` | object | From `emptyInvoiceForm` / `invoiceToForm` |
| `formErrors` | object | From `validateInvoiceForm` |
| `detail` | `{ loading, error, data }` | Single invoice fetch |
| `dialog` | `null` \| `"void"` \| `"cancel"` | Confirm destructive action |
| `submitting` | boolean | Save/void/cancel in flight |
| `notice` | `{ type, message }` | Success banner on list |
| `customers` | `{ loading, error, rows }` | Lazy load on create/edit open |

### Derived data

```javascript
const copy = invoiceCopy(language);
const filteredRows = filterInvoiceRows(invoiceState.rows, filters);
const listRows = filteredRows.map(invoiceView); // or enhanced row mapper
```

### View routing (within `InvoicesPage`)

```text
loading          → .getting-paid-loading (+ LoaderCircle)
error            → .getting-paid-error + Retry button → reloadInvoices()
rows.length === 0 → InvoiceEmptyState (create CTA)
rows.length > 0  → InvoiceListShell
  ├─ toolbar: search, status select, New Invoice button
  ├─ notice banner (if success)
  ├─ table: rows + actions (View, Edit, Void, Cancel)
  ├─ filter-no-match empty row when filteredRows.length === 0
  └─ modals (conditional)
```

### Modal components (new, colocated in `AdminGettingPaidPage.jsx`)

| Component | Opens when | Closes on |
| --- | --- | --- |
| `InvoiceFormModal` | create / edit | cancel, success, Escape, backdrop |
| `InvoiceDetailModal` | view action | close, Escape |
| `InvoiceConfirmDialog` | void / cancel | confirm, cancel, Escape |

**Create flow**: `modal="create"`, `formValues=emptyInvoiceForm(company)`, fetch customers on mount.

**Edit flow**: `modal="edit"`, GET detail if not in list cache, `invoiceToForm(data)`, disable if `!invoiceEditable(status)`. Edit status select uses `editStatusOptions` (draft, issued, paid only — cancelled is never selectable through edit/save).

**Detail flow**: GET `/admin/invoices/:id`, read-only layout, with Edit / Cancel / Void action buttons using the same lifecycle and editability gates as list actions.

**Cancel flow** (sole cancel path): confirm dialog → `updateInvoice(id, { status: "cancelled" })` PATCH. Cancel must not be reachable through normal edit/save.

**Void flow**: confirm dialog → `voidInvoice(id)` POST → remove from local `rows` or reload list.

### Action visibility rules

| Status | View | Edit | Cancel | Void |
| --- | --- | --- | --- | --- |
| draft | ✓ | ✓ | ✓ | ✓ |
| issued | ✓ | ✓ | ✓ | ✓ |
| paid | ✓ | ✓ | ✓ | ✓ |
| cancelled | ✓ | — | — | — |
| void | N/A (not in list) | — | — | — |

Cancel and void both available on editable statuses; operator chooses semantics. Hide cancel when already cancelled; hide void when not editable.

---

## 4. Validation & Totals Flow

### Client validation (pre-submit)

1. User edits form → local state update.
2. On submit: `validateInvoiceForm(formValues, copy)` → `{ errors, itemErrors }`.
3. If errors: set `formErrors`, focus first invalid field, **no API call**.
4. Rules (already in `invoices.js`): customer name required; email format if present; ≥1 line with description, qty > 0, price ≥ 0; maximum 100 line items (platform limit).

### Totals (live, pre-save)

1. Each line: `lineTotalValue(item)` on every qty/price change.
2. Invoice: `computeInvoiceTotals(formValues.line_items)` → `{ subtotal, total }` displayed in form footer.
3. On submit: `buildInvoicePayload(formValues)` sends line items; **server recalculates** authoritative totals on response.
4. After save: list/detail use server `total` via `gettingPaidCurrency`.

### Server error handling

- Catch `error.message` from `apiRequest` → show in `message-panel error` inside modal or list.
- On 400 for void/edit/cancel blocked (e.g., concurrent void or cancel elsewhere): reload list and/or detail to sync state.

---

## 5. AR/EN & RTL/LTR Handling

| Concern | Approach |
| --- | --- |
| Copy | All new UI strings via `invoiceCopy(language)` — extend object if gaps (e.g. actions column, due date in table) |
| Status labels | `invoiceStatusLabel(language, status)` in table/detail |
| Direction | Existing wrapper: `dir={gettingPaidDirection(language)}` + `data-getting-paid-direction` on `.tenant-getting-paid-page` |
| Tables | Existing `[dir="rtl"] .getting-paid-table-wrap` rules; use `text-align: start` for new cells |
| Currency | Wrap amounts in `<bdi dir="ltr">` where needed (Contact/Orders pattern) |
| Icons | Chevron/back icons: mirror for RTL only if following adjacent pages (Contacts breadcrumb pattern) |
| Dates | `toLocaleDateString(language)` for display |

Remove hardcoded `bi()` strings from invoice-specific sections where `invoiceCopy` already defines equivalents; keep `bi()` for non-invoice Getting Paid pages unchanged.

---

## 6. Loading, Empty, Validation, Success & Error States

| State | UI | Recovery |
| --- | --- | --- |
| **List loading** | `.getting-paid-loading` + `copy.loading` + spinner | — |
| **List error** | `.getting-paid-error` `role="alert"` + `copy.loadFailed` + message + **Retry** | `reloadInvoices()` |
| **Empty tenant** | Compact empty card: `copy.noInvoicesTitle`, `copy.noInvoicesText`, **New Invoice** button | Opens create modal |
| **Filter no match** | Inline message `copy.noMatches` + **Clear filters** | Reset `filters` |
| **Detail loading** | Modal skeleton/spinner text `copy.processing` | — |
| **Detail error** | Modal error + close | — |
| **Form validation** | Field-level errors from `itemErrors`; form-level `errors.line_items` | Fix fields |
| **Submit in progress** | Disable buttons; label `copy.saving` / `copy.processing` | — |
| **Submit error** | `message-panel error` in modal with `copy.requestFailed` + server message | Retry submit |
| **Success create** | Close modal; `notice` = `copy.createdNotice`; refresh list | — |
| **Success save** | Close modal; `notice` = `copy.savedNotice`; refresh list/detail | — |
| **Success void** | Close dialog; `notice` = `copy.voidedNotice`; remove row | — |
| **Success cancel** | Close dialog; `notice` = `copy.cancelledNotice`; refresh row status | — |
| **Customer load fail** | Non-blocking warning in form; manual entry still works | — |

---

## 7. Focused Tests to Update / Add

### Update: `cpanel/test/getting-paid-pages.test.js`

- Replace assertion `state.rows.length ? InvoiceList : InvoiceOnboarding` → expect `InvoiceEmptyState` or equivalent create-first empty (not `InvoiceOnboarding` with unsupported).
- Keep: API list wiring, `normalizeInvoiceRows`, access control, RTL/LTR, CSS section integrity.
- Add: source contains `POST` void path `/admin/invoices/` + `/void`; search/filter helper usage; `invoiceCopy` import usage.

### Add: `cpanel/test/invoices-utils.test.js`

| Test case | Assert |
| --- | --- |
| `computeInvoiceTotals` | qty × price rounding |
| `validateInvoiceForm` | missing name, bad email, empty lines |
| `buildInvoicePayload` | trims strings, nulls empty email |
| `filterInvoiceRows` | query matches number/name; status filter; no void option |
| `invoiceEditable` | false for cancelled/void; true for draft/issued/paid |
| Syntax | module imports without parse error (post brace fix) |

### Run command

```bash
node --test cpanel/test/getting-paid-pages.test.js cpanel/test/invoices-utils.test.js
```

No new backend tests (backend unchanged).

---

## 8. CPanel Build Verification

```bash
cd cpanel && npm run build:staging
```

**Pass criteria**: Zero compile errors; bundle includes updated Getting Paid page.

Optional dev smoke: `npm run dev` → navigate to `/admin/invoices` → manual quickstart checks ([quickstart.md](./quickstart.md)).

---

## 9. Risks & Remaining Backend Limitations

| Risk / limitation | Mitigation |
| --- | --- |
| Voided invoices invisible forever | Document in UI; no void filter; void confirm copy explains removal from active list |
| No server-side pagination/search | Client-side only; acceptable per spec ≤500 rows; performance watch on large tenants |
| Cancel vs void operator confusion | Distinct labels (`copy.cancelInvoice` vs `copy.voidInvoice`) and confirm messages |
| `paid` status without payment proof | Edit-only manual select; no payment UI (per scope) |
| Concurrent void elsewhere | Handle 400; reload list on error |
| `invoices.js` parse error blocks build | **First implementation task**: remove line 172 stray `}` |
| Large `AdminGettingPaidPage.jsx` | Accept for scope minimization; extract only if file exceeds maintainability during implement |
| Customer list limit | Use `fetchCustomers({ limit: 100 })`; searchable select; manual entry fallback |
| Filter spec mentioned void | **Removed from UI** per user constraint; update `filterOptions` in `invoices.js` |
| Test regression on onboarding | Update getting-paid test in same PR as UI change |

---

## Implementation Phases (for `/speckit-tasks`)

| Phase | Tasks |
| --- | --- |
| **A — Utilities** | Fix syntax; add filters, `invoiceEditable`, API wrappers; trim void from filterOptions; add `editStatusOptions` (draft, issued, paid only); unit tests |
| **B — List shell** | Toolbar, filtered table, actions column, empty/no-match states, success banner, retry |
| **C — Form modal** | Create/edit, customer select, line items, live totals, validation |
| **D — Detail + lifecycle** | Detail modal, void POST, cancel PATCH, confirm dialogs |
| **E — Polish** | CSS responsive pass, AR/EN audit, update getting-paid tests, staging build |

---

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| — | — | — |

---

## Generated Artifacts

| Artifact | Path |
| --- | --- |
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| API contract | [contracts/invoice-api.md](./contracts/invoice-api.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

**Next step**: `/speckit-tasks` to generate dependency-ordered `tasks.md`.
