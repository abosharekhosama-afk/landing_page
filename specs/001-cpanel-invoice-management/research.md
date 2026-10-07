# Research: CPanel Invoice Management

**Feature**: `001-cpanel-invoice-management`  
**Date**: 2026-08-18

## R1 — Void endpoint vs DELETE

**Decision**: Use `POST /admin/invoices/:invoiceId/void` via `apiRequest` with `{ method: "POST" }` and no body.

**Rationale**:
- `apiRequest` in `cpanel/src/utils/api.js` supports arbitrary HTTP methods with JSON headers; POST void is already used elsewhere (e.g. `archiveCustomer` uses `POST` action endpoints).
- Backend exposes both `DELETE /:invoiceId` and `POST /:invoiceId/void` with identical behavior (status `void`, `deleted_at` set). POST is more explicit for a destructive lifecycle action and avoids overloading DELETE semantics in UI code.
- Returns updated invoice JSON on success; errors surface via `error.message` from response body.

**Alternatives considered**:
- `DELETE /admin/invoices/:id` — works but less descriptive in frontend service layer; rejected for clarity.
- Custom wrapper in `api/` — out of scope (no backend changes).

## R2 — UI composition pattern (modal vs full-page)

**Decision**: Single-page sub-view state machine inside `InvoicesPage` with **modals** for create, edit, detail, and confirm dialogs—reusing existing `getting-paid-modal-backdrop` / `getting-paid-modal` CSS and Sales-page dialog patterns (`message-panel`, `admin-primary-button`, Escape-to-close).

**Rationale**:
- Current Getting Paid invoices area is already a section within `AdminGettingPaidPage`; no router sub-routes exist for invoice CRUD.
- `getting-paid-modal` and table styles already exist; extending width via `getting-paid-invoice-modal` modifier keeps changes scoped to the Tenant Getting Paid CSS block.
- Sales `AddOrderDialog` / `OrderDetailDialog` demonstrate the established CPanel pattern for create/detail modals with form grids and totals.

**Alternatives considered**:
- New dedicated page route — rejected; violates minimal scope and existing navigation model.
- Inline full-page replacement of list — acceptable fallback on narrow viewports via responsive CSS stacking inside modal.

## R3 — Customer selection without `customer_id`

**Decision**: Lazy-load customers with existing `fetchCustomers()` from `cpanel/src/utils/customersApi.js` when create/edit modal opens; optional `<select>` (or combobox) prefills `customer_name`, `customer_email`, `customer_phone` form fields. Manual entry always allowed.

**Rationale**:
- Invoice API persists only text customer fields (`customer_name`, `customer_email`, `customer_phone`).
- Customer API is read-only for this feature; no Customers module changes required.
- If customer fetch fails, form remains usable with manual fields and a non-blocking warning.

**Alternatives considered**:
- Navigate to Customers module — rejected; breaks create flow.
- Persist customer ID — rejected; backend does not support it.

## R4 — Status filter including “void”

**Decision**: Remove `void` from actionable filter options in UI copy (`filterOptions` in `invoices.js`); keep filter values: `all`, `draft`, `issued`, `paid`, `cancelled`. Document that voided records are excluded from list API.

**Rationale**:
- `companyInvoices()` filters `deleted_at`; void sets `deleted_at`, so voided invoices never appear in GET list.
- Showing a “void” filter that always returns empty violates data-integrity UX principles.

**Alternatives considered**:
- Keep void filter with empty state message — rejected per user constraint (“do not expose a useful voided list filter”).
- Backend change to include voided — out of scope.

## R5 — Cancel vs void semantics

**Decision**:
- **Void**: `POST …/void` after confirmation → invoice removed from list.
- **Cancel**: `PATCH …/:id` with `{ status: "cancelled" }` after confirmation → invoice remains visible under cancelled filter; edit disabled server-side.

**Rationale**: Matches backend lifecycle in `api/src/routes/invoices.js` and `api/src/invoices/schema.js`.

## R6 — Success feedback

**Decision**: Use inline `message-panel success` with `role="status"` at top of list/modal (pattern from `AdminFeaturePage.jsx`, `AdminCompaniesPage.jsx`), not Sonner toasts—Sonner is present but not widely used in Getting Paid pages.

**Rationale**: Consistent with adjacent admin pages; no new toast wiring in Getting Paid scope.

## R7 — `invoices.js` syntax fix

**Decision**: Remove stray closing brace at line 172 of `cpanel/src/utils/invoices.js` as first implementation step.

**Rationale**: File currently fails to parse; utilities are already imported in `AdminGettingPaidPage.jsx` but unusable until fixed.
