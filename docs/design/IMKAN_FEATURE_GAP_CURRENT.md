# IMKAN Feature Gap — Current State (2026-09-19)

**Classification:** AUDIT / PLANNING ONLY  
**Supersedes counts in:** `docs/audits/IMKAN_COMPETITIVE_FEATURE_GAP_AUDIT_2026-09-16.md` (keep that file for historical Velvet/Wix evidence; use **this** file for status)  
**Code basis:** develop ancestry through `a7c8191` + fidelity branch `262f630`  
**Do not reuse** old matrix totals **25 / 10 / 33**.

---

## 1. Recalculated capability counts

Capability rows below (N = **72**). Status is **IMKAN**, not competitor.

| Status | Count |
|---|---|
| AVAILABLE | **34** |
| PARTIAL | **14** |
| MISSING | **16** |
| PLANNED | **5** |
| SKIP / NOT APPLICABLE | **3** |
| **Total** | **72** |

### Must-no-longer-be-missing (confirmed on develop)

| Capability | Was (2026-09-16) | Now |
|---|---|---|
| Sites Foundation (tenant `/admin/sites`) | PLANNED / unmerged | **AVAILABLE** |
| SEO Site Settings (company + storefront head) | MISSING | **AVAILABLE** |
| Technical SEO v2 (robots indexing, robots.txt, sitemap, canonical/OG) | MISSING | **AVAILABLE** |
| Homepage Offers / Banners campaign controls | PARTIAL | **AVAILABLE** |
| Product Bundles | MISSING/early | **AVAILABLE** |

---

## 2. Reference ownership reminder

| Surface | Reference |
|---|---|
| Platform + company business modules | **Wix Dashboard** |
| Sites workspace / site cards / site mgmt overview | **Wix Studio Workspace** |
| Visual editor / canvas / Add / Layers | **OUT OF SCOPE** (list only) |
| Multi-warehouse, barcode prep, pixels, merchandising ops | **Digital** capability inspiration only |

---

## 3. Capability matrix

Columns: Reference · Current route · Current problem · UI fidelity · Functional · Priority · Effort (wd) · Dependency

Effort = working days for a single mid-level full-stack engineer familiar with the repo (realistic).

### A. Platform

| Feature | Status | Reference | Current route | Current problem | UI fidelity | Functional | Priority | Effort | Dependency |
|---|---|---|---|---|---|---|---|---|---|
| Platform overview | AVAILABLE | Dashboard | `/admin/platform/overview` | Bilingual + Dashboard tokens; not live-measured | **PASS (Phase B)** | OK | P2 done | 1–2 | Shell tokens |
| Companies + memberships | AVAILABLE | Dashboard | `/admin/platform/companies` | Card footer + memberships table migrated to shared table system | **PASS (Phase B)** | OK | P1 done | 0.5 polish | — |
| Domains | AVAILABLE | Dashboard | `/admin/platform/domains` | Bilingual + shared admin-data-table | **PASS (Phase B)** | OK | P2 done | 1–2 | Shell |
| Platform Sites | PLACEHOLDER | Dashboard nav | coming-soon | Honest Soon kept; bilingual copy + Go to Companies CTA | N/A | PLACEHOLDER | P3 done | 0.5 honesty | Product decision |
| Platform settings/team/apps | PLACEHOLDER | Dashboard | coming-soon | Honest Soon | N/A | PLACEHOLDER | P4 | — | — |

### B. Catalog / Store

| Feature | Status | Reference | Current route | Current problem | UI fidelity | Functional | Priority | Effort | Dependency |
|---|---|---|---|---|---|---|---|---|---|
| Products | AVAILABLE | Dashboard | `/admin/products` | Table/filter fidelity | **PASS (Phase C)** | OK | P1 done | 3–5 | Shell |
| Bundles | AVAILABLE | Dashboard | `/admin/product-bundles` | New; UI pass | **PASS (Phase C)** | OK | P1 done | 2–3 | Shell |
| Categories | AVAILABLE | Dashboard | `/admin/categories` | UI pass | **PASS (Phase C)** | OK | P1 done | 2–3 | Shell |
| Brands | AVAILABLE | Dashboard | `/admin/brands` | UI pass | **PASS (Phase C)** | OK | P2 done | 1–2 | Shell |
| Inventory | AVAILABLE | Dashboard | `/admin/inventory` | UI + multi-warehouse gap | **PASS (Phase C)** | PARTIAL ops | P1 done | 3–4 UI | Warehouses separate |
| Product settings | AVAILABLE | Dashboard | `/admin/product-settings` | UI pass | **PASS (Phase C)** | OK | P2 done | 1–2 | Shell |
| Trash | AVAILABLE | Dashboard | `/admin/products/trash` | UI pass | **PASS (Phase C)** | OK | P2 done | 1 | Shell |
| Coupons | PARTIAL | Dashboard | placeholder path → real manager | **Soon badge dishonest** | **PASS (Phase C)** | OK API/UI | **P0 done** | 0.5 nav + 2 UI | Honesty fix |
| Automatic discounts | PARTIAL | Dashboard | placeholder → real manager | Soon dishonest | **PASS (Phase C)** | OK API/UI | **P0 done** | 0.5 + 2 | Honesty |
| Gift cards / booking services | PLACEHOLDER | Dashboard | coming-soon | — | N/A | PLACEHOLDER | P4 | — | — |
| Multi-warehouse stock | MISSING | Digital→Dashboard | — | No branches model | N/A | MISSING | P2 | 15–25 | Schema design |
| Wholesale B2B accounts | SKIP | Digital | — | Not core unless tenant needs | N/A | SKIP | — | — | — |

### C. Sales

| Feature | Status | Reference | Current route | Current problem | UI fidelity | Functional | Priority | Effort | Dependency |
|---|---|---|---|---|---|---|---|---|---|---|
| Orders | AVAILABLE | Dashboard | `/admin/orders` | UI + prep/barcode gaps | **PASS (Phase D)** | PARTIAL ops | P1 | 4–6 UI | Lifecycle epic |
| Delivery zones | AVAILABLE | Dashboard | `/admin/delivery` | UI pass | **PASS (Phase D)** | OK | P1 | 2–3 | Shell |
| Invoices | AVAILABLE | Dashboard | `/admin/invoices` | UI pass | **PASS (Phase D)** | PARTIAL | P2 | 2–3 | Payments |
| Order→inventory lifecycle | MISSING | Dashboard | — | Stock not fully driven by order flow | N/A | MISSING | P1 | 10–18 | Inventory model |
| Order prep / barcode | MISSING | Digital→Dashboard | — | — | N/A | MISSING | P2 | 12–20 | Orders |
| Abandoned carts | PLACEHOLDER | Dashboard | coming-soon | — | N/A | PLACEHOLDER | P3 | 8–12 | Cart events |
| Subscriptions | PLACEHOLDER | Dashboard | coming-soon | — | N/A | PLACEHOLDER | P4 | — | — |
| All payments / receipts | PLACEHOLDER | Dashboard | coming-soon | — | N/A | PLACEHOLDER | P2 | — | PSP |
| PSP / Getting Paid connect | MISSING | Dashboard | settings shells | No live capture | N/A | MISSING | P1 | 20–35 | Provider choice |

### D. CRM / Customers

| Feature | Status | Reference | Current route | Current problem | UI fidelity | Functional | Priority | Effort | Dependency |
|---|---|---|---|---|---|---|---|---|---|
| Contacts | AVAILABLE | Dashboard | `/admin/customers` | UI pass | **PASS (Phase E)** | OK | P1 | 3–5 | Shell |
| Inbox | AVAILABLE | Dashboard | `/admin/inbox` | UI pass | **PASS (Phase E)** | OK | P1 | 3–4 | Shell |
| Reviews | AVAILABLE | Dashboard | `/admin/reviews` | UI pass | **PASS (Phase E)** | OK | P2 | 2 | Shell |
| Staff / employees | AVAILABLE | Dashboard | `/admin/staff` | UI pass | **PASS (Phase E)** | PARTIAL logs | P2 | 2–3 | Shell |
| Forms + submissions | PARTIAL | Dashboard | `/admin/forms` | Storage/inbox incomplete | **PASS (Phase E)** | PARTIAL | P1 | 10–16 | Schema |
| Meetings / pipelines / community / loyalty | PARTIAL | Dashboard | respective routes | Thin shells | NEEDS_PASS | PARTIAL | P3 | 8–20 ea | Product scope |

### E. Growth / Marketing / Analytics / SEO

| Feature | Status | Reference | Current route | Current problem | UI fidelity | Functional | Priority | Effort | Dependency |
|---|---|---|---|---|---|---|---|---|---|
| Banners + campaign controls | AVAILABLE | Dashboard | `/admin/banners` | UI pass | **PASS (Phase F)** | OK | P2 | 2–3 | Shell |
| Homepage offers carousel | AVAILABLE | Dashboard | `/admin/homepage-offers` | UI pass | **PASS (Phase F)** | OK | P2 | 2 | Shell |
| Announcements / splash ads / SMS | AVAILABLE | Dashboard | respective | UI pass | **PASS (Phase F)** | OK | P2 | 2–4 ea | Shell |
| SEO site settings | AVAILABLE | Dashboard | SEO via marketing placeholder key | Nav honesty | **PASS (Phase F)** | OK | P0 nav | 0.5 + 2 UI | — |
| Technical SEO v2 | AVAILABLE | Dashboard | storefront robots/sitemap/OG | Nav discoverability | OK storefront | OK | P1 | 1 | — |
| Analytics highlights/traffic/etc. | PARTIAL | Dashboard | `/admin/analytics-*` | Some real ingest; some shells | **PASS (Phase F)** chrome | PARTIAL | P2 | 8–15 | Data quality |
| Session recordings / benchmarks | PARTIAL | Dashboard | analytics routes | Likely non-operational | **PASS (Phase F)** honest chrome | WEAK | P3 | — | Product |
| Email/Meta/Google ads channels | PLACEHOLDER | Dashboard | coming-soon | — | N/A | PLACEHOLDER | P4 | — | — |
| Tracking pixels / catalog feeds | MISSING | Digital→Dashboard | — | — | N/A | MISSING | P2 | 8–14 | Site settings |
| Merchandising rails beyond offers | PARTIAL | Digital→Dashboard | offers/banners | Age/gender rails etc. | NEEDS_PASS | PARTIAL | P3 | 10–18 | Catalog |

### F. Website (non-editor)

| Feature | Status | Reference | Current route | Current problem | UI fidelity | Functional | Priority | Effort | Dependency |
|---|---|---|---|---|---|---|---|---|---|
| Sites workspace | AVAILABLE | **Studio Workspace** | `/admin/sites` | Card height residual | **PASS (Phase H)** + **Phase I regression** | OK | P1 polish | 1 | — |
| Page text | AVAILABLE | Dashboard | `/admin/website-texts` | UI pass | **PASS (Phase F)** | OK | P2 | 2 | Shell |
| Media | AVAILABLE | Dashboard | `/admin/website-media` | UI pass | **PASS (Phase F)** | OK | P2 | 2–3 | Shell |
| CMS collections UI | PARTIAL | Dashboard | `/admin/website-content/cms` | Weak create | **PASS (Phase F)** chrome | PARTIAL | P2 | 10–16 | Model |
| Multilingual | PARTIAL | Dashboard | multilingual route | Thin | **PASS (Phase F)** chrome | PARTIAL | P3 | 6–10 | Company langs |
| Store locator | AVAILABLE | Dashboard | `/admin/store-locator` | UI pass | NEEDS_PASS | OK | P3 | 2 | Shell |
| Site & Mobile overview placeholders | PLACEHOLDER | Dashboard | coming-soon | Duplicate IA | N/A | PLACEHOLDER | P3 | honesty | IA cleanup |

### G. Settings / Ops / Developer

| Feature | Status | Reference | Current route | Current problem | UI fidelity | Functional | Priority | Effort | Dependency |
|---|---|---|---|---|---|---|---|---|---|
| Company settings | AVAILABLE | Dashboard | `/admin/settings` | Dense; UI pass | **PASS (Phase G)** | OK | P2 | 3–5 | Shell |
| Security / policies / legal | AVAILABLE | Dashboard | respective | UI pass | **PASS (Phase G)** | OK | P2 | 2–4 | Shell |
| Automations | PARTIAL | Dashboard | `/admin/automations` | Not real engine | **PASS (Phase G)** chrome | PARTIAL | P1 | 20–40 | Engine design |
| Getting Paid / tax / checkout / shipping settings | PARTIAL | Dashboard | `/admin/settings/*` | Mostly stubs | **PASS (Phase G)** chrome | PARTIAL | P1 | w/ PSP | Payments |
| Developer logs/monitoring/secrets | PARTIAL | Dashboard | developer routes | Thin / naming | **PASS (Phase G)** Site Logs rename | PARTIAL | P3 | 4–8 | — |
| Activity log | AVAILABLE | Dashboard | `/admin/activity-log` | UI pass | **PASS (Phase G)** | OK | P3 | 1–2 | Shell |
| Dropshipping suite | AVAILABLE | IMKAN-specific | `/admin/dropshipping*` | Outside Wix map | **PASS (Phase G)** | OK | P3 | 3–6 | — |

### H. Website Studio (list only — DO NOT IMPLEMENT NOW)

| Feature | Status | Reference | Current route | Current problem | UI fidelity | Functional | Priority | Effort | Dependency |
|---|---|---|---|---|---|---|---|---|---|
| Edit Site entry | AVAILABLE | Studio entry | `/admin/site-editor` | Entry OK | OUT OF SCOPE restyle only | Drafts only | — | — | — |
| Pages / versions | PLANNED | Studio | — | No page tree | OUT OF SCOPE | PLANNED | Studio epic | 25–40 | Sites |
| Builder / canvas / Add / Layers | PLANNED | Studio | editor | Out of scope | OUT OF SCOPE | PLANNED | Studio epic | 60–120 | Pages |
| Responsive editor breakpoints | PLANNED | Studio | — | — | OUT OF SCOPE | PLANNED | Studio | 15–25 | Canvas |
| Preview / Publish / Rollback | PLANNED | Studio | Publish disabled | — | OUT OF SCOPE | PLANNED | Studio | 15–30 | Pages + CDN |
| Theme / Navigation / Editorial CMS / Page SEO | PLANNED | Studio | — | — | OUT OF SCOPE | PLANNED | Studio | 20–40 | Pages |

### I. Digital-inspired ops (not Wix clones)

| Feature | Status | Reference | Notes | Priority | Effort |
|---|---|---|---|---|---|
| Store visibility modes | PARTIAL | Digital→Settings | Partial in settings | P2 | 3–5 |
| Carousel / campaign slots beyond banners | PARTIAL | Digital→Marketing | Offers/banners exist | P3 | 8–12 |
| Staff tickets (issue.list) | MISSING | Digital→Dashboard | — | P3 | 10–15 |
| SQL/PHP/htaccess admin | SKIP | Digital | Must not copy | — | — |

---

## 4. Remaining work buckets

### Effort note (revised 2026-09-19)

Do **not** multiply work by raw route count (170/166). Effort is by **page family** (see master plan).  
UI-only realistic: **~58 wd** (1-dev) · **~26 wd** calendar (3-dev) · **~21 wd** (4-dev).  
EN/AR/responsive are **in-phase**, not a late Phase I buildout. Phase I = regression only.  
Foundation includes a **bilingual table system** reused by Products/Orders/Contacts/Inventory/Companies/Domains/etc.

### A. UI / UX fidelity (existing features)

Bring AVAILABLE/PARTIAL screens to Dashboard/Studio visual + interaction quality without inventing features. Primary volume: catalog, sales, CRM, growth, settings, Sites polish.

### B. Functional completion

- Nav honesty (coupons, SEO, platform Sites)
- Order↔inventory lifecycle
- Payments / PSP
- Forms submissions
- Real automations
- Multi-warehouse
- Tracking pixels / feeds
- Order prep / barcode

### C. Website Studio (deferred)

Pages, builder, responsive editor, publish/rollback, theme, navigation, editorial CMS, page SEO — **explicitly out of current implementation scope**.

---

## 5. Relationship to route inventory

Route-level feature tags in `IMKAN_PAGE_BY_PAGE_AUDIT.md` count placeholders vs existing leaves.  
**This matrix is capability-oriented** (72 rows) and is the source for product planning counts.
