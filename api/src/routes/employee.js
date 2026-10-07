import { Router } from "express";
import crypto from "node:crypto";
import {
  companyMembershipRepository,
  deleteTenantUserMembership,
  persistCompanyStore,
  userRepository,
  workSessionRepository,
} from "../data/store.js";
import { publicUser, requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch((error) => {
    if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
    return next(error);
  });
}

router.get("/", requireAuth, requireAdmin, (req, res) => {
  res.json(userRepository.getByCompany(req.companyId, { includeInactive: true }).filter((user) => user.role === "employee").map(publicUser));
});

router.post("/", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const employee = {
    ...req.body,
    id: `employee-${crypto.randomUUID()}`,
    role: "employee",
    password: req.body.password || "employee123",
    permissions: req.body.permissions || ["dashboard.view", "products.view", "orders.view"],
    isActive: req.body.isActive !== false,
  };
  const created = userRepository.createForCompany(req.companyId, employee, {
    requestedId: req.body.id,
  });
  await persistCompanyStore(req.companyId);
  res.status(201).json(publicUser(created));
}));

router.put("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const employee = userRepository.findByCompany(
    req.companyId,
    (user) => user.id === req.params.id && user.role === "employee",
    { includeInactive: true },
  );
  if (!employee) return res.status(404).json({ message: "Employee not found." });

  const updated = userRepository.updateForCompany(req.companyId, employee.id, {
    ...req.body,
    id: employee.id,
    role: "employee",
  }, { includeInactive: true });
  await persistCompanyStore(req.companyId);
  await companyMembershipRepository.updateMembership(req.companyId, employee.id, {
    role: "employee",
    status: updated.isActive === false ? "inactive" : "active",
    permissions: updated.permissions,
  });
  return res.json(publicUser(updated));
}));

router.put("/:id/permissions", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const employee = userRepository.findByCompany(
    req.companyId,
    (user) => user.id === req.params.id && user.role === "employee",
    { includeInactive: true },
  );
  if (!employee) return res.status(404).json({ message: "Employee not found." });

  const updated = userRepository.updateForCompany(req.companyId, employee.id, {
    permissions: req.body.permissions || [],
  }, { includeInactive: true });
  await companyMembershipRepository.updateMembership(req.companyId, employee.id, {
    permissions: updated.permissions,
  });
  return res.json(publicUser(updated));
}));

router.put("/:id/status", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const employee = userRepository.findByCompany(
    req.companyId,
    (user) => user.id === req.params.id && user.role === "employee",
    { includeInactive: true },
  );
  if (!employee) return res.status(404).json({ message: "Employee not found." });

  const isActive = Boolean(req.body.isActive);
  const updated = userRepository.updateForCompany(req.companyId, employee.id, { isActive }, { includeInactive: true });
  await companyMembershipRepository.updateMembership(req.companyId, employee.id, {
    status: isActive ? "active" : "inactive",
  });
  return res.json(publicUser(updated));
}));

router.delete("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const employee = userRepository.findByCompany(
    req.companyId,
    (user) => user.id === req.params.id && user.role === "employee",
    { includeInactive: true },
  );
  if (!employee) return res.status(404).json({ message: "Employee not found." });

  await deleteTenantUserMembership(req.companyId, employee.id);
  return res.status(204).end();
}));

router.get("/work-sessions", requireAuth, requireAdmin, (req, res) => {
  res.json(workSessionRepository.getByCompany(req.companyId));
});

export default router;
