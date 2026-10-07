# iCare dropshipping — staging release guide

This feature is tenant-scoped and must be reviewed on `eb-chemical-api-staging` with database `eb_catalog_test`. Do not run the migration or deployment commands against production.

## Required environment

- `DATABASE_URL`: staging PostgreSQL connection string for `eb_catalog_test`
- `POSTGRES_SSL=true` when required by the staging server
- `JWT_SECRET`: strong staging-only signing secret
- `FRONTEND_ORIGINS=https://cpanel-staging.igroup.website,https://igroup.website`
- `VITE_API_URL=https://api-staging.igroup.website` for the CPanel build
- `PLATFORM_API_BASE_URL=https://api-staging.igroup.website` for iGroup/iCare
- `NEXT_PUBLIC_STOREFRONT_HOST=igroup.website` for server-side storefront resolution
- Optional notification hooks: `DROPSHIPPING_EMAIL_WEBHOOK_URL`, `DROPSHIPPING_WHATSAPP_WEBHOOK_URL` (no credentials are stored in source)

## Staging migration

1. Take a verified backup of `eb_catalog_test`.
2. Confirm `select current_database()` returns `eb_catalog_test` and the application hostname is staging.
3. Review and apply `api/supabase/migrations/010_icare_dropshipping.sql` in one transaction.
4. Verify all new tables, constraints, and indexes; confirm the existing iCare catalog counts remain 43 categories, 18 brands, and 20 products.
5. Enable dropshipping only through the iCare tenant settings endpoint after the API and CPanel builds are deployed.

The migration creates settings disabled for every existing company. It does not enable products, duplicate catalog records, or mutate normal orders.

## Build and rollout

1. Build/test API, CPanel, and iCare locally.
2. Deploy the API to `eb-chemical-api-staging`/`api-staging.igroup.website`.
3. Deploy CPanel to `cpanel-staging.igroup.website` with the staging API URL.
4. Deploy iCare at `igroup.website/icare` with `PLATFORM_API_BASE_URL` pointing to staging for the review window.
5. Run the registration → approval → product enablement → order → delivered → delayed release → withdrawal E2E scenario and its cancellation/return variants.
6. Review audit logs and tenant-isolation probes before any production proposal.

DNS changes are intentionally not included. Recommended records, after approval, are `api-staging.igroup.website` and `cpanel-staging.igroup.website` targeting the reviewed staging services.
