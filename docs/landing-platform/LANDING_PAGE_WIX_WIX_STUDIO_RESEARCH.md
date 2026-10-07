# Landing Page — Wix / Wix Studio Research

**Classification:** RESEARCH (official Help Center + prior live audits)
**Date:** 2026-09-22
**Primary sources:** Wix Support / Help Center articles (fetched 2026-09-22)
**Secondary:** Live authenticated inspections recorded in `docs/audits/IMKAN_COMPETITIVE_FEATURE_GAP_AUDIT_2026-09-16.md` and shell tokens in `docs/design/IMKAN_PAGE_BY_PAGE_AUDIT.md`

**This-session live DevTools re-measure of authenticated Wix:** **NOT_TESTED** (no authenticated Wix session in this planning pass). Do not claim new pixel measurements beyond prior recorded evidence.

---

## 1. Account / workspace / site model

### Classic Wix account

- One **Account** can own many **Sites**.
- Sign-in with multiple sites → **All Sites / Sites** page (grid or list).
- Site actions: view live, change owner, collaborators, transfer plan, duplicate, move to folder, trash.
- **Folders / subfolders** organize sites for designers and multi-site owners.
- **Premium plan is per site** (plan can be transferred between sites in the same account).
- Domains and business email can transfer with site ownership.

Refs: [Managing Multiple Sites](https://support.wix.com/en/article/managing-multiple-sites-under-one-account), [Folders](https://support.wix.com/en/article/organizing-your-sites-into-folders), [Transfer Premium Site](https://support.wix.com/en/article/transferring-a-premium-site-to-another-wix-account).

### Wix Studio workspace

- **Workspace** is the agency/team container: many sites, teams, subscriptions, domains, reusable assets.
- Sites tab: create (blank, template, AI sitemap, marketplace, classic editor, own template), filter (editor type, Premium, publish status, ownership), tags, saved views, folders, trash.
- Per site: **Select Site** → Dashboard; **Edit Site** → Studio Editor; rename, preview, duplicate, client kit, transfer, invite collaborators.
- Teammates can co-edit Studio sites in realtime (code: one editor at a time).
- Transfer **between workspaces** currently not available (account transfer is the path).

Refs: [About Wix Studio](https://support.wix.com/en/article/about-wix-studio), [Managing Sites in a Workspace](https://support.wix.com/en/article/wix-studio-managing-sites-in-a-workspace).

### Collaborators / roles

- Invited at **site** level; seats depend on plan / Studio.
- **Owner** unique; transfer reassigns ownership.
- General roles: Admin (Co-Owner), Website Manager, Website Designer, Back Office Manager, Content Writer.
- App roles: Stores Manager, CMS Editor/Admin, Billing, Marketing, Payments, Bookings, etc.
- Custom roles supported.
- Collaborators cannot (regardless of role): delete/duplicate/transfer site; purchase/manage some premium account actions; escalate beyond own permissions.

Refs: [Roles overview](https://support.wix.com/en/article/roles-permissions-overview), [Inviting collaborators](https://support.wix.com/en/article/inviting-people-to-contribute-to-your-site).

### Site lifecycle (conceptual)

Create → (template/blank) → Edit → Preview → Publish → Connect domain → Collaborators → Duplicate / Archive(Trash) / Transfer.

Premium unlocks custom domain, remove ads, commerce depth, collaborator seats, storage — **one subscription ↔ one site** in the common model.

---

## 2. Wix Dashboard (business surface)

Site Dashboard owns operational business management:

- Home / overview
- Store (products, categories, inventory, orders)
- Customers / contacts / inbox
- Marketing / automations
- Analytics
- Settings (team/roles, payments, domains, SEO settings entry)
- Apps

**Implication for Landing Page:** today’s tenant CPanel **is** the Site Dashboard analogue — keep it; don’t replace with editor.

---

## 3. Wix Studio (creation surface)

Studio owns:

- Pages (static + dynamic)
- Sections / containers / components
- Responsive breakpoints
- Design system / global styles / reusable assets
- CMS collections + datasets + dynamic list/item pages
- Preview / publish / revisions
- Collaboration on canvas

CMS: collections, fields, datasets; dynamic pages share layout; item URLs don’t consume page quota the same way; Studio adds variants / manage-item pages.

**Implication:** Website Studio is a **multi-year** epic; Dashboard must remain usable without Studio completion.

---

## 4. Subscription model (architecture-relevant, not pricing)

Conceptual separation:

| Concept | Wix behavior | Landing Page readiness |
|---|---|---|
| Account | Identity + billing identity | `users` |
| Site | Product being built | `company_sites` |
| Premium / plan | Attached to a site | Future `subscriptions` → site (or company pack) |
| Domains | Separate purchasable + connectable | `company_domains` (+ later site bind) |
| Apps / business features | Plan + installed apps unlock roles/UI | Modules + future plan entitlements |
| Collaborator seats | Plan-limited | Future limit counters |

We do **not** lock prices. We design entitlements as data.

---

## 5. Adaptations for IMKAN (do not clone blindly)

1. Keep **Company** as legal/tenant/commerce boundary (Wix often collapses “business” into the site).
2. Introduce **Workspace** for agency; optional for single SMB.
3. Site Dashboard modules already richer in some commerce areas than Wix free tiers — preserve.
4. Velvet Digital ops are **functional** references, not Wix UX.
5. Super Admin is a **platform** layer Wix customers don’t have — keep it supreme.
6. Legal: no proprietary Wix fonts/assets (Madefor → Helvetica/Inter; Arabic Tajawal / IBM Plex Sans Arabic).

---

## 6. Evidence confidence

| Topic | Confidence |
|---|---|
| Official account/workspace/roles/transfer/CMS docs | HIGH (fetched) |
| Prior live Wix Dashboard/Studio inspection (2026-09-16) | HIGH for IA; MEDIUM for pixels (session-bound) |
| Fresh 2026-09-22 authenticated pixel re-measure | NOT_TESTED |
