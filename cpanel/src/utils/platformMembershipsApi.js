import { apiRequest } from "./api.js";

function membershipsPath(companyId) {
  return `/platform/companies/${encodeURIComponent(companyId)}/memberships`;
}

export async function fetchPlatformMemberships(companyId) {
  const response = await apiRequest(membershipsPath(companyId));
  return Array.isArray(response) ? response : response?.memberships || [];
}

export async function createPlatformMembership(companyId, membership) {
  const response = await apiRequest(membershipsPath(companyId), {
    method: "POST",
    body: JSON.stringify(membership),
  });
  return response?.membership || response;
}

export async function updatePlatformMembership(companyId, userId, membership) {
  const response = await apiRequest(
    `${membershipsPath(companyId)}/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(membership),
    },
  );
  return response?.membership || response;
}

export async function disablePlatformMembership(companyId, userId) {
  const response = await apiRequest(
    `${membershipsPath(companyId)}/${encodeURIComponent(userId)}/disable`,
    {
      method: "PATCH",
    },
  );
  return response?.membership || response;
}
