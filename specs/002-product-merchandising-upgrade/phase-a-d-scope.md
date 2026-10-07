# Phase A + D — Implementation / Audit Scope

**Status:** PR1 + PR2 implemented (Phase A + D complete for ProductWizard basic UX and Attributes promotion). Next execution scope after acceptance: Phase B.  
**Parent plan:** `specs/002-product-merchandising-upgrade/plan.md`  
**Execution scope:** **Phase A + D ONLY** (implementation landed in wizard; do not start Phase B until scoped/approved)  
**Implementation order (unchanged):** `A + D → B → C → G → H → E + F → J → I → K + L`

**Do not yet:** implement features, change schemas, create/run migrations, touch production, extract `AdminTable`/`Toolbar`/`ProductPicker` (those belong to later phases), or start Phase B+.

---

## 1. Purpose

Define a concrete, audit-backed scope so Phase A (Add/Edit Product UX) and Phase D (Attributes) can be implemented as small, reviewable PRs with clear in/out boundaries, file touch list, field move map, test updates, and acceptance criteria.

A and D are delivered together because both reshape `ProductWizard` on the **basic** tab. Prefer **one coordinated PR series** (or two tightly sequenced PRs) rather than parallel conflicting edits to `AdminDashboardPage.jsx`.

---



## 2. Goals



### Phase A — Add/Edit Product UX

Reorganize `ProductWizard` so daily-use fields appear first; move SEO / long content / identity / merchandising flags into **Advanced Settings** — without rebuilding the form or changing persistence.

### Phase D — Attributes

Promote catalog **filter attributes** from Advanced-only into a first-class **Attributes** block on the basic flow; keep variant color/size and tenant custom fields in their existing systems; improve labels and validation feedback.

---



## 3. Explicit Non-Goals (this scope)


| Out                                                    | Why / where it lands                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| New product data model / migrations                    | Not required for A+D                                                |
| Backend/API changes                                    | Layout-only; reuse existing `POST/PUT /api/products`                |
| Storefront serializer / Decision 15 sale-price mapping | Later (J / pricing PR) — A only **surfaces** sale price in admin UX |
| Cost price, barcode, condition                         | Phases H / I                                                        |
| Related / FBT / Trash / reorder / coupons / discounts  | Later phases                                                        |
| `ProductPicker`, `AdminTable`, `Toolbar` extraction    | Decision 19 — Phases B+                                             |
| Broad `AdminDashboardPage.jsx` refactor                | Forbidden                                                           |
| Replacing `TenantProductFields` or product schema API  | Out                                                                 |
| New attribute master tables                            | Out                                                                 |
| Deep product list / duplicate / sales count            | Phase B                                                             |


---



## 4. Audit Summary — Current `ProductWizard`

**Primary file:** `cpanel/src/pages/AdminDashboardPage.jsx` (`export function ProductWizard`, ~L1317+)  
**Also consumes wizard:** `cpanel/src/pages/EmployeeDashboardPage.jsx` (import only — inherit layout changes automatically)

### Tabs (unchanged set)

`basic` | `pricing` | `variants` | `media` | `details` | `marketing` | `preview`  

Gated by: `readOnly`, `canManageContent` (details/marketing), `canManageMedia` (media).

### Basic tab — current composition (as audited)


| Section                            | Contents today                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Basic info                         | Name EN/AR, short description EN/AR, Active, Visible                                                                                      |
| Classification                     | Brand → Main Category → Subcategory (required cascade + inline errors)                                                                    |
| Pricing summary                    | Variant count + total stock + “Manage variants” link only (**no inline price/sale price fields**)                                         |
| Media teaser                       | Note + “Open media” (if `canManageMedia`)                                                                                                 |
| Advanced collapse (`advancedOpen`) | Slug, SKU, long descriptions, Manufacturer, **all filter attribute groups**, Quick Shop / featured / newArrival / bestseller, label EN/AR |




### Variants tab — relevant to A

Per-variant: color, size, **price**, **sale_price**, stock, active/visible, image. This remains the system of record for price/sale/stock. Phase A adds a **summary/edit affordance on basic** for primary-variant price + sale price (see field map), still writing into `form.variants[0]` (or first active variant) — **not** a new product-level price model.

### Filter attributes — current

- Groups constant: `PRODUCT_FILTER_FORM_GROUPS` in `AdminDashboardPage.jsx` mirrors `PRODUCT_FILTER_ATTRIBUTE_GROUPS` in `api/src/catalog/productFilterAttributes.js` / `shared/catalog/productFilterAttributes.js` / `cpanel/src/utils/productFilterAttributes.js`.
- Groups: `age`, `gender`, `skill`, `occasion`, `material`, `productType`, `theme`, `collection`.
- UI: checkbox multi-select via `getLocalizedFilterAttributeOptions` + `toggleFilterAttribute`.
- Age already surfaces legacy/ambiguous warnings in Advanced.
- Persisted through `createProductFromForm` → existing product save path.



### Tenant fields — current

`TenantProductFields` on **media / details / showcase / marketing / seo** tabs — **leave placement as-is** in A+D (plan: Advanced may eventually group long content; do **not** move tenant sections in A+D unless a tiny consistency win with zero behavior change — default = **do not move**).

### Save path (must not change)

`ProductWizard` submit → parent `onSave` → `CPanelApp.jsx` `handleSaveProduct` → `cpanel/src/utils/productsApi.js` → `POST/PUT /api/products`.

---



## 5. Target Basic-Tab Information Architecture

Target order on **basic** (one scroll composition; keep existing CSS classes / section patterns):

1. **Name** (EN/AR) — keep short descriptions on basic *or* move short descriptions to Advanced if they clutter daily use; **recommendation:** keep short descriptions on basic (already daily copy).
2. **Price** — primary variant regular price (summary control bound to variants).
3. **Sale price** — primary variant `sale_price` (same binding).
4. **Stock** — read-only total (sum of variant stock) + link “Manage variants”.
5. **Image** — thumbnail of `form.image` / primary image if present + “Open media” link (reuse existing media teaser; optionally show small preview if URL exists — no new uploader on basic).
6. **Category / Brand** — existing classification cascade (unchanged validation).
7. **Attributes** (Phase D) — filter attribute checkbox groups (promoted from Advanced).
8. **Status** — Active (and keep Visible nearby unless product asks to bury Visible in Advanced; **recommendation:** keep Active + Visible together as today).

Then:

1. **Advanced Settings** (extend existing `advancedOpen` / `product-form-advanced`) — Slug, SKU, long descriptions, Manufacturer, merchandising flags (featured / newArrival / bestseller / quickShop), labels, notes pointing to Media/Details/Marketing tabs.

**Tabs** `pricing` **/** `variants` **/** `media` **/** `details` **/** `marketing` **/** `preview`**:** keep; pricing tab may remain a thin duplicate of the variants link (acceptable) or lightly align copy with the new basic pricing summary — no new pricing engine.

---



## 6. Field Move Map


| Field / control                                 | Form state                                        | Today                       | A+D target                      | Notes                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------- | --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Name EN/AR                                      | `form.nameEn`, `form.nameAr`                      | Basic                       | Basic (top)                     | Required                                                                                                                                                                             |
| Short description EN/AR                         | `form.shortDescription*`                          | Basic                       | Basic                           | Keep                                                                                                                                                                                 |
| Active / Visible                                | `form.active`, `form.visible`                     | Basic                       | Basic (Status)                  | Preserve                                                                                                                                                                             |
| Brand / Main / Sub                              | `form.brandId`, `mainCategoryId`, `subcategoryId` | Basic classification        | Basic (after price/stock/image) | Keep cascade + `validateProductHierarchySelection`                                                                                                                                   |
| Price (primary)                                 | `form.variants[i].price`                          | Variants tab only           | Basic summary **and** Variants  | Bind to first variant; if no variants, prompt to add via Manage variants (do not invent product-level `form.price` persistence beyond what `createProductFromForm` already supports) |
| Sale price (primary)                            | `form.variants[i].sale_price`                     | Variants tab only           | Basic summary **and** Variants  | Same binding                                                                                                                                                                         |
| Stock total                                     | derived from variants                             | Summary counts              | Basic read-only + link          | No new stock field                                                                                                                                                                   |
| Primary image preview                           | `form.image` / media                              | Media tab (+ teaser link)   | Basic teaser + optional thumb   | No new upload on basic                                                                                                                                                               |
| Filter attributes                               | `form.age`, `gender`, …                           | Advanced                    | **Attributes block on basic**   | Phase D core                                                                                                                                                                         |
| Slug / SKU                                      | `form.slug`, `form.sku`                           | Advanced                    | Advanced                        |                                                                                                                                                                                      |
| Long description EN/AR                          | `form.fullDescription*`                           | Advanced                    | Advanced                        |                                                                                                                                                                                      |
| Manufacturer                                    | `form.manufacturer`                               | Advanced                    | Advanced                        |                                                                                                                                                                                      |
| Quick Shop / featured / newArrival / bestseller | form flags                                        | Advanced                    | Advanced                        | Do not add storefront serializer work                                                                                                                                                |
| Label EN/AR                                     | `form.label*`                                     | Advanced                    | Advanced                        |                                                                                                                                                                                      |
| Variant color/size                              | variant fields                                    | Variants tab                | Variants tab                    | Phase D: document as variant attributes; optional label clarity only                                                                                                                 |
| Tenant custom fields                            | `tenantValues`                                    | details/media/marketing/seo | **Unchanged**                   | Do not relocate in A+D                                                                                                                                                               |
| Cost / barcode / condition                      | —                                                 | N/A                         | **Do not add**                  | H / I                                                                                                                                                                                |


---



## 7. Phase D — Attribute Systems Map (do not merge)


| Concern                                                                | System                                    | Location                      | A+D action                                         |
| ---------------------------------------------------------------------- | ----------------------------------------- | ----------------------------- | -------------------------------------------------- |
| Age, gender, skill, occasion, material, productType, theme, collection | Catalog filter attributes                 | Shared module + product JSONB | Promote UI to Attributes block; keep IDs canonical |
| Color / size (shade/volume)                                            | Variant attributes                        | Variants tab                  | Clarify labels only if needed; stay on variants    |
| iCare / tenant-specific content                                        | `product_field_*` + `TenantProductFields` | Other tabs                    | No move; no new platform                           |


**Rules:**

- Import options only via `cpanel/src/utils/productFilterAttributes.js` → shared/api catalog module.
- Do not hardcode a second option list.
- Preserve age legacy / ambiguous messaging when groups move.
- Inline validation: keep hierarchy errors; for filters, keep existing age warnings; surface save-time filter issues with the same `message-panel` / `admin-note` patterns (no new toast system).

---



## 8. Affected Files (expected)


| Path                                            | Change type                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cpanel/src/pages/AdminDashboardPage.jsx`       | **Primary** — `ProductWizard` layout / Attributes block / basic price+sale summary                                                                                                                                                                                                            |
| `cpanel/src/data/translations.js`               | Labels for Advanced Settings, Attributes section, any new help text (EN+AR via `getText` / `t()`)                                                                                                                                                                                             |
| `cpanel/src/utils/productFilterAttributes.js`   | Likely **unchanged** (reuse); touch only if a small helper improves form binding                                                                                                                                                                                                              |
| `cpanel/src/components/TenantProductFields.jsx` | **No change** expected                                                                                                                                                                                                                                                                        |
| `cpanel/src/pages/EmployeeDashboardPage.jsx`    | **No change** expected (inherits `ProductWizard`)                                                                                                                                                                                                                                             |
| `cpanel/test/product-save-flow.test.js`         | Re-run; update only if assertions break on structure                                                                                                                                                                                                                                          |
| `cpanel/test/product-filter-attributes.test.js` | Ensure still asserts shared vocabulary usage                                                                                                                                                                                                                                                  |
| `cpanel/test/catalog-hierarchy.test.js`         | Update source assertions if Advanced/Attributes markup moves (hierarchy cascade must remain; filter groups must still exist). **Note:** current test looks for `name="age"` etc.; checkbox filters today may not use `name=` — fix assertions to match real markup without weakening coverage |
| `api/src/catalog/productFilterAttributes.js`    | **No change** expected                                                                                                                                                                                                                                                                        |
| `api/src/routes/products.js` / migrations       | **None**                                                                                                                                                                                                                                                                                      |


CSS: prefer existing `product-form-section`, `product-form-advanced`, `admin-checkbox-grid`, `admin-note`, `secondary-action`. Add minimal CSS only if a new Attributes heading needs spacing — no visual redesign.

---



## 9. Implementation Tasks (ordered)



### A0 — Pre-flight (no product behavior change)

1. Confirm this scope approved.
2. Branch from current main/integration branch used by the team.
3. Snapshot failing/passing baseline:
  `node --test cpanel/test/product-save-flow.test.js`  
   `node --test cpanel/test/product-filter-attributes.test.js`  
   `node --test cpanel/test/catalog-hierarchy.test.js`  
   `cd cpanel && npm run build`



### A1 — Basic pricing / stock / image summary (Phase A)

1. Add basic-tab controls for primary variant **price** and **sale price** (update `form.variants` in place).
2. Keep stock as derived total + Manage variants CTA.
3. Improve media teaser (optional thumbnail) + Open media CTA.
4. Do not change `createProductFromForm` sale_price serialization semantics.



### A2 — Reorder basic sections (Phase A)

1. Reorder sections to match §5 target IA.
2. Rename Advanced toggle label to **Advanced Settings** via translations (`hierarchyLabels.advanced` / `translations.js`) without inventing a new collapse component.



### D1 — Attributes block (Phase D)

1. Move `PRODUCT_FILTER_FORM_GROUPS` checkbox UI from Advanced body into a dedicated **Attributes** `product-form-section` on basic.
2. Preserve age legacy/ambiguous notes.
3. Leave merchandising flags / slug / SKU / long copy in Advanced.
4. Do not duplicate option lists.



### A3 — Permissions & read-only

1. Respect `readOnly` on new basic price/sale inputs.
2. Keep `canManageMedia` / `canManageContent` tab gates unchanged.



### A4 — Copy / i18n

1. Add/adjust EN+AR strings for Attributes heading, Advanced Settings, pricing summary help if needed.
2. Prefer `t("productForm.*")` / existing `hierarchyLabels` pattern; avoid hard-coded English except where file already mixes (prefer cleaning only touched strings).



### A5 — Tests & build

1. Update `catalog-hierarchy.test.js` if structural regexes break.
2. Keep filter-attributes shared-vocabulary test green.
3. Manual create + edit smoke (admin + employee entry if used).
4. `cd cpanel && npm run build`.

---



## 10. PR Strategy (small / reviewable)

Recommended split (still A+D only):


| PR      | Contents                                                                          | Risk                    |
| ------- | --------------------------------------------------------------------------------- | ----------------------- |
| **PR1** | A1 + A2 — basic price/sale/stock/image summary + section reorder; Advanced rename | Medium (wizard layout)  |
| **PR2** | D1 + A4 — Attributes promotion + i18n; test assertion updates                     | Medium (filter UI move) |


Acceptable alternative: **single PR** if diff stays focused on `ProductWizard` + translations + tests and review bandwidth prefers one review.

**Hard rules:**

- Do not combine with Phase B list work, component extraction, or API changes.
- Do not open migrations.
- Do not touch production.

---



## 11. Dependencies


| Depends on                | Status                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Final plan decisions 1–23 | Closed                                                                                                      |
| Phase B+                  | Not started — blocked until A+D accepted                                                                    |
| Backend / DB              | None for A+D                                                                                                |
| Storefront Decision 15    | Explicitly **not** in A+D; track as follow-up so admin sale price and storefront do not permanently diverge |


---



## 12. Risks & Mitigations


| Risk                                               | Mitigation                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `AdminDashboardPage.jsx` size / merge conflicts    | Touch only `ProductWizard` region; no drive-by refactors                                   |
| Primary variant ambiguous when many variants       | Document: edit first variant (index 0) on basic; full matrix on Variants tab               |
| Empty variants on new product                      | Disable or no-op price inputs until a variant exists; CTA to Manage variants / add variant |
| `catalog-hierarchy.test.js` brittle source regexes | Update tests to assert Attributes section + cascade + advanced toggle presence             |
| Accidental tenant-field moves                      | Explicit non-goal; leave `TenantProductFields` mounts alone                                |
| Visual language drift                              | Reuse existing sections, checkboxes, buttons, message panels                               |


---



## 13. Verification / Acceptance Checklist



### Functional

- [ ] Create product: daily fields usable on basic without opening Advanced.
- [ ] Edit product: price + sale price on basic update primary variant and persist via existing save.
- [ ] Sale price still editable on Variants tab and stays in sync with basic summary.
- [ ] Attributes (all eight filter groups) editable on basic; values persist; storefront `filterAttributes` unchanged in shape.
- [ ] Advanced Settings still contains slug, SKU, long descriptions, manufacturer, merchandising flags, labels.
- [ ] Brand → Main → Sub validation unchanged.
- [ ] `readOnly` / content / media permission gates unchanged.
- [ ] Employee dashboard product editor reflects same UX.



### Non-functional / regression

- [ ] No API/schema/migration changes in the PR diff.
- [ ] No Cost Price / barcode / condition fields introduced.
- [ ] No shared component extraction beyond what already exists inline.
- [ ] `node --test cpanel/test/product-save-flow.test.js`
- [ ] `node --test cpanel/test/product-filter-attributes.test.js`
- [ ] `node --test cpanel/test/catalog-hierarchy.test.js`
- [ ] `cd cpanel && npm run build`



### Out-of-scope confirmation

- [ ] Storefront public serializer not modified in A+D PRs.
- [ ] Production not touched; no migrations applied.

---



## 14. Exit Criteria → Phase B

Phase A+D is done when:

1. PRs merged (or ready to merge) meeting §13.
2. Product owner / reviewer accepts basic-tab IA.
3. No open A+D defects blocking catalog editing.

Then prepare **Phase B Implementation/Audit Scope** (list, search, actions) — still no B coding until that scope is approved.

---



## 15. Recommended Immediate Next Action

After this document is approved:

1. Create a feature branch for Phase A+D.
2. Start **PR1** (basic pricing summary + section reorder) per §9–§10.
3. Follow with **PR2** (Attributes promotion) unless a single PR was chosen.

Until approval: **no application code changes for A+D.**