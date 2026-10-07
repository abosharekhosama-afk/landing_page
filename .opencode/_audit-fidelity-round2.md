# Fidelity Round 2 — Route Audit (pre-implement)

Baseline: manager/develop @ a0feb6f
Branch/worktree: fix/live-cpanel-fidelity-round2
Path: C:/Users/jamal2000/AppData/Local/Temp/imkan-live-cpanel-fidelity-r2

## Shared root causes

1. **Self-wrapping AdminLayout on feature pages** (not double-nested with CPanelApp — CPanelApp does not wrap; each page owns shell). Special feel comes from page-specific CSS/classes, duplicate headers, and for Sites: `admin-sites-workspace` alternate sidebar theme.
2. **Inventory** `GET /admin/inventory` → `productRepository.getByCompany` full catalog map — in-memory only.
3. **Sites**: `AdminLayout` adds `admin-sites-workspace` when `activeKey === "admin-sites"` (light Studio sidebar). Likely navigation trap + theme inconsistency. Investigate overlays/z-index + moduleRegistry path remaps (`/admin/sites` → `admin-website-texts`).
4. **Activity Log Time=—**: UI uses `log.created_at`; API maps `created_at || createdAt`. Likely empty/missing field in persisted rows or DTO — trace store → API → normalizeActivityLogRow.
5. **Sidebar clipping**: `.admin-nav-button > span` + `small` Soon badges + scrollbar eating padding (global.css ~284–377).

## By route

| Route | Issue | Root cause hypothesis |
|-------|--------|----------------------|
| Sidebar global | clip labels/badges | nav CSS overflow/ellipsis/padding vs scrollbar |
| /admin/product-bundles | nested feel + edit form stretch | hideHeader OK; product-schema CSS + draft grid |
| /admin/inventory | full list load | getByCompany; KPIs from client rows |
| /admin/product-settings | nested + blank + permissions | shell CSS; schema+merch stacked; actions when forbidden |
| Sales overview | equal KPI cards | AdminSalesPage metrics layout |
| /admin/customers | table clip + shell | AdminContactsPage layout; already paginated |
| /admin/inbox | special page | AdminInboxPage shell/CSS |
| Email marketing | weak hierarchy | AdminMarketingPage |
| /admin/sites | nav trap + theme | admin-sites-workspace; registry remap |
| /admin/homepage-offers | stretched form | HomeContentManager / dashboard offers UI |
| /admin/dropshipping | KPI grid of zeros | AdminDropshippingPage |
| /admin/activity-log | filter padding; Time=— | ActivityLogWorkspace CSS; timestamp field |

## Implementation order
1. Shared: sidebar CSS + remove Sites special theme + Sites nav bug
2. Inventory DB pagination + KPI counts endpoint
3. Activity log timestamp + filter padding
4. Bundles form + Settings shell/permissions
5. Contacts table, Inbox shell consistency
6. Sales hierarchy, Email marketing, Homepage offers, Dropshipping layout
7. Velvet Digital settings inventory (additive settings only if no migration)

No migrations without approval. No merge/deploy/Production.
