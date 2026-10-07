# Landing Page — Definition of Done

The **CPanel → Landing Page Platform** transformation is complete only when **all** of the following are true with evidence (not worker claims alone).

---

## Product / UX

- [ ] Customer has a platform/workspace experience after login (**My Sites**).
- [ ] Customer can manage **multiple sites** (create, open dashboard, edit, archive policy).
- [ ] Partner/agency can manage **clients/sites** (workspace) when enabled.
- [ ] Site Dashboard exposes current commerce/business modules without fake data.
- [ ] Website Studio exists with pages + preview + **publish** (gated) and rollback path.
- [ ] Wix-like UX fidelity validated on key families (measured tokens; EN/LTR + AR/RTL; 1440→390).
- [ ] No dishonest “Soon” for shipped features.

---

## Data / compatibility

- [ ] Existing company IDs, site IDs, domains, memberships remain valid.
- [ ] Live storefronts resolve and serve catalog/orders/content for existing tenants.
- [ ] No seed reset / forced recreation performed.
- [ ] Dual site identity (`websiteConnection` ↔ `company_sites`) documented and non-destructive.
- [ ] Velvet Digital capability inventory accounted for (Preserve / Improve / Replace / SKIP).

---

## Security / tenancy

- [ ] Super Admin controls whole platform (users, workspaces, companies, sites, domains, modules, future subscriptions).
- [ ] Server-side auth + tenant + permission + scope on all new APIs.
- [ ] Cross-tenant denial verified with real actors.

---

## Subscriptions

- [ ] Entitlement/plan architecture exists and is Super-Admin-configurable.
- [ ] Existing tenants grandfathered until explicitly assigned.
- [ ] Prices not hardcoded in feature modules.

---

## Quality gates

- [ ] Targeted unit/integration tests PASS.
- [ ] Real E2E for My Sites → Dashboard → Edit → (Publish when enabled) → refresh/relogin.
- [ ] `build:staging` on clean worktree; `VITE_API_URL` staging; zero `localhost:5000`.
- [ ] `git diff --check` clean for shipped scope.
- [ ] False-completion audit clear (no stub APIs presented as live, no client-only security).

---

## Explicitly not required for “platform transformation complete”

- Pixel-perfect claim without live measured evidence.
- Cloning Digital `?app=` / SQL / PHP / htaccess.
- Shipping POS or wholesale portal unless product mandates.
- Live payment capture if product defers PSP (must then remain honest PARTIAL).
