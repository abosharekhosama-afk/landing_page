# Landing Page Platform — Master Planning Package

**Mode:** PLANNING + PHASE 0 ARCHITECTURE LOCK
**Baseline:** `manager/develop` @ `2440e6833a2efacb773eb51e19d58086e290f589`
**Created:** 2026-09-22
**Status:** Phase 0 architecture lock implemented on `feature/landing-page-phase0-architecture-lock` — My Sites / Studio still require approval

## Non-negotiables

- Do **not** implement, merge, deploy, or run migrations from this package alone.
- Do **not** touch Production.
- Existing company IDs, site IDs, domains, memberships, products, orders, and live storefronts must remain valid through every phase.
- Incremental, backward-compatible evolution of the **same** CPanel + API platform (not a separate frontend rewrite).

## Deliverables

| # | Document |
|---|---|
| 0 | [PHASE0_ARCHITECTURE_LOCK.md](./PHASE0_ARCHITECTURE_LOCK.md) — **ratified architecture lock (implemented)** |
| 1 | [LANDING_PAGE_EXECUTIVE_ARCHITECTURE.md](./LANDING_PAGE_EXECUTIVE_ARCHITECTURE.md) |
| 2 | [LANDING_PAGE_CURRENT_CAPABILITY_MATRIX.md](./LANDING_PAGE_CURRENT_CAPABILITY_MATRIX.md) |
| 3 | [LANDING_PAGE_WIX_WIX_STUDIO_RESEARCH.md](./LANDING_PAGE_WIX_WIX_STUDIO_RESEARCH.md) |
| 4 | [LANDING_PAGE_WIX_DESIGN_SPEC.md](./LANDING_PAGE_WIX_DESIGN_SPEC.md) |
| 5 | [LANDING_PAGE_WIX_FIDELITY_MATRIX.md](./LANDING_PAGE_WIX_FIDELITY_MATRIX.md) |
| 6 | [VELVET_DIGITAL_FEATURE_INVENTORY.md](./VELVET_DIGITAL_FEATURE_INVENTORY.md) |
| 7 | [LANDING_PAGE_MASTER_GAP_MATRIX.md](./LANDING_PAGE_MASTER_GAP_MATRIX.md) |
| 8 | [LANDING_PAGE_DATA_OWNERSHIP_MODEL.md](./LANDING_PAGE_DATA_OWNERSHIP_MODEL.md) |
| 9 | [LANDING_PAGE_PERMISSIONS_MODEL.md](./LANDING_PAGE_PERMISSIONS_MODEL.md) |
| 10 | [LANDING_PAGE_SUBSCRIPTION_READINESS.md](./LANDING_PAGE_SUBSCRIPTION_READINESS.md) |
| 11 | [LANDING_PAGE_MIGRATION_SAFETY_PLAN.md](./LANDING_PAGE_MIGRATION_SAFETY_PLAN.md) |
| 12 | [LANDING_PAGE_IMPLEMENTATION_ROADMAP.md](./LANDING_PAGE_IMPLEMENTATION_ROADMAP.md) |
| 13 | [LANDING_PAGE_TEAM_EXECUTION_PLAN.md](./LANDING_PAGE_TEAM_EXECUTION_PLAN.md) |
| 14 | [LANDING_PAGE_DEFINITION_OF_DONE.md](./LANDING_PAGE_DEFINITION_OF_DONE.md) |
| 15 | [PHASE1_MY_SITES.md](./PHASE1_MY_SITES.md) — **Phase 1 My Sites (implemented)** |
| 16 | [PHASE2_SITE_DASHBOARD.md](./PHASE2_SITE_DASHBOARD.md) — **Phase 2 Site Dashboard (implemented)** |

## Related prior work (reuse, do not discard)

- `docs/design/IMKAN_WIX_MASTER_FIDELITY_PLAN.md`
- `docs/design/IMKAN_FEATURE_GAP_CURRENT.md`
- `docs/design/IMKAN_PAGE_BY_PAGE_AUDIT.md`
- `docs/audits/IMKAN_COMPETITIVE_FEATURE_GAP_AUDIT_2026-09-16.md` (Velvet/Wix live evidence)
- `api/docs/sites-foundation-phase0.md`
- `.specify/memory/constitution.md`

## First implementation gate (after approval)

1. Ratify hierarchy + compatibility rules (Phase 0).
2. Open branch: `feature/landing-page-phase0-architecture-lock` from latest `manager/develop`.
3. Spec Kit: smallest feature spec for Account / My Sites foundation only — not Studio builder.

## Phase 0 architecture lock (implemented)

The canonical hierarchy, ownership rules, site-context contract, feature flags,
auth rules, and compatibility guarantees are now **locked in code + docs**:

- **Lock doc:** [PHASE0_ARCHITECTURE_LOCK.md](./PHASE0_ARCHITECTURE_LOCK.md)
- **API source of truth:** `api/src/landingPlatform/` (barrel: `index.js`)
- **CPanel mirror:** `cpanel/src/utils/landingPlatform/siteContext.js`
- **Tests:** `api/test/landing-platform-phase0.test.js`,
  `cpanel/test/landing-platform-site-context.test.js`
- **Migration:** none applied (Phase 0 is code + docs only)

Phase 1 (My Sites) must import from the `api/src/landingPlatform/index.js`
barrel and must NOT change the locked rules above.

## Phase 1 My Sites (implemented)

My Sites is implemented on top of the Phase 0 contract — flag-gated, no
migration, no site-scoped domains. See
[PHASE1_MY_SITES.md](./PHASE1_MY_SITES.md) for scope, locked rules, tests, and
rollout.

## Phase 2 Site Dashboard (implemented)

The selected-site experience is implemented on top of the Phase 1 My Sites
foundation — a Wix-like site header strip (identity + Back to My Sites +
switcher) with a sessionStorage restore hint that is always revalidated through
`resolveSiteContext` (never a Source of Truth, never auto-picks). See
[PHASE2_SITE_DASHBOARD.md](./PHASE2_SITE_DASHBOARD.md) for scope, locked rules,
tests, and rollout.
