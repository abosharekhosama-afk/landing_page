import { apiRequest } from "./api.js";

export function fetchProductSchema() {
  return apiRequest("/admin/product-schema");
}

/** Tenant-scoped product schema for Product Wizard (no Product Settings module required). */
export function fetchCompanyProductSchema() {
  return apiRequest("/product-schema");
}

export function saveProductSchema(schema) {
  return apiRequest("/admin/product-schema", {
    method: "PATCH",
    body: JSON.stringify(schema),
  });
}
