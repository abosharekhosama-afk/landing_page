import { Router } from "express";
import {
  companyMembershipRepository,
  currentStoreSnapshot,
  orderRepository,
  platformUserRepository,
  persistCompanyStore,
  productRepository,
  reviewRepository,
  userRepository,
  workSessionRepository,
} from "../data/store.js";
import {
  contactMatchesQuery,
  parseContactQuery,
  safeContactResponse,
  validateContactInput,
} from "../customers/contactContract.js";
import { requireAdmin, requireAnyPermission, requireAuth } from "../middleware/auth.js";
import { filterActiveProducts } from "../products/trashLifecycle.js";

const router = Router();

router.use(requireAuth);

const VALID_ACCOUNT_TYPES = new Set(["retail", "trader", "wholesale"]);
const canReadCustomers = requireAnyPermission("customers.view", "customers.manage");
const canCreateCustomers = requireAnyPermission("customers.create", "customers.manage");
const canUpdateCustomers = requireAnyPermission("customers.update", "customers.manage");
const canArchiveCustomers = requireAnyPermission("customers.archive", "customers.manage");

function customerOrderCounts(companyId) {
  const counts = new Map();
  for (const order of orderRepository.getByCompany(companyId)) {
    if (!order.customerUserId) continue;
    counts.set(order.customerUserId, (counts.get(order.customerUserId) || 0) + 1);
  }
  return counts;
}

function customerReviewCounts(companyId) {
  const counts = new Map();
  for (const review of reviewRepository.getByCompany(companyId)) {
    const userId = review.customerUserId || review.customerId || "";
    if (!userId) continue;
    counts.set(userId, (counts.get(userId) || 0) + 1);
  }
  return counts;
}

function sendCustomerError(res, error, fallbackMessage) {
  const status = Number(error?.statusCode || 500);
  if (status >= 500) console.error(fallbackMessage, error?.message || error);
  return res.status([400, 401, 403, 404, 409].includes(status) ? status : 500).json({
    message: status >= 500 ? fallbackMessage : error.message,
    ...(status === 400 && error?.details ? { errors: error.details } : {}),
  });
}

async function customerMembership(companyId, customerId) {
  const membership = await companyMembershipRepository.getMembershipByCompanyAndUser(companyId, customerId);
  if (!membership || membership.role !== "customer" || !membership.user) {
    const error = new Error("Contact not found.");
    error.statusCode = 404;
    throw error;
  }
  return membership;
}

router.get("/summary", requireAdmin, (req, res) => {
  const users = userRepository.getByCompany(req.companyId);
  res.json({
    products: filterActiveProducts(productRepository.getByCompany(req.companyId)).length,
    orders: orderRepository.getByCompany(req.companyId).length,
    employees: users.filter((user) => user.role === "employee").length,
    customers: users.filter((user) => user.role === "customer").length,
    workSessions: workSessionRepository.getByCompany(req.companyId).length,
  });
});

router.get("/customers", canReadCustomers, async (req, res) => {
  try {
    const query = parseContactQuery(req.query);
    const memberships = await companyMembershipRepository.listUsersForCompany(req.companyId);
    const orderCounts = customerOrderCounts(req.companyId);
    const reviewCounts = customerReviewCounts(req.companyId);
    const filtered = memberships
      .filter((membership) => membership.role === "customer" && membership.user)
      .map((membership) =>
        safeContactResponse(
          membership,
          orderCounts.get(membership.userId),
          reviewCounts.get(membership.userId),
        ),
      )
      .filter((contact) => contactMatchesQuery(contact, query));
    const total = filtered.length;
    if (query.page !== null) {
      const start = (query.page - 1) * query.limit;
      const items = filtered.slice(start, start + query.limit);
      return res.json({
        items,
        total,
        page: query.page,
        limit: query.limit,
        summary: {
          total,
          customers: filtered.filter((contact) => contact.type === "customer").length,
          active: filtered.filter((contact) => !contact.isArchived).length,
          archived: filtered.filter((contact) => contact.isArchived).length,
        },
      });
    }
    return res.json(filtered);
  } catch (error) {
    return sendCustomerError(res, error, "Unable to load contacts.");
  }
});

router.post("/customers", canCreateCustomers, async (req, res) => {
  try {
    const values = validateContactInput(req.body, { create: true });
    const membership = await companyMembershipRepository.createCustomerContact(req.companyId, values);
    return res.status(201).json(safeContactResponse(membership));
  } catch (error) {
    return sendCustomerError(res, error, "Unable to create contact.");
  }
});

router.get("/customers/:customerId", canReadCustomers, async (req, res) => {
  try {
    const membership = await customerMembership(req.companyId, req.params.customerId);
    const orderCount = customerOrderCounts(req.companyId).get(membership.userId);
    const reviewCount = customerReviewCounts(req.companyId).get(membership.userId);
    return res.json(safeContactResponse(membership, orderCount, reviewCount));
  } catch (error) {
    return sendCustomerError(res, error, "Unable to load contact.");
  }
});

router.patch("/customers/:customerId", canUpdateCustomers, async (req, res) => {
  try {
    const membership = await customerMembership(req.companyId, req.params.customerId);
    const values = validateContactInput(req.body);
    if (
      (Object.prototype.hasOwnProperty.call(values, "firstName")
        || Object.prototype.hasOwnProperty.call(values, "lastName"))
      && !Object.prototype.hasOwnProperty.call(values, "displayName")
      && !Object.prototype.hasOwnProperty.call(values, "name")
    ) {
      values.displayName = [
        values.firstName ?? membership.user.firstName,
        values.lastName ?? membership.user.lastName,
      ].filter(Boolean).join(" ");
      values.name = values.displayName;
    }
    const user = await platformUserRepository.updateUser(membership.userId, values);
    const orderCount = customerOrderCounts(req.companyId).get(membership.userId);
    const reviewCount = customerReviewCounts(req.companyId).get(membership.userId);
    return res.json(safeContactResponse({ ...membership, user }, orderCount, reviewCount));
  } catch (error) {
    return sendCustomerError(res, error, "Unable to update contact.");
  }
});

router.post("/customers/:customerId/archive", canArchiveCustomers, async (req, res) => {
  try {
    await customerMembership(req.companyId, req.params.customerId);
    const membership = await companyMembershipRepository.updateMembership(
      req.companyId,
      req.params.customerId,
      { status: "inactive" },
    );
    return res.json(safeContactResponse(
      membership,
      customerOrderCounts(req.companyId).get(membership.userId),
      customerReviewCounts(req.companyId).get(membership.userId),
    ));
  } catch (error) {
    return sendCustomerError(res, error, "Unable to archive contact.");
  }
});

router.post("/customers/:customerId/restore", canArchiveCustomers, async (req, res) => {
  try {
    await customerMembership(req.companyId, req.params.customerId);
    const membership = await companyMembershipRepository.updateMembership(
      req.companyId,
      req.params.customerId,
      { status: "active" },
    );
    return res.json(safeContactResponse(
      membership,
      customerOrderCounts(req.companyId).get(membership.userId),
      customerReviewCounts(req.companyId).get(membership.userId),
    ));
  } catch (error) {
    return sendCustomerError(res, error, "Unable to restore contact.");
  }
});

router.patch("/users/:id/account-type", canUpdateCustomers, async (req, res) => {
  try {
    const user = userRepository.findByCompany(req.companyId, req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role !== "customer") {
      return res.status(400).json({ message: "Only customer account type can be changed from this page." });
    }

    const accountType = req.body.accountType;
    if (!accountType || !VALID_ACCOUNT_TYPES.has(accountType)) {
      return res.status(400).json({
        message: "Account type must be one of: retail, trader, wholesale.",
      });
    }

    user.accountType = accountType;
    user.updatedAt = new Date().toISOString();

    let persistTimer;
    try {
      await Promise.race([
        persistCompanyStore(req.companyId),
        new Promise((_, reject) => {
          persistTimer = setTimeout(() => reject(new Error("Account type persistence timed out.")), 5000);
        }),
      ]);
    } catch (persistError) {
      console.error("Account type persistence failed:", persistError);
    } finally {
      if (persistTimer) clearTimeout(persistTimer);
    }

    const orderCount = orderRepository
      .getByCompany(req.companyId)
      .filter((order) => order.customerUserId === user.id).length;
    const reviewCount = reviewRepository
      .getByCompany(req.companyId)
      .filter((review) => review.customerUserId === user.id || review.customerId === user.id).length;

    return res.json({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      accountType: user.accountType,
      isActive: user.isActive !== false,
      orderCount,
      reviewCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Account type update failed:", error);
    return res.status(500).json({ message: "Unable to update account type." });
  }
});

router.get("/export-store", requireAdmin, (req, res) => {
  res.json(currentStoreSnapshot(req.companyId));
});

export default router;
