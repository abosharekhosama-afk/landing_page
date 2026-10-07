import {
  apiRequest,
  clearAuthSession,
  getToken,
  getStoredUser,
  setAuthSession,
} from "./api.js";
import {
  clearTenantCaches,
  getStoredCompanyContext,
  sanitizeCompanyContext,
  setStoredCompanyContext,
} from "./companyContext.js";
import {
  recordCompanyScopeExit,
  requestCompanyScope,
} from "./platformCompaniesApi.js";
import { effectivePlatformRole, isPlatformAdmin } from "./roles.js";

const platformSessionKey = "cpanelPlatformSession";

function authenticatedUser(session) {
  if (!session) return null;
  const user = session.user || session;
  return {
    ...user,
    activeCompany: sanitizeCompanyContext(session.activeCompany || user.activeCompany),
    activeMembership: session.activeMembership || user.activeMembership || null,
  };
}

export function getCurrentUser() {
  const user = getStoredUser();
  return user
    ? { ...user, activeCompany: getStoredCompanyContext() || user.activeCompany || null }
    : null;
}

export function setCurrentUser(user) {
  if (!user) {
    clearTenantCaches();
    clearAuthSession();
    return;
  }

  localStorage.setItem("epChemicalUser", JSON.stringify(user));
}

export async function loginUser(email, password) {
  sessionStorage.removeItem(platformSessionKey);
  const session = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  clearTenantCaches();
  setAuthSession(session);
  const companyContext = session.activeCompany
    ? await apiRequest("/company/context")
    : null;
  const activeCompany = setStoredCompanyContext({
    ...session.activeCompany,
    ...companyContext,
  });
  const user = authenticatedUser({ ...session, activeCompany });
  localStorage.setItem("epChemicalUser", JSON.stringify(user));
  return { ...session, user, activeCompany };
}

export async function registerCustomer({ name, email, phone, password }) {
  const session = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, phone, password }),
  });
  setAuthSession(session);
  return {
    error: "",
    user: session.user,
  };
}

export async function fetchCurrentUser() {
  if (!getToken()) {
    setCurrentUser(null);
    return null;
  }

  const session = await apiRequest("/auth/me");
  const companyContext = session.activeCompany
    ? await apiRequest("/company/context")
    : null;
  const activeCompany = setStoredCompanyContext({
    ...session.activeCompany,
    ...companyContext,
  });
  const user = authenticatedUser({ ...session, activeCompany });
  setCurrentUser(user);
  return user;
}

export async function logoutUser() {
  try {
    return await apiRequest("/auth/logout", {
      method: "POST",
    });
  } finally {
    sessionStorage.removeItem(platformSessionKey);
    clearTenantCaches();
    clearAuthSession();
  }
}

export async function enterCompanyScope(companyId) {
  const currentToken = getToken();
  const currentUser = getStoredUser();
  const currentCompany = getStoredCompanyContext();
  if (!currentToken || !isPlatformAdmin(effectivePlatformRole(currentUser))) {
    throw new Error("A Super Admin session is required.");
  }
  const storedPlatformSession = sessionStorage.getItem(platformSessionKey);
  const session = await requestCompanyScope(companyId);

  try {
    // The context endpoint must use the scoped JWT. Keep the transition
    // transactional so a failed context refresh cannot strand the UI with it.
    setAuthSession(session);
    const companyContext = await apiRequest("/company/context");
    clearTenantCaches();
    const activeCompany = setStoredCompanyContext({
      ...session.activeCompany,
      ...companyContext,
    });
    const user = authenticatedUser({ ...session, activeCompany });
    localStorage.setItem("epChemicalUser", JSON.stringify(user));
    if (!storedPlatformSession) {
      sessionStorage.setItem(
        platformSessionKey,
        JSON.stringify({ token: currentToken, user: currentUser }),
      );
    }
    return user;
  } catch (error) {
    setAuthSession({ token: currentToken, user: currentUser });
    setStoredCompanyContext(currentCompany);
    throw error;
  }
}

export async function exitCompanyScope() {
  const stored = sessionStorage.getItem(platformSessionKey);
  if (!stored) throw new Error("The original platform session is unavailable. Please sign in again.");
  try {
    await recordCompanyScopeExit();
  } catch {
    // Audit failure must not trap the user in a tenant scope.
  }
  const session = JSON.parse(stored);
  clearTenantCaches();
  setAuthSession(session);
  setStoredCompanyContext(null);
  sessionStorage.removeItem(platformSessionKey);
  const user = { ...session.user, activeCompany: null };
  localStorage.setItem("epChemicalUser", JSON.stringify(user));
  return user;
}
