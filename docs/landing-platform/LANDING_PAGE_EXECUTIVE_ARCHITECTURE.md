# Landing Page Platform — Executive Architecture

**Baseline SHA:** `2440e6833a2efacb773eb51e19d58086e290f589` (`manager/develop`)
**Classification:** PLANNING ONLY
**Date:** 2026-09-22

---

## 1. Mission in one paragraph

Evolve the existing IMKAN / iGroup **CPanel + API** into a SaaS-style **Landing Page Platform** (Wix / Wix Studio conceptual model + Velvet Digital functional parity), without recreating companies/sites, without a big-bang rewrite, and without breaking live storefronts or Super Admin control.

---

## 2. Current architecture (as-built)

```text
User (global identity)
  └── company_memberships → Company (tenant boundary)
        ├── company_cpanel_modules
        ├── company_domains  (host → company)
        ├── company_settings (SEO, theme, websiteConnection, …)
        ├── commerce / CRM / content (company_id)
        └── company_sites (Phase 0 storefront identities)
              └── site_editor drafts (optional siteId)
```

| Surface | What it is today |
|---|---|
| **Platform Super Admin** | Companies, domains, overview; can enter company scope |
| **Tenant CPanel** | Company business dashboard (catalog, orders, CRM, marketing, settings) |
| **Sites** | `company_sites` list + Edit Site → site editor (`?siteId=`) |
| **Site editor** | Drafts only; **Publish disabled** |
| **Storefront** | Separate deployment; resolves via verified domain / company headers |

**Authoritative isolation key today:** `company_id` (almost everywhere). Sites are presentation identities; catalog/orders/CRM stay company-scoped (`api/docs/sites-foundation-phase0.md`).

---

## 3. Proposed target hierarchy (adapted, not blind Wix copy)

```text
Landing Page Platform
└── User Account
    └── Workspace (optional org layer — partners/agencies; additive)
        └── Company / Client          ← KEEP as canonical tenant SoT
            └── Site / Storefront     ← KEEP company_sites; first-class “My Sites”
                ├── Site Dashboard    ← today’s tenant CPanel (module-gated)
                └── Website Studio    ← evolve site editor (later phases)
```

### Why this model (vs alternatives)

| Option | Verdict |
|---|---|
| Replace Company with Workspace-only | **Reject** — would break tenancy, domains, RLS, memberships |
| Force every entity to `site_id` now | **Reject** — destroys shared catalog assumption for live tenants |
| Keep Company, add Workspace + Site UX | **Accept** — Wix-like My Sites/agency without re-homing data |
| Map Company 1:1 to Wix “Site” | **Reject** — companies already own multi-module businesses + may own multiple sites |

### Entity mapping (Wix → Landing Page)

| Wix concept | Landing Page target |
|---|---|
| Account | `users` |
| Workspace (Studio) | New `workspaces` (optional; phase-gated) |
| Site | `company_sites` (+ future publish/domain bind) |
| Site Dashboard | Tenant CPanel shell under site context |
| Studio Editor | Site editor → Website Studio roadmap |
| Collaborators | Extend memberships; later site-scoped invites |
| Premium plan | Future subscription on **Site** (or Company for multi-site packs) — see subscription doc |
| Apps / modules | Existing `company_cpanel_modules` + module groups |

---

## 4. Actor models

### A. Normal customer

Register/login → **My Sites** (workspace default) → Create / Manage / Edit Site → Site Dashboard → Studio.

**Single-site recommendation:** Always land on **My Sites** if any site exists; provide one-click “Open dashboard” on the primary card. Auto-skip My Sites only as a **user preference**, not hard default — agencies and future multi-site must not be trapped.

### B. Business

Same as customer, with commerce/CRM modules enabled on the company; team via memberships; multiple sites when product allows.

### C. Partner / Agency

Workspace owns many client companies (or many sites tagged as client projects); folders/tags; invite client; optional transfer/handoff; team seats at workspace level.

### D. Platform Super Admin (unchanged supremacy)

Remains **above** workspaces/companies/sites. Full visibility, suspend/reactivate, module overrides, domain inspect, ownership change (gated), audit, future subscription overrides. **Not replaced** by workspace admin.

---

## 5. Site Dashboard vs Website Studio (ownership split)

| Owns | Site Dashboard (Wix Dashboard analogue) | Website Studio (Wix Studio analogue) |
|---|---|---|
| Products, orders, inventory, delivery | Yes | No (may embed product *blocks* later) |
| Contacts, inbox, marketing ops | Yes | No |
| SEO site settings, analytics, staff | Yes | Page SEO / visual layout only |
| Pages tree, canvas, breakpoints, theme | Entry only | Yes |
| Publish / preview / versions | Orchestration UI | Authoritative draft→publish |

**Rule:** Do not put orders/products inside page JSON. Do not put canvas layout inside product rows.

---

## 6. Module system (reuse, don’t fork)

Reuse `cpanel_module_definitions` + `company_cpanel_modules` as **Source of Truth** for feature enablement.

Target module groups (logical, map to existing keys):

- `website` — sites, texts, media, CMS, multilingual, editor entry
- `commerce` — products, bundles, inventory, orders, delivery, discounts
- `crm` — contacts, inbox, forms, reviews
- `marketing` — banners, offers, SMS, announcements, splash
- `analytics` — insights family
- `settings` — staff, policies, legal, security, activity
- `dropshipping` — IMKAN-specific (opt-in)
- future: `cms`, `subscriptions`, `bookings`

Navigation = modules ∩ permissions ∩ role. Super Admin can override per company. Future subscriptions gate module packs **through the same tables**, not a parallel flag system.

---

## 7. Compatibility guarantees (architecture lock)

1. Existing `companies.id` remain primary keys.
2. Existing `company_sites.id` remain; lazy-backfilled defaults stay first-class sites.
3. `company_domains` continue resolving to `company_id` until an additive `site_id` column is dual-written and backfilled.
4. `websiteConnection.siteId` is **never rewritten** as a destructive migrate; alias/link only.
5. Catalog/orders/CRM remain company-scoped until an explicit multi-site commerce decision + migration.
6. No seed reset, no forced site recreation, no all-tenant cutover switch.
7. Feature flags / additive columns only; old CPanel entry paths remain until My Sites is proven.

---

## 8. What “done” looks like (executive)

Customers manage sites like Wix My Sites; partners manage clients in a workspace; Super Admin controls the platform; Site Dashboard runs current business features; Velvet capabilities are preserved or deliberately skipped; Website Studio can page/preview/publish safely; live sites never require recreation.

See `LANDING_PAGE_DEFINITION_OF_DONE.md` and `LANDING_PAGE_IMPLEMENTATION_ROADMAP.md`.
