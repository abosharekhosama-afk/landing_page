# Landing Page — Master Gap Matrix

**Baseline:** `2440e6833a2efacb773eb51e19d58086e290f589`
**Compare:** Current · Velvet Digital · Wix Dashboard · Wix Studio · Target LPP

Priority: P0 blockers · P1 platform foundation · P2 parity · P3 polish · SKIP

---

## Selected high-impact rows

| Capability | Current | Velvet | Wix Dash | Wix Studio | Target | Gap | Data | API | UI | Migration? | Risk | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| My Sites / account sites home | Missing | N/A (module CMS) | Sites list | Workspace Sites | Account My Sites | Large | Workspace/site list APIs | New | New | Additive | Med | **P0** |
| Workspace / agency | Missing | N/A | Limited | Strong | Optional workspace | Large | New tables | New | New | Additive | Med | P1 |
| Company tenant | Strong | Store = tenant | Site≈business | Workspace>sites | Keep company | — | — | — | — | No | Crit if changed | LOCK |
| Sites foundation | Available | Pages list ≠ sites | — | Sites cards | First-class sites | Polish + lifecycle | Enrich status | Extend | Fidelity | Soft | Med | P1 |
| Site Dashboard shell | Strong Wix-shaped | Digital `?app=` | Full | Entry only | Keep + site context | Site switcher | Context | Context headers | IA | Soft | Med | **P0** |
| Modules enablement | Available | Module list | Apps | — | Reuse modules | Entitlements later | Plan↔module | Gate | Nav | Soft | Med | P1 |
| Catalog commerce | Available | Strong + warehouses | Stores | Blocks only | Company catalog | Warehouses/ops | Later WH | Later | Dash | Additive | High | P2 |
| Orders ops extras | Partial | Barcode/prep | Strong | No | Improve ops | Medium | Soft | Extend | Dash | No | Med | P2 |
| SEO | Available | Strong | Strong | Page SEO | Site + page SEO | Page SEO | Soft | Extend | Both | Soft | Med | P1 |
| Publish / versions | Missing | Deploy outside | Publish | Publish/history | Draft→publish | Large | versions table | New | Studio | Additive | **High** | P1→P2 |
| Pages tree | Missing | `page.list` | — | Pages panel | Site pages SoT | Large | `company_pages` | New | Studio | Additive | **High** | P2 |
| Canvas builder | Partial drafts | No canvas | — | Full | Studio builder | Very large | Page docs | New | Studio | Additive | High | P3+ |
| CMS dynamic | Partial shell | Weak | CMS | Strong | Collections + dynamic pages | Large | CMS tables | New | Studio | Additive | High | Later |
| Domains | Company map | URL settings | Domains | Domains | Company→site bind | Medium | `site_id` col | Dual-read | Platform+Dash | Backfill | **High** | P2 |
| Collaborators invite | Staff only | Staff users | Roles seats | Site invite | Site + company | Medium | site_memberships | New | Dash | Additive | Med | P1 |
| Transfer / handoff | Missing | N/A | Transfer | Transfer | Gated transfer | Large | Ownership fields | New | Dash | Careful | **High** | P2 |
| Subscriptions | Missing | License opaque | Premium/site | Workspace subs | Entitlements ready | Large | plans/subs | New | Platform | Additive | Med | P1 arch / later bill |
| Super Admin | Strong | N/A | N/A | N/A | Platform above all | Extend UI | Soft | Extend | Platform | No | Med | P1 |
| Velvet merchandising SF | Partial | Strong | N/A | N/A | Parity selective | Medium | Tags exist | Soft | SF | No | Med | P2 |
| Multi-warehouse | Missing | Available | Locations | — | Optional module | Large | WH schema | New | Dash | Additive | High | P2 |
| PSP / checkout capture | Missing | Unknown/live | Payments | — | Real payments | Large | Payments | New | Dash+SF | Additive | **High** | P1 product |
| Digital SQL/PHP/htaccess | Absent | Present | Absent | Absent | Never build | — | — | — | — | — | — | **SKIP** |
| POS | Missing | Present | POS app | — | Skip default | — | — | — | — | — | — | **SKIP** |
| Wishlist | Missing | SF hearts | Members | — | Optional | Small–Med | Soft | New | SF | Additive | Low | P3 |
| Nav honesty (coupons/SEO) | Dishonest Soon | Real | Real | — | Honest nav | Tiny | — | — | Nav | No | Low | **P0** |

---

## Count summary (capability-oriented)

| Bucket | Approx |
|---|---:|
| Already AVAILABLE on develop | 34 |
| PARTIAL needing closure | 14 |
| MISSING platform/Studio/payments | 16+ |
| PLACEHOLDER nav rows | 65 |
| Explicit SKIP | Digital dangerous tools, POS clone, wholesale portal unless needed |

Full Velvet rows: `VELVET_DIGITAL_FEATURE_INVENTORY.md`.
Full current rows: `LANDING_PAGE_CURRENT_CAPABILITY_MATRIX.md` + `docs/design/IMKAN_FEATURE_GAP_CURRENT.md`.
