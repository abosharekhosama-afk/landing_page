export function companyInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export function createCompanySwitchGuard(switchCompany) {
  let pending = null;

  return function switchOnce(companyId) {
    if (pending) return pending;
    pending = Promise.resolve()
      .then(() => switchCompany(companyId))
      .finally(() => {
        pending = null;
      });
    return pending;
  };
}

export async function performSecureCompanySwitch(
  companyId,
  { enterScope, onSession, navigate },
) {
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedCompanyId) throw new Error("Select a company to continue.");

  const user = await enterScope(normalizedCompanyId);
  if (!user?.activeCompany?.id) {
    throw new Error("The scoped company session did not include a company context.");
  }

  onSession(user, user.activeCompany);
  navigate("admin", {
    company: user.activeCompany,
    modules: user.activeCompany.modules || [],
    path: "/admin/dashboard",
    role: user.role,
    replace: true,
  });
  return user;
}
