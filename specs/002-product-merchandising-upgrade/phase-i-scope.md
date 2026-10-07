# Phase I — Product Condition — Implementation / Audit Scope

**Status:** Implemented (Phase I). **No migration required.** Production was **not** touched.  
**Parent plan:** `specs/002-product-merchandising-upgrade/plan.md` (Decision 7)  
**Execution scope:** **Phase I ONLY**  
**Prior completed phases:** A, B, C, D, G, H, E, F, J  
**Next after I:** K + L (deferred)

**Do not:** start K / L; add a new attributes platform; add a new settings table; add catalog filter dimension; apply migrations to Production; broadly refactor CPanel.

---

## 1. Audit summary (pre-implementation)

### Partial Condition implementation

| Surface | Finding |
|---------|---------|
| Product JSONB `condition` | **Absent** — no field in schema, `normalizeProduct`, wizard, list, or public serializer |
| Settings gate | **Present (Phase H)** — `company_settings.settings.productConditionEnabled`, default `false` |
| Settings API | `GET/PATCH /api/company/settings` already round-trips the boolean (tenant-scoped) |
| Settings UI | `AdminProductSettingsPage` toggle exists as “Phase I precursor” (copy only) |
| Attributes (Phase D) | Canonical filter groups do **not** include condition — keep Condition as a dedicated product property |
| List columns | Fixed columns; **no** configurable-column system — do not add a Condition column |
| Catalog filters | Product-level filters are Phase D attribute groups only — Condition is **not** a catalog filter |

### Product persistence

Products persist as JSONB `products.data` (`postgresStore.productRow`). Barcode / min-max qty (Phase H) already use this document. Condition belongs on the same JSONB document. **No new table. No new column. No migration.**

### Public contract

`serializePublicProduct` is an explicit allowlist. Plan: additive `condition` **only when the company gate is enabled and a value is set**. Unset and disabled omit the key. Cost price / barcode / settings / permissions must not leak.

Storefront listing already excludes trashed / inactive / hidden products (`storefront.js` + `attachPublicRelations.js`).

### Duplicate / Trash

- Duplicate: `buildDuplicatedProduct` spreads source fields — Condition copies automatically when present.
- When the gate is **disabled**, duplicate must **strip** `condition` so the copy does not create enabled-only state.
- Trash stores the full JSONB document (`deleted_at` only). Restore preserves `condition`. Permanent delete removes the product row (no orphan Condition records).

### Permissions

Reuse `products.create` / `products.update` / `products.view` and existing `company_settings.*`. **Do not** add `products.condition.manage`.

### Activity log

Product create/update already logs. Condition rides along with `product.updated` (include before/after when the value changes). Company settings PATCH remains unlogged (Phase H convention).

---

## 2. Configuration

Reuse Phase H key:

- `productConditionEnabled` in `company_settings.settings`
- Default when absent: `false`
- Tenant-scoped; not user-specific; not product-specific
- No new settings table

---

## 3. Data model

- Product-level JSONB field: `condition`
- Canonical stored / API values: `new` | `refurbished` | `used`
- Writes also accept labels `New` / `Refurbished` / `Used` and normalize to the enum
- Optional; `null` / omit = unset
- Do **not** backfill existing products to `new` when the gate is turned on
- Not required on create/update even when enabled

---

## 4. Backend validation (authoritative)

When **enabled**:

- Accept only the three canonical values (after label normalization)
- Reject invalid values (`400`)
- `null` / `""` / omitted → unset (`null`)
- Clearing via `condition: null` is allowed

When **disabled**:

- Requests that **include** the `condition` key are rejected (`403`) — no silent accept
- Requests that omit `condition` remain valid; stored value is preserved
- Duplicate strips `condition` from the copy

---

## 5. CPanel

- ProductWizard Advanced Settings: selector visible **only** when `conditionEnabled === true`
- Options: unset + New / Refurbished / Used
- Payload omits `condition` entirely when the gate is disabled
- Settings toggle copy updated (no longer “deferred”)
- Product list: no new column / no new filter (fixed table; not a catalog filter)
- Employee dashboard wizard: default `conditionEnabled=false` unless wired later

---

## 6. Storefront

**Public** when `productConditionEnabled === true` **and** a value is set.

Omit when disabled or unset. Not a catalog filter. Trashed products remain excluded by existing public listing.

`ProductDetailsPage` may display the label when `product.condition` is present on the loaded product.

---

## 7. Out of scope

Phase K (bulk discounts), Phase L (coupons), new attributes/filter platform, Condition history/analytics, pricing changes, new merchandising architecture, Production migration apply.
