export function canSeeInventoryCost(user, company) {
  const enabled = company?.settings?.costPriceEnabled === true;
  if (!enabled) return false;
  const role = user?.role;
  if (role === "admin" || role === "company_admin" || role === "manager") return true;
  return Array.isArray(user?.permissions) && user.permissions.includes("products.cost_price.manage");
}
