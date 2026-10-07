import { Router } from "express";
import { persistCompanyStore, workSessionRepository } from "../data/store.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isStaffRole(role) {
  return role === "employee" || role === "staff";
}

function findOpenSession(companyId, user) {
  return workSessionRepository.findByCompany(
    companyId,
    (session) => session.employeeId === user.id && session.date === todayKey() && !session.logoutTime,
  );
}

function sessionMinutes(session, endTime = new Date()) {
  const loginTime = session?.loginTime ? new Date(session.loginTime) : null;
  if (!loginTime || Number.isNaN(loginTime.getTime())) return 0;
  const end = endTime instanceof Date ? endTime : new Date(endTime);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end.getTime() - loginTime.getTime()) / 60000));
}

router.post("/start", async (req, res) => {
  if (!isStaffRole(req.user.role)) {
    return res.status(403).json({ message: "Only employees can start work sessions." });
  }

  let session = findOpenSession(req.companyId, req.user);
  if (!session) {
    const now = new Date().toISOString();
    session = {
      id: `session-${Date.now()}`,
      employeeId: req.user.id,
      employeeName: req.user.name,
      date: todayKey(),
      loginTime: now,
      logoutTime: null,
      lastActivityAt: now,
    };
    workSessionRepository.createForCompany(req.companyId, session, { prepend: true });
    await persistCompanyStore(req.companyId);
  }
  return res.json(session);
});

router.post("/end", async (req, res) => {
  const session = findOpenSession(req.companyId, req.user);
  if (!session) return res.status(404).json({ message: "No open work session." });

  const logoutTime = new Date();
  session.logoutTime = logoutTime.toISOString();
  session.lastActivityAt = session.logoutTime;
  session.totalMinutes = sessionMinutes(session, logoutTime);
  await persistCompanyStore(req.companyId);
  return res.json(session);
});

router.post("/heartbeat", async (req, res) => {
  if (!isStaffRole(req.user.role)) {
    return res.status(403).json({ message: "Only employees can send heartbeat." });
  }

  const session = findOpenSession(req.companyId, req.user);
  if (!session) return res.status(404).json({ message: "No open work session." });

  session.lastActivityAt = new Date().toISOString();
  await persistCompanyStore(req.companyId);
  return res.json({ ok: true });
});

router.get("/my-today", (req, res) => {
  if (!isStaffRole(req.user.role)) return res.json(null);
  return res.json(findOpenSession(req.companyId, req.user) || null);
});

router.get("/employees", requireAdmin, (req, res) => {
  return res.json(workSessionRepository.getByCompany(req.companyId));
});

router.get("/employees/:employeeId", (req, res) => {
  const canReadOwnSessions = isStaffRole(req.membershipRole)
    && req.user.id === req.params.employeeId;
  if (
    !["admin", "company_admin"].includes(req.membershipRole)
    && !canReadOwnSessions
  ) {
    return res.status(403).json({ message: "Work session access denied." });
  }
  return res.json(
    workSessionRepository
      .getByCompany(req.companyId)
      .filter((session) => session.employeeId === req.params.employeeId),
  );
});

export default router;
