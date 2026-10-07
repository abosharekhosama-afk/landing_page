import { Router } from "express";
import { persistCompanyStore, userRepository } from "../data/store.js";
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

function addressesFor(req) {
  const addresses = req.user?.addresses;
  return Array.isArray(addresses) ? addresses : [];
}

function normalizeAddress(input = {}) {
  return {
    id: String(input.id || "").trim(),
    label: String(input.label || input.name || "").trim(),
    fullName: String(input.fullName || "").trim(),
    phone: String(input.phone || "").trim(),
    city: String(input.city || "").trim(),
    address: String(input.address || "").trim(),
    notes: input.notes !== undefined ? String(input.notes).trim() : "",
    isDefault: Boolean(input.isDefault),
  };
}

function syncProfileFields(req, address) {
  const updates = {};
  if (address.city) updates.city = address.city;
  if (address.address) updates.address = address.address;
  if (address.phone) updates.phone = address.phone;
  if (address.fullName) updates.name = address.fullName;
  if (Object.keys(updates).length) {
    userRepository.updateForCompany(req.companyId, req.user.id, updates, { touchMembership: false });
  }
}

router.get("/", (req, res) => {
  res.json(addressesFor(req));
});

router.post("/", async (req, res) => {
  const current = addressesFor(req);
  const address = normalizeAddress({ ...req.body, id: `addr-${Date.now()}` });
  if (!address.label || !address.fullName || !address.phone || !address.city || !address.address) {
    return res.status(400).json({ message: "label, fullName, phone, city and address are required." });
  }

  let next = [...current, address];
  if (address.isDefault) {
    next = next.map((entry) => ({ ...entry, isDefault: entry.id === address.id }));
  } else if (!next.some((entry) => entry.isDefault)) {
    next = next.map((entry, index) => ({ ...entry, isDefault: index === 0 }));
  }

  const updated = userRepository.updateForCompany(
    req.companyId,
    req.user.id,
    { addresses: next },
    { touchMembership: false },
  );
  if (!updated) return res.status(404).json({ message: "User not found." });
  if (address.isDefault) syncProfileFields(req, address);
  await persistCompanyStore(req.companyId);
  res.status(201).json(address);
});

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  const current = addressesFor(req);
  const existing = current.find((entry) => entry.id === id);
  if (!existing) return res.status(404).json({ message: "Address not found." });

  const address = normalizeAddress({ ...existing, ...req.body, id });
  if (!address.label || !address.fullName || !address.phone || !address.city || !address.address) {
    return res.status(400).json({ message: "label, fullName, phone, city and address are required." });
  }

  let next = current.map((entry) => (entry.id === id ? address : entry));
  if (address.isDefault) {
    next = next.map((entry) => ({ ...entry, isDefault: entry.id === id }));
  } else if (!next.some((entry) => entry.isDefault)) {
    next = next.map((entry, index) => ({ ...entry, isDefault: index === 0 }));
  }

  const updated = userRepository.updateForCompany(
    req.companyId,
    req.user.id,
    { addresses: next },
    { touchMembership: false },
  );
  if (!updated) return res.status(404).json({ message: "User not found." });
  if (address.isDefault) syncProfileFields(req, address);
  await persistCompanyStore(req.companyId);
  res.json(address);
});

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  const current = addressesFor(req);
  const existing = current.find((entry) => entry.id === id);
  if (!existing) return res.status(404).json({ message: "Address not found." });

  const next = current.filter((entry) => entry.id !== id);
  const updated = userRepository.updateForCompany(
    req.companyId,
    req.user.id,
    { addresses: next },
    { touchMembership: false },
  );
  if (!updated) return res.status(404).json({ message: "User not found." });
  await persistCompanyStore(req.companyId);
  res.status(204).end();
});

export default router;