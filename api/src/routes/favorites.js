import { Router } from "express";
import { persistCompanyStore, productRepository, userRepository } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.use(requireCustomer);

function requireCustomer(req, res, next) {
  if (req.user?.role !== "customer") {
    return res.status(403).json({ message: "Customer access required." });
  }
  return next();
}

function favoriteIdsFor(req) {
  const ids = req.user?.favoriteProductIds;
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && id.trim()) : [];
}

function productSummary(product) {
  if (!product) return null;
  const name = product.name;
  return {
    id: product.id,
    slug: product.slug || product.id,
    name: typeof name === "string" ? name : (name?.en || name?.ar || product.id),
    price: product.price ?? null,
    currency: product.currency || null,
    image: product.image || product.images?.[0] || null,
  };
}

router.get("/", (req, res) => {
  const productIds = favoriteIdsFor(req);
  const products = productIds
    .map((id) => productRepository.findByCompany(req.companyId, id))
    .filter(Boolean)
    .map(productSummary);
  res.json({ productIds, products });
});

router.post("/:productId", async (req, res) => {
  const productId = String(req.params.productId || "").trim();
  if (!productId) return res.status(400).json({ message: "Product id is required." });

  const product = productRepository.findByCompany(req.companyId, productId);
  if (!product) return res.status(404).json({ message: "Product not found in this company." });

  const current = favoriteIdsFor(req);
  const next = current.includes(productId) ? current : [...current, productId];
  const updated = userRepository.updateForCompany(
    req.companyId,
    req.user.id,
    { favoriteProductIds: next },
    { touchMembership: false },
  );
  if (!updated) return res.status(404).json({ message: "User not found." });
  await persistCompanyStore(req.companyId);
  res.json({ productIds: next, product: productSummary(product) });
});

router.delete("/:productId", async (req, res) => {
  const productId = String(req.params.productId || "").trim();
  const current = favoriteIdsFor(req);
  const next = current.filter((id) => id !== productId);
  const updated = userRepository.updateForCompany(
    req.companyId,
    req.user.id,
    { favoriteProductIds: next },
    { touchMembership: false },
  );
  if (!updated) return res.status(404).json({ message: "User not found." });
  await persistCompanyStore(req.companyId);
  res.json({ productIds: next });
});

export default router;