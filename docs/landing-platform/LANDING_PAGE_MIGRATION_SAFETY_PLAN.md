# Landing Page — Migration Safety Plan

**Non-negotiable:** Existing live sites must not break. No big bang. No seed reset. No forced recreation.

---

## 1. Compatibility contract (every phase)

| Guarantee | Mechanism |
|---|---|
| Company IDs stable | No PK rewrite; no delete/recreate |
| Site IDs stable | Keep `company_sites.id`; backfill only when empty |
| Domains keep mapping | Additive columns; dual-read; verify before dual-write cutover |
| Storefront/API keep working | Public routes unchanged; feature flags for new paths |
| Super Admin retains control | Platform routes preserved |
| Memberships valid | Additive roles; no mass revoke |
| Products/orders/content untouched | No truncate; no tenant switch requiring re-import |
| Dual site identity safe | Never destructively rewrite `websiteConnection` |

---

## 2. Phase template (required fields)

For each implementation phase document:

1. DB changes (additive preferred)
2. API changes (+ compatibility layer)
3. CPanel / Landing Page changes
4. Compatibility layer / feature flags
5. Migration / backfill (idempotent, reversible)
6. Rollback strategy
7. Staging validation checklist
8. Production risk + explicit approval gate

---

## 3. Example: Phase 1 My Sites (illustrative)

| Area | Approach |
|---|---|
| DB | Optional `workspaces`, `workspace_memberships`; link companies via nullable `workspace_id` |
| API | `GET /api/me/sites` aggregating memberships → companies → `company_sites`; old company APIs unchanged |
| UI | New My Sites entry after login; existing `/admin/dashboard` deep links still work |
| Backfill | Personal workspace per user; attach existing company memberships |
| Rollback | Feature flag off → old login landing; tables remain inert |
| Staging | Login as Super Admin + company_admin + staff; open each existing site; storefront curl by domain |
| Prod risk | Medium (auth routing) — requires approval |

---

## 4. Highest-risk migrations (defer until designed)

1. Domain `site_id` binding cutover
2. Splitting company content to per-site
3. Enabling publish that writes live storefront
4. Ownership transfer across companies
5. Any rewrite of `websiteConnection.siteId`

---

## 5. Forbidden actions

- `TRUNCATE` / drop tenant tables
- Seed reset on shared staging without snapshot
- Production migration without explicit approval
- Single switch that migrates all tenants at once to a new schema without dual-run
- Recreating sites to “clean” IDs

---

## 6. Validation always includes

- Existing company can open CPanel and list sites
- Storefront domain still resolves (`is_active` + `is_verified`)
- Products/orders counts unchanged pre/post
- Super Admin company switch still works
- Editor draft load with `?siteId=` still works
- `git diff --check` + targeted tests + `build:staging` on clean worktree when shipping UI
