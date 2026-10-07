# Tasks: CPanel Invoice Management

**Input**: Design documents from `/specs/001-cpanel-invoice-management/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/invoice-api.md](./contracts/invoice-api.md)

**Tests**: Focused cpanel tests included per plan and Constitution Principle VII.

**Organization**: Tasks grouped by user story phase after a blocking utilities foundation. Each phase ends with a verifiable checkpoint.

**Constitution**: No backend/migration/git tasks. Scope limited to 5 files listed in plan.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: User story label ([US1]–[US5]) from spec.md
- Every task includes exact file path(s)

---

## Phase 1: Setup (Read-Only Checkpoint)

**Purpose**: Confirm design artifacts before code changes. No file modifications.

- [ ] T001 Review spec.md, plan.md, research.md, data-model.md, and contracts/invoice-api.md in specs/001-cpanel-invoice-management/ before editing cpanel source

**Checkpoint**: Team aligned on scope, API contract, and void-filter exclusion.

---

## Phase 2: Foundational — `invoices.js` Utilities (BLOCKS ALL UI)

**Purpose**: Repair and complete shared invoice helpers. **No user story UI work until T002–T008 pass.**

**Independent verification**: `node --test cpanel/test/invoices-utils.test.js` passes after T008.

- [ ] T002 Remove the stray extra closing brace at end of cpanel/src/utils/invoices.js so the module parses and exports load
- [ ] T003 Add `invoiceListRow(row, language)` in cpanel/src/utils/invoices.js mapping snake_case API fields (`invoice_number`, `customer_name`, `customer_email`, `issue_date`) for list display and search
- [ ] T004 Add `filterInvoiceRows(rows, { query, status })` in cpanel/src/utils/invoices.js with case-insensitive match on invoice number, customer name, and customer email
- [ ] T005 Add `invoiceEditable(status)` returning false for `cancelled` and `void`, true otherwise, in cpanel/src/utils/invoices.js
- [ ] T006 Add `customerDisplayName(customer)` in cpanel/src/utils/invoices.js for customer picker labels (`displayName`, `name`, or `firstName` + `lastName`)
- [ ] T007 Remove `void` from `filterOptions` in `invoiceCopy()` and add `editStatusOptions` (draft, issued, paid only — not cancelled) for edit form in cpanel/src/utils/invoices.js
- [ ] T008 Add API wrappers in cpanel/src/utils/invoices.js: `fetchInvoices`, `fetchInvoice(id)`, `createInvoice(payload)`, `updateInvoice(id, payload)`, `voidInvoice(id)` using `apiRequest` — void via `POST /admin/invoices/:id/void`
- [ ] T009 [P] Create cpanel/test/invoices-utils.test.js covering module import, `computeInvoiceTotals`, `validateInvoiceForm`, `buildInvoicePayload`, `filterInvoiceRows`, `invoiceEditable`, void absent from `filterOptions`, and `editStatusOptions` excluding cancelled

**Checkpoint**: Utilities compile; unit tests green. UI implementation may begin.

**Parallel note**: T009 can start after T002; must complete after T004–T008 to assert final helper shapes.

---

## Phase 3: User Story 1 — Browse and Find Invoices (Priority: P1) 🎯 MVP

**Goal**: Searchable, filterable invoice list with honest loading, error, empty, and no-match states.

**Independent Test**: Load Invoices page with real data; search and status filter narrow rows; empty tenant shows create CTA; load error shows Retry.

**Depends on**: Phase 2 complete (T002–T008).

### Implementation

- [X] T010 [US1] Extract `reloadInvoices` callback in cpanel/src/pages/AdminGettingPaidPage.jsx and pass it to `InvoicesPage` (reuse existing `useEffect` fetch logic)
- [X] T011 [US1] Replace `InvoiceOnboarding` with `InvoiceEmptyState` using `invoiceCopy(language).noInvoicesTitle/noInvoicesText/newInvoice` and open-create handler in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T012 [US1] Add `filters` state (`query`, `status`) and `filterInvoiceRows` derivation inside `InvoicesPage` in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T013 [US1] Add list toolbar with search input, status `<select>` from `copy.filterOptions` (no void), and New Invoice button in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T014 [US1] Enhance `InvoiceList` to use `invoiceListRow`, `invoiceStatusLabel`, `gettingPaidCurrency`, and an Actions column placeholder in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T015 [US1] Add filter-no-match inline state with `copy.noMatches` and Clear filters control in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T016 [US1] Add Retry button to list error state using `copy.retry` wired to `reloadInvoices` in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T017 [US1] Replace hardcoded invoice list `bi()` strings with `invoiceCopy(language)` equivalents in cpanel/src/pages/AdminGettingPaidPage.jsx

**Checkpoint**: List, search, filter, empty, error-retry, and no-match flows work without create/edit modals.

---

## Phase 4: User Story 2 — Create a New Invoice (Priority: P1)

**Goal**: Create invoice with customer prefill, line items, live totals, validation, and success refresh.

**Independent Test**: Open create modal, pick customer, add line item, save draft; new invoice appears in list with server number.

**Depends on**: Phase 2 (T002–T008). Can proceed in parallel with Phase 3 after foundation if list shell (T010–T013) exists for refresh target.

### Implementation

- [X] T018 [US2] Add `InvoiceFormModal` shell with backdrop, Escape close, and create/edit mode prop in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T019 [US2] Initialize create form from `emptyInvoiceForm(company)` and wire New Invoice / empty-state CTA to open modal in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T020 [US2] Lazy-load customers via `fetchCustomers({ limit: 100 })` on modal open with non-blocking load error in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T021 [US2] Add customer `<select>` using `customerDisplayName` to prefill `customer_name`, `customer_email`, `customer_phone` in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T022 [US2] Implement line-item rows (description, quantity, unit price, remove, add item) with live `lineTotalValue` and `computeInvoiceTotals` footer in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T023 [US2] Add create status select from `copy.statusOptions` (draft, issued only) and date/notes/currency fields in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T024 [US2] Wire create submit: `validateInvoiceForm` → enforce max 100 line items → `buildInvoicePayload` → `createInvoice` with inline validation and `message-panel error` on failure in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T025 [US2] On create success: close modal, set list `notice` to `copy.createdNotice`, call `reloadInvoices` in cpanel/src/pages/AdminGettingPaidPage.jsx

**Checkpoint**: Create flow end-to-end with validation and list refresh.

---

## Phase 5: User Story 3 — View Invoice Details (Priority: P2)

**Goal**: Read-only detail modal with loading/error states; Edit, Cancel, and Void actions gated by status (same rules as list).

**Independent Test**: Click View on a list row; detail shows full record from GET `/admin/invoices/:id`; cancelled invoice shows no edit/void/cancel actions.

**Depends on**: Phase 3 list actions column (T014).

### Implementation

- [X] T026 [US3] Add `InvoiceDetailModal` with GET `fetchInvoice(id)` loading and error states in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T027 [US3] Render read-only detail layout (number, status, dates, customer, notes, line items, totals with `<bdi dir="ltr">` for amounts) in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T028 [US3] Wire list row View action to open detail modal; expose Edit, Cancel, and Void actions in detail modal with the same lifecycle/editability gates as list actions in cpanel/src/pages/AdminGettingPaidPage.jsx

**Checkpoint**: Detail view loads real invoice data; no edit/void/cancel yet required.

---

## Phase 6: User Story 4 — Edit an Editable Invoice (Priority: P2)

**Goal**: Edit draft/issued/paid invoices; block cancelled; manual paid status; PATCH save.

**Independent Test**: Edit draft invoice line items and status; save persists; cancelled invoice cannot edit.

**Depends on**: Phase 4 `InvoiceFormModal` (T018–T024), Phase 5 detail (T026–T028) optional for Edit-from-detail.

### Implementation

- [X] T029 [US4] Open edit modal prefilled via `invoiceToForm` after `fetchInvoice(id)` in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T030 [US4] Add edit status select from `copy.editStatusOptions` (draft, issued, paid only — cancelled must never be selectable through normal edit/save) in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T031 [US4] Wire edit submit: validation → enforce max 100 line items → `updateInvoice(id, buildInvoicePayload(values))` with saving state and error panel; on 400 (e.g., invoice voided/cancelled elsewhere), reload list/detail to sync state in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T032 [US4] Gate Edit actions with `invoiceEditable(status)` in list, detail, and form; show blocked message for cancelled in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T033 [US4] On edit success: close modal, set `copy.savedNotice`, refresh list in cpanel/src/pages/AdminGettingPaidPage.jsx

**Checkpoint**: Edit and manual paid status work; cancelled invoices read-only.

---

## Phase 7: User Story 5 — Void or Cancel an Invoice (Priority: P3)

**Goal**: Confirm and execute void (POST) and cancel (PATCH status); refresh list state.

**Independent Test**: Void removes invoice from list; cancel keeps row with cancelled status; both require confirmation.

**Depends on**: Phase 3 list actions (T014), Phase 5 detail actions optional.

### Implementation

- [X] T034 [US5] Add `InvoiceConfirmDialog` reusing `getting-paid-modal-backdrop` with void/cancel copy from `invoiceCopy` in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T035 [US5] Wire Void action to `voidInvoice(id)` POST `/admin/invoices/:id/void` with success notice and list refresh; on 400 (e.g., already void), reload list/detail to sync state in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T036 [US5] Wire Cancel as the sole cancel path: confirmed `InvoiceConfirmDialog` → `updateInvoice(id, { status: "cancelled" })` PATCH with success notice and list refresh; on 400, reload list/detail to sync state in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T037 [US5] Hide void/cancel actions when `!invoiceEditable(status)` or status is already cancelled in cpanel/src/pages/AdminGettingPaidPage.jsx

**Checkpoint**: Full invoice lifecycle complete per backend rules.

---

## Phase 8: Scoped Styles — `global.css`

**Purpose**: Invoice UI styling within existing Getting Paid CSS block only.

**Depends on**: Phases 3–7 UI structure (class names stable). Can start after T013 (toolbar classes known).

- [X] T038 [P] Add `.getting-paid-invoice-toolbar` and search/filter layout styles in cpanel/src/styles/global.css inside `/* Tenant Getting Paid pages */`
- [X] T039 [P] Add `.getting-paid-invoice-form`, line-item table, and totals footer styles in cpanel/src/styles/global.css
- [X] T040 [P] Add `.getting-paid-invoice-modal` wider variant and `.getting-paid-invoice-detail` styles in cpanel/src/styles/global.css
- [X] T041 Add confirm-dialog and responsive stacking rules for invoice modals/toolbar at existing Getting Paid breakpoints in cpanel/src/styles/global.css

**Checkpoint**: Layout correct in EN LTR and AR RTL at 320px+ width.

**Parallel note**: T038–T040 can run in parallel once class names are introduced in JSX (after T013, T018, T026).

---

## Phase 9: Tests & Verification

**Purpose**: Focused test updates and build gate.

**Depends on**: All implementation phases.

- [X] T042 Update cpanel/test/getting-paid-pages.test.js: replace `InvoiceOnboarding` assertion with create-first empty state; assert `filterInvoiceRows`, `invoiceCopy`, POST void path, and list retry wiring in cpanel/src/pages/AdminGettingPaidPage.jsx
- [X] T043 Extend cpanel/test/invoices-utils.test.js if any helpers added during UI work remain untested in cpanel/test/invoices-utils.test.js
- [X] T044 Run `node --test cpanel/test/getting-paid-pages.test.js cpanel/test/invoices-utils.test.js` from repository root and fix failures
- [X] T045 Run `cd cpanel && npm run build:staging` and fix compile errors

**Checkpoint**: All tests pass; staging build succeeds.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    ↓
Phase 2 (invoices.js) ─── BLOCKS ───→ Phases 3–7 (UI stories)
    ↓                                      ↓
Phase 9 (Tests) ←──────────────── Phase 8 (CSS, parallel late)
```

### User Story Dependencies

| Story | Depends on | Can start after |
| --- | --- | --- |
| **US1** List/search/filter | Phase 2 | T008 |
| **US2** Create | Phase 2; list refresh target from T010 | T010 (soft); T008 (hard) |
| **US3** Detail | US1 actions column T014 | T014 |
| **US4** Edit | US2 form modal T018 | T018 |
| **US5** Void/cancel | US1 actions T014 | T014 |

### Independent vs Sequential Tasks

| Independent (after Phase 2) | Must follow prior tasks |
| --- | --- |
| T009 tests (after T002) | T003–T008 before UI phases |
| T038–T040 CSS (after JSX class names) | T002 before all UI |
| T042–T043 test updates | T011–T037 implementation |
| T044–T045 verification | All above |

### Parallel Opportunities

```bash
# After T002 (syntax fix):
# Parallel: T003–T008 utilities (same file — execute sequentially within invoices.js)

# After T008:
# Parallel track A: T009 invoices-utils.test.js
# Parallel track B: T010–T017 US1 list UI

# After T013 + T018 (class names exist):
# Parallel: T038, T039, T040 CSS in global.css

# After full implementation:
# Parallel: T042 getting-paid-pages.test.js + T043 invoices-utils.test.js extensions
```

---

## Parallel Example: After Foundation (T008)

```text
Developer A: T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017  (US1 list)
Developer B: T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025  (US2 create)
Developer C: T009 invoices-utils.test.js (finalize against T003–T008)
```

US2 create can proceed alongside US1 once T010 provides `reloadInvoices`; merge conflicts likely in `AdminGettingPaidPage.jsx` — prefer sequential single-file edits if one agent.

---

## Implementation Strategy

### MVP First (User Story 1 + utilities)

1. Complete Phase 2 (T002–T009)
2. Complete Phase 3 (T010–T017)
3. **STOP and VALIDATE**: list/search/filter/empty/error
4. Add Phase 4 create (T018–T025) for usable MVP

### Incremental Delivery

1. Foundation → List (US1) → Create (US2) → Detail (US3) → Edit (US4) → Void/Cancel (US5) → CSS polish → Tests/build

### Suggested Agent Batches (verify after each)

| Batch | Tasks | Verify |
| --- | --- | --- |
| A | T002–T009 | `node --test cpanel/test/invoices-utils.test.js` |
| B | T010–T017 | Manual: list/filter/empty/error |
| C | T018–T025 | Manual: create invoice |
| D | T026–T033 | Manual: detail + edit |
| E | T034–T037 | Manual: void + cancel |
| F | T038–T045 | Full test suite + staging build |

---

## Conflicts: Spec vs Plan vs Existing Code

| # | Conflict | Resolution for tasks |
| --- | --- | --- |
| C1 | **Spec FR-003 / US1 scenario 3 previously mentioned void filter** | Resolved in spec.md; T007 removes void from `filterOptions`; no void filter UI (T013) |
| C2 | **`invoiceCopy.filterOptions` still includes void** in cpanel/src/utils/invoices.js | Fixed in T007 |
| C3 | **`invoiceView` in gettingPaid.js** does not map snake_case `customer_name`, `invoice_number`, `issue_date` from API | T003 adds `invoiceListRow` in invoices.js; do not modify gettingPaid.js per plan |
| C4 | **`InvoiceOnboarding` uses `unsupported` placeholder** vs spec empty state with create CTA | T011 replaces with `InvoiceEmptyState`; T042 updates test |
| C5 | **Utilities imported in AdminGettingPaidPage.jsx** but unused; **invoices.js has parse error** | T002 fixes parse; later tasks wire imports |
| C6 | **List error state lacks Retry** vs spec FR-004 | T016 adds retry |
| C7 | **Status in list shows raw API string** vs localized labels in spec | T014 uses `invoiceStatusLabel` |
| C8 | **Spec mentions payment options in old onboarding copy** | T011 removes marketing onboarding; no payment UI added |

No conflicts require backend changes. All resolved within the 5-file scope.

---

## Notes

- Do **not** add tax, discount, catalog picker, payment gateway, or other Getting Paid sub-pages
- Do **not** modify `api/**`, migrations, or unrelated cpanel modules
- Preserve existing Getting Paid pages (Setup, Pay Links, Quotes, Proposals, POS) unchanged
- Prefer `invoiceCopy(language)` over new `bi()` strings for invoice-specific UI
- Void uses **POST** `/admin/invoices/:id/void` only (not DELETE)
- Cancel uses **PATCH** `{ status: "cancelled" }` only via confirmed cancel dialog (T036); never through edit/save

**Total tasks**: 45
