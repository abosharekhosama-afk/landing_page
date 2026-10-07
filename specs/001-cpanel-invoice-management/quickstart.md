# Quickstart: Validate CPanel Invoice Management

**Feature**: `001-cpanel-invoice-management`  
**Prerequisites**: Local API running with tenant that has Invoices module enabled; CPanel dev or staging build; authenticated company admin (or super_admin).

## 1. Run focused tests

From repository root:

```bash
node --test cpanel/test/getting-paid-pages.test.js cpanel/test/invoices-utils.test.js
```

**Expected**: All tests pass (after implementation adds `invoices-utils.test.js` and updates getting-paid tests).

## 2. CPanel build verification

```bash
cd cpanel
npm run build:staging
```

**Expected**: Vite build completes with no errors; `AdminGettingPaidPage.jsx` and `invoices.js` compile cleanly (syntax fix applied).

## 3. Manual validation checklist

### Access

1. Log in as company admin with Invoices module enabled.
2. Open **Getting Paid → Invoices**.
3. Confirm RTL when language is Arabic (`dir="rtl"` on `.tenant-getting-paid-page`).

### Empty tenant

1. With zero invoices, confirm empty state shows “No invoices yet” and **New Invoice** action (not “Get Started” unsupported placeholder).

### Create

1. Click **New Invoice**.
2. Select a customer from dropdown → name/email/phone populate.
3. Add line item (qty 2, price 50) → line total and invoice total show 100.
4. Save as draft → success message; invoice appears in list with `INV-YYYY-…` number.

### List / filter / search

1. Search by customer name → list narrows.
2. Filter by status → only matching rows.
3. Clear filters when no matches.

### Detail / edit

1. Open invoice detail → all fields match API record.
2. Edit draft → change line item → save → totals update in list.
3. Change status to **issued**, then **paid** (manual).

### Cancel

1. On editable invoice, **Cancel** → confirm → status `cancelled`; edit disabled.

### Void

1. On another invoice, **Void** → confirm → invoice disappears from list after refresh.

### Error states

1. Stop API, click Retry on list load → error + retry works when API returns.
2. Submit invalid form (no customer name) → inline validation, no API call.

## 4. Out of scope — do not validate

- Pay Links, Quotes, Proposals, POS, payment gateways
- PDF/print/email invoice
- Product catalog line picker
- Void filter showing voided records
- Backend route or migration changes

## References

- [Feature spec](./spec.md)
- [Data model](./data-model.md)
- [API contract](./contracts/invoice-api.md)
- [Implementation plan](./plan.md)
