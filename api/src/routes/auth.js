import { Router } from "express";
import { hasPlatformAccess } from "../auth/roles.js";
import {
  companyMembershipRepository,
  companyRepository,
  deleteTenantUserMembership,
  persistCompanyStore,
  platformUserRepository,
  userRepository,
  workSessionRepository,
} from "../data/store.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";
import {
  publicUser,
  requireAuth,
  signCompanySelectionChallenge,
  signToken,
  verifyToken,
} from "../middleware/auth.js";
import { resolveClientIp } from "../middleware/ipBlock.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  checkLoginLock,
  clearFailedLogin,
  recordFailedLogin,
} from "../security/bruteForceProtection.js";
import { findActiveIpBlock } from "../security/ipBlocking.js";
import { recordLoginAttempt } from "../security/loginHistory.js";

function normalizePhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.startsWith("970")) return digits.slice(3);
  if (digits.startsWith("972")) return digits.slice(3);
  return digits.replace(/^0+/, "") || digits;
}

function headerCompanyId(req) {
  return String(req.headers["x-company-id"] || req.headers["x-company-slug"] || "").trim().toLowerCase();
}

function resolveSecurityCompanyId(req, membershipCompanyIds = []) {
  if (req.requestedCompanyId) return req.requestedCompanyId;
  if (req.companyId) return req.companyId;
  const header = headerCompanyId(req);
  if (header && companyRepository.getCompanyById(header)) return header;
  if (membershipCompanyIds.length === 1) return membershipCompanyIds[0];
  return null;
}

function denyIfBlockedOrLocked(res, companyId, email, ip) {
  if (!companyId) return null;
  if (ip && findActiveIpBlock(companyId, ip)) {
    res.status(403).json({ message: "Access denied." });
    return { denied: true, reason: "IP_BLOCKED" };
  }
  const lock = checkLoginLock(companyId, email);
  if (lock) {
    res.status(423).json({
      message: "Account temporarily locked due to failed login attempts.",
      lockedUntil: lock.locked_until,
    });
    return { denied: true, reason: "ACCOUNT_LOCKED" };
  }
  return null;
}

const router = Router();

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch((error) => {
    if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
    return next(error);
  });
}

function publicCompany(company) {
  if (!company) return null;
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    status: company.status,
  };
}

function publicMembership(membership) {
  if (!membership) return null;
  return {
    id: membership.id,
    companyId: membership.companyId,
    role: membership.role,
    status: membership.status,
    permissions: Array.isArray(membership._permissions) ? membership._permissions : [],
    updatedAt: membership.updatedAt || null,
  };
}

function sessionUser(user, membership) {
  if (!membership) return { ...user, globalRole: user.role };
  return {
    ...user,
    globalRole: user.role,
    role: membership.role,
    permissions: Array.isArray(membership._permissions) ? membership._permissions : [],
  };
}

function availableCompanies(memberships) {
  return memberships.map((membership) => ({
    ...publicCompany(membership.company),
    membership: publicMembership(membership),
  }));
}

async function createSessionResponse(user, membership, memberships = []) {
  const workSession = membership
    ? await startEmployeeSession(sessionUser(user, membership), membership.companyId)
    : null;
  const freshMembership = membership
    ? (await companyMembershipRepository.getMembershipByCompanyAndUser(membership.companyId, user.id)) || membership
    : null;
  const effectiveUser = sessionUser(user, freshMembership);
  const freshMemberships = memberships.length
    ? await companyMembershipRepository.listActiveMembershipsForUser(user.id)
    : memberships;
  return {
    token: signToken(user, freshMembership),
    user: publicUser(effectiveUser),
    activeCompany: publicCompany(freshMembership?.company),
    activeMembership: publicMembership(freshMembership),
    availableCompanies: availableCompanies(freshMemberships),
    workSession,
  };
}

function isStaffRole(role) {
  return role === "employee" || role === "staff";
}

async function startEmployeeSession(user, companyId) {
  if (!isStaffRole(user.role)) return null;
  const today = new Date().toISOString().slice(0, 10);
  let session = workSessionRepository.findByCompany(
    companyId,
    (entry) => entry.employeeId === user.id && entry.date === today && !entry.logoutTime,
  );
  if (!session) {
    session = {
      id: `session-${Date.now()}`,
      employeeId: user.id,
      employeeName: user.name,
      date: today,
      loginTime: new Date().toISOString(),
      logoutTime: null,
    };
    workSessionRepository.createForCompany(companyId, session, { prepend: true });
    await persistCompanyStore(companyId);
  }
  return session;
}

router.post("/login", rateLimit({ key: "login", max: 10, windowMs: 15 * 60_000 }), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const ip = req.clientIp || resolveClientIp(req);
  req.clientIp = ip;
  const headerId = headerCompanyId(req);
  const safeRecord = async ({ companyId, user = null, status, failureReason = "" }) => {
    try {
      if (!companyId) return;
      await recordLoginAttempt({ companyId, user, email: normalizedEmail, status, req, authenticationMethod: "PASSWORD", failureReason });
    } catch (error) {
      console.error("Failed to record login attempt:", error);
    }
  };

  const earlyCompanyId = resolveSecurityCompanyId(req);
  const earlyDeny = denyIfBlockedOrLocked(res, earlyCompanyId, normalizedEmail, ip);
  if (earlyDeny) {
    await safeRecord({ companyId: earlyCompanyId, status: "FAILURE", failureReason: earlyDeny.reason });
    return;
  }

  const user = await platformUserRepository.findByEmail(normalizedEmail);

  if (!user || user.isActive === false) {
    if (earlyCompanyId) await recordFailedLogin(earlyCompanyId, normalizedEmail, ip, req);
    await safeRecord({ companyId: earlyCompanyId || headerId, user, status: "FAILURE", failureReason: "INVALID_CREDENTIALS" });
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const memberships = hasPlatformAccess(user)
    ? []
    : await companyMembershipRepository.listActiveMembershipsForUser(user.id);
  const membershipCompanyIds = memberships.map((entry) => entry.companyId);
  const securityCompanyId = resolveSecurityCompanyId(req, membershipCompanyIds);

  const membershipDeny = denyIfBlockedOrLocked(res, securityCompanyId, normalizedEmail, ip);
  if (membershipDeny) {
    await safeRecord({ companyId: securityCompanyId, user, status: "FAILURE", failureReason: membershipDeny.reason });
    return;
  }

  if (!(await verifyPassword(password, user.password))) {
    const failureCompanies = securityCompanyId ? [securityCompanyId] : membershipCompanyIds;
    for (const companyId of failureCompanies) {
      await recordFailedLogin(companyId, normalizedEmail, ip, req);
    }
    await safeRecord({
      companyId: securityCompanyId || failureCompanies[0] || headerId,
      user,
      status: "FAILURE",
      failureReason: "INVALID_PASSWORD",
    });
    return res.status(401).json({ message: "Invalid email or password." });
  }

  if (hasPlatformAccess(user)) {
    return res.json(await createSessionResponse(user, null));
  }

  if (!memberships.length) {
    return res.status(403).json({ message: "No active company membership is available for this account." });
  }
  if (req.requestedCompanyId) {
    const storefrontMembership = memberships.find(
      (membership) => membership.companyId === req.requestedCompanyId,
    );
    if (!storefrontMembership) {
      await safeRecord({ companyId: headerId || req.requestedCompanyId, user, status: "FAILURE", failureReason: "NO_STOREFRONT_MEMBERSHIP" });
      return res.status(403).json({ message: "Active membership for this storefront is required." });
    }
    const storefrontDeny = denyIfBlockedOrLocked(res, storefrontMembership.companyId, normalizedEmail, ip);
    if (storefrontDeny) {
      await safeRecord({ companyId: storefrontMembership.companyId, user, status: "FAILURE", failureReason: storefrontDeny.reason });
      return;
    }
    await clearFailedLogin(storefrontMembership.companyId, normalizedEmail, ip);
    await safeRecord({ companyId: storefrontMembership.companyId, user, status: "SUCCESS" });
    return res.json(await createSessionResponse(user, storefrontMembership, memberships));
  }
  if (memberships.length > 1) {
    const available = availableCompanies(memberships).filter((company) => {
      if (ip && findActiveIpBlock(company.id, ip)) return false;
      if (checkLoginLock(company.id, normalizedEmail)) return false;
      return true;
    });
    if (!available.length) {
      return res.status(403).json({ message: "Access denied." });
    }
    return res.json({
      companySelectionRequired: true,
      selectionChallenge: signCompanySelectionChallenge(user),
      availableCompanies: available,
    });
  }
  const onlyCompanyId = memberships[0].companyId;
  const onlyDeny = denyIfBlockedOrLocked(res, onlyCompanyId, normalizedEmail, ip);
  if (onlyDeny) {
    await safeRecord({ companyId: onlyCompanyId, user, status: "FAILURE", failureReason: onlyDeny.reason });
    return;
  }
  await clearFailedLogin(onlyCompanyId, normalizedEmail, ip);
  await safeRecord({ companyId: onlyCompanyId, user, status: "SUCCESS" });
  return res.json(await createSessionResponse(user, memberships[0], memberships));
}));

router.post("/select-company", asyncHandler(async (req, res) => {
  const selectionChallenge = String(req.body?.selectionChallenge || "");
  const companyId = String(req.body?.companyId || "").trim().toLowerCase();
  const challenge = verifyToken(selectionChallenge);
  if (!challenge || challenge.tokenType !== "company_selection" || !challenge.id) {
    return res.status(401).json({ message: "Invalid or expired company selection challenge." });
  }
  const user = await platformUserRepository.getUserById(challenge.id);
  if (!user || user.isActive === false || user.role !== challenge.role || hasPlatformAccess(user)) {
    return res.status(401).json({ message: "Invalid or expired company selection challenge." });
  }
  const memberships = await companyMembershipRepository.listActiveMembershipsForUser(user.id);
  const membership = memberships.find((entry) => entry.companyId === companyId);
  if (!membership) {
    return res.status(403).json({ message: "Active membership for the selected company is required." });
  }
  const ip = req.clientIp || resolveClientIp(req);
  req.clientIp = ip;
  const selectDeny = denyIfBlockedOrLocked(res, companyId, user.email, ip);
  if (selectDeny) return;
  await clearFailedLogin(companyId, user.email, ip);
  try {
    await recordLoginAttempt({ companyId, user, email: user.email, status: "SUCCESS", req, authenticationMethod: "PASSWORD" });
  } catch (error) {
    console.error("Failed to record login attempt:", error);
  }
  return res.json(await createSessionResponse(user, membership, memberships));
}));

router.post("/register", asyncHandler(async (req, res) => {
  const { name, email, phone: rawPhone, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const phone = normalizePhone(rawPhone);
  if (await platformUserRepository.findByEmail(normalizedEmail)) {
    return res.status(409).json({ message: "Email already exists." });
  }

  const validAccountTypes = new Set(["retail", "trader", "wholesale"]);
  const accountType = validAccountTypes.has(req.body.accountType) ? req.body.accountType : "retail";

  // Check if a phone-linked points user already exists and inherit their balance
  let existingPoints = 0;
  let existingEarned = 0;
  let existingRedeemed = 0;
  if (phone) {
    const phoneUser = userRepository.findByCompany(req.companyId, (u) => normalizePhone(u.phone) === phone && u.id.startsWith("points-"));
    if (phoneUser) {
      existingPoints = Math.max(0, Number(phoneUser.ebPoints || 0));
      existingEarned = Math.max(0, Number(phoneUser.totalPointsEarned || 0));
      existingRedeemed = Math.max(0, Number(phoneUser.totalPointsRedeemed || 0));
      await deleteTenantUserMembership(req.companyId, phoneUser.id);
    }
  }

  const user = {
    id: `customer-${Date.now()}`,
    name,
    email: normalizedEmail,
    phone,
    password: await hashPassword(password),
    role: "customer",
    permissions: [],
    accountType,
    ebPoints: existingPoints,
    totalPointsEarned: existingEarned,
    totalPointsRedeemed: existingRedeemed,
    isActive: true,
  };
  const createdUser = userRepository.createForCompany(req.companyId, user);
  await persistCompanyStore(req.companyId);
  const membership = await companyMembershipRepository.getMembershipByCompanyAndUser(
    req.companyId,
    createdUser.id,
  );
  return res.status(201).json(await createSessionResponse(
    createdUser, membership, membership ? [membership] : [],
  ));
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = { ...req.user };
  const userPhone = normalizePhone(user.phone);
  if (userPhone && user.globalRole !== "super_admin") {
    const phoneUser = userRepository.findByCompany(
      req.companyId,
      (u) => u.id !== user.id && normalizePhone(u.phone) === userPhone,
    );
    if (phoneUser) {
      user.ebPoints = Math.max(0, Number(user.ebPoints || 0)) + Math.max(0, Number(phoneUser.ebPoints || 0));
      user.totalPointsEarned = Math.max(0, Number(user.totalPointsEarned || 0)) + Math.max(0, Number(phoneUser.totalPointsEarned || 0));
      user.totalPointsRedeemed = Math.max(0, Number(user.totalPointsRedeemed || 0)) + Math.max(0, Number(phoneUser.totalPointsRedeemed || 0));
    }
  }
  const actorRole = user.globalRole || user.role;
  const memberships = hasPlatformAccess({ role: actorRole })
    ? []
    : await companyMembershipRepository.listActiveMembershipsForUser(user.id);
  const safeUser = req.tenantScope
    ? { ...publicUser(user), role: "company_admin", globalRole: actorRole, isCompanyScope: true }
    : publicUser(user);
  res.json({
    ...safeUser,
    user: safeUser,
    activeCompany: publicCompany(req.company),
    activeMembership: publicMembership(req.membership),
    availableCompanies: availableCompanies(memberships),
  });
}));

router.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  try {
    if (!req.companyId || !req.membership) {
      return res.status(403).json({ message: "An active company membership is required." });
    }
    const allowed = ["name", "email", "phone", "city", "address", "avatarUrl"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.phone) updates.phone = normalizePhone(updates.phone);
    if (
      updates.name === undefined &&
      updates.email === undefined &&
      updates.phone === undefined &&
      updates.city === undefined &&
      updates.address === undefined &&
      updates.avatarUrl === undefined
    ) {
      return res.status(400).json({ message: "No valid fields to update." });
    }
    const updated = userRepository.updateForCompany(req.companyId, req.user.id, updates, { touchMembership: false });
    if (!updated) return res.status(404).json({ message: "User not found." });

    let persistTimer;
    try {
      await Promise.race([
        persistCompanyStore(req.companyId),
        new Promise((_, reject) => {
          persistTimer = setTimeout(() => reject(new Error("Profile persistence timed out.")), 5000);
        }),
      ]);
    } catch (persistError) {
      console.error("Profile update persistence failed:", persistError);
    } finally {
      if (persistTimer) clearTimeout(persistTimer);
    }

    return res.json(publicUser(updated));
  } catch (error) {
    console.error("Profile update failed:", error);
    return res.status(500).json({ message: "Unable to update profile. Please try again." });
  }
}));

router.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  const user = req.user;

  let workSession = null;
  if (isStaffRole(user?.role)) {
    workSession = workSessionRepository.findByCompany(
      req.companyId,
      (entry) => entry.employeeId === user.id && !entry.logoutTime,
    );
    if (workSession) {
      workSession.logoutTime = new Date().toISOString();
      await persistCompanyStore(req.companyId);
    }
  }

  res.json({ workSession });
}));

export default router;
