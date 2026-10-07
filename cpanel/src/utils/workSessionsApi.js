import { apiRequest } from "./api.js";

export function startWorkSession() {
  return apiRequest("/work-sessions/start", {
    method: "POST",
  });
}

export function endWorkSession() {
  return apiRequest("/work-sessions/end", {
    method: "POST",
  });
}

export function fetchMyTodayWorkSession() {
  return apiRequest("/work-sessions/my-today");
}

export function fetchEmployeeWorkSessions() {
  return apiRequest("/work-sessions/employees");
}

export function fetchWorkSessionsForEmployee(employeeId) {
  return apiRequest(`/work-sessions/employees/${employeeId}`);
}
