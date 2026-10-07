# Data Model: CPanel Invoice Management

**Feature**: `001-cpanel-invoice-management`  
**Date**: 2026-08-18  
**Source**: `api/src/invoices/schema.js`, `api/supabase/migrations/003_company_invoices.sql`, `cpanel/src/utils/invoices.js`

## Invoice (tenant-scoped)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string (UUID) | server | Primary key |
| `invoice_number` | string | server | Format `INV-{YYYY}-{6-digit-seq}` |
| `company_id` | string | server | Tenant scope (API-enforced) |
| `customer_name` | string | yes | Free text; no FK |
| `customer_email` | string | null | Optional |
| `customer_phone` | string | null | Optional |
| `order_id` | string | null | Not exposed in UI this phase |
| `status` | enum | yes | `draft` \| `issued` \| `paid` \| `cancelled` \| `void` |
| `currency` | string | yes | Default from company settings / `ILS` |
| `issue_date` | date (ISO date) | yes | |
| `due_date` | date | null | Optional |
| `notes` | string | null | Max 2000 chars server-side |
| `line_items` | array | yes | Min 1 on create; max 100 |
| `subtotal` | number | server | Sum of line totals |
| `discount_total` | number | server | Always `0` (not editable in UI) |
| `tax_total` | number | server | Always `0` (not editable in UI) |
| `total` | number | server | Equals subtotal today |
| `created_by` / `updated_by` | string | server | Audit |
| `created_at` / `updated_at` | ISO datetime | server | |
| `deleted_at` | ISO datetime | null | Set on void; excluded from list |

### Line item shape

| Field | Type | Required | UI |
| --- | --- | --- | --- |
| `description` | string | yes | Free text; max 500 chars |
| `quantity` | number | yes | > 0 |
| `unit_price` | number | yes | ≥ 0 |
| `total` | number | computed | `round(qty * price, 2)` |
| `product_id` | string | null | Not used in UI |
| `sku` | string | null | Not used in UI |

## Customer (selection source only)

Read from `/admin/customers` via `fetchCustomers`. Mapped to invoice form:

| Customer field | Invoice form field |
| --- | --- |
| `displayName` or `name` or `firstName` + `lastName` | `customer_name` |
| `email` | `customer_email` |
| `phone` | `customer_phone` |

No persistence link after save.

## Status lifecycle

```text
                    ┌──────────┐
         create ──► │  draft   │◄── edit allowed
                    └────┬─────┘
                         │ issue (status → issued)
                         ▼
                    ┌──────────┐
                    │  issued  │◄── edit allowed
                    └────┬─────┘
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
      ┌────────┐   ┌──────────┐  ┌───────────┐
      │  paid  │   │cancelled │  │   void    │
      └────────┘   └──────────┘  └───────────┘
      edit OK*     no edit       no edit; hidden from list
      (* PATCH while not void/cancelled)
```

| Transition | Mechanism | UI action |
| --- | --- | --- |
| Create draft/issued | POST `/admin/invoices` | Create form save |
| Update fields/status | PATCH `/admin/invoices/:id` | Edit form save |
| Mark paid | PATCH `status: paid` | Edit form status select |
| Cancel | PATCH `status: cancelled` | **Confirmed** cancel dialog → PATCH (sole cancel path) |
| Void | POST `/admin/invoices/:id/void` | **Confirmed** void dialog → POST |

**Blocked**: PATCH on `void` or `cancelled` → 400 `"Cannot update a void or cancelled invoice."`

## Client-side form model (`emptyInvoiceForm` / `invoiceToForm`)

```javascript
{
  customer_name: string,
  customer_email: string,
  customer_phone: string,
  status: "draft" | "issued" | ...,
  currency: string,
  issue_date: "YYYY-MM-DD",
  due_date: string | "",
  notes: string,
  line_items: [{ description, quantity: string, unit_price: string }]
}
```

Payload for API via `buildInvoicePayload(values)`.

## Client-side list filter model

```javascript
{
  query: string,      // matches invoice_number, customer_name, customer_email (case-insensitive)
  status: "all" | "draft" | "issued" | "paid" | "cancelled"
}
```

Applied with `filterInvoiceRows(rows, filters)` (to be added in `invoices.js`).

## Edit form status options

Edit/save may only set:

```javascript
editStatusOptions: ["draft", "issued", "paid"]
```

**Cancelled is excluded** from edit status select. The sole cancel path is a confirmed cancel action that PATCHes `{ status: "cancelled" }`. Void is not a list filter and voided invoices are not browsable after void succeeds.
