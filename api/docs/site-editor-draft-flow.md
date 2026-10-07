# Site editor draft compatibility boundary

The site editor stores a validated, tenant-scoped page document. PostgreSQL is required in production and staging; isolated local and test runtimes may use the local adapter. Draft saves never update public website text, media, or storefront records.

The additive `company_site_editor_drafts` table is keyed by company, page, and locale. Its conditional insert/update path enforces optimistic revision checks atomically and records the authenticated user as the draft author. The API derives `company_id` from authenticated middleware and never accepts a browser-selected tenant identifier.

The planned production boundary is:

1. Editable tenant draft
2. Validated draft revision with optimistic concurrency
3. Explicit future publish operation
4. Immutable published page version
5. Storefront renderer consuming the same validated document schema

Publishing and storefront renderer activation are deliberately outside the current implementation. The iCare storefront continues to render its existing `Home`, `Hero`, and `PageHero` components and existing content API.
