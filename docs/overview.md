# Platform overview

## Services

The platform contains two independently runnable services:

1. `api/` is the central Express API. It owns authentication, tenant isolation, company management, company memberships, persistence, and uploads.
2. `cpanel/` is the admin-only React/Vite application. It provides EB Chemical administration and Super Admin company/membership management.

The public website is intentionally separate. Both the public website and future company frontends may eventually consume the same API, but storefront domain switching is not enabled by this repository extraction.

## Connection model

At build/runtime, the CPanel reads `VITE_API_URL` through its shared API utility. No API origin should be hardcoded into application code. The API must allow the exact CPanel browser origin through its environment-driven CORS configuration.

## Multi-company status

EB Chemical remains the default and only publicly operational company. The API includes company-aware repositories, Super Admin protection, company-management endpoints, and membership endpoints. Those foundations do not activate public resolution for additional companies.

## Source snapshots

- API: `eb-chemical-api`, branch `cpanel-company-memberships-foundation`, commit `f6cb609`.
- CPanel: `eb-chemical-cpanel`, branch `cpanel-company-memberships-ui`, commit `46051e7`.

The source repositories remain independent and were not embedded as Git repositories.

