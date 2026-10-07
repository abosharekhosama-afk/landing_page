import { Router } from "express";
import { cartRepository, persistCompanyStore } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  res.json(cartRepository.findByCompany(req.companyId, req.user.id) || []);
});

router.put("/", async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  cartRepository.updateForCompany(req.companyId, req.user.id, items);
  await persistCompanyStore(req.companyId);
  res.json(items);
});

router.delete("/", async (req, res) => {
  cartRepository.deleteForCompany(req.companyId, req.user.id);
  await persistCompanyStore(req.companyId, { pruneMissing: true });
  res.status(204).end();
});

export default router;
