# Phase H — Product Settings — Implementation / Audit Scope

**Status:** Implemented (Phase H). **No migration required.** Production was **not** touched.  
**Parent plan:** `specs/002-product-merchandising-upgrade/plan.md`  
**Execution scope:** **Phase H ONLY**  
**Prior completed phases:** A, B, C, D, G  
**Next after H:** E + F → J → I → K + L  

**Do not:** start E / F / I / J / K / L; invent `products.restore`; apply migrations to Production; broadly refactor CPanel; build a coupon engine.

---

## 1. Audit summary (pre-implementation)

### Company settings (reuse)

| Item | Finding |
|------|---------|
| Storage | `company_settings.settings` JSONB (`001_multi_company_foundation.sql`) — **no new table** |
| Write | `companyRepository.updateCompanyBrandingAndSettings` + shallow merge |
| API | `GET/PATCH /api/company/settings` (`company_settings.view` / `company_settings.update`) |
| Allowlist | `validateSettingsPatch` — branding keys only today |
| Projection | `publicSettingKeys` in `tenancy/company.js` — Phase H keys would not round-trip without extension |
| Client | `sanitizeCompanyContext` drops unknown settings keys |
| Activity log | Company settings PATCH currently **does not** log (existing convention) |

`AdminProductSettingsPage.jsx` is the **product schema** editor (`/api/admin/product-schema`), not merchandising toggles. Phase H adds an adjacent merchandising settings panel on that page (same route/module), wired to company settings — does not replace the schema editor.

### Low stock

Hardcoded `5` via `TEMPORARY_LOW_STOCK_THRESHOLD` (CPanel) and `LOW_STOCK_THRESHOLD` (dashboard insights). Insights helpers already accept `{ lowStockThreshold }` but callers do not pass company setting.

### Product / variant fields

| Field | Status |
|-------|--------|
| `barcode` | Missing — add product-level JSONB field |
| `minPurchaseQuantity` / `maxPurchaseQuantity` | Missing — **product-level** (execution brief; Decision 22 = dual validation) |
| `costPrice` | Missing — **variant-level** JSONB (distinct from `wholesalePrice`) |
| `wholesale_price` column | Exists but app uses JSONB `wholesalePrice`; cost price follows JSONB pattern |

**No migration required** — all new fields live in existing product/variant JSONB documents.

### Permissions

| Permission | Status |
|------------|--------|
| `products.cost_price.manage` | **Add** to API `allPermissions` + CPanel `permissions.js` |
| `products.restore` | **Must remain absent** (restore = `products.update`) |

### Public leak surfaces

- `serializePublicProduct` — explicit allowlist (safe if cost never mapped)
- `GET /api/products` (unauth) returns full `normalizeProduct` — **must strip cost price**
- Admin product responses — strip unless `costPriceEnabled` + `products.cost_price.manage`

### Quantity enforcement

Order create (`orders.js`) is authoritative. Cart has no min/max. Frontend `ProductDetailsPage` / cart qty are UX-only today.

### Latest migration

`023_products_deleted_at.sql`. Phase H: **no new migration**.

---

## 2. Phase H deliverables

### A. Company settings keys (`company_settings.settings`)

| Key | Type | Default | Exposure |
|-----|------|---------|----------|
| `lowStockThreshold` | integer ≥ 0 | `5` | Admin only |
| `costPriceEnabled` | boolean | `false` | Admin only |
| `productConditionEnabled` | boolean | `false` | Admin only (Phase I precursor only) |
| `showCouponBoxAtCheckout` | boolean | `false` | Public (Phase L UI contract) |

Validation on PATCH; reject unknown keys; reject invalid types/ranges. Do **not** silently swap min/max (product fields).

### B. Product fields (JSONB)

- `barcode` — optional string, tenant-scoped, Advanced editor + list search after field exists
- `minPurchaseQuantity` / `maxPurchaseQuantity` — optional positive integers; reject if min > max

### C. Variant field (JSONB)

- `costPrice` — optional number ≥ 0; gated by setting + permission; never public

### D. Consumers

- Replace hardcoded low-stock `5` in list, inventory, insights with company `lowStockThreshold`
- Order API enforces product min/max purchase quantity
- Storefront product detail / cart UX clamps to min/max when present
- Coupon box: setting only — no coupon engine (document deferred Phase L UI if box absent)

### E. Permissions / security

- Add `products.cost_price.manage`
- Backend strips/rejects cost price without setting+permission
- Public serializers never emit cost price
- Tenant isolation on all settings/product ops

---

## 3. Out of scope (document only)

| Deferred | Note |
|----------|------|
| E / F | Related / FBT |
| I | Condition field UX/business logic (reads `productConditionEnabled` later) |
| J | Featured / new arrivals merchandising |
| K / L | Bulk discounts / coupon engine (only visibility setting in H) |
| Barcode search polish | Field lands in H; list search may wire if trivial |
| `products.restore` | Explicitly rejected |

---

## 4. Activity logging

- Product create/update already logs — continue (cost/qty/barcode ride along)
- Company settings PATCH: **no new audit system**; match existing convention (no activity log) unless a lightweight `company.settings_updated` is added for merchandising keys only — prefer document “no log” to match branding settings

---

## 5. Verification checklist

Settings round-trip + tenant isolation + validation; low stock shared; barcode optional; cost price gated + never public; min/max dual validation; coupon setting only; CPanel build; targeted tests.
