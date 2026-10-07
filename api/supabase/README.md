# EB Chemical Supabase Persistence

This backend keeps local development working with `backend/src/data-store/store.json` and `backend/uploads`.
In production, set Supabase environment variables so data and uploaded images persist after redeploys.

## 1. Create Supabase resources

1. Create a Supabase project.
2. Open **SQL Editor** and run `backend/supabase/schema.sql`.
3. Open **Storage** and create a public bucket, for example:
   `eb-chemical-uploads`

The backend uses the service role key server-side only. Do not expose it in frontend code.

## Phase 1 multi-company foundation draft

The additive migration draft is located at:

```text
backend/supabase/migrations/001_multi_company_foundation.sql
```

Do not apply this draft directly to production. Test it against a restored copy
of the production database first.

### What the migration does

- Creates `companies`, `company_domains`, `company_memberships`,
  `company_settings`, `product_field_definitions`, and
  `product_field_values` when missing.
- Creates EB Chemical as the active default company with ID `eb-chemical`.
- Adds `company_id` only to tenant-owned tables that already exist.
- Backfills existing tenant-owned rows to `eb-chemical` without changing IDs,
  slugs, JSON data, media keys, or image URLs.
- Copies existing user roles into EB Chemical memberships without removing or
  changing the role fields used by the current runtime.
- Adds company lookup indexes. Tenant-scoped uniqueness for existing tables is
  documented but deliberately not enforced until duplicate checks are reviewed.

The temporary `company_id = 'eb-chemical'` database default is intentional.
The current backend does not send `company_id`, so this default lets unchanged
EB Chemical writes continue to work after the foundation migration is eventually
approved and applied.

### What the migration does not do

- It does not make backend queries, exports, deletes, or persistence tenant-aware.
- It does not change frontend routing, Product Details, cart behavior, admin UI,
  static fallbacks, localStorage data, or uploaded files.
- It does not add a company switcher or Super Admin interface.
- It does not migrate authentication to membership-based authorization.
- It does not add direct-client RLS policies.
- It does not create, enable, or safely support a second company.

The current backend persists a global store snapshot and can globally prune rows.
For that reason, **do not create a second company** until all backend reads,
writes, deletes, exports, and prune operations are scoped by `company_id` and
checked against an authenticated company membership.

### Required backup before eventual application

Before testing or applying the migration:

1. Create a Supabase database backup or `pg_dump` that includes schema and data.
2. Export the live backend store using the procedure in section 3 below.
3. Copy `backend/src/data-store/store.json` from any deployment that may still
   use the JSON fallback.
4. Back up the Supabase Storage bucket or record a complete object listing and
   public URLs. This migration does not move or rename stored objects.
5. Record pre-migration row counts:

```sql
select 'users' as table_name, count(*) as row_count from public.users
union all select 'products', count(*) from public.products
union all select 'product_variants', count(*) from public.product_variants
union all select 'product_gallery_images', count(*) from public.product_gallery_images
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'carts', count(*) from public.carts
union all select 'homepage_offers', count(*) from public.homepage_offers
union all select 'homepage_category_cards', count(*) from public.homepage_category_cards
union all select 'reviews', count(*) from public.reviews
union all select 'work_sessions', count(*) from public.work_sessions
union all select 'website_media', count(*) from public.website_media
order by table_name;
```

Do not use `--prune`, delete tables, truncate data, or replace the current data
with an empty export as part of this migration.

### Validation after applying to a restored/staging database

Run the same row-count query and compare every count to the backup. Existing
tenant-owned table counts must remain unchanged. Then verify the backfill:

```sql
select id, slug, name, status, is_default
from public.companies
where id = 'eb-chemical';

select 'products' as table_name, count(*) filter (where company_id <> 'eb-chemical') as unexpected_company_rows,
       count(*) filter (where company_id is null) as null_company_rows
from public.products
union all
select 'orders', count(*) filter (where company_id <> 'eb-chemical'),
       count(*) filter (where company_id is null)
from public.orders
union all
select 'website_media', count(*) filter (where company_id <> 'eb-chemical'),
       count(*) filter (where company_id is null)
from public.website_media;

select
  (select count(*) from public.users) as user_count,
  (select count(*) from public.company_memberships where company_id = 'eb-chemical') as eb_membership_count;
```

All unexpected/null company counts should be zero, and the EB membership count
should match the user count. Also compare a sample of product IDs/slugs, order
IDs, media section keys, JSON payloads, and image URLs with the backup.

Supabase/current data must not be deleted or regenerated: existing IDs are used
by products, variants, orders, media, carts, static fallback merging, and admin
workflows. Replacing them could break Product Details, order history, media
references, and persisted carts even if row totals appear similar.

## Phase 3 company context foundation

The backend exposes `GET /api/company/context` with public EB Chemical metadata.
Request hosts are normalized and attached to the internal request context, but
database-backed domain resolution is not active yet: every host still resolves
to EB Chemical.

EB Chemical remains the only operational company. Do not enable a second company
until Super Admin controls, verified domain ownership, and the Phase 1 migration
have all been validated against a restored staging database.

## Phase 4 Super Admin backend foundation

The backend now has a strict `super_admin` authorization guard and a protected,
read-only `GET /api/platform/companies` endpoint. There is no Super Admin UI and
company creation, editing, and deletion are not enabled.

No existing `admin` user is promoted automatically. EB Chemical remains the only
operational company, and a second company stays blocked until Super Admin flows,
verified domains, and migration behavior have been validated in staging before
any production deployment.

## 2. Environment variables

Set these on the backend deployment, including Vercel if the backend is deployed there:

```env
SUPABASE_URL=https://hmugkuhbsqbdbnoqhcsm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=paste-your-service-role-key-here
SUPABASE_BUCKET=eb-chemical-uploads
```

For local development, create `backend/.env` and paste the real values there.
`backend/.env` is ignored by git and must not be committed.

Keep local development without these variables if you want to use the local JSON fallback.

## 3. Preserve current live production data before redeploy

If staff/products/orders were added from the live website before Supabase was configured, export them before replacing that deployment.

Preferred full export, available after this backend version is deployed:

```bash
cd backend
npm run export:live -- https://YOUR_BACKEND_URL/api admin@epchemical.com admin-password live-store-export.json
```

If the current live backend does not have `/api/admin/export-store`, the script falls back to the existing public/admin endpoints. That fallback can export products, orders, employees, reviews, offers, category cards, and work sessions exposed by the current API. Customer accounts that are not exposed by the current API may need a full server-side `store.json` backup.

## 4. Import data into Supabase

After creating the schema and setting local `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, run:

```bash
cd backend
npm run migrate:supabase -- live-store-export.json
```

By default, migration is merge-only and does not delete rows already in Supabase.
To intentionally replace Supabase rows that are missing from the file:

```bash
npm run migrate:supabase -- live-store-export.json --prune
```

Use `--prune` only when the export file is known to be the complete source of truth.

## 5. Deploy

Set the Supabase environment variables in Vercel/backend hosting before redeploy:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`

In Vercel, add them in the backend project's **Settings -> Environment Variables**.
Use the same variable names exactly. Do not prefix them with `VITE_`.

When these variables exist:

- Products, staff/users, orders, variants, gallery images, carts, reviews, homepage offers, category cards, and work sessions are loaded from Supabase PostgreSQL.
- Uploaded images are saved to Supabase Storage and returned as permanent public URLs.
- `store.json` is not used as the production source of truth.
- `backend/uploads` is only a local fallback.

## 6. Persistence test

After deployment:

1. Add a product from Admin.
2. Add at least one variant with color, size, price, and stock.
3. Upload a main/gallery image.
4. Add a staff member.
5. Create an order.
6. Redeploy the backend/frontend.
7. Confirm the product, variant, uploaded image URL, staff member, and order still appear.

If data disappears, check that all three Supabase env vars are present in the deployed backend runtime, not only the frontend.
