const reservedTenantFields = new Set([
  "company_id",
  "companyId",
  "company",
  "tenant_id",
  "tenantId",
  "tenant",
]);

export function stripReservedTenantFields(value) {
  if (Array.isArray(value)) {
    return value.map(stripReservedTenantFields);
  }

  if (!value || typeof value !== "object" || Buffer.isBuffer(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !reservedTenantFields.has(key))
      .map(([key, entry]) => [key, stripReservedTenantFields(entry)]),
  );
}

export function sanitizeTenantRequestBody(req, _res, next) {
  const isPlatformRoute =
    req.path?.startsWith("/api/platform") ||
    req.originalUrl?.startsWith("/api/platform");
  const isCompanySelectionRoute =
    req.path === "/api/auth/select-company" ||
    req.originalUrl?.split("?", 1)[0] === "/api/auth/select-company";

  if (
    req.body !== undefined
    && !Buffer.isBuffer(req.body)
    && !isPlatformRoute
    && !isCompanySelectionRoute
  ) {
    req.body = stripReservedTenantFields(req.body);
  }

  next();
}
