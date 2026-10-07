export const platformRoles = Object.freeze({
  SUPER_ADMIN: "super_admin",
  PLATFORM_ADMIN: "platform_admin",
  COMPANY_ADMIN: "company_admin",
  EMPLOYEE: "employee",
  CUSTOMER: "customer",
});

/** Roles a platform user directory can assign. super_admin is never assignable. */
export const assignablePlatformUserRoles = Object.freeze([
  "admin",
  "manager",
  "company_admin",
  "employee",
  "staff",
  "customer",
  "platform_admin",
]);

export const legacyRoles = Object.freeze({
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
});

export function hasRole(user, role) {
  return Boolean(user && typeof user.role === "string" && user.role === role);
}

export function isSuperAdmin(user) {
  return hasRole(user, platformRoles.SUPER_ADMIN);
}

export function isPlatformAdmin(user) {
  return hasRole(user, platformRoles.PLATFORM_ADMIN);
}

/** Super Admin or delegated platform admin. Company roles are not included. */
export function hasPlatformAccess(user) {
  return isSuperAdmin(user) || isPlatformAdmin(user);
}

export function assignablePlatformUserRoleError() {
  return `role must be one of: ${assignablePlatformUserRoles.join(", ")}.`;
}

export function isCompanyAdmin(user) {
  return hasRole(user, platformRoles.COMPANY_ADMIN) || hasRole(user, legacyRoles.ADMIN);
}
