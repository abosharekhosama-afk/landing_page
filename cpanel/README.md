# EB Chemical CPanel

Standalone React/Vite administration frontend for EB Chemical and the central multi-company platform.

This application contains the protected admin experience only: admin login, dashboard, products, orders, media/uploads, homepage content, employees/staff, settings, and the Super Admin companies page. It does not serve the EB Chemical public storefront, customer registration, cart, checkout, or customer account pages.

## Setup

Requirements: Node.js and npm.

```bash
npm ci
npm run dev
```

Create a local `.env` from `.env.example` and set the central API base URL:

```dotenv
VITE_API_URL=http://localhost:5000
```

Production example:

```dotenv
VITE_API_URL=https://api.ebchemical.com
```

Do not place Supabase service-role keys, JWT secrets, passwords, or other backend secrets in this frontend. Vite variables are delivered to the browser.

## Routes and access

- `/` redirects to `/admin/login` when signed out and `/admin` (or the Super Admin companies page) when signed in.
- `/admin/login` is the only public application screen.
- `/admin` and its existing management sub-routes require an administrator session.
- `/admin/platform/companies` is visible only when `user.role === "super_admin"`; the API remains the authority and returns 401/403 where appropriate.
- Public storefront and customer routes are not registered. Unknown routes redirect to the appropriate admin entry route.

Authentication tokens and API calls continue to use the existing utilities under `src/utils`. The API URL is never hardcoded in application code.

## Build

```bash
npm run build
```

The static output is written to `dist/`. `vercel.json` is retained for the current deployment configuration; deployment is intentionally outside this extraction step.

## Scope note

The copied storefront source files and assets remain in the repository for now, but the CPanel entrypoint does not import or render them. Removing legacy source/assets should be a separate cleanup after the standalone admin application has been tested against staging.
