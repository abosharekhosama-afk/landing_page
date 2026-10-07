# Landing Page — Team Execution Plan

**Goal:** Parallelize safely across backend, frontend, Studio, QA, migration tracks.

---

## 1. Ownership lanes (avoid file collisions)

| Lane | Primary owners | Hot files (minimize shared edits) |
|---|---|---|
| **Platform / tenancy API** | Backend A | `api/src/routes/platform.js`, `tenancy/*`, new workspace/sites list APIs |
| **Site Dashboard UI** | Frontend A | Page managers under `cpanel/src/pages/Admin*` (feature folders) |
| **Shell / My Sites UI** | Frontend B | Prefer new `MySites*` pages; coordinate `AdminLayout` / `adminNavigation` via short integration windows |
| **Modules / permissions** | Backend B + Frontend B | `moduleRegistry.js` (API+cpanel) — **serialize** changes |
| **Website Studio** | Studio track | `site-editor/*`, `siteEditor` routes — isolated until Phase 6+ |
| **Storefront / Velvet parity** | SF track | Separate storefront repo / public APIs only |
| **QA / E2E** | QA | Playwright; no production |
| **Migration / data** | Data engineer | Additive SQL; staging-only apply until approved |

---

## 2. Per-phase track matrix

### Phase 0 — Architecture lock

| Track | Work |
|---|---|
| Backend | None required (docs + honesty flags only) |
| Frontend | Nav honesty for coupons/SEO |
| Studio | Idle |
| QA | Regression on affected nav routes |
| Migration | None |

### Phase 1 — My Sites

| Track | Work |
|---|---|
| Backend | `GET /me/sites`, optional workspace backfill |
| Frontend | My Sites UI (WS reference) |
| Studio | Idle |
| QA | Multi-actor login journeys |
| Migration | Idempotent workspace backfill on staging |

### Phase 2 — Site context

| Track | Work |
|---|---|
| Backend | Site context middleware helpers |
| Frontend | Shell site switcher; deep-link preservation |
| Studio | Accept `siteId` consistently |
| QA | Switch site → dashboard → refresh/relogin |
| Migration | None destructive |

### Phase 4 — Workspace / agency

| Track | Work |
|---|---|
| Backend | Workspace CRUD + ACLs |
| Frontend | Workspace switcher, folders |
| Studio | Idle |
| QA | Partner multi-client journeys |
| Migration | Attach companies to workspaces |

### Phase 6 — Pages / publish

| Track | Work |
|---|---|
| Backend | Pages/versions APIs; publish transaction |
| Frontend | Pages manager in Dashboard entry |
| Studio | Preview/publish bar |
| QA | Draft≠live; rollback |
| Migration | Import manifest pages carefully |

---

## 3. Merge order rules

1. Schema/API land before UI that requires them.
2. Feature flags default **off** for new entry points until staging PASS.
3. One PR owns `AdminLayout` / navigation per week.
4. Studio PRs must not change commerce schemas.
5. No Production migration in the same PR as speculative UI.

---

## 4. Communication artifacts

- Spec Kit `spec.md` / `plan.md` / `tasks.md` per phase feature.
- Update this folder’s matrices when status changes.
- Staging evidence required before “done”.
