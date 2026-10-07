# Phase 2 — Site Dashboard (implemented)

**Status:** Implemented on the Phase 2 Site Dashboard worktree — tests + docs complete.
**Migration:** none (code + docs only).
**Baseline:** Phase 1 My Sites (`docs/landing-platform/PHASE1_MY_SITES.md`).

## Scope

Phase 2 formalizes the selected-site experience after My Sites: the user
clearly enters and manages **ONE site** through a Wix-like Site Dashboard shell,
using the Phase 0 site-context contract. It does **not** introduce a Studio
builder, site-scoped domains, Workspace, subscriptions, Pages/Publish, or any
new persistence.

### What changed

| Area | Change |
|---|---|
| `cpanel/src/utils/landingPlatform/activeSiteSession.js` | Extended with a **sessionStorage restore hint only** (NOT Source of Truth): `persistActiveSiteHint` / `readActiveSiteHint` / `clearActiveSiteHint(companyId?)` / `readSiteIdFromUrl` / `restoreActiveSiteContext`. `activateSiteContext` now also persists the minimal `{ companyId, siteId }` hint. Every restore revalidates through `resolveSiteContext` with an explicit siteId + the current company sites and fails safe (clears memory + hint, returns null) on invalid/stale/cross-company values. |
| `cpanel/src/components/SiteContextBar.jsx` | New additive Wix-like strip under the topnav: site identity (name + status badge, real data only), **Back to My Sites** (`onNavigate("admin-sites")`, EN/AR), and a safe site switcher listing only the current company's sites. Soft "Pick a site to manage" prompt on the Dashboard when flags are on but no site is selected (never auto-picks; Super Admin never prompted). |
| `cpanel/src/components/AdminLayout.jsx` | Renders `SiteContextBar` when `siteContextEnabled` (any landing-platform flag on) or a site context is active. New optional props (`siteContext`, `companySites`, `onBackToMySites`, `onSwitchSite`, `siteContextEnabled`) — defaults keep the shell unchanged (backward compatible). |
| `cpanel/src/CPanelApp.jsx` | Wiring: restores context on tenant session load / company change (after sites available, flag-gated, Super Admin skipped); clears context + hint on company switch, logout, 401, and return to Super Admin platform overview; `handleSwitchSite` (explicit siteId only, syncs URL, keeps current page); `navigate` preserves `?siteId=` across dashboard navigations (best-effort, never overrides an explicit path siteId). |
| `cpanel/src/styles/dashboard-shell.css` | Site context strip styles (light + dark). |
| `docs/landing-platform/PHASE2_SITE_DASHBOARD.md` | This document. |

### Locked rules (unchanged from Phase 0/1)

1. Company remains the tenant Source of Truth — never invent a tenant from a
   site alone.
2. Commerce stays company-scoped — no `site_id` on commerce.
3. Domains are not remapped; storefront behavior and
   `middleware/company.js` domain logic are untouched.
4. Multi-site companies are **never** silently auto-picked
   (`resolveMode: "none"` unless the caller explicitly opts into
   single-site-fallback for legacy single-site only).
5. localStorage is **never** Source of Truth for site context — the
   sessionStorage hint is a convenience only and is always revalidated.
6. Super Admin platform overview flow is unchanged (never forced into My
   Sites / never forced into a site).
7. Existing company-scoped admin routes keep working without requiring a site.
8. No Workspace, subscriptions, Studio redesign, Pages/Publish.
9. Company/site IDs are never changed.

## Persistence model (SAFE)

- In-memory session stays the live session (`get/set/clear/activate`).
- `sessionStorage` key `landingPlatform.activeSiteHint.v1` stores the minimal
  `{ companyId, siteId }` on activate/switch.
- Restore reads the hint OR the URL `?siteId=` (URL wins after revalidation),
  then calls `resolveSiteContext` with an **explicit siteId** + the current
  company sites. Only accepted when the companyId matches and the site belongs
  to the company.
- Invalid / stale / cross-company → clear memory + clear hint + return null
  (fail safe). Never invents a site.
- Company switch / logout → clear memory + clear that company's hint.

## Flags

Reuses the Phase 0/1 flags. Shell chrome is gated with
`siteContextEnabled || mySitesEnabled || landingPlatformEnabled`. Defaults
remain **false**. Super Admin is never forced into site context.

## Tests

- `cpanel/test/landing-platform-phase2-site-dashboard.test.js` — restore from
  hint + URL revalidation via `resolveSiteContext`; reject cross-company /
  stale siteId (clears); multi-site no auto-pick; single-site legacy
  (`resolveMode: "none"` leaves null without explicit id); activate + switch
  updates memory + hint; clear on company mismatch; URL sync; file smoke for
  AdminLayout site identity / My Sites back / switcher when wired.
- Phase 0/1 tests stay green (`landing-platform-site-context.test.js`,
  `landing-platform-my-sites.test.js`).

## Run

```powershell
cd api
node --test test/landing-platform-phase0.test.js test/landing-platform-phase1-my-sites.test.js test/sites.test.js

cd cpanel
node --test test/landing-platform-site-context.test.js test/landing-platform-my-sites.test.js test/landing-platform-phase2-site-dashboard.test.js
npm.cmd run build:staging
```

## Rollout

Site Dashboard chrome is **off by default**. Enable per company via
`company.settings.landingPlatformFlags.siteContextEnabled` (or
`mySitesEnabled` / `landingPlatformEnabled`). No migration is required.