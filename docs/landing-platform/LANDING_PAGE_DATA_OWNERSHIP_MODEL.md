# Landing Page — Data Ownership Model

**Baseline:** `2440e6833a2efacb773eb51e19d58086e290f589`
**Rule:** One fact → one canonical SoT. Do not force everything to `site_id`.

---

## 1. Target ownership matrix

| Entity | Current scope | Target scope | Migration needed? | Backward compatible? | Risk |
|---|---|---|---|---|---|
| User account | Platform (`users`) | Platform | No | Yes | Low |
| Workspace | N/A | Platform/org (new) | Additive tables | Yes if optional | Medium (agency UX) |
| Company | Platform tenant | **Canonical tenant** | No re-key | **Must keep IDs** | Critical if changed |
| Membership | Company | Company (+ optional workspace membership) | Additive | Yes | Medium |
| Site | Company (`company_sites`) | Company → Site | Soft enrich only | Yes (Phase 0 exists) | High if ID rewrite |
| Domain | Company | Company + optional `site_id` | Additive column + backfill | Dual-read | **High** (live DNS) |
| Modules | Company | Company (entitlements may layer) | No fork | Yes | Medium |
| Products / variants | Company | Company (v1); optional site assortment later | Defer site split | Yes | Critical if premature |
| Categories / brands | Company | Company | No | Yes | Low |
| Bundles / discounts / coupons | Company | Company | No | Yes | Low |
| Inventory | Company | Company; warehouses later | Additive warehouses | Yes | High if half-migrated |
| Orders / invoices | Company | Company | No | Yes | Critical |
| Delivery zones | Company | Company | No | Yes | Low |
| Contacts / inbox | Company | Company | No | Yes | Low |
| Reviews | Company | Company | No | Yes | Low |
| Media / website texts | Company | Company → eventually site where multi-site | Later dual-write | Must not break single-site | **High** |
| SEO settings | Company | Company then site overrides | Additive | Yes | Medium |
| Homepage offers / banners | Company | Company / site campaigns later | Later | Yes | Medium |
| Analytics events | Company + soft `site_id` | Company + FK `site_id` | Backfill/normalize | Yes | Medium |
| Site editor drafts | Company + site | Site | Already site-capable | Yes | Medium |
| Page documents | Manifest / none | Site (`company_pages`) | New additive | Yes if drafts≠live | **High** if dual SoT |
| Publish versions | N/A | Site | New | N/A | High |
| Theme / global styles | Settings / editor | Site | Evolve | Yes | Medium |
| Subscription | N/A | Site (default) or Company pack | New | N/A | Medium |
| Activity log | Company | Company (+ site attr) | Optional | Yes | Low |

---

## 2. Hard decisions (locked for Phase 0)

1. **Company remains the isolation and commerce boundary** for existing tenants.
2. **Site is the website/publishing identity** (and future subscription anchor).
3. **Do not migrate products to site_id** in early phases.
4. **Domains stay company-scoped** until dual-written `site_id` is proven on staging.
5. **Never rewrite** `websiteConnection` destructively; alias `company_sites.id` ↔ legacy siteId.
6. Page JSON is presentation only — never the SoT for catalog/orders.

---

## 3. Multi-site content strategy (when a second site is created)

| Mode | Behavior | When |
|---|---|---|
| **Shared company content (default)** | New site reuses company texts/media/SEO until overrides exist | Existing EB Chemical / iCare / Velvet |
| **Site overrides (later)** | Per-site settings overlay company defaults | When product needs distinct brand sites |
| **Isolated catalog (explicit opt-in)** | Rare; separate company preferred over site-split catalog | Avoid unless mandated |

Default protects live sites: creating Site B must not blank or fork Site A’s catalog.
