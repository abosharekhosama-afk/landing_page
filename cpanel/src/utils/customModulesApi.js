import { apiRequest } from "./api.js";

export function fetchCustomModules() {
  return apiRequest("/admin/custom-modules");
}

export function fetchCustomModule(moduleId) {
  return apiRequest(`/admin/custom-modules/${encodeURIComponent(moduleId)}`);
}

export function createCustomModule(body) {
  return apiRequest("/admin/custom-modules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCustomModule(moduleId, body) {
  return apiRequest(`/admin/custom-modules/${encodeURIComponent(moduleId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function disableCustomModule(moduleId) {
  return apiRequest(`/admin/custom-modules/${encodeURIComponent(moduleId)}`, {
    method: "DELETE",
  });
}

export function fetchCustomModuleEntries(moduleId) {
  return apiRequest(`/admin/custom-modules/${encodeURIComponent(moduleId)}/entries`);
}

export function createCustomModuleEntry(moduleId, data) {
  return apiRequest(`/admin/custom-modules/${encodeURIComponent(moduleId)}/entries`, {
    method: "POST",
    body: JSON.stringify({ data }),
  });
}

export function updateCustomModuleEntry(moduleId, entryId, data) {
  return apiRequest(`/admin/custom-modules/${encodeURIComponent(moduleId)}/entries/${encodeURIComponent(entryId)}`, {
    method: "PATCH",
    body: JSON.stringify({ data }),
  });
}

export function deleteCustomModuleEntry(moduleId, entryId) {
  return apiRequest(`/admin/custom-modules/${encodeURIComponent(moduleId)}/entries/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  });
}
