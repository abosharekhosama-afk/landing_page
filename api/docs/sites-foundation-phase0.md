# Sites Foundation — Phase 0

Status: implemented (Phase 0, infrastructure only).

## Model

A **Company owns Sites**. Each site is a tenant-scoped storefront identity:

```text
Company → Site
```

- Table: `public.company_sites` (migration `035_company_sites.sql`).
- Fields: `id`, `company_id`, `slug` (unique per company), `name`, `status`
  (`active` | `draft` | `archived`), `default_locale`, `settings` (jsonb),
  `created_at`, `updated_at`.
- RLS: all reads/writes are scoped to `app.current_company_id`.

## API

Mounted at `/api/admin/sites` (`api/src/routes/sites.js`):

| Method | Path | Permission | Behavior |
| --- | --- | --- | --- |
| GET | `/api/admin/sites` | `sites.manage` OR `site_editor.access` | List company sites (lazy default backfill when empty) |
| POST | `/api/admin/sites` | `sites.manage` | Create a site (slug normalized, duplicate slug → 409) |
| GET | `/api/admin/sites/:siteId` | `sites.manage` OR `site_editor.access` | Get one site; cross-tenant or missing → 404 |

- Company scope always comes from the authenticated session (`req.companyId`).
  Client-supplied `company_id` is never trusted.
- Lazy backfill: when a company has zero sites, the first list/create call
  creates a default site. `company_sites.id` is always globally unique
  (`site-{uuid}` in the API; company-prefixed in SQL backfill). The legacy
  `settings.websiteConnection.siteId` is copied to slug / `settings.legacyWebsiteConnectionSiteId`
  only — the connection object itself is never rewritten. Two companies may
  share the same legacy siteId and still each get a row.
- Persist is authoritative: if saving the default site fails, the in-memory
  row is rolled back and the error is rethrown (no phantom site).
- Module access: `/api/admin/sites` is gated by the existing
  `storefront.website_texts` module (no new module catalog entry).

## CPanel

- Page key `admin-sites`, path `/admin/sites`, under **Website Content → Sites**
  (first child, `existing(...)` — not a placeholder).
- `cpanel/src/utils/sitesApi.js`: `fetchSites`, `fetchSite`, `createSite`.
- `cpanel/src/pages/AdminSitesPage.jsx`: real list (name, slug, status, default
  locale), honest empty state, create form gated by `sites.manage`, and an
  **Edit Site** button per row.
- Permission `sites.manage` added to the storefront permission group; page
  access for staff requires `sites.manage` OR `site_editor.access`.

## Edit Site integration

- **Edit Site** navigates to `/admin/site-editor?siteId=<real site id>`.
- `SiteEditorPage` reads `siteId` from `window.location.search` and passes it to
  the site editor API client, which appends `?siteId=` to the existing
  site-editor endpoints.
- `api/src/routes/siteEditor.js` verifies the requested `siteId` belongs to the
  active company (`tenantCompanySiteRepository.findByCompany`) and returns 404
  otherwise. When present, that site id is used for draft get/save; when absent,
  the existing `websiteConnection` / `manifest.siteId` behavior is unchanged.
- No second editor was created. Publish is NOT enabled.

## Boundaries

- Business data (products, categories, brands, inventory, media, orders,
  checkout, delivery, coupons, reviews, CRM, inbox, analytics, website
  texts/media, home offers, storefront content APIs) stays in the existing
  APIs — sites do not duplicate it.
- Future page documents are presentation/config only; the storefront still uses
  the existing content path.
- Out of scope for Phase 0: pages, page_versions, visual canvas, blocks,
  publish, rollback, navigation editor, CMS, responsive studio, ecommerce
  blocks, domain automation, storefront renderer changes.