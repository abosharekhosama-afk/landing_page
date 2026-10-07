# Phase I — Final regression / consistency matrix

**Date:** 2026-09-20  
**Branch:** `feature/wix-dashboard-ui-fidelity`  
**Scope:** Consistency sweep only (not redesign; no Stream B; editor untouched)

## Pages / families checked

| Family | Phase | EN/LTR | AR/RTL | 1440 | laptop | tablet/820 | 390 | Sticky Actions | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Shell / tokens / Be Vietnam gate | P0/A | PASS | PASS | PASS* | PASS* | PASS* | PASS* | — | `dashboard-shell.css` |
| Platform Overview / Domains / Companies modules | B | PASS | PASS* | PASS* | PASS* | PASS* | PASS* | Domains PASS | Modules migrated Phase I |
| Memberships | B | PASS | PASS* | PASS* | PASS* | PASS* | PASS* | PASS | Shared table |
| Catalog Products / Brands / Inventory / Bundles / Settings | C | PASS | PASS* | PASS* | PASS* | PASS* | PASS* | PASS | Products EN table remains shared |
| Sales Orders / Delivery / Invoices / Getting Paid | D | PASS | PASS* | PASS* | PASS* | PASS* | PASS* | PASS | |
| CRM Contacts / Reviews / Staff / Inbox honesty | E | PASS | PASS* | PASS* | PASS* | PASS* | PASS* | PASS | Employees All/Active/Disabled intact |
| Growth Banners / Announcements / Splash / SMS / Analytics / SEO | F | PASS | PASS* | PASS* | PASS* | PASS* | PASS* | PASS | Unavailable honesty retained |
| Settings Security / Policies / Automations / Dev Tools / Dropshipping | G | PASS | PASS* | PASS* | PASS* | PASS* | PASS* | PASS | |
| Sites workspace cards | H | PASS | PASS* | PASS* | PASS* | PASS* | PASS* | n/a (cards) | Card **211.375** ≈ **211.8** |

\* CSS / unit-test matrix. Live authenticated CDP = **NOT_TESTED** (no staging deploy this phase).

## Loading / empty / error

| Pattern | Status |
|---|---|
| `admin-data-loading` / `admin-data-empty` / `admin-data-error` | Token-aligned to `--dashboard-text-secondary` |
| Honest unavailable / notConnected shells (Analytics, Automations, Forms, Meta) | Retained — no fake backends |
| Broken route / nav honesty (P0 Coupons/SEO; Platform Sites Soon) | Intact |

## Clipping / overflow

| Check | Status |
|---|---|
| `.admin-data-table-wrap` overflow auto | PASS |
| `.admin-data-table-cell-clip` max-width 220 (140 @720) | PASS |
| Sticky Actions `inset-inline-end` + RTL shadow | PASS |
| 390 page overflow-x hidden (sites/settings/growth) | PASS |

## Website Studio editor / canvas

**Untouched** — `SiteEditorPage.jsx`, `SiteEditorCanvas.jsx`, `siteEditor.js` not modified in Phase I.

## Evidence method

Source assertions + prior phase fixtures. No browser automation in this phase.
