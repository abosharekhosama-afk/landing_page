import { Router } from "express";
import {
  orderRepository,
  persistCompanyStore,
  productRepository,
  reviewRepository,
  userRepository,
} from "../data/store.js";
import { optionalAuth, requireAuth, requireAnyPermission } from "../middleware/auth.js";

const router = Router();
const reviewRead = requireAnyPermission("reviews.view", "reviews.manage");
const reviewWrite = requireAnyPermission("reviews.manage");

// Review types that must survive save/reload untouched.
const VALID_REVIEW_TYPES = ["product", "website", "order", "employee", "store", "site"];

// Resolve and tenant-validate the type linkage for a review write.
// Returns { productId, employeeId, employeeName } or { error, status }.
function resolveReviewLinks(companyId, { type, productId, employeeId, employeeName }) {
  if (type === "product") {
    const trimmedProductId = String(productId || "").trim();
    if (!trimmedProductId) {
      return { error: "A product is required for product reviews.", status: 400 };
    }
    const product = productRepository.findByCompany(companyId, trimmedProductId);
    if (!product) {
      return { error: "Product not found for this company.", status: 404 };
    }
    return { productId: trimmedProductId, employeeId: "", employeeName: "" };
  }
  if (type === "employee") {
    const trimmedEmployeeId = String(employeeId || "").trim();
    if (!trimmedEmployeeId) {
      return { error: "An employee is required for employee reviews.", status: 400 };
    }
    const employee = userRepository.findByCompany(companyId, trimmedEmployeeId);
    if (!employee || employee.role !== "employee") {
      return { error: "Employee not found for this company.", status: 404 };
    }
    return {
      productId: "",
      employeeId: trimmedEmployeeId,
      employeeName: String(employeeName || "").trim() || employee.name || "",
    };
  }
  return { productId: "", employeeId: "", employeeName: "" };
}

function visibleReviews(items) {
  return items
    .filter((review) => review.isActive && review.isApproved !== false && review.status === "approved")
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function reviewRating(review) {
  const parsed = Number(review.rating);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(5, parsed)) : null;
}

// Aggregate summary from approved-only reviews: averageRating, reviewCount,
// and a 1..5 ratingDistribution. reviewCount counts every approved review;
// averageRating is computed from reviews that carry a numeric rating.
function buildReviewSummary(reviews) {
  const rated = reviews.map(reviewRating).filter((rating) => rating !== null);
  const reviewCount = reviews.length;
  const averageRating = rated.length
    ? Math.round((rated.reduce((sum, rating) => sum + rating, 0) / rated.length) * 10) / 10
    : 0;
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rating of rated) {
    ratingDistribution[Math.round(rating)] += 1;
  }
  return { averageRating, reviewCount, ratingDistribution };
}

async function persistReviewsSafely(companyId, options = {}) {
  let timer;
  try {
    await Promise.race([
      persistCompanyStore(companyId, options),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Review persistence timed out.")), 5000);
      }),
    ]);
  } catch (error) {
    console.error("Review persistence failed:", error);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

router.get("/", optionalAuth, (req, res) => {
  const typeFilter = req.query.type || "website";
  const featuredOnly = req.query.featured === "true";
  let reviews = visibleReviews(reviewRepository.getByCompany(req.companyId)).filter(
    (review) => review.type === typeFilter,
  );
  if (featuredOnly) reviews = reviews.filter((review) => review.featured === true);
  res.json(reviews);
});

router.get("/product/:productId", optionalAuth, (req, res) => {
  res.json(
    visibleReviews(reviewRepository.getByCompany(req.companyId)).filter(
      (review) => review.type === "product" && review.productId === req.params.productId,
    ),
  );
});

router.get("/product/:productId/summary", optionalAuth, (req, res) => {
  const reviews = visibleReviews(reviewRepository.getByCompany(req.companyId)).filter(
    (review) => review.type === "product" && review.productId === req.params.productId,
  );
  res.json(buildReviewSummary(reviews));
});

router.get("/store/summary", optionalAuth, (req, res) => {
  const reviews = visibleReviews(reviewRepository.getByCompany(req.companyId)).filter((review) =>
    ["website", "store", "site"].includes(review.type),
  );
  res.json(buildReviewSummary(reviews));
});

router.get("/employee/:employeeId", optionalAuth, (req, res) => {
  res.json(
    visibleReviews(reviewRepository.getByCompany(req.companyId)).filter(
      (review) => review.type === "employee" && review.employeeId === req.params.employeeId,
    ),
  );
});

router.get("/all", requireAuth, reviewRead, (req, res) => {
  return res.json(reviewRepository.getByCompany(req.companyId));
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const type = req.body.type || "website";
    const allowedTypes = VALID_REVIEW_TYPES;
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid review type." });
    }

    let order = null;
    if (req.body.orderId) {
      const orders = orderRepository.getByCompany(req.companyId);
      order = orders.find((entry) => entry.id === req.body.orderId);
    }

    if (
      req.user.role === "customer" &&
      type !== "website" &&
      (!order || order.customerUserId !== req.user.id)
    ) {
      return res.status(403).json({ message: "A completed interaction is required before reviewing." });
    }

    // Link integrity: linked reviews must point at a record from this tenant.
    // An employee review may inherit its employee from the reviewed order.
    const links = resolveReviewLinks(req.companyId, {
      type,
      productId: req.body.productId,
      employeeId:
        req.body.employeeId || order?.handledByEmployeeId || order?.assignedToEmployeeId || "",
      employeeName: req.body.employeeName || order?.createdByEmployeeName || "",
    });
    if (links.error) {
      return res.status(links.status).json({ message: links.error });
    }

    const now = new Date().toISOString();
    const status = req.user.role === "customer" ? "pending" : req.body.status || "approved";

    // One active product review per customer+product: a customer resubmitting a
    // product review replaces any existing pending/approved review for the same
    // user+product instead of stacking duplicates.
    if (req.user.role === "customer" && type === "product") {
      const existing = reviewRepository
        .getByCompany(req.companyId)
        .filter(
          (entry) =>
            entry.type === "product"
            && entry.productId === links.productId
            && (entry.customerUserId === req.user.id || entry.customerId === req.user.id)
            && ["pending", "approved"].includes(entry.status),
        );
      for (const entry of existing) {
        reviewRepository.deleteForCompany(req.companyId, entry.id);
      }
    }

    const review = {
      ...req.body,
      id: req.body.id || `review-${Date.now()}`,
      type,
      customerName: req.body.customerName || req.user.name || "Customer",
      customerUserId: req.user.role === "customer" ? req.user.id : req.body.customerUserId || "",
      customerId: req.user.role === "customer" ? req.user.id : req.body.customerId || "",
      productId: links.productId,
      orderId: req.body.orderId || order?.id || "",
      employeeId: links.employeeId,
      employeeName: links.employeeName,
      createdAt: req.body.createdAt || now,
      updatedAt: now,
      status,
      isApproved: req.user.role === "customer" ? false : status !== "rejected",
      isActive: req.user.role === "customer" ? false : req.body.isActive !== false,
      featured: status === "approved" && req.body.featured === true,
    };
    reviewRepository.createForCompany(req.companyId, review, { prepend: true });
    await persistReviewsSafely(req.companyId);
    return res.status(201).json(review);
  } catch (error) {
    console.error("Review creation failed:", error);
    return res.status(500).json({ message: "Unable to submit review. Please try again." });
  }
});

router.put("/:id/status", requireAuth, reviewWrite, async (req, res) => {
  try {
    const review = reviewRepository.findByCompany(req.companyId, req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });

    const allowedStatuses = new Set(["approved", "rejected", "hidden", "pending"]);
    const status = allowedStatuses.has(req.body.status) ? req.body.status : review.status || "approved";
    if (req.body.featured === true && status !== "approved") {
      return res.status(400).json({ message: "Only approved reviews can be featured." });
    }
    review.status = status;
    review.isApproved = status === "approved";
    review.isActive = status === "approved" ? req.body.isActive !== false : false;
    review.featured = status === "approved"
      ? req.body.featured === true || (review.featured === true && req.body.featured !== false)
      : false;
    review.updatedAt = new Date().toISOString();
    await persistReviewsSafely(req.companyId);
    return res.json(review);
  } catch (error) {
    console.error("Review status update failed:", error);
    return res.status(500).json({ message: "Unable to update review. Please try again." });
  }
});

router.put("/:id", requireAuth, reviewWrite, async (req, res) => {
  const existing = reviewRepository.findByCompany(req.companyId, req.params.id);
  if (!existing) return res.status(404).json({ message: "Review not found." });

  // Preserve a valid stored type; never collapse it. An explicit body type wins
  // when valid, otherwise the stored type survives (order reviews stay order).
  const requestedType = req.body.type !== undefined ? req.body.type : existing.type;
  const type = VALID_REVIEW_TYPES.includes(requestedType)
    ? requestedType
    : VALID_REVIEW_TYPES.includes(existing.type)
      ? existing.type
      : "website";
  if (req.body.type !== undefined && !VALID_REVIEW_TYPES.includes(req.body.type)) {
    return res.status(400).json({ message: "Invalid review type." });
  }

  // Link integrity + stale clearing: linkage resolves from the submitted body
  // with the stored values as fallback, then validates against this tenant.
  // Switching away from product/employee drops the old linkage entirely.
  const links = resolveReviewLinks(req.companyId, {
    type,
    productId: req.body.productId !== undefined ? req.body.productId : existing.productId,
    employeeId: req.body.employeeId !== undefined ? req.body.employeeId : existing.employeeId,
    employeeName:
      req.body.employeeName !== undefined ? req.body.employeeName : existing.employeeName,
  });
  if (links.error) {
    return res.status(links.status).json({ message: links.error });
  }

  const status = req.body.status || existing.status || "approved";
  if (req.body.featured === true && status !== "approved") {
    return res.status(400).json({ message: "Only approved reviews can be featured." });
  }
  const updated = reviewRepository.updateForCompany(req.companyId, req.params.id, {
    ...existing,
    ...req.body,
    id: req.params.id,
    type,
    productId: links.productId,
    employeeId: links.employeeId,
    employeeName: links.employeeName,
    status,
    isApproved: status === "approved",
    featured: status === "approved"
      ? req.body.featured === true || (existing.featured === true && req.body.featured !== false)
      : false,
  });
  await persistCompanyStore(req.companyId);
  return res.json(updated);
});

router.delete("/:id", requireAuth, reviewWrite, async (req, res) => {
  try {
    const removed = reviewRepository.deleteForCompany(req.companyId, req.params.id);
    if (!removed) return res.status(404).json({ message: "Review not found." });

    await persistReviewsSafely(req.companyId, { pruneMissing: true });
    return res.status(204).end();
  } catch (error) {
    console.error("Review delete failed:", error);
    return res.status(500).json({ message: "Unable to delete review. Please try again." });
  }
});

export default router;
