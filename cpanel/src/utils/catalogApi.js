import { apiRequest } from "./api.js";

export function fetchCategories() {
  return apiRequest("/categories");
}

export function createCategory(category) {
  return apiRequest("/categories", {
    method: "POST",
    body: JSON.stringify(category),
  });
}

export function updateCategory(category) {
  const { id, ...changes } = category;
  return apiRequest(`/categories/${encodeURIComponent(category.id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteCategory(categoryId) {
  return apiRequest(`/categories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
  });
}

export function fetchBrands({ view } = {}) {
  const params = new URLSearchParams();
  if (view) params.set("view", view);
  const query = params.toString();
  return apiRequest(`/brands${query ? `?${query}` : ""}`);
}

export function fetchBrand(brandId) {
  return apiRequest(`/brands/${encodeURIComponent(brandId)}`);
}

export function createBrand(brand) {
  return apiRequest("/brands", {
    method: "POST",
    body: JSON.stringify(brand),
  });
}

export function updateBrand(brand) {
  const { id, ...changes } = brand;
  return apiRequest(`/brands/${encodeURIComponent(brand.id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteBrand(brandId) {
  return apiRequest(`/brands/${encodeURIComponent(brandId)}`, {
    method: "DELETE",
  });
}
