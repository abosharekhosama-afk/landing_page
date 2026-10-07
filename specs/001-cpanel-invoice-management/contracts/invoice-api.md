# Invoice API Contract (CPanel consumer)

**Base path**: `/api/admin/invoices` (CPanel calls `/admin/invoices` via `apiRequest`)  
**Auth**: Bearer JWT + server-resolved `companyId` (tenant scope)  
**Backend source**: `api/src/routes/invoices.js`, `api/src/invoices/schema.js`

## Endpoints

### List invoices

```http
GET /admin/invoices
```

**Response**: `200` — JSON array of invoice objects (non-deleted only, newest first)

**Errors**: `401`/`403` auth; `500` generic message

---

### Create invoice

```http
POST /admin/invoices
Content-Type: application/json
```

**Body** (allowed fields only):

```json
{
  "customer_name": "string (required)",
  "customer_email": "string | null",
  "customer_phone": "string | null",
  "status": "draft | issued | paid | cancelled | void",
  "currency": "ILS",
  "issue_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD | null",
  "notes": "string | null",
  "line_items": [
    {
      "description": "string (required)",
      "quantity": 1,
      "unit_price": 0,
      "product_id": null,
      "sku": null
    }
  ]
}
```

**Response**: `201` — created invoice with `invoice_number`, computed totals

**Validation errors**: `400` with `{ message: "..." }`

---

### Get invoice

```http
GET /admin/invoices/:invoiceId
```

**Response**: `200` — invoice object  
**Errors**: `404` `"Invoice not found."`

---

### Update invoice

```http
PATCH /admin/invoices/:invoiceId
Content-Type: application/json
```

**Body**: Partial allowed fields (same as create, excluding required create-only constraints). Include `line_items` array to replace all lines.

**Blocked when** `status` is `void` or `cancelled`: `400` `"Cannot update a void or cancelled invoice."`

**Response**: `200` — updated invoice

---

### Void invoice (preferred for CPanel)

```http
POST /admin/invoices/:invoiceId/void
```

**Body**: none

**Response**: `200` — invoice with `status: "void"`, `deleted_at` set

**Errors**:
- `400` `"Invoice is already void."`
- `404` not found

**Note**: `DELETE /admin/invoices/:invoiceId` is equivalent but **not used** by this feature.

---

## Invoice response shape (snake_case)

```json
{
  "id": "uuid",
  "invoice_number": "INV-2026-000001",
  "customer_name": "Jane Doe",
  "customer_email": "jane@example.com",
  "customer_phone": "+972...",
  "status": "draft",
  "currency": "ILS",
  "issue_date": "2026-08-18",
  "due_date": null,
  "notes": null,
  "line_items": [
    {
      "description": "Service fee",
      "quantity": 2,
      "unit_price": 50,
      "total": 100,
      "product_id": null,
      "sku": null
    }
  ],
  "subtotal": 100,
  "discount_total": 0,
  "tax_total": 0,
  "total": 100,
  "created_at": "...",
  "updated_at": "..."
}
```

## Related read-only contract: customers (picker)

```http
GET /admin/customers?limit=100
```

Used only to populate customer select; see `cpanel/src/utils/customersApi.js`.

## Frontend service layer (to add in `invoices.js`)

| Function | Maps to |
| --- | --- |
| `fetchInvoices()` | GET `/admin/invoices` |
| `fetchInvoice(id)` | GET `/admin/invoices/:id` |
| `createInvoice(payload)` | POST `/admin/invoices` |
| `updateInvoice(id, payload)` | PATCH `/admin/invoices/:id` |
| `voidInvoice(id)` | POST `/admin/invoices/:id/void` |

All use `apiRequest` with `JSON.stringify` body where applicable.
