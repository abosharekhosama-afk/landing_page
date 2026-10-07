# Feature Specification: CPanel Invoice Management (Getting Paid → Invoices)

**Feature Branch**: `feature/cpanel-invoice-management` *(optional; not created by this command)*

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Complete the existing Getting Paid → Invoices feature in the current iGroup CPanel. Turn the current Invoices page from a mostly read-only/partial implementation into a complete CPanel invoice management UI using the backend invoice APIs that already exist."

## Constitution Constraints *(mandatory)*

Reference: `.specify/memory/constitution.md`

Every feature on iGroup Platform MUST respect these non-negotiable constraints:

- **Multi-tenancy**: Server-side tenant isolation; API is authoritative; no tenant-specific logic unless explicitly scoped and reusable.
- **Data integrity**: No fabricated records, balances, analytics, or success states; honest UI for partial/unimplemented modules.
- **Migrations**: Schema changes require explicit approval; Production migration is a separate approval gate.
- **Deployment**: Staging/local validation before Production; no unverified deployment replacements.
- **CPanel** (if UI involved): Arabic/English support, RTL/LTR behavior, existing design system patterns.
- **Scope**: Minimal file changes; unrelated fixes out of scope unless requested.

This feature complies with all constraints: it completes an existing partial UI using existing tenant-scoped invoice capabilities only, with no schema changes, no payment-provider integration, and no modifications to unrelated Getting Paid sub-pages (Pay Links, Quotes, Proposals, POS, Setup).

## Existing Implementation Baseline *(preserve and extend)*

The following work already exists and MUST be inspected, reused, and extended—not replaced:

| Asset | Current state |
| --- | --- |
| `cpanel/src/pages/AdminGettingPaidPage.jsx` | Loads invoice list via tenant API; shows loading/error states; read-only table when records exist; marketing onboarding when empty; imports invoice utilities but does not yet wire create/edit/detail/void flows |
| `cpanel/src/utils/invoices.js` | Bilingual copy strings, form defaults, validation, line-item totals, and payload shaping for create/update—ready for UI integration |
| `cpanel/src/utils/gettingPaid.js` | Invoice list normalization, row view mapping, access control, currency formatting, RTL/LTR direction |
| Getting Paid CSS (`global.css`) | Scoped styles for invoice list, hero, loading, and error states within the existing design system |

Out of scope for this feature: all other Getting Paid pages, Sales, Orders, Inventory, Booking, Marketing, Customers & Leads module changes, Catalog, payment gateways, and backend route or migration work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Find Invoices (Priority: P1)

A company operator opens **Getting Paid → Invoices** to review tenant invoice records, search by invoice number or customer, and filter by status so they can quickly locate a specific invoice.

**Why this priority**: Listing and discovery is the foundation for all other invoice work and replaces the current read-only table with actionable navigation.

**Independent Test**: Load the Invoices page with existing tenant data; verify the list renders real records, search narrows results, status filter works, and empty/filter-no-match states are distinct and bilingual.

**Acceptance Scenarios**:

1. **Given** the operator has access to the Invoices module and the tenant has invoice records, **When** they open the Invoices page, **Then** they see a table of real invoices showing number, customer, issue date, total (in company currency), and localized status.
2. **Given** invoices are displayed, **When** the operator searches by invoice number or customer name/email, **Then** only matching invoices remain visible and a clear “no matches” state appears when nothing matches.
3. **Given** invoices are displayed, **When** the operator filters by status (draft, issued, paid, cancelled, or all), **Then** only invoices in that status are shown and filters can be cleared.
4. **Given** the tenant has no invoices, **When** the page loads successfully, **Then** the operator sees an honest empty state with a primary action to create the first invoice—not a “feature unavailable” placeholder.
5. **Given** invoice data is loading or failed to load, **When** the operator views the page, **Then** they see a loading indicator or a recoverable error state with retry—not stale or fabricated data.

---

### User Story 2 - Create a New Invoice (Priority: P1)

A company operator creates a new invoice by selecting or entering customer details, adding one or more line items with quantity and unit price, reviewing calculated totals, and saving as draft or issued.

**Why this priority**: Creation is the primary gap in the current partial implementation and delivers immediate business value for requesting payment.

**Independent Test**: Open create flow, fill valid customer and line items, submit, and confirm the new invoice appears in the list with correct totals and status.

**Acceptance Scenarios**:

1. **Given** the operator is on the Invoices page, **When** they choose “New Invoice”, **Then** a create form opens using existing Getting Paid layout patterns with bilingual labels and RTL/LTR support.
2. **Given** the create form is open, **When** the operator selects an existing customer from the tenant customer directory, **Then** customer name, email, and phone fields populate from that record (editable before save).
3. **Given** the create form is open, **When** the operator adds line items with description, quantity > 0, and unit price ≥ 0, **Then** line totals and invoice subtotal/total update immediately without requiring a save.
4. **Given** required fields are missing or invalid, **When** the operator attempts to save, **Then** inline validation messages appear in the active language and the invoice is not submitted.
5. **Given** valid form data and draft or issued status, **When** the operator saves, **Then** a success confirmation appears, the invoice is persisted for the current tenant, and the list refreshes to include it with server-assigned invoice number and totals.

---

### User Story 3 - View Invoice Details (Priority: P2)

A company operator opens a single invoice to review full details including customer information, dates, status, notes, line items, and computed totals before deciding to edit or void/cancel.

**Why this priority**: Detail view is required for trust and audit before any lifecycle action.

**Independent Test**: Select an invoice from the list; verify all fields match the stored record and actions reflect invoice status rules.

**Acceptance Scenarios**:

1. **Given** an invoice exists, **When** the operator opens it from the list, **Then** they see invoice number, status, issue/due dates, currency, customer details, notes, line items, and totals formatted in company currency.
2. **Given** a cancelled invoice, **When** viewed in detail, **Then** edit, void, and cancel actions are hidden or disabled with an explanatory state. Successfully voided invoices are removed from the browsable list and detail flow and cannot be reopened from the Invoices UI.
3. **Given** detail data is loading or unavailable, **When** the operator opens an invoice, **Then** they see loading or error feedback—not partial fabricated content.

---

### User Story 4 - Edit an Editable Invoice (Priority: P2)

A company operator updates customer details, dates, notes, status (where permitted), and line items on invoices that the platform still allows to be modified.

**Why this priority**: Operators need to correct mistakes and advance invoice lifecycle (e.g., draft → issued) without backend changes.

**Independent Test**: Open a draft invoice, change line items and status, save, and verify updates persist and totals recalculate.

**Acceptance Scenarios**:

1. **Given** an invoice in draft or issued (or other non-terminal editable status per platform rules), **When** the operator chooses Edit, **Then** the form opens pre-filled with current data and calculated totals.
2. **Given** the edit form, **When** the operator changes line items or customer fields and saves valid data, **Then** changes persist and a success confirmation is shown.
3. **Given** an invoice marked void or cancelled, **When** the operator attempts to edit, **Then** the platform prevents the update and shows a clear message that the invoice cannot be modified.
4. **Given** the operator changes status to a value the platform accepts through edit (e.g., issued or paid), **When** they save, **Then** the updated status appears in list and detail views with localized label. Cancellation is not available through edit save; it requires the separate confirmed cancel action.

---

### User Story 5 - Void or Cancel an Invoice (Priority: P3)

A company operator voids or cancels an invoice according to existing platform lifecycle rules when an invoice should no longer be active.

**Why this priority**: Lifecycle management completes the management UI but depends on list/detail/create flows first.

**Independent Test**: Void a draft invoice and cancel an issued invoice; verify list behavior and that terminal states block further edits.

**Acceptance Scenarios**:

1. **Given** an invoice eligible for voiding, **When** the operator confirms void, **Then** the invoice is voided per platform rules, a success message appears, and it no longer appears in the active invoice list.
2. **Given** an invoice eligible for cancellation, **When** the operator confirms cancel, **Then** the invoice status becomes cancelled, it remains visible when filtered appropriately, and further edits are blocked.
3. **Given** an invoice already void, **When** the operator attempts to void again, **Then** the platform shows an error message without changing state.
4. **Given** a void or cancel confirmation dialog, **When** displayed, **Then** copy is bilingual and the destructive action requires explicit confirmation.

---

### Edge Cases

- **Access denied**: User without Invoices module permission or tenant operator role sees the existing access-denied pattern—not invoice data from another tenant.
- **Voided invoices hidden from list**: Voided records are soft-deleted server-side; they disappear from the list API and are not offered as a list filter option.
- **Search with special characters**: Search treats input literally; no crash on empty or whitespace-only queries.
- **Single line item minimum**: Cannot save an invoice with zero valid line items; removing the last line item should prompt adding another row or show validation.
- **Large line-item sets**: UI remains usable up to the platform maximum (100 line items); validation message if exceeded.
- **Currency display**: Totals always display using the company/invoice currency with locale-appropriate formatting; mixed manual currency on form respects invoice currency field when editable.
- **Concurrent edits**: If an invoice was voided or cancelled elsewhere, save/edit shows server error message and refreshes state.
- **Customer picker unavailable**: If customer directory cannot load, operator can still enter customer fields manually.
- **Paid status without payment integration**: Marking paid is a manual status change only—no payment confirmation UI or gateway flow.
- **Responsive narrow view**: List, forms, and detail layouts stack and remain operable on mobile-width viewports within existing Getting Paid breakpoints.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a tenant-scoped invoice list on **Getting Paid → Invoices** using real records from the existing invoice service—never fabricated rows.
- **FR-002**: System MUST provide client-side search across invoice number and customer name/email visible in list rows.
- **FR-003**: System MUST provide client-side status filtering for draft, issued, paid, cancelled, and all statuses with a clear reset when no matches remain. Void is not a list filter option because voided invoices are excluded from the tenant list API after voiding.
- **FR-004**: System MUST show distinct UI states for loading, load failure (with retry), empty tenant (with create action), and filter-no-match.
- **FR-005**: System MUST allow authorized operators to open a create-invoice flow from the Invoices page.
- **FR-006**: System MUST support selecting a customer from the tenant’s existing customer directory to pre-fill name, email, and phone, while still allowing manual entry and edits.
- **FR-007**: System MUST allow adding, editing, and removing line items with description, quantity, and unit price on create and edit forms.
- **FR-008**: System MUST calculate and display line totals and invoice subtotal/total on the form before save, consistent with platform rounding rules.
- **FR-009**: System MUST validate required customer name, optional email format, and at least one valid line item before submit, with bilingual inline error messages.
- **FR-010**: System MUST persist new invoices through the existing create capability with status draft or issued and reflect server-generated invoice number and totals after save.
- **FR-011**: System MUST allow opening invoice detail for a selected list row, loading the full record for the current tenant.
- **FR-012**: System MUST allow editing invoices only while the platform permits updates (not void or cancelled); blocked attempts MUST show a clear error.
- **FR-013**: System MUST support voiding invoices through the existing void lifecycle (confirmation required, success/error feedback, list refresh).
- **FR-014**: System MUST support cancelling invoices only through a confirmed cancel action that transitions status to cancelled via the existing update capability while the invoice remains editable. Cancelled must not be selectable through normal edit/save.
- **FR-015**: System MUST localize all invoice UI strings in Arabic and English using the established bilingual copy pattern.
- **FR-016**: System MUST preserve RTL for Arabic and LTR for English via direction-aware layout on the Invoices page and its sub-views (list, form, detail, dialogs).
- **FR-017**: System MUST remain responsive within the existing Getting Paid / CPanel design system without introducing new global styling patterns.
- **FR-018**: System MUST preserve existing Getting Paid sub-pages (Setup, Pay Links, Quotes, Proposals, POS) unchanged except where shared layout wrappers are already used.
- **FR-019**: System MUST enforce existing module and role gates for Invoices access (tenant operators with Invoices module enabled; platform admin override per current rules).
- **FR-020**: System MUST show success notifications after create, save, void, and cancel operations complete successfully.

### Key Entities

- **Invoice**: A tenant-scoped billing document with server-assigned number, customer name/email/phone (text fields, not a foreign key), status (draft | issued | paid | cancelled | void), currency, issue/due dates, notes, line items, computed subtotal/total, audit timestamps, and creator/updater references.
- **Invoice Line Item**: A row with description, quantity, unit price, computed line total; optional product reference fields exist in the platform but are not required for this UI scope.
- **Customer (selection source)**: An existing tenant contact/customer record used read-only to populate invoice customer fields; the invoice stores copied text values, not a persistent customer link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized operator can locate a specific invoice by number or customer name in under 30 seconds when the tenant has up to 500 invoice records (client-side search/filter).
- **SC-002**: An authorized operator can create and save a valid draft invoice with at least one line item in under 3 minutes on first attempt without backend changes.
- **SC-003**: 100% of invoice list rows displayed are loaded from the tenant’s real invoice service—zero fabricated or placeholder records in the data table.
- **SC-004**: All primary flows (list, create, detail, edit, void/cancel) render correctly in both English (LTR) and Arabic (RTL) without layout breakage at 320px viewport width.
- **SC-005**: Validation prevents 100% of submits missing customer name or valid line items, with errors visible in the operator’s active language.
- **SC-006**: Void and cancel actions require confirmation and reflect final platform state in the UI within one refresh cycle after success.

## Assumptions

- Customer selection uses a read-only fetch of the tenant customer directory (`/admin/customers` pattern already used elsewhere in CPanel); selecting a customer copies fields into the invoice form without creating a backend customer-invoice relationship (the invoice schema stores text fields only).
- Initial create status choices are **draft** and **issued** as already defined in `invoiceCopy.statusOptions`; **paid** is available on edit via `editStatusOptions`. **Cancelled** is not available through edit/save.
- **Cancel** is the sole path to `cancelled`: a confirmed cancel action that PATCHes `status: "cancelled"`. **Void** uses the dedicated void capability (POST `/void`). Both require confirmation dialogs with copy already prepared in `invoices.js`.
- Voided invoices are excluded from the list API response (soft-deleted). Void is not offered as a list filter because voided records disappear from the list API after voiding.
- Tax and discount totals remain zero in UI and payloads, matching current platform calculation behavior (subtotal equals total).
- Product catalog picker for line items is out of scope; line items are free-text descriptions unless a future phase adds product linking.
- Payment collection, Pay Links, email delivery of invoices, PDF export, and printing are out of scope.
- Implementation reuses `cpanel/src/utils/invoices.js` and extends `AdminGettingPaidPage.jsx` rather than introducing a parallel invoice module or new routes.
- Existing `cpanel/test/getting-paid-pages.test.js` expectations for API wiring and onboarding/list branching will need updating when the empty state switches from marketing onboarding to create-first CTA—tests are updated during implementation, not in this spec phase.

## Dependencies & Platform Constraints *(discovery from existing backend)*

The following constraints come from inspection of the existing invoice service and MUST be respected by the UI specification (no backend changes in this feature):

| Capability | Supported today | UI implication |
| --- | --- | --- |
| List invoices | Yes; active (non-deleted) records for current tenant | Default list source |
| Get invoice by ID | Yes | Detail and edit pre-fill |
| Create invoice | Yes; requires customer_name + ≥1 line item; auto invoice number `INV-{year}-{seq}` | Create flow |
| Update invoice | Yes; blocked when status is void or cancelled | Edit gating |
| Void invoice | Yes; via void endpoint or DELETE; sets status void + deleted_at | Removes from list; irreversible |
| Cancel invoice | Yes; via PATCH status → cancelled while editable | Remains in list with cancelled status |
| Set status paid | Yes; via PATCH while editable | Manual status only—no payment proof UI |
| Server-side search/filter | No | All search/filter is client-side on loaded list |
| Customer ID on invoice | No | Customer picker is convenience only |
| Tax / discount | No (always 0) | Do not expose tax/discount fields |
| Product-linked line items | Optional fields exist; not required | Description-based lines are sufficient |
| Dedicated cancel endpoint | No | Cancel = status update |
| Payment gateway integration | No | Do not implement |

**Authorization**: Invoice routes require authenticated admin context with tenant company scope; Invoices page additionally requires the Invoices module for non–platform-admin users (existing `canViewGettingPaid` behavior).

**Known implementation note**: `cpanel/src/utils/invoices.js` contains a syntax error (extra closing brace) that must be fixed during implementation before the utilities can be imported successfully.
