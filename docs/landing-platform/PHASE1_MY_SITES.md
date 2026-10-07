# Phase 1 — My Sites (implemented)

**Status:** Implemented on the Phase 1 My Sites worktree — tests + docs complete.
**Migration:** none (code + docs only).
**Baseline:** Phase 0 architecture lock (`docs/landing-platform/PHASE0_ARCHITECTURE_LOCK.md`).

## Scope

Phase 1 delivers the **My Sites** foundation on top of the Phase 0 site-context
contract. It does **not** introduce a Studio builder, site-scoped domains, or
any new persistence.

### What changed

| Area | Change |
|---|---|
| `api/src/routes/sites.js` | Site list/get/create payloads now include `primaryDomain` — a read-only, company-scoped lookup (domain registry → company payload → `null`). Never invents a site-scoped domain. |
| `cpanel/src/utils/landingPlatform/featureFlags.js` | CPanel mirror of the Phase 0 flag contract (`landingPlatformEnabled`, `mySitesEnabled`, `siteContextEnabled`). Defaults **false**; company settings are the browser-side Source of Truth. |
| `cpanel/src/utils/landingPlatform/activeSiteSession.js` | In-memory active-site session: `setActiveSiteContext` / `getActiveSiteContext` / `clearActiveSiteContext` / `activateSiteContext` (explicit siteId only) / `syncSiteIdToUrl` (best-effort `?siteId=`). localStorage is never a Source of Truth. |
| `cpanel/src/utils/landingPlatform/landingPage.js` | `landingPageForUser` — flag-gated post-login landing. Flags on → tenant users who can access `admin-sites` land on My Sites. `super_admin` is never forced. Flags off → existing landing unchanged. |
| `cpanel/src/pages/AdminSitesPage.jsx` | My Sites UI: site cards, Manage Site (explicit site context → Site Dashboard), Edit Site (`/admin/site-editor?siteId=`), AR/EN labels when flagged. |
| `cpanel/src/CPanelApp.jsx`, `AdminLayout.jsx`, `companyContext.js`, `dashboard-shell.css` | Wiring: `landingPageForUser` on login, "My Sites / مواقعي" nav label override when flagged, My Sites shell styling. |

### Locked rules (unchanged from Phase 0)

1. Always require a valid `companyId` from existing tenant resolution.
2. Explicit `siteId` must belong to the company, else `SiteContextError`.
3. No `siteId` → **no auto-pick** for multi-site companies (`source: "none"`).
4. localStorage is never a Source of Truth.
5. Domains remain company-scoped — `primaryDomain` is a read-only lookup, never
   a site-scoped domain and never a host remap.
6. Existing company-scoped routes never require a site context.

## Tests

- `api/test/landing-platform-phase1-my-sites.test.js` — seeds companies with a
  `domain` so the registry resolves; asserts list/get/create include
  `primaryDomain`; cross-company isolation (own sites + own domain only, 404 on
  foreign site id).
- `cpanel/test/landing-platform-my-sites.test.js` — flag defaults; active-site
  session set/get/clear + `activateSiteContext` explicit source; multi-site
  no-auto-pick; `landingPageForUser` flag gating (off → unchanged, on →
  admin-sites for non-super-admin, super_admin never forced, no-access users
  not forced); file smoke for Manage Site / Edit Site siteId path / My Sites
  AR-EN labels.

## Run

```powershell
cd api
node --test test/landing-platform-phase0.test.js test/landing-platform-phase1-my-sites.test.js test/sites.test.js

cd cpanel
node --test test/landing-platform-site-context.test.js test/landing-platform-my-sites.test.js
npm.cmd run build:staging
```

## Rollout

My Sites is **off by default**. Enable per company via
`company.settings.landingPlatformFlags.mySitesEnabled` (or
`landingPlatformEnabled`). No migration is required.