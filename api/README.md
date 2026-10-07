# EB Chemical Central API

This project is the standalone backend for EB Chemical and the foundation for a future multi-company central API. It contains the Express API, backend-owned seed data, Supabase schema and migration drafts, and data migration utilities. It does not contain the EB Chemical frontend.

The production API domain is planned to be `https://api.ebchemical.com`. Frontend applications connect to it with:

```env
VITE_API_URL=https://api.ebchemical.com
```

## Tenant status

Tenant-owned data is isolated internally with `company_id` and request company context. EB Chemical (`eb-chemical`) is currently the only operational and default company.

Do not enable a second company until the Phase 1 migration has been backed up, applied, and validated in staging, and all domain resolution, authorization, storage, and tenant isolation checks have passed. Migrations are never run automatically when the API starts.

## Local setup

```sh
npm ci
copy .env.example .env
npm run dev
```

The default local API address is `http://localhost:5000`. Local development can use the JSON fallback when Supabase variables are absent. The local store and uploads are intentionally excluded from Git.

## Environment variables

- `PORT`: API listening port; defaults to `5000`.
- `CORS_ALLOWED_ORIGINS`: comma-separated exact browser origins. This is the preferred production CORS configuration.
- `FRONTEND_ORIGIN`: single-origin fallback when `CORS_ALLOWED_ORIGINS` is empty.
- `PUBLIC_API_URL`: externally reachable API base URL used for generated local-upload URLs. Use `https://api.ebchemical.com` in production.
- `JWT_SECRET`: strong signing secret. Required in production; keep it stable during a deployment cutover to preserve existing sessions.
- `SUPABASE_URL`: Supabase project URL for persistent database storage.
- `SUPABASE_SERVICE_ROLE_KEY`: backend-only service role key. Never expose it through a `VITE_` variable or commit it.
- `SUPABASE_BUCKET`: Supabase Storage bucket used for production uploads.
- `DATA_STORE_DIR`: optional local JSON persistence directory.
- `UPLOADS_DIR`: optional local upload directory on a persistent volume.
- `NODE_ENV`: set to `production` in production.

The export utility additionally supports `EXPORT_API_URL`, `EXPORT_ADMIN_EMAIL`, `EXPORT_ADMIN_PASSWORD`, and `EXPORT_OUTPUT`.

## Commands

```sh
npm start
npm run dev
npm run export:live
npm run migrate:supabase
```

`npm run migrate:supabase` is an explicit data migration command. Back up current data and validate the target schema before running it. Do not attach it to build, startup, or deployment commands.

## CPanel Phase 1: company management backend

The protected `/api/platform/companies` API now supports listing, reading,
creating, updating, and disabling company records. Every endpoint requires an
authenticated user whose explicit role is `super_admin`; legacy admins,
employees, customers, and unauthenticated requests are not granted platform
access.

New companies default to `draft`. Company domains are stored as inactive for
future verification, and the request company resolver still always selects EB
Chemical. There is no cPanel frontend UI, public domain switching, storefront
switching, company deletion, or second operational tenant in this phase.

EB Chemical remains active, default, and protected from ID, slug, domain,
default-status, and disable changes. The backend strips client tenant ownership
fields and never uses a submitted `company_id` to select or own a company.

Local JSON development stores company directory records in the ignored
`src/data-store/store.json`. Supabase persistence requires the additive Phase 1
migration, including the `companies`, `company_domains`, and `company_settings`
tables and the `draft` company status. Back up and validate the migration on a
restored staging database before any production deployment. Do not create an
operational second company until domain verification, frontend cPanel work, and
full tenant-isolation staging tests are complete.

## CPanel Super Admin Provisioning

The first Super Admin is provisioned from a trusted terminal or deployment
console. No public registration or bootstrap API endpoint is provided.

Required environment variables:

- `SUPER_ADMIN_EMAIL`: valid email address for the identity to create or promote.
- `SUPER_ADMIN_PASSWORD`: 14-128 characters containing lowercase, uppercase,
  number, and symbol characters.
- `SUPER_ADMIN_NAME`: optional display name.
- `SUPER_ADMIN_ALLOW_UPDATE`: set exactly to `true` to promote or update an
  existing user with the same email. Existing users are otherwise left unchanged.

Example for local PowerShell using placeholder values only:

```powershell
$env:SUPER_ADMIN_EMAIL="admin@example.test"
$env:SUPER_ADMIN_PASSWORD="Replace-With-A-Strong-Placeholder-2026!"
$env:SUPER_ADMIN_NAME="Platform Administrator"
npm run admin:create-super
Remove-Item Env:SUPER_ADMIN_EMAIL,Env:SUPER_ADMIN_PASSWORD,Env:SUPER_ADMIN_NAME
```

Run this command only from a trusted terminal or protected deployment console.
Do not paste credentials into shared logs, commit them to `.env`, or expose them
through frontend `VITE_` variables. The script never prints the password.

New and updated credentials use versioned Node.js `scrypt` hashes. Existing
legacy EB Chemical plaintext passwords remain login-compatible until a separate
controlled password migration, while newly registered users are also hashed.
The explicit `super_admin` role is stored on the user record read by
`requireSuperAdmin`; Supabase provisioning also writes the EB Chemical company
membership for future membership-aware authorization.

Local provisioning writes to the ignored JSON store. Supabase provisioning
requires the Phase 1 `company_memberships` migration to be backed up, applied,
and validated in staging before this command is used against production data.
To intentionally rotate credentials or promote an existing user, rerun with
`SUPER_ADMIN_ALLOW_UPDATE=true`.

Back up staging before provisioning. The current Supabase implementation writes
the user identity and company membership as separate REST operations because no
transactional RPC is deployed yet. It creates new identities as inactive,
non-privileged users, writes the membership prerequisite, and promotes
`users.role` to `super_admin` only as the final privileged write. Failures trigger
best-effort role and membership compensation. If the command reports any
failure, verify both `users.role` and `company_memberships` before retrying,
especially if automatic rollback could not be confirmed.

Authentication treats email addresses case-insensitively. Resolve legacy users
whose emails differ only by casing or surrounding whitespace before applying the
normalized-email unique index or running this command. The bootstrap performs a
case-insensitive full user scan to reject ambiguity; this safe one-time tradeoff
can be replaced with indexed normalized-email lookup later. A transactional
Supabase RPC remains the recommended production-hardening improvement.

## Trusted admin password reset

For an existing PostgreSQL user whose password is no longer known, run the
password-reset CLI from a trusted deployment console. Passwords and stored hashes
cannot be recovered from the database; this command replaces the stored value
with a new versioned `scrypt` hash and never prints the password or hash.

```powershell
$env:ADMIN_RESET_EMAIL="admin@example.test"
$env:ADMIN_RESET_PASSWORD="Replace-With-A-Strong-Temporary-Password-2026!"
npm run admin:reset-password
Remove-Item Env:ADMIN_RESET_EMAIL,Env:ADMIN_RESET_PASSWORD
```

The default `ADMIN_RESET_ROLE=keep` updates only the matched active user's
password and timestamp. Email matching is case-insensitive, ambiguous matches
are rejected, and the PostgreSQL operation is transactional. To deliberately
repair authorization at the same time, set `ADMIN_RESET_ROLE` to one of:

- `super_admin`: platform/CPanel company management access.
- `admin`: legacy EB Chemical admin dashboard access.
- `company_admin`: membership-aware API role; the current CPanel shell does not
  treat this role as a legacy dashboard admin.

An explicit role option also creates or updates that user's active
`eb-chemical` membership. Do not set it when only rotating a password. The
script refuses inactive or missing users and never creates identities. Run it
only where `DATABASE_URL` or `POSTGRES_URL` is already supplied securely by the
deployment provider; never paste database URLs or passwords into source files,
commits, tickets, or shared logs.

## Deployment notes

Install the locked production dependencies and start the API with:

```sh
npm ci
npm start
```

- Configure HTTPS and DNS for `api.ebchemical.com` before changing the frontend API URL.
- Set `CORS_ALLOWED_ORIGINS` to exact verified HTTPS frontend origins. Wildcard origins are rejected. `FRONTEND_ORIGIN` remains a single-origin fallback.
- Local development automatically permits ports `5173` and `8080` on `localhost` and `127.0.0.1`. These automatic local origins are not added when `NODE_ENV=production`.
- Requests without an `Origin` header remain available to health checks and trusted server-to-server clients. Browser origins not in the allowlist receive no CORS permission.
- Keep `credentials: true` paired with exact origins; never configure `*`.
- Production should use Supabase/PostgreSQL and Supabase Storage, or explicitly mounted persistent storage. Ephemeral filesystems are not safe for JSON data or uploads.
- Supabase and local upload object paths remain company-scoped. Local upload responses use `PUBLIC_API_URL` when configured and otherwise retain request/proxy-derived URLs.
- Preserve existing upload URLs and the current JWT secret during cutover.
- Apply and validate database migrations in staging before production deployment.
- Keep EB Chemical as the default tenant until second-company activation is explicitly approved and tested.

## CPanel staging migration readiness

Phase 1 staging readiness tooling is documented in
[`docs/staging-migration-checklist.md`](docs/staging-migration-checklist.md).
Run the read-only checks before and after applying the additive migration to a
backed-up staging project:

```sh
npm run db:check-staging
```

The command requires staging Supabase credentials and the explicit
`STAGING_PREFLIGHT_CONFIRM=staging` acknowledgement. It checks current/target
tables, row counts, normalized-email duplicates, required columns, EB Chemical's
default state, and active non-default domains. It does not change data or apply
the migration. Database index and catalog verification remains in the read-only
`supabase/preflight/phase1_readiness_checks.sql` SQL-editor checklist.

Public domain resolution remains disabled for second companies. Production is
blocked until the staging backup, migration validation, post-migration counts,
API smoke tests, and Super Admin authorization tests all pass.

## CPanel company memberships foundation

Super Admins can manage tenant-scoped user memberships through these protected
backend endpoints:

```text
GET   /api/platform/companies/:companyId/memberships
POST  /api/platform/companies/:companyId/memberships
PATCH /api/platform/companies/:companyId/memberships/:userId
PATCH /api/platform/companies/:companyId/memberships/:userId/disable
```

Every endpoint requires both authentication and the explicit global
`user.role = super_admin` guard. Membership roles are limited to
`company_admin`, `employee`, and `customer`; these APIs cannot create, modify,
or disable a Super Admin. Super Admin provisioning remains CLI-only through
`npm run admin:create-super`.

An unknown email can create only an inactive passwordless customer identity
shell. There is no public invitation UI, password assignment, reset flow, or
new public registration behavior in this phase. Existing user authentication
roles are not promoted by membership changes. API responses expose only the
safe membership summary and never passwords, hashes, tokens, permissions, or
database internals.

Local JSON and Supabase persistence are supported. Supabase requires the
existing Phase 1 `company_memberships` table; no additional migration columns
are required. Apply and validate that migration in staging before production.
The public company resolver remains fixed to EB Chemical, and membership data
does not enable another storefront or domain.

## Health check

After starting the server:

```text
GET /api/health
GET /api/company/context
```

Production health check URL: `https://api.ebchemical.com/api/health`.

The company context should resolve to `eb-chemical` during the current single-operational-company phase.
