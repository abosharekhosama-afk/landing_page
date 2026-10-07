import { apiRequest } from "./api.js";

export function fetchVlogs() {
  return apiRequest("/admin/vlogs");
}

export function createVlog(vlog) {
  return apiRequest("/admin/vlogs", {
    method: "POST",
    body: JSON.stringify(vlog),
  });
}

export function updateVlog(vlog) {
  return apiRequest(`/admin/vlogs/${encodeURIComponent(vlog.id)}`, {
    method: "PATCH",
    body: JSON.stringify(vlog),
  });
}

export function deleteVlog(vlogId) {
  return apiRequest(`/admin/vlogs/${encodeURIComponent(vlogId)}`, {
    method: "DELETE",
  });
}

export function saveVlogHero(hero) {
  return apiRequest("/admin/vlogs/hero", {
    method: "PATCH",
    body: JSON.stringify(hero),
  });
}
