# iGroup Platform

iGroup Platform is a generic multi-tenant management platform. It provides the shared CPanel, backend APIs, catalog, inventory, sales, CRM, website-content, and company-management foundations used by independent storefronts such as EB Chemical, iCare, and i-play / Kids Velvet.

Storefronts remain separate applications and repositories. This repository owns the platform services and administration experience; it must not contain tenant-specific storefront behavior unless that behavior is explicitly scoped by company and remains reusable.

## Architecture

The platform is organized around a tenant-scoped catalog hierarchy:

```text
Company
└── Brand
    └── Main Category
        └── Subcategory
            └── Product
```

Media belongs to the entity that renders it:

- Brands own brand media such as logos, hero videos, and hero posters.
- Main Categories own category images and hero videos.
- Products own product images, galleries, variant images, and usage media.
- Website Media owns global or page-level media that does not belong to a catalog entity.
- Website Texts owns independently editable storefront text.

The API is the authority for tenant context, permissions, persistence, and public storefront serialization. The CPanel consumes those APIs and must not infer tenant access from browser state alone.

## Multi-Tenant Model

- Every company has an isolated company identifier and scoped session context.
- Authenticated platform users enter a company through the secure company-switch flow.
- API reads and writes enforce company scope server-side.
- Public storefront requests resolve a company/site context and return only that tenant's content.
- Tenant data, permissions, media, catalog entities, and configuration must never fall back to another company.
- Shared CPanel components should stay generic; tenant-specific presentation rules must be explicitly scoped.

## Current Modules

The CPanel remains under active development. A module listed here is not automatically considered final or approved.

| Area | Current state |
| --- | --- |
| Platform companies and secure tenant switching | Implemented |
| Tenant dashboard and company context | Implemented; ongoing visual and workflow refinement |
| Catalog: products, brands, main categories, and subcategories | Implemented |
| Entity-owned catalog media | Implemented |
| Inventory and storefront availability | Implemented |
| Sales: orders and core sales views | Implemented; advanced sales workflows remain partial |
| Customers and CRM contacts | Implemented |
| Inbox backend foundation | Implemented; broader channel workflows remain partial |
| Website management: Website Texts and Website Media | Implemented |
| Site Editor draft/manifest foundation | Implemented; editing and publishing capabilities remain in development |
| RBAC: employees, roles, permissions, and module gates | Implemented; continue validating each new module |
| Videos, store locator, booking, apps, marketing, getting paid, and site/mobile management | Mixed partial, setup, or unavailable states depending on the feature |
| Subscriptions, gift cards, abandoned carts, and unsupported integrations | Not fully implemented; the UI must show honest empty or under-development states |

Do not fabricate records, connection states, metrics, or feature availability for unfinished modules.

## Storefront Integration

Storefronts integrate through the public platform API rather than importing CPanel code. A storefront supplies its resolved company and site context, then consumes tenant-scoped content such as:

- brands and catalog hierarchy;
- products, variants, media, pricing, and stock;
- website text and page/global media;
- site manifest and supported storefront configuration.

Dynamic storefront mode must not fall back to another tenant. A storefront may use its own static fallback only when platform integration is explicitly unavailable or disabled.

## Repository Structure

```text
api/
  src/                    Backend API, middleware, routes, contracts, and stores
  supabase/migrations/    Ordered PostgreSQL migrations
  test/                   API and persistence regression tests
cpanel/
  src/                    React CPanel application
  test/                   CPanel regression tests
docs/                     Architecture and deployment notes
README.md                 Platform overview and contributor guidance
```

Generated builds, upload folders, ZIP archives, backups, scratch scripts, local data stores, and reference assets are not implementation source and should not be committed unless explicitly approved.

## Local Development

Install and run each application from its own directory:

```powershell
cd api
npm.cmd install
npm.cmd run dev
```

```powershell
cd cpanel
npm.cmd install
npm.cmd run dev
```

Use documented local-only environment values. Never place credentials or environment secrets in tracked files, and never point local development at production data.

## Environments

| Environment | Purpose | Known endpoint |
| --- | --- | --- |
| Local | Isolated development and tests | API `http://localhost:5000`, CPanel `http://localhost:5173` |
| Staging API | Integration and migration verification | `https://api-staging.igroup.website` |
| Staging CPanel | Authenticated staging review | `https://cpanel-staging.igroup.website` |
| Production | Live customer workloads | Changes require separate explicit approval |

Staging and production must use separate resources and database identities. Verify the target environment and create a recoverable backup before applying an approved migration.

## Git Workflow

```text
main
└── develop
    └── feature/<descriptive-name>
```

- `main` represents production-ready work and is never modified implicitly.
- `develop` is the shared integration branch for ongoing platform development.
- Feature branches are created from `develop` and merged only after review and validation.
- Keep commits narrowly scoped and stage files explicitly; do not use `git add .` in a dirty worktree.
- Never reset, restore, stash, normalize, or discard unrelated local changes.

The former `feature/icare-dropshipping` branch is retained for compatibility while external deployment references are audited. New general platform work should target `develop` or a feature branch created from it.

## Naming Conventions

- Use company IDs/slugs for tenant identity, not display names.
- Use stable IDs for entity relationships and URLs where the existing contract requires them.
- Keep API/database field mappings explicit when camelCase application fields map to snake_case columns.
- Name migrations with the next ordered numeric prefix and a concise purpose.
- Avoid tenant names in generic modules unless the code is deliberately tenant-scoped.

## Database Migrations

- Migrations live in `api/supabase/migrations/` and execute in numeric order.
- Never edit a migration that has successfully run in an environment; add a follow-up migration instead.
- Confirm the database identity, create and validate a custom-format backup, and apply only missing migrations.
- Stop on the first SQL error. Do not automatically repair, restore, or continue.
- Migration execution is an operational action and is not implied by merging or deploying code.

## Safety Rules

- Never touch production without explicit, current approval.
- Use staging first for migrations, API deployments, CPanel builds, and storefront integration tests.
- Preserve strict isolation between EB Chemical, iCare, Kids Velvet, and every future tenant.
- Derive company authority from authenticated server-side context, not editable browser payloads.
- Do not commit credentials, local data, backups, generated packages, or deployment artifacts.
- Preserve existing uncommitted work and inspect the diff before staging or committing.

## Testing

Run checks from the relevant package and use isolated test data:

```powershell
cd api
npm.cmd test
```

```powershell
cd cpanel
node --test test/*.test.js
npm.cmd run build:staging
```

Before a commit, also run `git diff --check`. Database integration tests may require an explicitly configured disposable test database; they must never target staging or production implicitly.

## Related Repositories

- [EB Chemical storefront](https://github.com/burhanbakri1-spec/eb-chemical-front-End)
- [iCare storefront](https://github.com/burhanbakri1-spec/i-care-frontend)
- [i-play / Kids Velvet storefront](https://github.com/omarshaeban/i-play)

Each storefront is independently versioned and deployed. Storefront-specific source belongs in its own repository, while reusable tenant-aware contracts and management capabilities belong in this platform repository.
