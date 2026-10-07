# TASK: Global CPanel Create/Edit/Settings layout fix

Branch: `fix/global-cpanel-form-layouts`
Baseline: `c109a85587370a6b96f08e4e7db0535128d122fc`
Worktree ONLY: this directory (repo root for `--dir`)

## Constraints
- Do NOT merge, deploy, touch Production, or run migrations.
- Do NOT change business logic unless required for a proven UI state bug.
- Preserve: tenant isolation, permissions, Inventory pagination/valuation, Contacts totals, Activity Log timestamps, Sites nav, Employees filters, Sales metrics, Bundles persistence, no Be Vietnam Pro.
- Website Studio editor/canvas OUT OF SCOPE.
- No random per-page CSS patches — fix SHARED root causes first.
- Do NOT invent new settings.

## Proven root causes (audit)
1. `.admin-form` is 2-col CSS grid with default `align-items: stretch`. Tall fieldset + KPI summary as siblings → summary stretches full height, form compressed. Worst: Product Bundles Create/Edit.
2. Global `input, textarea { width:100%; min-height:46px }` applies to checkboxes → oversized controls. Incomplete page-scoped overrides in dashboard-shell.
3. `.admin-form-grid` has no base `display:grid` foundation — Homepage Offers / settings forms rely on incomplete contract.
4. Nested AdminLayout is NOT the Bundles bug (pages self-wrap once). Keep single shell; do not unwrap AdminLayout incorrectly.

## Required shared foundation (small, no rewrite)
In `cpanel/src/styles/global.css` (and thin polish in `dashboard-shell.css` if needed):

```css
.admin-stack-form { /* single column create/edit; align-items: start; width 100% */ }
.admin-stack-form > * { /* full width / grid-column 1 / -1 */ }
.admin-form-grid { /* display:grid; 2-col; align-items:start; gap; logical props */ }
.admin-kpi-summary, .product-schema-summary { align-items: start; }
.admin-kpi-summary > *, .product-schema-summary > * { height: auto; align-self: start; }

.admin-studio-shell input[type="checkbox"],
.admin-studio-shell input[type="radio"] {
  width: auto; min-width: 16px; width/height ~16px; min-height: 16px; padding: 0;
}
```

Replace page-scoped bundles/settings checkbox band-aids with the shared reset.

## Markup retargets (P0)
1. `AdminProductBundlesPage.jsx` — Create/Edit form → `admin-stack-form`; summary compact; Basic Details / Pricing / Components / Summary clear; one shell; normal checkboxes; no overflow; EN/AR logical props.
2. `AdminProductSettingsPage.jsx` — one coherent shell; merch + schema not “page in page”; stack forms; forbidden state still hides Save/Discard; normal controls; no huge empty space.
3. `HomeContentManager.jsx` — group EN/AR; usable description/media; list vs create separated; max-width; action bar; rely on real `.admin-form-grid`.

## Also fix via shared CSS (P1, no business logic)
- Delivery dialog checkboxes
- Employees/Categories/Brands checkbox sizing (keep 2-col paired fields where intentional)
- Settings pages using `admin-form-grid`

## Do NOT retarget
- Product wizard (`product-wizard-form`) intentional layout
- Contacts modal (`crm-contact-form-grid`)
- Site editor / Sites canvas
- Storefront CSS

## Responsive
1440 / laptop / 820 / 390 — tablet collapses columns; mobile one-column; no horizontal page scroll; summary compact.

## RTL
Use logical properties (`margin-inline`, `padding-inline`, `inset-inline`, `text-align: start`) where practical.

## Tests
Add/update:
- Bundle Create/Edit one Admin shell; summary not stretch structure; stack-form class present
- Product Settings one shell/header; forbidden hides mutation actions
- No duplicate AdminLayout on affected routes
- Shell/navigation preserved

Run: bundles, catalog, settings, shell/nav, relevant CRM/website for touched files, inventory, products regressions, `npm run build:staging`, `git diff --check`.

## Commit
Commit on this branch with a clear message. Do NOT push unless asked (parent will push).
Do NOT merge.

## Return to parent
Files changed, tests results, build JS/CSS names, remaining affected pages, SAFE TO REVIEW yes/no.
