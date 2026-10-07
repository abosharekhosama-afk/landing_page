# Phase E + F — Related Products & Frequently Bought Together — Implementation / Audit Scope

**Status:** Approved for implementation after repository audit.  
**Parent plan:** `specs/002-product-merchandising-upgrade/plan.md`  
**Execution scope:** **Phase E + Phase F ONLY**  
**Prior completed phases:** A, B, C, D, G, H  
**Next after E+F:** J → I → K + L  

**Do not:** start J / I / K / L; build a recommendation engine; invent Related Products fallback; apply migration to Production; broadly refactor CPanel.

---

## A. Existing architecture

### Products

- Table `public.products` with tenant `company_id`, JSONB `data`, column `is_active`, soft-delete `deleted_at` (Phase G / migration `021`).
- Catalog hierarchy on product documents:
  - `categoryId` → column `category_id` (concrete category; typically subcategory)
  - `mainCategoryId` (JSON) — main category
  - `subcategoryId` (JSON) — subcategory
- Active / visible for storefront: `!isProductTrashed` && `isActive !== false` && `active !== false` && `visible !== false`.
- Global order: `sortOrder` in JSON `data` (Phase C). Deterministic secondary: `slug`.

### Trash (Phase G)

- Soft delete via `deleted_at`. Default lists exclude trashed.
- Permanent delete: `DELETE /api/products/:id/permanent` + `deleteProductWithTenantCatalogLock` (hard row delete). Child FKs with `ON DELETE CASCADE` clean up; no `product_relations` yet.

### Permissions (reuse — no new relation perms)

| Action | Permission |
|--------|------------|
| Admin read relations | `products.view` (same list gate pattern) |
| Replace relations | `products.update` |
| Permanent delete cleanup | existing `products.permanent_delete` |

### Storefront

- `serializePublicProduct` allowlist; **never** cost price / internal metadata.
- `GET /api/storefront/content` and `GET /api/storefront/products/:slug`.
- No product cache beyond `Cache-Control: must-revalidate`.
- `ProductDetailsPage.jsx` currently invents related via same-`categoryId` client heuristic (max 8) — **replace with backend-authoritative lists**.

### Shared UI

- `AdminTable`, `Toolbar` extracted; `SearchField`/`Badge` still local in `AdminDashboardPage.jsx`.
- **`ProductPicker` does not exist** — create `cpanel/src/components/ProductPicker.jsx`.

### Gaps before E+F

| Planned | Current |
|---------|---------|
| `product_relations` | Missing |
| Relation APIs | Missing |
| `ProductPicker` | Missing |
| Additive `relatedProducts` / `frequentlyBoughtTogether` | Missing |
| Activity `product.relations_updated` | Missing |

---

## B. Proposed `product_relations` schema

**Migration:** `api/supabase/migrations/024_product_relations.sql`  
**Not applied to Production** as part of this phase.

```sql
create table if not exists public.product_relations (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  source_product_id text not null,
  target_product_id text not null,
  type text not null check (type in ('related', 'fbt')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_relations_no_self check (source_product_id <> target_product_id),
  constraint product_relations_unique
    unique (company_id, source_product_id, target_product_id, type)
);

-- Composite FKs aligned with products (company_id, id)
alter table public.product_relations
  add constraint fk_product_relations_source
  foreign key (company_id, source_product_id)
  references public.products (company_id, id)
  on delete cascade;

alter table public.product_relations
  add constraint fk_product_relations_target
  foreign key (company_id, target_product_id)
  references public.products (company_id, id)
  on delete cascade;
```

**Note:** `products` must have unique `(company_id, id)` for composite FKs. If absent, add `unique (company_id, id)` in the same migration before FKs (idempotent).

File-store / tests: in-memory `productRelations` collection mirrored via `productRelationRepository` + `persistCompanyStore`.

---

## C. Relation types

| `type` | Meaning |
|--------|---------|
| `related` | Manual Related Products (Phase E) |
| `fbt` | Manual Frequently Bought Together (Phase F) |

No other recommendation types.

`sort_order` preserves admin-submitted order (0..n). **Not** tied to Phase C global `sortOrder`.

---

## D. API endpoints

Prefer bulk replace (matches architecture; avoid N individual mutate endpoints).

| Method | Path | Permission | Behavior |
|--------|------|------------|----------|
| `GET` | `/api/products/:id/relations?type=related\|fbt` | auth + product list/`products.view` gate | Return ordered target products (admin summaries; no cost unless caller has cost perm via existing presenters if reused) |
| `PUT` | `/api/products/:id/relations?type=related\|fbt` | `products.update` | Body `{ targetProductIds: string[] }` — atomic replace for that type |

Public read only via storefront additive fields (not admin relation routes).

---

## E. Permission model

- Mutations: **`products.update`** only (Decision / plan — no `products.related.manage` / `products.fbt.manage`).
- Admin reads: same as product detail/list (`products.view` / existing `requireProductListPermission`).
- Source product must exist, belong to `req.companyId`, and **not** be trashed for normal relation management.

---

## F. ProductPicker design

**File:** `cpanel/src/components/ProductPicker.jsx`

Props (conceptual):

- `products` — candidate list (caller supplies tenant-scoped active catalog)
- `selectedIds` / `onChange`
- `excludeIds` — always includes current product
- `search` — client filter on name/SKU/slug
- Multi-select, remove chips/rows, loading/empty/error states

**Must exclude:** trashed, inactive (`isActive === false`), other tenants (never in input list), self.

Reuse local visual patterns (`admin-search-field`, pills, buttons). Do not invent a generic entity picker framework.

Used by ProductWizard for **both** Related and FBT.

---

## G. Related Products behavior

- Admin configures manual list via ProductPicker on marketing step (edit only; product must exist).
- Persist `type = related` with `sort_order` = array index.
- Storefront: return configured related products only; **empty array if none** — **no fallback**.
- Filter out: self, trashed, inactive/invisible, other tenant.

---

## H. FBT manual behavior

- Same ProductPicker; `type = fbt`.
- Manual list is authoritative when **any** valid manual FBT relation exists after filtering.
- Cap public FBT at **8** (manual also capped at 8 on write and/or read).
- Invalid submitted IDs → **400** with explicit error (do not silently drop malformed cross-tenant/self/trashed/inactive IDs).

---

## I. FBT fallback algorithm (Decision 11)

When **no** manual `fbt` relations exist for the source product:

1. Candidates: same `subcategoryId` (when source has a non-empty `subcategoryId`), exclude self / trashed / inactive / invisible / other company.
2. If fewer than 8: fill from the same category hierarchy using `mainCategoryId` (broader parent). If `mainCategoryId` is empty, fall back to exact `categoryId` matches.
3. Sort: `sortOrder` ASC, then `slug` ASC.
4. Max **8**.
5. Never invent products; never randomize.

**Why mainCategoryId for step 2:** In this repository `categoryId` is typically mirrored from `subcategoryId`, so filling by `categoryId` alone would not broaden beyond subcategory peers.

Do **not** append fallback when manual FBT exists (even if manual has &lt; 8).

---

## J. Storefront response shape

Additive on public product payloads (detail and content enrichment):

```json
{
  "relatedProducts": [ /* serializePublicProduct summaries */ ],
  "frequentlyBoughtTogether": [ /* serializePublicProduct summaries */ ]
}
```

- No relation `id`, `company_id`, `type`, or admin metadata.
- No `costPrice`.
- Prefer enriching `GET /storefront/products/:slug` and products in `GET /storefront/content` via a bounded in-memory attach helper (no N+1).

---

## K. Trash interaction

| Surface | Rule |
|---------|------|
| ProductPicker | Trashed not in catalog list |
| Relation PUT | Reject trashed targets (and trashed source) |
| Manual related/FBT public | Skip trashed targets |
| FBT fallback | Exclude trashed |
| Permanent delete | Postgres: `ON DELETE CASCADE` on source/target FKs; file-store: delete relations where source or target matches |

---

## L. Tenant isolation

- Every row has `company_id`.
- Resolve source + all targets with `findByCompany(req.companyId, id)` before write.
- Reject any target not found in current company (treat as invalid ID → 400).
- Cross-tenant IDs never create rows.
- Tests cover Company A ↛ Company B.

---

## M. Indexes and constraints

- `UNIQUE (company_id, source_product_id, target_product_id, type)`
- `CHECK (source_product_id <> target_product_id)`
- `CHECK (type in ('related','fbt'))`
- Index: `(company_id, source_product_id, type, sort_order)`
- Index: `(company_id, target_product_id)` (cleanup / reverse lookups)
- Composite FKs → `products(company_id, id)` `ON DELETE CASCADE`

---

## N. Tests

**File:** `api/test/product-relations-phase-e-f.test.js` (+ optional cpanel smoke if needed)

### Related

- set / get / replace / clear
- duplicate target IDs deduped or rejected consistently (document: **dedupe preserving first order**, then persist)
- self-reference → 400
- inactive / trashed / cross-tenant → 400
- tenant isolation on read

### FBT

- manual CRUD
- manual precedence over fallback
- fallback cases 1–9 from execution brief
- max 8

### Storefront

- `relatedProducts` / `frequentlyBoughtTogether` present
- no internal relation metadata / cost price / deleted / inactive / self
- tenant isolation

### Regressions

- Phase G trash exclusions
- Phase H cost price still absent from public serializer

### Build

```bash
cd cpanel && npm run build
```

### Migration

- File reviewable; **Production not touched**.

---

## Activity logs

On successful `PUT` relations:

- `product.relations_updated` with metadata `{ type, targetProductIds }` (and before/after id lists).

---

## Explicit non-goals

Phase I condition, Phase J merchandising flags, Phase K/L discounts/coupons, AI/popularity engines, new permissions, new public serializer, new cache layer, broad CPanel refactor.
