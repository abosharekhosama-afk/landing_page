# Tenant catalog transition

Migration `009_tenant_catalog_entities.sql` has not been executed. It must first
be exercised against an isolated PostgreSQL staging database after the schema
preflight and application database role have been reviewed.

## Compatibility contract

- Legacy `products.category`, `products.category_ar`, and `products.brand`
  remain supported compatibility/display fields and are not rewritten.
- Optional `category_id` and `brand_id` are the authoritative normalized
  references when present. A disagreement does not rewrite the legacy string.
- No catalog or product backfill has occurred.
- Category and brand deletion remains restricted by normalized references and,
  while legacy-only products remain, matching tenant-scoped legacy values.
- Product foreign keys are added `NOT VALID`. They enforce future writes but are
  not validated against all existing products in migration 009.

## API write serialization

PostgreSQL catalog-sensitive writes acquire one stable per-company transaction
lock by selecting the authenticated company row `FOR UPDATE`. Category creation
with a parent, category parent updates, category/brand deletion, and product
create/update/delete all participate in this lock. Validation, reference checks,
and mutation use the same transaction client.

This serializes API writes across Node processes and deployed instances. It
prevents an API product write from being inserted between a legacy-reference
check and catalog deletion. Direct external SQL writes do not acquire the API
lock and remain outside this concurrency guarantee during the legacy transition.

Catalog memory/JSON storage is allowed automatically only in `NODE_ENV=test`.
Local development may opt in with `ALLOW_LOCAL_CATALOG_STORAGE=true` only when
`NODE_ENV=development`. Production and other non-test environments fail startup
when neither `DATABASE_URL` nor `POSTGRES_URL` is configured.

`categories.view` and `brands.view` remain reserved for future private admin
views. Current storefront category and brand GET routes intentionally remain
public and do not consume those permissions.

Constraint validation requires a separate approved operation after measuring
the products table and confirming existing normalized values. Migration 009
must not run `VALIDATE CONSTRAINT`.

## RLS follow-up

RLS is deferred for the new catalog tables. The API must continue filtering
every catalog query and mutation by the authenticated `company_id`. Do not add
permissive `USING (true)` policies.

Before designing the separately reviewed RLS migration, an operator may run
these read-only checks through the same application database role. They reveal
no connection values or secrets:

```sql
select current_user;

select c.relname,
       pg_get_userbyid(c.relowner) as table_owner,
       c.relrowsecurity,
       c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('company_categories', 'company_brands');

select rolname, rolbypassrls
from pg_roles
where rolname = current_user;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('company_categories', 'company_brands');
```

The future policy strategy must define how the direct `DATABASE_URL` or
`POSTGRES_URL` session receives a validated tenant identity, and must account
for table ownership, `BYPASSRLS`, and `FORCE ROW LEVEL SECURITY` explicitly.

## Deployment order

1. Review and back up the target schema using the normal operations process.
2. Run migration 009 only on isolated staging and confirm its fail-fast checks.
3. Deploy the API code that uses per-record, tenant-scoped catalog operations.
4. Exercise catalog/settings/product integration and concurrent-instance tests.
5. Separately review and run product FK validation after measuring lock impact.
6. Introduce RLS only through another reviewed migration after role verification.

## Rollback expectations

Before application traffic depends on normalized IDs, a rollback may remove the
two unvalidated product FKs, their four non-unique indexes, the nullable product
columns, and empty catalog tables through a separately reviewed rollback. Once
catalog rows or normalized product IDs are in use, dropping them is destructive
and is not a safe automatic rollback. Prefer rolling the application back while
leaving additive schema objects in place until data has been inventoried.
