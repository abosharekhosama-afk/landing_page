# Landing Page Platform — Phase 0 Architecture Lock

**Status:** IMPLEMENTED (code + docs)
**Branch:** `feature/landing-page-phase0-architecture-lock`
**Baseline:** `manager/develop` @ `2440e6833a2efacb773eb51e19d58086e290f589`
**Date:** 2026-09-22
**Migration:** **NO database migration applied** (see confirmation below)

---

## 1. Canonical hierarchy (LOCKED)

```text
Platform → User → Workspace(FUTURE optional) → Company(TENANT SoT) → Site → Dashboard/Studio
```

| Level | Entity | Phase 0 status |
|---|---|---|
| Platform | `PLATFORM` | Exists (Super Admin, domain registry) |
| User | `USER` | Exists (`users`) |
| Workspace | `WORKSPACE` | **FUTURE optional** — NOT a DB table now |
| Company | `COMPANY` | **Canonical tenant Source of Truth** (`companies`) |
| Site | `SITE` | Exists (`company_sites`) — subordinate to Company |
| Dashboard / Studio | — | Site Dashboard = tenant CPanel (module-gated); Studio = future |

Encoded in code: `api/src/landingPlatform/entities.js` (frozen constants).

---

## 2. Company vs Workspace

- **Workspace does NOT replace Company.** Company remains the canonical tenant
  and commerce boundary.
- Workspace is an **additive, optional** org layer for partners/agencies
  (phase-gated, roadmap Phase 4). It is **not implemented as DB in Phase 0**.
- Never derive a tenant from a workspace alone; tenant always comes from
  existing company resolution.

---

## 3. Company vs Site ownership

| Owns | Company (tenant SoT) | Site (publishing identity) |
|---|---|---|
| Products, variants, categories, brands | ✅ | ❌ |
| Bundles, discounts, coupons | ✅ | ❌ |
| Inventory, orders, invoices, delivery zones | ✅ | ❌ |
| Contacts, inbox, reviews | ✅ | ❌ |
| Domains | ✅ (company-scoped) | ❌ (no site_id binding in Phase 0) |
| Modules / entitlements | ✅ | ❌ |
| Website texts / media / SEO | ✅ (shared company content default) | ❌ (site overrides deferred) |
| Pages, page versions, publish, theme, editor drafts, navigation | ❌ | ✅ (site concepts, future) |

- Commerce stays **company-scoped** — **NO site_id migration** in Phase 0.
- Site context is **subordinate** to company tenant context.
- Encoded in code: `api/src/landingPlatform/ownership.js`
  (`isCompanyScopedEntity`, `isSiteScopedConcept`, `COMMERCE_ENTITIES`).

---

## 4. Site-context contract

Shape (minimum):

```js
{
  companyId,          // required — from existing tenant resolution, never invented
  siteId,             // null when absent (compat)
  slug,               // null when absent
  name,               // null when absent
  status,             // null when absent
  primaryDomain,      // null if unknown; domains remain company-scoped
  membership,         // { role, permissions } or null
  modules,            // enabled module keys array or null
  source,             // 'explicit' | 'single-site' | 'none'
}
```

Rules:

1. Always require a valid `companyId` from existing tenant resolution — never
   invent a tenant from a site alone.
2. If `siteId` is provided: it must belong to that company; otherwise reject
   (throws `SiteContextError`).
3. If `siteId` is absent:
   - do **NOT** auto-pick when the company has **multiple** sites
     (`source: 'none'`, `siteId: null`)
   - if exactly **one** site and the caller opts in via
     `resolveMode: 'single-site-fallback'`, that site may be set with
     `source: 'single-site'`
   - default resolve mode for legacy APIs: leave site null (`source: 'none'`) —
     **legacy behavior unchanged**
4. Never use localStorage as Source of Truth. Pure functions only; Phase 1 may
   wire optional in-memory/session helpers on top.
5. Do not require a site on existing company-scoped routes.

Helpers (API + CPanel mirror, kept in sync):

- `normalizeSiteSummary(siteRow)`
- `buildSiteContext({ companyId, site, membership, modules, primaryDomain, source })`
- `resolveSiteContext({ companyId, siteId, sites, membership, modules, domains?, resolveMode })`
- `assertSiteBelongsToCompany(site, companyId)`
- `listAccessibleSitesForCompany(sites)` — identity; no cross-company leak

Files:

- `api/src/landingPlatform/siteContext.js`
- `cpanel/src/utils/landingPlatform/siteContext.js` (mirror)

Repository reuse: site rows come from the existing
`tenantCompanySiteRepository` (`api/src/data/store.js`) — the contract does
**not** duplicate the repository.

---

## 5. Compatibility rules

1. Legacy APIs work with `companyId` only — site context is optional and never
   required on existing company-scoped routes.
2. Missing site context → company behavior (`siteId: null`, `source: 'none'`).
3. Multi-site + no `siteId` → **no silent site selection**.
4. Storefront/domain resolution is **unchanged** — `middleware/company.js`
   domain logic is intentionally untouched (zero changes).
5. Commerce stays company-scoped; no `site_id` migration.
6. Dual site identity (`websiteConnection.siteId` vs `company_sites.id`) is
   preserved, never destructively rewritten.

Encoded in code: `api/src/landingPlatform/compatibility.js`.

---

## 6. Feature flags

Flags (default **false** for rollout; existing tenants keep current UX):

- `landingPlatformEnabled`
- `mySitesEnabled`
- `siteContextEnabled`

Resolution order (per flag):

1. `company.settings.landingPlatformFlags[flag]` (boolean, if object exists)
2. `process.env.LANDING_PLATFORM_<FLAG>` (`true` / `1`)
3. default `false`

Env var names (camelCase → SCREAMING_SNAKE_CASE):

| Flag | Env var |
|---|---|
| `landingPlatformEnabled` | `LANDING_PLATFORM_LANDING_PLATFORM_ENABLED` |
| `mySitesEnabled` | `LANDING_PLATFORM_MY_SITES_ENABLED` |
| `siteContextEnabled` | `LANDING_PLATFORM_SITE_CONTEXT_ENABLED` |

This is the **only** landing-platform flag source — do not invent a second
config platform. Phase 0 is **prep only**: AdminLayout/nav are NOT changed
based on flags.

Encoded in code: `api/src/landingPlatform/featureFlags.js`.

---

## 7. Auth rules

- `isPlatformSuperAdmin(user)` — uses existing `globalRole`/`role` patterns
  from `middleware/auth.js` / `auth/roles.js`.
- `canAccessCompany(user, companyId, membership)` — active membership for that
  company, or Super Admin (full access when scoped).
- `canAccessSite({ user, companyId, site, membership })` — company access +
  site belongs to that company.
- Super Admin retains full access (same as today when scoped).
- Workspace/partner roles are **not** implemented in Phase 0.

Encoded in code: `api/src/landingPlatform/access.js`.

---

## 8. What Phase 1 (My Sites) may rely on

- `api/src/landingPlatform/index.js` barrel as the single import surface.
- `resolveSiteContext` / `buildSiteContext` / `normalizeSiteSummary` for site
  context; `tenantCompanySiteRepository` for site rows.
- `getLandingPlatformFlags` for rollout gating (defaults off).
- `canAccessCompany` / `canAccessSite` / `isPlatformSuperAdmin` for access.
- `isCompanyScopedEntity` / `isSiteScopedConcept` / `COMMERCE_ENTITIES` for
  ownership decisions.

## What Phase 1 MUST NOT change

- Must NOT migrate commerce to `site_id`.
- Must NOT rewrite `websiteConnection.siteId`.
- Must NOT change storefront/domain resolution behavior.
- Must NOT require a site on existing company-scoped routes.
- Must NOT invent a tenant from a site alone.
- Must NOT auto-pick a site for multi-site companies.
- Must NOT use localStorage as Source of Truth for site context.
- Must NOT add a second feature-flag system.

---

## 9. Known risks / deferred decisions

| Risk / decision | Status |
|---|---|
| Domains company-scoped vs site-scoped | Deferred — additive `site_id` binding must be designed + proven on staging first |
| Dual site identity (`websiteConnection.siteId` vs `company_sites.id`) | Preserved; alias/link only, never destructive rewrite |
| Most content/commerce company-scoped | Locked company-scoped for Phase 0/1 |
| No feature-flag system existed | Added small reusable one (`featureFlags.js`) — no competing system |
| Workspace org layer | Deferred (roadmap Phase 4); additive tables only |
| Site-scoped collaborators/seats | Deferred; additive on top of company memberships |
| Per-site content overrides (texts/media/SEO) | Deferred; shared company content is the default |
| Publish engine / Studio canvas | Deferred (roadmap Phase 6–7) |
| Subscription entitlements | Deferred (roadmap Phase 5) |

---

## 10. Confirmation: NO migration applied

- **No database migration was created or applied.**
- No SQL was written.
- No migration files (including `036`) were touched.
- No seed reset, no forced site recreation, no tenant cutover switch.
- If a future phase requires a migration, it must follow
  `LANDING_PAGE_MIGRATION_SAFETY_PLAN.md` (additive, idempotent, reversible,
  staging-validated, explicit approval gate).

---

## 11. Files delivered by Phase 0

API (new):

- `api/src/landingPlatform/entities.js`
- `api/src/landingPlatform/ownership.js`
- `api/src/landingPlatform/siteContext.js`
- `api/src/landingPlatform/featureFlags.js`
- `api/src/landingPlatform/access.js`
- `api/src/landingPlatform/compatibility.js`
- `api/src/landingPlatform/index.js`

CPanel (new):

- `cpanel/src/utils/landingPlatform/siteContext.js`

Tests (new):

- `api/test/landing-platform-phase0.test.js`
- `cpanel/test/landing-platform-site-context.test.js`

Docs (new/updated):

- `docs/landing-platform/PHASE0_ARCHITECTURE_LOCK.md` (this file)
- `docs/landing-platform/README.md` (link added)