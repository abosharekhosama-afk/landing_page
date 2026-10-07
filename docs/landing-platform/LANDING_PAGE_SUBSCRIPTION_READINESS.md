# Landing Page — Subscription Readiness

**Mode:** Architecture only — **no prices locked**, no payment gateway required now.

---

## 1. Wix conceptual model (to emulate structurally)

- Account identity ≠ site product.
- **Premium plan attaches to a site** (commonly).
- Plan unlocks: custom domain, branding, storage, collaborator seats, commerce depth, marketing suite.
- Domains / mailbox / apps can be separate add-ons.
- Transfer can move plan with site.
- Studio workspace aggregates many site subscriptions.

---

## 2. Proposed Landing Page entities (future)

| Entity | Purpose |
|---|---|
| `plan_definitions` | Code, name, interval options, feature matrix, limits (JSON) — editable by Super Admin |
| `plan_prices` | Amount/currency/interval — **not hardcoded in app logic** |
| `subscriptions` | Subject (`site_id` default; optional `company_id` pack), plan, status, trial ends, current period |
| `entitlements` | Resolved feature flags + numeric limits for a subject |
| `subscription_overrides` | Super Admin manual activation / comp / partner pricing |
| `usage_counters` | Sites, seats, storage, SMS, etc. |

**Statuses:** `trialing` | `active` | `past_due` | `canceled` | `suspended` | `manual_active`

---

## 3. Attachment recommendation

| Default | Attach subscription to **Site** (Wix-like). |
|---|---|
| Pack option | Company-level plan covering N sites (partner packs). |
| Modules | Entitlement → allows enabling module keys already in `company_cpanel_modules`. |
| Limits | Enforce server-side (seats, sites, storage); UI only reflects. |

---

## 4. Super Admin controls (must be possible later)

- CRUD plans/prices without deploy.
- Manual activate / extend trial / suspend.
- Partner special pricing overrides.
- Feature matrix per plan.
- Usage inspect + raise limits.
- Do **not** bake SKUs into React conditionals.

---

## 5. What we build now vs later

| Now (Phase 0–1) | Later |
|---|---|
| Document entitlement keys beside modules | Billing provider |
| Optional `entitlements` stub resolving to “all enabled for existing tenants” | Checkout, invoices, dunning |
| No customer-facing paywall for existing live sites | Upgrades/downgrades |

**Compatibility:** Existing companies/sites default to **grandfathered full access** until Super Admin assigns plans.
