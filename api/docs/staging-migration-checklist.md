# Phase 1 staging migration checklist

Use this checklist only with a dedicated Supabase staging project. The current
company resolver remains fixed to EB Chemical; this process does not authorize
production deployment or public resolution of another company.

## Before the migration

- Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` belong to staging.
- Back up the Supabase staging project/database and record the restore point.
- Record current products, orders, media, reviews, and users row counts.
- Run `supabase/preflight/phase1_readiness_checks.sql` in the staging SQL editor.
- Set `STAGING_PREFLIGHT_CONFIRM=staging`, then run `npm run db:check-staging`.
- Resolve every duplicate identity matching `lower(trim(email))`, including
  casing and surrounding-whitespace variants.
- Verify required current tables and `users.email` / `users.role` are present.
- Investigate any partially present Phase 1 target schema before proceeding.

The CLI uses service-role credentials for read-only PostgREST `GET` and `HEAD`
requests. It never sends a write request and never prints the service-role key.
SQL-editor checks are still required for database indexes and catalog details
that PostgREST cannot fully verify.

## Apply to staging only

- Review `supabase/migrations/001_multi_company_foundation.sql` against the
  staging backup and preflight results.
- Apply the migration only to staging through the approved Supabase workflow.
- Do not create or activate public domain resolution for a second company.
- Rerun the SQL preflight and `npm run db:check-staging` after application.
- Confirm exactly one default company exists.
- Confirm `eb-chemical` is active, default, and retains slug `eb-chemical`.
- Confirm no active domain belongs to a non-default company.
- Compare products, orders, media, reviews, and users counts with the recorded
  pre-migration values.

## API staging smoke tests

Set an API shell variable to the staging API origin. Do not paste tokens into
shared logs or documentation.

```text
GET /api/health
GET /api/company/context
GET /api/products
GET /api/website-media
GET /api/home-offers
GET /api/reviews
```

Expected behavior:

- `/api/company/context` returns EB Chemical.
- Products, media, homepage offers, and reviews retain their EB data and shapes.
- Unauthenticated `GET /api/platform/companies` returns `401`.
- A normal admin/customer/employee token returns `403`.
- An explicitly provisioned `super_admin` token returns `200`.

Create the staging Super Admin only from a trusted terminal or protected
deployment console after the company and membership tables pass validation:

```sh
npm run admin:create-super
```

Use environment variables described in the README; never place credentials in
the command history or source tree.

## Production gate

- Verify API authentication, products, orders, media, homepage content, reviews,
  carts, employees, and work sessions against staging.
- Confirm normal admin/customer authorization still returns `403` for platform
  company management.
- Confirm EB Chemical remains the only publicly resolved operational company.
- Preserve the current runtime resolver and default-company fallback.
- Do not deploy the API or apply the migration to production until the staging
  backup, preflight, migration, count comparison, and smoke tests all pass.
