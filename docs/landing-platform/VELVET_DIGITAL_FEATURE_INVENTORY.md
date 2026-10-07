# Velvet Digital Feature Inventory

**Classification:** PLANNING / FORENSIC
**Date:** 2026-09-22
**Baseline develop:** `2440e6833a2efacb773eb51e19d58086e290f589`
**Sources:** Live Digital admin audit 2026-09-16, workbook/catalog code, sibling `velvet-front-end` (Landing SF — not Digital PHP).
**No Digital repo under EP_Chemical** — do not invent modules.

---
## Scope & sources (evidence only)

| Source | What it is |
|---|---|
| `docs/audits/IMKAN_COMPETITIVE_FEATURE_GAP_AUDIT_2026-09-16.md` | Primary **Velvet Digital** live admin (`velvet-kids.com/admin`, Digital v267) + storefront inspection |
| `docs/design/IMKAN_FEATURE_GAP_CURRENT.md` | Current **Landing/IMKAN** status (supersedes 2026-09-16 counts) |
| `docs/audits/evidence-2026-09-16/velvet-*.png` | Screenshots (admin login, PLP) |
| `api/src/catalog/velvetWorkbook*.js`, `productFilterAttributes.js`, kids-velvet SQL/tests | Catalog taxonomy, age/tags, commerce import model |
| `C:\Users\jamal2000\Documents\velvet-front-end` (`play-store`) | Sibling **Landing/i-play** storefront (not Digital PHP) |
| `references/` | **Wix Studio only** — no Digital clone |
| EP_Chemical siblings | **No Velvet Digital repo**; only `eb-chemical-platform`, storefront mirrors, worktrees |

**Not found:** Digital `?app=` PHP/SQL codebase under `Documents\EP_Chemical`.
**Do not copy (audit):** SQL console, PHP INFO, htaccess, admin-path rewrite, Digital `?app=` router, POS.

Status = Landing/IMKAN vs Velvet Digital behavior. Gap = what’s missing or weaker on Landing.

---

## VELVET_DIGITAL_FEATURE_INVENTORY

| Feature | Velvet behavior | Current Landing/IMKAN behavior (if known) | Status | Gap | Suggested target location | Preserve/Improve/Replace |
|---|---|---|---|---|---|---|
| **Admin shell / module CMS** | Digital `?app=` modules; chrome + live customer counter; v267 | Wix-shaped CPanel; no Digital URL scheme | N/A | Must not clone router | — | **Replace** (own IA; skip Digital shell) |
| **Home dashboard KPIs** | 858 products, stock split, orders, POS vs retail, inventory value, SMS balance, search logs | `/admin/dashboard` insights API | PARTIAL | Digital KPI mix (POS/SMS/search) not mirrored 1:1 | Dashboard | **Improve** selectively |
| **Products CRUD** | `product.list` catalog | `/admin/products` + `/api/products` | MATCHED | none | Dashboard catalog | **Preserve** |
| **Product trash** | المحذوفات | `/admin/products/trash` | MATCHED | none | Dashboard | **Preserve** |
| **Product settings (Digital)** | `product.setting`: attributes, sort, discounts, home rails, retail/wholesale, multi-warehouse qty, colors/sizes, WhatsApp share | `/admin/product-settings`: low stock, costPrice, condition, coupon-box + **product schema** editor — not Digital rails/wholesale toggles | PARTIAL | Home rails / Digital merchandising toggles / multi-warehouse qty UX | Dashboard product settings + merchandising | **Improve** (don’t clone Digital form) |
| **Variants (colors/sizes)** | Colors/sizes manager in product setting | Product wizard variants; schema-driven | PARTIAL | UX parity unknown; schema exists | Dashboard products | **Improve** |
| **Wholesale / retail channels** | Retail + wholesale in product setting; B2B merchants | Wholesale price + `retail|trader|wholesale` account types in API/contacts | PARTIAL | No Digital-style wholesale merchant portal | Dashboard (pricing); **SKIP** full B2B portal unless needed | **Preserve** pricing; **SKIP** Digital B2B clone |
| **Categories tree** | `cat.list` + subcategories + counts | `/admin/categories`; Kids Velvet Brand→Main→Sub enforced | MATCHED (KV) | Flat tenants differ by design | Dashboard categories | **Preserve** |
| **Brands** | `brand.list` add/manage/reorder | `/admin/brands` | MATCHED | UI polish only | Dashboard | **Preserve** / polish |
| **Catalog hierarchy depth** | Deep SF tree (baby, age, gender, LEGO, etc.) | Workbook: 12 brands / 127 mains / 412 leafs (`tmp-velvet-workbook-audit.json`); migrations 020/021 | MATCHED (data model) | SF presentation differs (Landing brand showcases vs Digital mega tree) | Catalog + storefront | **Preserve** taxonomy; **Improve** SF browse UX |
| **Age tags / PLP age pills** | SF pills 0–3, 3–6, 6–10, 10+ | Canonical IDs in `productFilterAttributes` + workbook age planner; Landing filters include age | PARTIAL | Digital PLP “age pills” UX not confirmed equal on Landing | Catalog filters + PLP | **Improve** SF UX |
| **Gender merchandising** | SF browse by gender | Filter attrs `boys/girls/unisex` + workbook tags | PARTIAL | Same as age — data yes, Digital UX partial | Catalog + PLP | **Improve** |
| **Skill / material / productType / theme / collection tags** | Source tags in workbook classifications | Full registry → filter groups (`velvetWorkbookClassifications.js`) | MATCHED (model) | SF facet completeness vs Digital UNKNOWN | Catalog + shop facets | **Preserve** / verify SF |
| **Featured / new / promotions collections** | SF featured, new arrivals, offers | Flags + `collection` tags; Phase J; homepage offers | PARTIAL→AVAILABLE | Countdown hero not proven on Landing | Merchandising + offers | **Improve** countdown |
| **Bundles** | Tag `بكجات` / product type bundles | `/admin/product-bundles` AVAILABLE (2026-09-19) | MATCHED (capability) | Presentation parity UNKNOWN | Dashboard bundles + PDP | **Preserve** |
| **Inventory (single)** | Home stock counts; product qty | `/admin/inventory` | MATCHED | Lifecycle order↔stock still gap (current docs) | Dashboard inventory | **Improve** lifecycle |
| **Multi-warehouse / branches** | `warehouse.list` stock movement + value | None | MISSING | Branches + movements | Dashboard inventory | **Improve** (P2) or defer |
| **Orders** | `order.list` + barcode, matching/prep, reputation | `/admin/orders` | PARTIAL | Barcode / prep / reputation | Dashboard orders | **Improve** ops extras |
| **Coupons** | `coupon.list` codes/uses/repeat | Coupons API+UI real; nav honesty issue | PARTIAL | Nav honesty | Dashboard discounts | **Preserve** API; fix honesty |
| **Automatic / offer discounts** | SF % off + offer rail | Automatic discounts manager; sale/compare-at | PARTIAL | Digital offer rail density | Dashboard + SF | **Improve** |
| **Customers (Digital)** | `customer.list` = **wholesale merchants** | Retail CRM contacts | SKIP / different | Not retail CRM | — | **SKIP** unless B2B tenant |
| **Delivery cities/fees** | `city.list` admin + SF “مناطق التوصيل” | `/admin/delivery` + public zones | MATCHED | SF city-list page style may differ | Dashboard delivery + SF | **Preserve** |
| **Delivery companies** | Sidebar `post.list` (not fully opened) | UNKNOWN | UNKNOWN | UNKNOWN | Dashboard delivery | UNKNOWN |
| **CMS pages** | `page.list` add/reorder/link | Studio Pages **PLANNED**; website texts slots exist | MISSING / PLANNED | Page tree | Studio Phase 1 | **Replace** with IMKAN pages (not Digital lists) |
| **Nav / menu manager** | `menu.list` | No dedicated menu API; Landing Header hardcoded + mega menu from taxonomy | MISSING / PLANNED | Editable nav | Studio Phase 6 | **Improve** later |
| **SEO suite** | `seo.setting`: name, keywords, sitemap count, robots, GA, Meta, Body | SEO site settings + robots/sitemap/OG **AVAILABLE** (2026-09-19) | MATCHED (core) | Meta/Body inject / GA-as-admin-field vs Landing GTM | Dashboard SEO + storefront | **Preserve**; optional Improve pixels |
| **Homepage carousel + welcome video** | `carousel.list` many slides + welcome video | Homepage offers + banners AVAILABLE; welcome video **MISSING** | PARTIAL | Welcome video; slide parity | Dashboard offers/banners | **Improve** |
| **Promo countdown heroes** | SF “العرض فقط لمدة 7 أيام” | Offers/banners; countdown engine not confirmed | PARTIAL | Timed countdown | Dashboard offers | **Improve** |
| **Placed ads / ads.txt / AdBlock** | `ad.list` floating/slots | Splash ads AVAILABLE; placement engine/ads.txt MISSING | PARTIAL | Placement engine | Dashboard marketing | **Improve** (P2) |
| **Testimonials (trust rail)** | `testimonial.list` opinions ≠ SKU reviews | Product reviews AVAILABLE; trust-rail separate | PARTIAL | Merchandising opinions | Content + SF bind | **Improve** or skip |
| **Marketing catalog / pixels / RSS / QR** | `marketing.catalog` FB pixel, tracking, RSS, QR | Tracking pixels/feeds MISSING; Landing has **GTM** via `VITE_GTM_ID` | PARTIAL | Admin-managed pixels/RSS/QR | Site settings + SF | **Improve** (P2) |
| **Contact directory** | `contactUs.list` + add-to-menu | Contacts CRM; Landing Contact form page | PARTIAL | Directory≠forms inbox | CRM + forms | **Preserve** CRM; **Improve** forms |
| **Staff users + logs** | `user.list` login/ops logs, lock, perms | `/admin/staff` + permissions | PARTIAL | Thinner audit logs | Dashboard staff | **Improve** logs |
| **System settings** | Name, copyright, URL, AR/HE, timezone Hebron, **store visibility**, social, htaccess/SQL/PHP | Company settings; store visibility PARTIAL | PARTIAL | Close-store modes; **SKIP** SQL/PHP/htaccess | Company settings | **Improve** visibility; **SKIP** dangerous tools |
| **Security** | IP block, admin path rename | IP blocks AVAILABLE; path rename SKIP | MATCHED / SKIP | Admin path rename | Security | **Preserve** IP; **SKIP** path rewrite |
| **SMS** | `sms.list` send/credit logs | `/admin/sms` AVAILABLE | MATCHED | polish | Dashboard SMS | **Preserve** |
| **Visitor analytics** | `visitor.listDaily` daily/monthly/yearly | Analytics ingest PARTIAL | PARTIAL | Built-in Digital reports depth | Dashboard analytics | **Improve** |
| **Search logs** | Home 82407 search logs | Search ingest PARTIAL | PARTIAL | Operator search-log UI | Analytics | **Improve** |
| **Staff tickets** | `issue.list` open/deferred/closed | MISSING | MISSING | Tickets | Dashboard (P3) | Optional **Improve** |
| **POS** | `pos.select` in-store | MISSING | SKIP | Offline POS | — | **SKIP** |
| **Policies** | `policy.list` + ecommerce registry | `/admin/policies` + legal | MATCHED | none | Dashboard | **Preserve** |
| **Breaking news** | `breakingNews.list` | Announcements AVAILABLE | MATCHED (approx) | naming/UX | Dashboard announcements | **Preserve** |
| **Storefront mega menu** | Category mega menu | Landing `CategoriesMegaMenu` + brand tree | PARTIAL | Digital chip links (orders/cities/policy) | SF header | **Improve** |
| **Header chips (orders, cities, policy, contact)** | طلباتي السابقة، مناطق التوصيل، سياسة، تواصل | Landing: search/cart/account (account button present; auth depth UNKNOWN); footer policies; Contact page | PARTIAL | Prior orders chip; city-list chip | SF chrome | **Improve** |
| **Wishlist** | Hearts on PLP | **Not found** in `velvet-front-end` src | MISSING | Wishlist | SF + API | **Improve** if required |
| **WhatsApp ops** | WhatsApp on SF | Not found as first-class in Landing src (audit: don’t hardcode number) | MISSING / optional | Channel CTA | SF / company settings | Optional **Improve** |
| **Social links** | FB/IG/TikTok on Digital SF | Landing footer IG/LinkedIn/TikTok/YouTube | PARTIAL | Network set differs | SF footer / settings | **Preserve** |
| **PLP sort** | default, bestseller, most viewed, random, price↑↓, newest, oldest | Landing: `featured|newest|price-asc|price-desc|name` only | PARTIAL | Missing bestseller/views/random/oldest | SF shop sort | **Improve** |
| **PLP all products / offers rail** | `product.all`, `product.all.offer` | `/products` + filters + offers tags | PARTIAL | Offer-only Digital app UX | SF PLP | **Improve** |
| **Sale vs compare-at** | % off + ILS | `originalPrice` on cards; ILS workbook target | PARTIAL | Currency display ($ in Landing checkout copy) | SF pricing | **Improve** |
| **Currency ILS** | ILS storefront | Workbook `VELVET_TARGET_CURRENCY = ILS`; company settings currency | PARTIAL | Landing checkout still `$` formatting in code | Company currency + SF | **Improve** |
| **Search** | Header search | Landing `SearchDropdown` live filter | MATCHED (basic) | Digital search-log ops separate | SF + analytics | **Preserve** SF |
| **Cart** | Cart present | Landing Cart + drawer + context | MATCHED (UI) | Persistence/API depth UNKNOWN for this SF | SF cart | **Improve** if not wired to API |
| **Checkout / payment** | Checkout likely; **not completed** in audit | Landing checkout = **preview, no payment**; IMKAN PSP MISSING | MISSING | Real PSP + order place | Dashboard payments + SF | **Improve** (epic) |
| **Customer account / prior orders** | Header “طلباتي السابقة” | Account button in Header; auth journey UNKNOWN | UNKNOWN / PARTIAL | Customer login + order history | SF account | **Improve** if required |
| **Link-in-bio `/bio`** | `/bio` page | Not in Landing pages list | MISSING | Bio page | SF or CMS page | Optional |
| **PDP presentation** | Digital product app (not fully drilled) | Landing PDP: gallery, variants, age/skill specs, usage video, related, path hero | PARTIAL | Digital PDP extras UNKNOWN | SF PDP | **Preserve** Landing; verify vs Digital |
| **Product media / derivatives** | Product images on SF | Uploads + webp derivatives (kids-velvet staging assets) | MATCHED (platform) | — | Media pipeline | **Preserve** |
| **Homepage content model** | Carousel + category rails | Landing: IntroLoader, Hero, Intro, **BrandShowcase** rails, Careers — different composition than Digital promo rails | PARTIAL | Digital rail/countdown vs Landing brand worlds | SF home + offers | **Improve** merchandising; don’t force Digital layout |
| **Localization AR/(HE)** | AR storefront; admin AR/HE | Landing EN/AR i18n; HE UNKNOWN | PARTIAL | Hebrew | i18n / company locale | **Preserve** AR/EN; HE UNKNOWN |
| **SEO / analytics on SF** | GA via admin SEO | Landing GTM + `page_view`; platform robots/sitemap | PARTIAL | Admin pixel suite vs GTM-only | SEO + analytics | **Preserve** GTM; optional admin pixels |
| **Forms submissions** | contactUs = directory not inbox | Forms shell PARTIAL | PARTIAL | Stored submissions | Dashboard forms | **Improve** |
| **Store locator** | “مواقع المتجر” chip (audit) | `/admin/store-locator` AVAILABLE | MATCHED (admin) | SF chip UNKNOWN | Dashboard + SF | **Preserve** |
| **Vlogs / news** | UNKNOWN on Digital | Landing News + Vlogs pages; CPanel vlogs | N/A / Landing-only | Not Digital-evidenced | Content | **Preserve** Landing |
| **SQL / PHP INFO / htaccess** | Present in system.setting | Must not exist | SKIP | — | — | **SKIP** / never build |

---

## Workbook / clone notes (not Digital runtime, but Velvet capability evidence)

| Item | Evidence | Implication |
|---|---|---|
| Classification workbook | `tmp-velvet-workbook-audit.json`, `velvetWorkbookClassifications.js` | 434 products; age/gender/skill/… tags | Landing catalog must keep these attributes |
| Age extraction | `velvetWorkbookAge.js`, `tmp-velvet-age-*.json` | Digital-like age bands mapped to IDs | Preserve mapping |
| Commerce import | `velvetWorkbookCommerce.js` | price, stock=24, active/visible, ILS | Staging ops; not SF feature |
| Sibling `velvet-front-end` | `play-store` Landing/i-play | Modern SPA mirror target — **not** Digital admin | Gap table above uses this for SF |
| `references/` | Wix Studio HTML/PNGs only | No Digital UI reference pack in-repo | Rely on audit + live site for Digital |

---

## Highest-value gaps (evidence-backed)

1. **Storefront merchandising UX:** age/gender PLP, richer sort, countdown offers, wishlist, WhatsApp, city/orders chips (`IMKAN_COMPETITIVE…` §5.2–5.3).
2. **Digital admin ops worth considering:** multi-warehouse, order prep/barcode, pixels/RSS, carousel welcome video, store visibility modes, staff tickets (P2–P3 / SKIP where noted).
3. **Already largely covered on Landing/IMKAN (2026-09-19):** Sites, SEO/robots/sitemap, homepage offers/banners campaigns, product bundles, core catalog/orders/delivery/SMS.
4. **Explicit non-goals:** Digital `?app=`, SQL/PHP/htaccess, POS, wholesale merchant portal.

**Checkout/PSP, abandoned carts detail, Digital PDP internals, delivery-companies module, Hebrew locale:** marked **UNKNOWN** or **MISSING** where the audit did not complete the journey—no invention.
