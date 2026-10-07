const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const localizedKeys = new Set(["en", "ar", "he"]);
const prototypePollutionKeys = new Set(["__proto__", "prototype", "constructor"]);

export function catalogError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function assertAllowedFields(body, allowedFields, { requireNonEmpty = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw catalogError("Request body must be an object.");
  }
  const keys = Object.keys(body);
  const unsafe = keys.find((key) => prototypePollutionKeys.has(key));
  if (unsafe) throw catalogError(`Unsafe field: ${unsafe}.`);
  if (requireNonEmpty && !keys.length) throw catalogError("At least one permitted field is required.");
  const unknown = keys.find((key) => !allowedFields.has(key));
  if (unknown) throw catalogError(`Unknown field: ${unknown}.`);
}

export function validateSlug(value) {
  const slug = String(value || "").trim();
  if (!slugPattern.test(slug) || slug.length > 120) {
    throw catalogError("slug must be lowercase letters, numbers, and hyphens.");
  }
  return slug;
}

export function validateLocalized(value, field, { required = false } = {}) {
  if (value === null && !required) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw catalogError(`${field} must be a localized object.`);
  }
  const unknown = Object.keys(value).find(
    (key) => prototypePollutionKeys.has(key) || !localizedKeys.has(key),
  );
  if (unknown) throw catalogError(`${field}.${unknown} is not supported.`);
  const result = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (typeof entry !== "string" || entry.trim().length > 240) {
        throw catalogError(`${field}.${key} must be a string of 240 characters or fewer.`);
      }
      return [key, entry.trim()];
    }),
  );
  if (required && !result.en && !result.ar) {
    throw catalogError(`${field}.en or ${field}.ar is required.`);
  }
  return result;
}

export function validateOptionalUrl(value, field, { allowRelative = true } = {}) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) {
    throw catalogError(`${field} must be a valid URL.`);
  }
  const normalized = value.trim();
  if (allowRelative && /^\/(?!\/)[^\s]*$/.test(normalized)) return normalized;
  try {
    const url = new URL(normalized);
    if (["http:", "https:"].includes(url.protocol)) return url.toString();
  } catch {
    // Fall through to the validation error.
  }
  throw catalogError(
    `${field} must use http or https${allowRelative ? ", or a root-relative path" : ""}.`,
  );
}

export function validateSortOrder(value) {
  const validNumber = typeof value === "number" && Number.isInteger(value);
  const validString = typeof value === "string" && /^-?(?:0|[1-9]\d*)$/.test(value);
  if (!validNumber && !validString) {
    throw catalogError("sortOrder must be an integer between -100000 and 100000.");
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < -100000 || number > 100000) {
    throw catalogError("sortOrder must be an integer between -100000 and 100000.");
  }
  return number;
}

export function requireTenantPermission(resource, action) {
  return (req, res, next) => {
    const isScopedSuperAdmin = req.tenantScope && req.membershipRole === "super_admin";
    if (!req.membership && !isScopedSuperAdmin) {
      return res.status(403).json({ message: "An active company membership is required." });
    }
    const permissions = Array.isArray(req.membership?._permissions)
      ? req.membership._permissions
      : req.user?.permissions || [];
    if (
      ["admin", "company_admin", "super_admin"].includes(req.membershipRole)
      || permissions.includes(`${resource}.${action}`)
      || permissions.includes(`${resource}.manage`)
    ) {
      return next();
    }
    return res.status(403).json({ message: `${resource} permission required.` });
  };
}

export function sendCatalogError(res, error, context = {}) {
  const constraint = String(error?.constraint || "");
  if (error?.code === "23505") {
    if (constraint === "company_categories_company_id_slug_key") {
      return res.status(409).json({ message: "Category slug already exists for this company." });
    }
    if (constraint === "company_brands_company_id_slug_key") {
      return res.status(409).json({ message: "Brand slug already exists for this company." });
    }
    return res.status(409).json({ message: "Database conflict." });
  }
  if (error?.code === "23503") {
    if (["fk_products_company_category", "fk_products_company_brand"].includes(constraint)) {
      return res.status(409).json({ message: "The record is referenced by products and cannot be deleted." });
    }
    if (constraint === "fk_company_categories_parent") {
      const message = context.operation === "delete"
        ? "Category has child categories and cannot be deleted."
        : "Parent category is invalid for this company.";
      return res.status(context.operation === "delete" ? 409 : 400).json({ message });
    }
    return res.status(409).json({ message: "Database reference conflict." });
  }
  const status = Number(error?.statusCode || 500);
  if (status >= 500) console.error("Catalog operation failed:", error?.message || error);
  return res.status(status).json({ message: status >= 500 ? "Catalog operation failed." : error.message });
}
