import { apiRequest } from "./api.js";

const companiesPath = "/platform/companies";

export async function fetchPlatformCompanies() {
  const response = await apiRequest(companiesPath);
  return Array.isArray(response) ? response : response?.companies || [];
}

export async function createPlatformCompany(company) {
  const response = await apiRequest(companiesPath, {
    method: "POST",
    body: JSON.stringify(company),
  });
  return response?.company || response;
}

export async function updatePlatformCompany(companyId, company) {
  const response = await apiRequest(`${companiesPath}/${encodeURIComponent(companyId)}`, {
    method: "PATCH",
    body: JSON.stringify(company),
  });
  return response?.company || response;
}

export async function disablePlatformCompany(companyId) {
  const response = await apiRequest(`${companiesPath}/${encodeURIComponent(companyId)}/disable`, {
    method: "PATCH",
  });
  return response?.company || response;
}

export async function fetchCompanyModules(companyId) {
  return apiRequest(`${companiesPath}/${encodeURIComponent(companyId)}/modules`);
}

export async function updateCompanyModules(companyId, modules) {
  return apiRequest(`${companiesPath}/${encodeURIComponent(companyId)}/modules`, {
    method: "PUT",
    body: JSON.stringify({ modules }),
  });
}

export async function restoreCompanyModules(companyId) {
  return apiRequest(`${companiesPath}/${encodeURIComponent(companyId)}/modules/restore-defaults`, {
    method: "POST",
  });
}

export async function requestCompanyScope(companyId) {
  return apiRequest(`${companiesPath}/${encodeURIComponent(companyId)}/scope`, { method: "POST" });
}

export async function recordCompanyScopeExit() {
  return apiRequest("/platform/company-scope/exit", { method: "POST" });
}

export async function onboardCompany(data) {
  return apiRequest("/platform/onboard", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
