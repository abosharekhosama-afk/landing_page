# Wix Dashboard DevTools Capture — 2026-09-19

**Surface:** authenticated Wix Dashboard (site management), not Studio editor canvas, not public storefront.
**Account / site:** icare beauty (`metaSiteId` `c2208bff-c493-4ff9-962b-e6117a029328`)
**Tooling:** Cursor IDE browser CDP (`getComputedStyle` + `getBoundingClientRect`)
**Primary viewport:** `Emulation.setDeviceMetricsOverride` width **1440**, height **900**, `deviceScaleFactor` **1**
**Also sampled:** 768, 390

**Do not** ship Madefor / Wix logos / Wix proprietary assets.

## Screenshots

| File | What |
|---|---|
| `wix-dashboard-home-1440.png` | Wix Home @ 1440 |
| `wix-dashboard-home-390.png` | Wix Home @ 390 |
| `imkan-staging-dashboard-before-1440.png` | IMKAN staging (session expired → login; Be Vietnam still computed on body) |

Paths under Cursor screenshots temp: `%LOCALAPPDATA%\Temp\cursor\screenshots\`

## Font (legal)

| Item | Computed |
|---|---|
| Rendered family | **Madefor** (loaded, axis 400–800) |
| H1 declared stack | `Madefor, "Helvetica Neue", Helvetica, Arial, …` |
| Madefor Display | unloaded on dashboard |

**IMKAN substitute (legal):** `"Helvetica Neue", Helvetica, Inter, Arial, sans-serif`
**Arabic:** Tajawal / IBM Plex Sans Arabic
**Weight 530 →** CSS **500**

## Exact computed tokens @ 1440

| Component | Property | Wix computed |
|---|---|---|
| Topbar | height | **48px** |
| Topbar | background | **#131720** `rgb(19, 23, 32)` |
| Topbar | box-shadow | `rgb(66, 69, 76) 0px 1px 0px 0px` |
| Topbar | width | 1440px |
| Sidebar | width | **255px** |
| Sidebar | background | **#131720** |
| Sidebar | height | 852px (viewport − topbar) |
| Canvas | background | **#F0F4F7** `rgb(240, 244, 247)` |
| Canvas | origin | x=255, y=48 |
| Selected nav (Home) | background | **#42454C** `rgb(66, 69, 76)` |
| Selected nav | height | **36px** |
| Selected nav | padding | **0 18px** |
| Selected nav | font | Madefor **14px / 530 / 18px** |
| Selected nav label color | color | **#CFD0D2** `rgb(207, 208, 210)` (not white) |
| Nav icon | size / fill | **18×18**, `#CFD0D2` |
| Unselected Settings label | color / size / weight | `#CFD0D2` / 14px / 530 |
| H1 | font | Madefor **28px / 700 / 36px** |
| H1 | color | **#000624** `rgb(0, 6, 36)` |
| H1 | gutter from sidebar | **48px** (x=303 − 255) |
| H1 | top from canvas | Home **24px** (y=72); Products **30px** (y=78) |
| Search input | height | **28.4px** |
| Search input | font | 14px / 400 / 18px, color `#FFFFFF` |
| Search input | padding | `5px 3px 5px 6px` |
| Search shell | height / radius / bg | **30px** / **15px** / **#1F222B** `rgb(31, 34, 43)` |
| Search shell | width | ~361px |
| Avatar | size | **30×30** |
| Upgrade (top) | height / radius / pad / font | 24px / 18px / `3px 12px` / 12px 700 16px |
| Primary button (New Product) | height | **36px** |
| Primary button | radius / pad | **18px** / `6px 24px` |
| Primary button | font / bg / color | 16px / 530 / 24px / **#116DFF** / `#FFFFFF` |
| Filter (secondary) | height / radius / pad | **30px** / **15px** / `6px 18px` |
| Filter | font / color / bg | 14px / 530 / 18px / **#116DFF** / `#FFFFFF` |
| Card | radius / shadow / bg | **8px** / **none** / `#FFFFFF` |
| Table header cell | height / bg / font | **42px** / `#F7F8F8` / 14px 400 18px `#000624` |

## Responsive notes

| Viewport | Sidebar | Topbar | Notes |
|---|---|---|---|
| 1440 | 255px visible | 48px | Canonical |
| 768 | still 255px visible in this CDP pass | 48px | Content starts at x=255 |
| 390 | still reported 255px in layout metrics (content squeezed) | 48px | H1 size remains 28px |

IMKAN keeps an overlay/collapse pattern on narrow viewports (existing mobile nav) rather than squeezing a permanent 255px rail into 390.

## IMKAN staging BEFORE (2026-09-19)

Staging session dropped to company login during capture. Computed on login document:

| Item | Staging before |
|---|---|
| body / H1 font-family | **Be Vietnam Pro**, IBM Plex Sans Arabic, Helvetica Neue, Arial |
| dashboard-shell tokens | **absent** (`hasShellCss: false`) |
| card (login) | radius **16px**, soft multi-layer shadow, Be Vietnam |

Authenticated staging earlier in-session still used pre-fidelity nav labels (e.g. Website Content) — branch not deployed.

## Target IMKAN AFTER (branch `feature/wix-dashboard-ui-fidelity`)

Legal font substitute + exact numeric tokens above in `cpanel/src/styles/dashboard-shell.css`.
