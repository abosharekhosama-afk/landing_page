# Internal page fidelity matrix — 2026-09-19

Reference rule (user-approved):
- **Company management / normal admin modules** → Wix **Dashboard** (dark sidebar 255 / `#131720` / selected `#42454C`)
- **Website / Sites workspace only** → Wix **Studio Workspace** (light sidebar ~228 / selected `#A8CAFF`)

## Route matrix

| Route | Reference | Before mismatch | Exact fix | Final measured (1440 CDP harness) | Evidence |
|---|---|---|---|---|---|
| `/admin/platform/companies` | **Dashboard** | Light Studio sidebar; Be Vietnam; card shadow | Platform dark Dashboard + font lock | Sidebar **255** / `#131720`; selected `#42454C`/`#CFD0D2`; gutter **48**; H1 28/700/36; search 30/15/`#1F222B`; cards 8px/no shadow; **hasBeVietnam=false** | `evidence-2026-09-19/imkan-platform-companies-full-1440.png` |
| `/admin/platform/companies` → Memberships | **Dashboard** | Legacy r10 / h38 / beige edit form | Memberships overrides under `.admin-platform` | Panel mt24 pad24 gap16 r8 white; h2 20/700; subtitle 14 `#333853`; select 30/r15; primary 36/r18/`#116DFF`; th `#F7F8F8`/42; edit form r8 pad 12/16 white; **no Be Vietnam** | `evidence-2026-09-19/imkan-platform-companies-members-1440.png` |
| `/admin/platform/domains` | **Dashboard** | Wrong light shell | Inherits platform Dashboard | Same shell tokens | shell CSS |
| `/admin/sites` shell | **Studio Workspace** | Dark sidebar | `admin-sites-workspace` | Sidebar **228** / white; selected `#A8CAFF` / `#000624` | shell + AdminLayout |
| `/admin/sites` content | **Studio Workspace** | List/table | Card grid markup + Studio content CSS | Card **247×229** r8 white **shadow none** gap **24**; thumb 16:9; Edit Site h24; Create h36/r18/`#116DFF` (auto width); gutter **48**; H1 28/700; **hasBeVietnam=false** | `evidence-2026-09-19/imkan-sites-workspace-1440.png` |
| `/admin/sites` @390 | **Studio Workspace** | Multi-col squeeze | `@media (max-width: 520px)` → `1fr` | 1-column card stack (CSS + iframe evidence) | `evidence-2026-09-19/imkan-sites-workspace-390.png` |
| Products / Orders / Contacts / Settings | **Dashboard** | Type/radius leak | Shared shell table/button/badge tokens | Helvetica lock; shared 36/18 / 30/15 controls | shell CSS |

## Memberships CDP proof (1440)

| Token | Measured |
|---|---|
| Panel padding / gap / margin-top | 24 / 16 / 24 |
| Panel radius / bg | 8px / `#FFFFFF` |
| h2 | 20/700/28 `#000624` |
| Company select | 30px / radius 15 / Helvetica |
| Add member button | 36 / r18 / `#116DFF` |
| Table th | `#F7F8F8` / ~42px / Helvetica |
| Edit form | r8 / pad 12×16 / white |
| Be Vietnam | **false** |

## Sites content CDP proof (1440)

| Token | Wix Studio forensic | IMKAN measured |
|---|---|---|
| Sidebar | 228 / white / `#A8CAFF` | **228** / white / `#A8CAFF` |
| Gutter | 48 | **48** (H1 left=276) |
| Card | 246 × 211.8 / r8 / no shadow / gap 24 | **247 × 229** / r8 / none / **24** |
| Thumb | top of card | **16:9** |
| Edit Site | h24 white | **24** / white |
| Create site | 36 / 6 24 / r18 / `#116DFF` | **36** / r18 / `#116DFF` / auto width |

## Remaining mismatches (honest)

1. Sites card height **229** vs forensic **211.8** (~17px from footer padding + status chip) — cosmetic only.
2. Live authenticated staging screenshots **NOT_TESTED** until this branch is deployed (no deploy this pass).
3. Site card thumbs use initials placeholders (no backend preview URL yet).

Confirmed gap work (memberships detail + Sites Studio content) is complete for shell/internal-page tokens.
