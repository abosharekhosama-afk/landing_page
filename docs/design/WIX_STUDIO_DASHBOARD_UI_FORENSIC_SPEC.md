# Wix Studio Dashboard / Workspace — Forensic Spec

**Surface:** authenticated Wix Studio **management workspace**, not the Studio editor canvas and not the public site.
**Measured:** 2026-09-17 via Cursor IDE browser CDP.
**Primary viewport:** 1440 × 1100, DPR 1.

Do not clone Wix logos, “WIX STUDIO” wordmark, or Wix marketing copy.
Do **not** treat the Studio editor (Add / Layers / inspector / canvas) as an implementation target in this pass.

---

## 1. Screens inspected

| Screen | URL | Status |
|---|---|---|
| Discover | `https://manage.wix.com/studio/discover` | Snapshot + nav tree |
| Sites | `https://manage.wix.com/studio/sites` | Measured shell, title, cards, primary/secondary actions |
| Studio editor | (not opened as target) | **OUT OF SCOPE** for implementation |

Sites grid showed project cards: icare beauty, Imkan, other workspace sites, PREMIUM badge, “Not published”, overflow `…` menu, Filter / Search / view toggles, **Create New Folder**, **Create New Site**.

---

## 2. Typography tokens

Same **rendered** family as Wix Dashboard: **Madefor** (loaded). Same legal substitution: Helvetica Neue / Inter + Tajawal for Arabic.

| Role | Family | Size | Weight | Line-height | Color |
|---|---|---|---|---|---|
| Page title “Sites” | Madefor | 28px | 700 | 36px | `#000624` |
| Subtitle | Madefor | 16px | 400 | 24px | `#333853` |
| Sidebar item | Madefor | 14px | 530 | 18px | dark navy (see note) |
| Create New Site | Madefor | 16px | 530 | 24px | `#FFFFFF` |
| Create New Folder | Madefor | 16px | 530 | 24px | `#116DFF` |
| Card “Edit Site” overlay | Madefor | 16px | 400 | 24px | `#FFFFFF` |

**Note:** selected “Sites” `<a>` computed `color` is `#0000EE` (unvisited default). Screenshot shows **dark navy label on light-blue selected pill**. Use `#000624` for selected/default label on the light sidebar unless a child span is re-measured.

---

## 3. Color tokens

| Token | HEX | Where |
|---|---|---|
| Topbar | `#131720` | `[data-hook=header]` — **same as site Dashboard** |
| Sidebar (Studio workspace) | `#FFFFFF` | `giza-sidebar` — **different from site Dashboard dark sidebar** |
| Selected nav | `#A8CAFF` | Sites link |
| Canvas | light gray (screenshot); card sampling at (800,200) hit white card `#FFFFFF` | |
| Primary button | `#116DFF` | Create New Site |
| Secondary button | `#FFFFFF` fill, `#116DFF` text | Create New Folder |
| Title | `#000624` | H1 |
| Subtitle | `#333853` | page header subtitle |
| Card | `#FFFFFF` | `[data-hook=card]` |

---

## 4–6. Spacing, radius, shadows

Recurring: 6 / 18 / 24 / 48.

| Surface | Radius | Shadow |
|---|---|---|
| Site cards | `8px` | `none` |
| Create buttons | `18px` | `none` |
| Selected nav | `0px` | none |

---

## 7. Sidebar dimensions (1440)

| Metric | Value |
|---|---|
| Width | **228px** (`ge-sidebar`) — **27px narrower than site Dashboard 255** |
| Offset from top | 48px |
| Item height | **36px** |
| Item padding | `0 18px 0 24px` |
| Selected | full width 228, fill `#A8CAFF` |
| Workspace identity | “burhan bakri” + role line in sidebar header (light) |

---

## 8. Topbar dimensions (1440)

Same 48px / `#131720` shell as site Dashboard. Left cluster: WIX STUDIO wordmark, workspace/site switcher (“All Sites”), Resources, Community, Help. Right: notifications, avatar, AI.

---

## 9. Page container (1440)

| Metric | Value |
|---|---|
| H1 “Sites” | x=276, y=78, 28/36/700 |
| Gutter | **48px** (276 − 228) |
| Subtitle | y=114 (12px under title block: 78+36=114) |
| Card origin | first card x=300, y=246.8 |
| Card size | **246 × 211.8** |
| Card gap | 24px (300 → 570 → 840 → 1110) |
| Columns at 1440 | 4 |

---

## 10. Buttons

| Variant | Height | Padding | Radius | Fill | Text | Font |
|---|---|---|---|---|---|---|
| Create New Site | 36 | 6px 24px | 18px | `#116DFF` | `#FFFFFF` | 16/24/530 |
| Create New Folder | 36 | 6px 24px | 18px | `#FFFFFF` | `#116DFF` | 16/24/530 |
| Card Edit Site | 24 | 0 | 2px | transparent | `#FFFFFF` | 16/24/400 |

---

## 11. Inputs

Sites toolbar includes Filter, search (`Search…`), grid/list toggles. Exact search-field box model **NOT_TESTED** this pass (screenshot only). Reuse Dashboard search tokens until measured.

---

## 12. Cards (site / project)

- 246 × 211.8, radius 8, white, no shadow
- Thumbnail on top, name + URL + overflow menu
- Hover actions: “Select Site”, “Edit Site” (white text on image)
- Status: PREMIUM chip, “Not published”, WIX STUDIO mark on thumbnail — **do not copy Wix marks**; keep IMKAN status/domain only

---

## 13. Tables

Sites default view is a **card grid**, not a table. List “Manage View” exists; table metrics **NOT_TESTED**.

---

## 14. Badges

PREMIUM / WIX STUDIO marks observed on thumbnails. IMKAN should use generic status chips (Active / Draft / Unpublished) with measured 12px/530 density, **without Wix brand**.

---

## 15. Navigation states

| State | Background | Notes |
|---|---|---|
| Default | `#FFFFFF` sidebar | 36px items |
| Selected | `#A8CAFF` | Sites |
| Hover | **NOT_TESTED** | |

---

## 16. Responsive

Studio Sites **NOT_TESTED** at 1280/1024/768/390 this pass. Expect:

- 1440: 4 cards
- narrower: fewer columns (screenshot-based hypothesis only — re-measure before implementing)

Topbar stays 48px.

---

## 17. Interaction states

Measured: default + selected. Hover, menu `…`, Create New Site dropdown: **NOT_TESTED**.

---

## 18. Approximation notes

1. Studio **workspace** sidebar is **light**; site **Dashboard** sidebar is **dark**. IMKAN Company Dashboard should follow the **dark Dashboard** shell. IMKAN Website/Sites **management** page should follow this **light workspace + site cards** pattern inside the existing company shell (or a documented hybrid — see module map).
2. Editor canvas was not measured and must not be redesigned. “Edit Site” on a card should keep routing to the existing IMKAN site editor.
3. Madefor 530 → 500. Same legal font substitution as the Dashboard spec.
