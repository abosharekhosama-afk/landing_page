import { apiRequest } from "./api.js";

export function fetchEmployees() {
  return apiRequest("/employees");
}

export function createEmployee(employee) {
  return apiRequest("/employees", {
    method: "POST",
    body: JSON.stringify(employee),
  });
}

export function updateEmployee(employee) {
  return apiRequest(`/employees/${employee.id}`, {
    method: "PUT",
    body: JSON.stringify(employee),
  });
}

export function updateEmployeePermissions(employeeId, permissions) {
  return apiRequest(`/employees/${employeeId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });
}

export function updateEmployeeStatus(employeeId, isActive) {
  return apiRequest(`/employees/${employeeId}/status`, {
    method: "PUT",
    body: JSON.stringify({ isActive }),
  });
}

export function deleteEmployee(employeeId) {
  return apiRequest(`/employees/${employeeId}`, {
    method: "DELETE",
  });
}
