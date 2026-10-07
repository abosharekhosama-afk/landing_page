# Deployment plan

This document is preparation guidance only. It does not authorize a migration or production deployment.

## 1. Prepare the API

```powershell
cd api
npm ci
npm start
```

Set production values outside Git for `NODE_ENV`, `PORT`, `JWT_SECRET`, Supabase configuration, CORS origins, and `PUBLIC_API_URL`. Use persistent storage or Supabase Storage for uploads; do not rely on an ephemeral deployment filesystem.

Validate `GET /api/health`, the EB company context, authentication, business endpoints, company management, and membership authorization in staging. Apply database migrations to staging only after backup and preflight checks.

## 2. Prepare the CPanel

```powershell
cd cpanel
npm ci
npm run build
```

Set `VITE_API_URL` to the deployed API origin before building. Deploy only the generated `cpanel/dist/` contents to the static host. Configure SPA fallback so unknown CPanel routes serve `index.html`.

## 3. Configure service boundaries

- The panel domain serves the static CPanel build.
- The API domain routes to the Express service.
- API CORS allows the exact HTTPS panel origin; do not use a production wildcard.
- TLS, DNS, and security headers are configured at the hosting/reverse-proxy layer.
- The public website remains deployed independently.

## 4. Pre-production security checklist

- Review all npm dependency advisories before production deployment. The current known npm report is 2 low, 1 moderate, and 6 high advisories. Do not run `npm audit fix` automatically; assess and test dependency changes deliberately.
- Create production environment configuration only on the server or in the deployment provider's protected environment settings.
- Never commit `.env` files.
- Never commit `JWT_SECRET` values.
- Never commit Supabase service role keys.
- Never commit database passwords.
- Production must set a strong, unique `JWT_SECRET` through protected environment configuration.
- Do not rely on development fallback secrets in production.

## 5. Release gates

- No `.env`, secret, upload, local data-store, `node_modules`, or `dist` directory is committed.
- API and CPanel dependencies install from their lockfiles.
- CPanel production build passes.
- Authentication returns 401 for signed-out users and 403 for unauthorized roles.
- Only explicit `super_admin` users can access platform company and membership operations.
- EB Chemical business endpoints and company context remain unchanged.
- Staging migration and rollback validation succeeds before any production migration.
- A second company remains publicly unresolved until a separately approved activation phase.
