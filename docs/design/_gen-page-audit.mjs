import fs from "fs";

const snap = JSON.parse(fs.readFileSync(new URL("./_inventory_snapshot.json", import.meta.url), "utf8"));
const { counts, rows } = snap;

const apiHints = {
  "admin-platform-companies": "GET/POST platform companies + memberships APIs",
  "admin-platform-domains": "platform domains API",
  "admin-platform-overview": "dashboard/platform overview aggregates",
  "admin-products": "GET/POST/PUT /api/products (+ admin products)",
  "admin-product-bundles": "GET/POST/PATCH/DELETE /api/admin/bundles",
  "admin-inventory": "/api/admin/inventory",
  "admin-categories": "categories API",
  "admin-brands": "brands API",
  "admin-orders": "/api/orders",
  "admin-delivery": "/api/admin/delivery-zones",
  "admin-customers": "customers/contacts API",
  "admin-inbox": "/api/admin/inbox",
  "admin-reviews": "reviews /all",
  "admin-sites": "GET/POST /api/admin/sites",
  "admin-homepage-offers": "home-offers + category-cards",
  "admin-website-texts": "/api/admin/website-texts",
  "admin-website-media": "website media API",
  "admin-banners": "banners API",
  "admin-sms": "/api/admin/sms",
  "admin-announcements": "/api/admin/announcements",
  "admin-splash-ads": "/api/admin/splash-ads",
  "admin-security": "/api/admin/security",
  "admin-policies": "/api/admin/policies",
  "admin-legal-information": "/api/admin/legal-information",
  "admin-invoices": "/api/admin/invoices",
  "admin-analytics-highlights": "/api/admin/analytics + reports",
  "admin-tenant-placeholder-catalog-discounts-coupons": "GET/POST /api/admin/coupons (real manager behind Soon nav)",
  "admin-tenant-placeholder-catalog-discounts-automatic": "GET/POST /api/admin/discounts (real manager behind Soon nav)",
  "admin-tenant-placeholder-marketing-seo-geo": "company settings SEO fields + storefront seoContent (real SeoPage behind placeholder key)",
  "admin-site-editor": "GET/PUT site-editor drafts (Publish disabled) — OUT OF SCOPE",
};

function forensicDepth(pageKey, feature) {
  if (pageKey === "admin-platform-companies" || pageKey === "admin-sites") return "MEASURED_HARNESS_2026-09-19";
  if (pageKey === "admin" || pageKey === "admin-products") return "WIX_SHELL_PLUS_PARTIAL_PAGE_FORENSIC";
  if (feature === "PLACEHOLDER") return "N/A_PLACEHOLDER";
  if (pageKey === "admin-site-editor") return "OUT_OF_SCOPE";
  return "INHERITED_SHELL_TOKENS_ONLY — per-page Wix DevTools NOT_TESTED this planning pass";
}

function uiFidelity(pageKey, feature) {
  if (pageKey === "admin-platform-companies") return "SHELL_PASS + memberships tokens (card height/footer polish residual)";
  if (pageKey === "admin-sites") return "SHELL_PASS + Studio card grid (card height ~229 vs 211.8 residual)";
  if (feature === "PLACEHOLDER") return "N/A";
  if (pageKey === "admin-site-editor") return "OUT OF SCOPE";
  return "NEEDS_PAGE_PASS";
}

const lines = [];
lines.push("# IMKAN Page-by-Page Audit");
lines.push("");
lines.push("**Classification:** PLANNING / AUDIT ONLY — no implementation");
lines.push(`**Inventory generated:** ${snap.generatedAt}`);
lines.push("**Codebase basis:** `feature/wix-dashboard-ui-fidelity` @ `262f630` (includes develop `a7c8191` ancestry)");
lines.push("**Sources:** `adminNavigation.js`, `CPanelApp.jsx` `pagePaths`, `roles.js`, API routers, prior Wix DevTools forensics (`WIX_DASHBOARD_UI_FORENSIC_SPEC.md`, `WIX_STUDIO_DASHBOARD_UI_FORENSIC_SPEC.md`, Companies/Sites harness CDP 2026-09-19)");
lines.push("");
lines.push("## Honesty rules");
lines.push("");
lines.push("- Wix/Studio used for **structure / UX / interaction patterns only**.");
lines.push("- IMKAN is source of truth for **data, labels, permissions, APIs**.");
lines.push("- Do **not** invent DevTools numbers. Unmeasured pages = `NOT_TESTED`.");
lines.push("- Website Studio **editor/canvas** is listed but **OUT OF SCOPE** for implementation.");
lines.push("- No Be Vietnam Pro in authenticated CPanel (shell lock). Legal fonts: Helvetica Neue / Inter; Arabic Tajawal / IBM Plex Sans Arabic.");
lines.push("");
lines.push("## Summary counts");
lines.push("");
lines.push("| Metric | Value |");
lines.push("|---|---|");
lines.push(`| Nav+routed rows audited | **${counts.totalRows}** |`);
lines.push(`| Unique \`/admin\` routes | **${counts.uniqueRoutes}** |`);
lines.push(`| Mapped → Wix Dashboard | **${counts.dashboard}** |`);
lines.push(`| Mapped → Wix Studio Workspace | **${counts.studioWs}** |`);
lines.push(`| Out of scope (editor) | **${counts.outOfScope}** |`);
lines.push(`| Feature AVAILABLE (route-level) | **${counts.byFeature.AVAILABLE || 0}** |`);
lines.push(`| Feature PARTIAL | **${counts.byFeature.PARTIAL || 0}** |`);
lines.push(`| Feature PLACEHOLDER | **${counts.byFeature.PLACEHOLDER || 0}** |`);
lines.push(`| Nav \`existing()\` leaves | **${counts.existing}** |`);
lines.push(`| Nav \`placeholder()\` leaves | **${counts.placeholders}** |`);
lines.push("");
lines.push("## Shared shell tokens (measured — apply as baseline)");
lines.push("");
lines.push("From Wix Dashboard CDP (1440) + IMKAN harness after shell pass:");
lines.push("");
lines.push("| Token | Wix Dashboard | IMKAN shell |");
lines.push("|---|---|---|");
lines.push("| Topbar height | 48px | 48px |");
lines.push("| Sidebar width | 255px | 255px (Dashboard) / **228px** (Sites Studio only) |");
lines.push("| Sidebar bg | `#131720` | `#131720` / Sites `#FFFFFF` |");
lines.push("| Selected nav | `#42454C` / `#CFD0D2` | same / Sites `#A8CAFF` |");
lines.push("| Canvas | `#F0F4F7` | `#F0F4F7` |");
lines.push("| H1 | 28/700/36 `#000624` | same (Helvetica/Inter sub) |");
lines.push("| Gutter | 48px | 48px |");
lines.push("| Primary button | 36 / r18 / `#116DFF` | same |");
lines.push("| Compact control | 30 / r15 | same |");
lines.push("| Card | r8 / no shadow | same |");
lines.push("| Table th | `#F7F8F8` 14/400/18 | same |");
lines.push("| Font EN | Madefor → Helvetica/Inter | Helvetica Neue, Helvetica, Inter |");
lines.push("| Font AR | — | Tajawal / IBM Plex Sans Arabic |");
lines.push("");
lines.push("## Interaction pattern checklist (Wix → IMKAN mapping)");
lines.push("");
lines.push("Apply on every page pass (do not fake missing backend):");
lines.push("");
lines.push("| Interaction | Wix pattern (observed / expected) | IMKAN mapping rule |");
lines.push("|---|---|---|");
lines.push("| Hover nav | Subtle fill change; selected stays pill/bar | Keep muted selected; no Studio blue on Dashboard |");
lines.push("| Primary click | Immediate navigation or create drawer/modal | Wire to real create route/API only |");
lines.push("| Search focus | Dark field (topbar) / in-page search | Use shell search tokens |");
lines.push("| Filter/select open | Native or Wix select popover | Prefer existing IMKAN selects; restyle to 30/r15 |");
lines.push("| Row/menu … | Overflow menu anchored to row | Keep existing menus; measure offset |");
lines.push("| Modal/drawer | Dim overlay + escape/outside close | Match AdminLayout popover close (Escape/outside) |");
lines.push("| Save success | Toast / inline success | Use existing message panels; restyle only |");
lines.push("| Validation error | Inline field + banner | Keep server messages; no fake success |");
lines.push("| API 401/403 | Session redirect / forbidden | Existing handlers; must stay |");
lines.push("| Empty state | Illustration + one CTA | Honest empty copy; no fake demo rows |");
lines.push("");
lines.push("## EN/AR + responsive gates (every page completion criteria)");
lines.push("");
lines.push("- [ ] EN/LTR no clip on title/toolbar/table");
lines.push("- [ ] AR/RTL logical padding; icons mirrored where needed; tables scroll not overflow page");
lines.push("- [ ] 1440 / laptop / tablet / 390 — no page-level horizontal overflow");
lines.push("- [ ] Computed fonts under shell never include Be Vietnam Pro");
lines.push("- [ ] Network: no unexpected 4xx/5xx on happy path; loading/error UI real");
lines.push("- [ ] Relevant unit tests + `build:staging` + `git diff --check`");
lines.push("");
lines.push("## Full route inventory");
lines.push("");
lines.push("| Route | Name (EN) | pageKey | Reference | Feature | Permissions | Data/API hint | UI fidelity | Forensic depth |");
lines.push("|---|---|---|---|---|---|---|---|---|");

for (const r of rows) {
  const api = apiHints[r.pageKey] || (r.placeholder ? "coming-soon shell only" : "see page component + matching /api route");
  const ui = uiFidelity(r.pageKey, r.feature);
  const depth = forensicDepth(r.pageKey, r.feature);
  const route = r.route || "—";
  const name = String(r.name).replaceAll("|", "/");
  lines.push(
    `| \`${route}\` | ${name} | \`${r.pageKey}\` | ${r.reference} | ${r.feature} | \`${String(r.permissions).replaceAll("|", "/")}\` | ${api} | ${ui} | ${depth} |`,
  );
}

lines.push("");
lines.push("## Notes on dishonest / special routes");
lines.push("");
lines.push("1. **Coupons / Automatic Discounts** — nav `placeholder: true` + Soon badge, but `AdminCatalogPage` mounts real `CouponsManager` / `AutomaticDiscountsManager` against live APIs. Treat as **PARTIAL (nav honesty)** until reclassified to `existing()`.");
lines.push("2. **SEO & GEO** — placeholder key, but `SeoPage` persists company SEO + Technical SEO v2 storefront fields. Treat as **PARTIAL (nav honesty)** / capability **AVAILABLE**.");
lines.push("3. **Platform → Sites** — still platform placeholder Soon; **tenant** `/admin/sites` is real Sites Foundation.");
lines.push("4. **Edit Site** — real route; **editor/canvas out of current fidelity scope**.");
lines.push("");
lines.push("## Per-page DevTools status this planning pass");
lines.push("");
lines.push("| Area | Status |");
lines.push("|---|---|");
lines.push("| Global Dashboard shell | MEASURED (Wix + IMKAN) |");
lines.push("| Studio Sites workspace shell + cards | MEASURED (forensic + harness) |");
lines.push("| Platform Companies + Memberships | MEASURED (harness CDP) |");
lines.push("| Products table (Wix) | PARTIAL forensic (title/button/table) |");
lines.push("| All other Dashboard modules | **NOT_TESTED** live page-vs-page this pass — schedule in Phase C–G |");
lines.push("| EN+AR live for every route | **NOT_TESTED** this pass |");
lines.push("| 390 native Emulation in IDE browser | Unreliable; use CSS breakpoints + device/iframe evidence |");
lines.push("");

fs.writeFileSync(new URL("./IMKAN_PAGE_BY_PAGE_AUDIT.md", import.meta.url), lines.join("\n"), "utf8");
console.log("wrote IMKAN_PAGE_BY_PAGE_AUDIT.md rows", rows.length);
