# Wix Dashboard UI — Forensic Spec

**Surface:** authenticated Wix Dashboard (site management), not the public storefront.
**Account / site:** icare beauty (`metaSiteId` `c2208bff-c493-4ff9-962b-e6117a029328`)
**Measured:** 2026-09-17 via Cursor IDE browser CDP (`getComputedStyle` + `getBoundingClientRect`).
**Primary viewport:** `Emulation.setDeviceMetricsOverride` width 1440, `deviceScaleFactor` 1.
**Also sampled:** 768, 390.

Do not copy Wix logos, “WIX STUDIO” wordmark, or Wix business copy.

---

## 1. Screens inspected

| Screen | URL | Status |
|---|---|---|
| Home | `…/dashboard/{id}/home` | Measured (shell + cards + buttons) |
| Products | `…/wix-stores/products` | Measured (title, primary button, table) |
| Inventory | sidebar present | Navigation only — **NOT_TESTED** table |
| Categories | sidebar present | Navigation only — **NOT_TESTED** |
| Orders | sidebar present | Navigation only — **NOT_TESTED** |
| Coupons | sidebar present | Navigation only — **NOT_TESTED** |
| Contacts | sidebar present | Navigation only — **NOT_TESTED** |
| Settings | sidebar present | Navigation only — **NOT_TESTED** |
| Website (Site & Mobile) | sidebar present | Navigation only — **NOT_TESTED** |
| CMS | sidebar present | Navigation only — **NOT_TESTED** |
| Marketing / Analytics / Inbox | sidebar present | Navigation only — **NOT_TESTED** |

Home loaded widgets: site card, client-kit empty state, Analytics metric row, activity/suggestions. Cookie / upgrade banners were present; they are Wix chrome, not IMKAN targets.

---

## 2. Typography tokens

**Rendered family (DevTools / `document.fonts`):** `Madefor` — **loaded**, weight axis 400–800.
**Declared stack on H1:** `Madefor, "Helvetica Neue", Helvetica, Arial, メイリオ, meiryo, "ヒラギノ角ゴ pro w3", "hiragino kaku gothic pro", sans-serif`

`Madefor Display` appears in `document.fonts` as **unloaded** on this dashboard.

Wix weight **530** is between CSS 500 and 600. Map IMKAN to **500**.

| Role | Family (rendered) | Size | Weight | Line-height | Letter-spacing | Color | Transform |
|---|---|---|---|---|---|---|---|
| Page title (H1) | Madefor | 28px | 700 | 36px | normal | `#000624` | none |
| Section / card title (H3) | Madefor | 18px | 700 | 24px | normal | `#000624` | none |
| Metric value | Madefor | 18px | 700 | 24px | normal | `#000624` | none |
| Sidebar item | Madefor | 14px | 530 | 18px | normal | `#CFD0D2` | none |
| Topbar search input | Madefor | 14px | 400 | 18px | normal | `#FFFFFF` | none |
| Upgrade / Quick Actions (top) | Madefor | 12px | 700 | 16px | normal | `#FFFFFF` / `#000624` | none |
| Primary page button (“New Product”) | Madefor | 16px | 530 | 24px | normal | `#FFFFFF` | none |
| Secondary button (“Filter”, “Learn More”, “View Live Site”) | Madefor | 14px | 530 | 18px | normal | `#116DFF` | none |
| Compact primary (“Get Started”) | Madefor | 14px | 530 | 18px | normal | `#FFFFFF` | none |
| Table header | Madefor | 14px | 400 | 18px | normal | `#000624` | none |
| Table body | Madefor | 14px | 400 | 18px | normal | `#333853` | none |

### Font substitution (legal)

Madefor is Wix-proprietary (not OFL/jsDelivr). **Do not ship Wix font files.**

IMKAN fallback for this dashboard:

- Latin: `"Helvetica Neue", Helvetica, Arial, sans-serif` (Wix’s own fallback), or **Inter** if already licensed in CPanel.
- Arabic: keep existing **Tajawal / IBM Plex Sans Arabic**.
- Report this substitution on every visual comparison.

---

## 3. Color tokens

Values from computed `background-color` / `color` (rgb converted to HEX).

| Token | HEX / rgba | Where measured |
|---|---|---|
| Topbar background | `#131720` | `[data-hook=header]` |
| Sidebar background | `#131720` | `elementFromPoint` empty sidebar |
| Selected nav item | `#42454C` | Home link |
| Nav / icon fill | `#CFD0D2` | Home SVG fill; Home text |
| App canvas | `#F0F4F7` | `[data-hook=right-side-area]` |
| Card / table surface | `#FFFFFF` | `Card__card`, Product table |
| Table header | `#F7F8F8` | `th` |
| Title / primary text | `#000624` | H1, H3, th |
| Secondary / table body | `#333853` | product name cell |
| Search field (topbar) | `#1F222B` | `[data-hook=wsr-input]` parent sample |
| Primary action | `#116DFF` | Get Started, New Product |
| Primary action text | `#FFFFFF` | same |
| Secondary action text | `#116DFF` | Learn More, Filter, View Live Site |
| Upgrade chip | `rgba(0,6,36,0.3)` on `#FFFFFF` text | Upgrade |
| Topbar divider | `rgb(66,69,76) 0px 1px 0px 0px` | header `box-shadow` |
| Thumbnail chrome | `#DFE5EB` | site thumbnail sample |

**Not fully measured:** focus ring, destructive, success/warning/error badges, disabled opacity. Treat as **NOT_TESTED** until the matching module is opened.

CSS custom properties `--wix-color-*` / `--wsr-color-*` were **empty** on `:root` in this session. Colors come from Wix Design System (`wds_*`) hashed classes.

---

## 4. Spacing scale (observed)

Not a named 4px scale in CSS variables. Recurring values:

- 6px — compact button vertical padding
- 9px / 12px / 15px / 18px / 24px — cell and card padding
- 48px — topbar height **and** content gutter from sidebar

---

## 5. Radius scale

| Surface | Radius |
|---|---|
| Cards | `8px` |
| Product table container | `8px` |
| Compact buttons (Get Started / Filter / Learn More) | `15px` |
| Page primary (New Product) | `18px` |
| Top chips (Upgrade, Quick Actions) | `18px` |
| Sidebar nav items | `0px` |
| Thumbnail | `4px` |

---

## 6. Shadows

| Surface | Computed |
|---|---|
| Topbar | `rgb(66, 69, 76) 0px 1px 0px 0px` (1px bottom hairline) |
| Cards (Home) | `none` |
| Product table | `none` |

---

## 7. Sidebar dimensions (1440)

| Metric | Value |
|---|---|
| Width | **255px** (`[data-hook=ge-sidebar]`) |
| Offset from top | 48px (below topbar) |
| Nav item height | **36px** |
| Nav item padding | `0 18px` |
| Nav font | 14px / 18px / 530 Madefor |
| Icon | **18×18**, fill `#CFD0D2`, `stroke: none` |
| Selected background | `#42454C`, radius 0, full 255px width |
| Edit Site (footer of sidebar) | 255×36, padding `0 18px` |

Collapsed width: **NOT_OBSERVABLE** in this session (sidebar stayed 255 at 768 and 390).

---

## 8. Topbar dimensions (1440)

| Metric | Value |
|---|---|
| Height | **48px** |
| Width | 1440 (full viewport) |
| Background | `#131720` |
| Search input | ~329.5 × 28.4, Madefor 14/18/400, white text |
| Avatar | **30×30** |
| Upgrade | 74.2 × 24, padding `3px 12px`, radius 18px |
| Quick Actions (sidebar, not topbar) | 185 × 24, white fill, `#000624` text, radius 18px |

---

## 9. Page container (1440)

| Metric | Value |
|---|---|
| Main origin | x=255, y=48 |
| Main width | 1185 |
| Content gutter | **48px** (title/cards at x=303 = 255+48) |
| H1 position | x=303, y=72 → **24px** below topbar |
| Card width | 1077 |
| Card padding (inner box) | **18px 24px** |
| Card radius | 8px |

---

## 10. Buttons

| Variant | Height | Padding | Radius | Fill | Text | Font |
|---|---|---|---|---|---|---|
| Page primary (New Product) | 36 | 6px 24px | 18px | `#116DFF` | `#FFFFFF` | 16/24/530 |
| Compact primary (Get Started) | 30 | 6px 18px | 15px | `#116DFF` | `#FFFFFF` | 14/18/530 |
| Compact secondary (Filter, Learn More, View Live Site) | 30 | 6px 18px | 15px | `#FFFFFF` | `#116DFF` | 14/18/530 |
| Top chip (Upgrade) | 24 | 3px 12px | 18px | `rgba(0,6,36,0.3)` | `#FFFFFF` | 12/16/700 |
| Sidebar nav | 36 | 0 18px | 0 | transparent / `#42454C` selected | `#CFD0D2` | 14/18/530 |

Focus ring / disabled: **NOT_TESTED**.

---

## 11. Inputs

Topbar search (only fully measured):

- Height ~28.4px
- Font 14/18/400 Madefor
- Color `#FFFFFF` on `#1F222B`
- Padding `5px 3px 5px 6px`
- Radius 0 on the inner input (the visible pill is a parent — parent radius **NOT_FULLY_RESOLVED**; screenshot shows a rounded dark field)

In-page product search: **NOT_TESTED** (query matched the topbar input).

---

## 12. Cards

- Background `#FFFFFF`, radius `8px`, shadow `none`
- Inner padding `18px 24px`
- Home card width 1077 at 1440
- Site thumbnail radius 4px

---

## 13. Tables (Products)

| Metric | Value |
|---|---|
| Container | 1077 wide, radius 8px, `#FFFFFF` |
| Header row height | **42px** |
| Header background | `#F7F8F8` |
| Header padding | `9px 12px 9px 24px` (checkbox col) |
| Body row height | **82px** (includes  product thumb) |
| Body cell padding | `15px 12px` (first col `15px 12px 15px 24px`) |
| Body text | 14/18/400 `#333853` |

Row hover / selected: **NOT_TESTED**.

---

## 14. Badges

Home “MADE ON WIX STUDIO” sample: 12px / 530 / height 15 / white text — **do not clone this badge**. Other status badges **NOT_TESTED**.

---

## 15. Navigation states

| State | Background | Text / icon |
|---|---|---|
| Default (dark sidebar) | `#131720` | `#CFD0D2` |
| Selected | `#42454C` | `#CFD0D2` |
| Hover | **NOT_TESTED** (CDP Input hover blocked) | |

---

## 16. Responsive findings

| Viewport | Sidebar | Topbar | Notes |
|---|---|---|---|
| 1440 | 255 visible | 48 | Reference |
| 768 | **255 still visible** | 48 | Main width 513; no collapse in this override |
| 390 | **255 overlay still visible** | 48 | Content squeezed; not a clean mobile drawer |

Wix did **not** switch to an icon rail or hamburger drawer under these device-metrics overrides. IMKAN already has a mobile drawer (`admin-mobile-menu`). **Prefer IMKAN’s existing mobile collapse** rather than cloning the cramped 390 overlay.

1920 / 1280 / 1024: **NOT_TESTED** this pass. 1440 layout (255 + 48 gutter) is expected to hold.

---

## 17. Interaction states

Measured: default + selected nav.
**NOT_TESTED:** hover, focus-visible, disabled, loading, dropdown open, modal, table row hover. Durations/easing unknown (no computed transition dump).

---

## 18. Approximation notes

1. Unvisited `<a>` computed `color` sometimes reports `#0000EE`; visible paint is `#CFD0D2` on the label/SVG. Use the label/SVG value.
2. First `header` in DOM is the sidebar header (height 146), not the 48px topbar. Selector: `[data-hook=header]`.
3. Madefor 530 → IMKAN 500.
4. Table body 82px includes a thumbnail; text-only IMKAN tables may use header-like 42px unless a thumb column exists.
5. Modules listed as Navigation only were not opened — do not invent their inner paddings.
