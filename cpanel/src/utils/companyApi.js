import { apiRequest } from "./api.js";
import { sanitizeCompanyContext, setStoredCompanyContext } from "./companyContext.js";

export async function fetchCompanyContext() {
  return sanitizeCompanyContext(await apiRequest("/company/context"));
}

export async function fetchCompanySettings() {
  return apiRequest("/company/settings");
}

export async function updateCompanySettings(settings) {
  await apiRequest("/company/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
  return setStoredCompanyContext(await apiRequest("/company/context"));
}
