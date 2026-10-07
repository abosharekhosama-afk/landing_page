# Landing Page — Permissions Model

**Baseline:** `2440e6833a2efacb773eb51e19d58086e290f589`
**Principle:** Extend existing RBAC; do not replace working auth.

---

## 1. Current roles (as-built)

| Role | Scope | Notes |
|---|---|---|
| `super_admin` | Platform | Global; company work only in company scope |
| `company_admin` / `admin` | Company | Full tenant short-circuit on many checks |
| `manager` | Company | Elevated; API often bypasses fine-grained perms |
| `employee` / `staff` | Company | Explicit permission lists |
| `customer` | Company membership | Storefront customer, not CPanel |

Permissions live on membership/user JSON; page gates in `cpanel/src/data/roles.js`; API in `middleware/auth.js`. Site editor has dedicated `site_editor.*` and `sites.manage`.

---

## 2. Target role map (Wix-inspired names → IMKAN)

| Target role | Maps from | Capabilities (intent) |
|---|---|---|
| Platform Super Admin | `super_admin` | Everything; overrides; subscriptions later |
| Workspace Admin | **New** | Manage workspace members, client companies/sites, folders |
| Company Owner | `company_admin` | Full company + sites; billing later; transfer initiate |
| Site Admin | `admin` / elevated membership | Full Site Dashboard + publish + collaborators for site |
| Website Editor | staff + `site_editor.*` | Studio edit/preview; limited CRM |
| Store Manager | staff + catalog/orders perms | Products/orders/inventory/delivery |
| Marketing role | staff + marketing perms | Banners/offers/SMS/SEO |
| Support / Employee | `employee`/`staff` | Inbox/contacts limited |
| Custom | existing permission arrays | Keep custom lists |

Collaborator invite (future) is **site-scoped seat** on top of company membership — additive, not a second auth system.

---

## 3. Non-negotiable authorization rules

1. API is authoritative; never trust client `companyId` / `siteId` alone.
2. Every read/write: auth + tenant + permission + record scope + action.
3. Cross-tenant denial must be 404/403 consistently.
4. Super Admin remains able to inspect/act with audit.
5. Frontend hidden nav is never security.
6. Module disabled ⇒ API should still enforce module/permission where applicable.

---

## 4. Migration of permissions

| Change | Approach |
|---|---|
| Introduce workspace roles | New tables; default workspace = personal for each user |
| Site collaborators | New `site_memberships` optional; until then company memberships grant all company sites |
| Rename UI labels | Display-only; keep DB role keys stable |
| Fine-grained Wix-like roles | Grow permission catalog; avoid breaking admin short-circuits until staff UX ready |

---

## 5. Super Admin capabilities (target)

Platform: overview, users, workspaces, companies, partners, memberships, sites, domains, modules, feature flags, subscriptions (later), usage/limits, suspend/reactivate, audit, manual activation, overrides.

Site control: view, inspect owner, change owner (gated), reassign company/workspace (gated), suspend site, inspect domain/modules/usage/activity.
