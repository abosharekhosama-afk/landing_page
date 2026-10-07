import fs from "node:fs/promises";
import { Router } from "express";
import {
  companyMembershipRepository,
  deliveryZoneRepository,
  platformUserRepository,
} from "../data/store.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { withVelvetTransaction } from "../velvetDropshipping/database.js";
import { httpError } from "../velvetDropshipping/domain.js";
import {
  addSelection,
  generatedImagePath,
  listOffers,
  listSelections,
  publicStore,
  removeSelection,
  retryImage,
} from "../velvetDropshipping/catalog.js";
import {
  createMerchantAndStore,
  findMerchantByUser,
  merchantOverview,
  requireMerchant,
  updatePayout,
  updateStoreIdentity,
} from "../velvetDropshipping/merchants.js";
import {
  cancelUnconfirmed,
  confirmOrder,
  createOrder,
  listMerchantOrders,
  recordWhatsApp,
  resolveLine,
} from "../velvetDropshipping/orders.js";
import { earnings, merchantStatements } from "../velvetDropshipping/settlements.js";
import { deliveryQuote } from "../velvetDropshipping/whatsapp.js";
import { velvetQuery } from "../velvetDropshipping/database.js";

const router = Router();

const handle = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((error) => {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code || undefined });
    }
    return next(error);
  });

function companyId(req) {
  if (!req.companyId) throw httpError(400, "Company context is required.");
  return req.companyId;
}

router.get("/images/:fileName", handle(async (req, res) => {
  const filePath = generatedImagePath(req.params.fileName);
  const body = await fs.readFile(filePath);
  res.type("image/webp").send(body);
}));

router.get("/stores/:slug", handle(async (req, res) => {
  res.json(await publicStore(companyId(req), req.params.slug));
}));

router.post("/stores/:slug/checkout", handle(async (req, res) => {
  const idempotencyKey = req.get("Idempotency-Key");
  if (!idempotencyKey) return res.status(400).json({ message: "Idempotency-Key is required." });
  const customer = {
    name: String(req.body.customerName || req.body.name || "").trim(),
    phone: String(req.body.customerPhone || req.body.phone || "").trim(),
    city: String(req.body.city || "").trim(),
    address: String(req.body.address || "").trim(),
  };
  if (!customer.name || customer.phone.length < 7 || !customer.city || !customer.address) {
    return res.status(400).json({ message: "Customer name, phone, city, and address are required." });
  }
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: "At least one item is required." });
  const store = await velvetQuery(
    `select s.*, m.status as merchant_status
     from public.velvet_dropship_stores s
     join public.velvet_dropship_merchants m on m.id = s.merchant_id
     where s.company_id = $1 and s.slug = $2`,
    [companyId(req), req.params.slug],
  );
  if (!store.rowCount) return res.status(404).json({ message: "Store was not found." });
  const zones = deliveryZoneRepository.getByCompany(companyId(req)) || [];
  const delivery = deliveryQuote(zones, customer.city);
  const order = await withVelvetTransaction((client) => createOrder(client, {
    companyId: companyId(req),
    store: store.rows[0],
    items: items.map((item) => ({ offerId: item.offerId || item.offer_id, quantity: Number(item.quantity) })),
    customer,
    delivery,
    idempotencyKey,
  }));
  res.status(201).json({ order, stockDeducted: false });
}));

router.post("/register", rateLimit({ windowMs: 60_000, max: 10 }), handle(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const storeName = String(req.body.storeName || req.body.store_name || "").trim();
  const name = String(req.body.name || storeName).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "A valid email is required." });
  if (password.length < 8) return res.status(400).json({ message: "Password must contain at least 8 characters." });
  if (!storeName) return res.status(400).json({ message: "Store name is required." });
  if (await platformUserRepository.findByEmail(email)) return res.status(409).json({ message: "Email already exists." });
  const user = await platformUserRepository.createUser({ name, email, password, role: "customer" });
  try {
    const membership = await companyMembershipRepository.createOrUpdateMembership(
      companyId(req),
      { email, name, role: "customer", status: "active" },
    );
    const created = await withVelvetTransaction((client) => createMerchantAndStore(client, {
      companyId: companyId(req),
      userId: user.id,
      storeName,
      logoUrl: req.body.logoUrl || req.body.logo_url || null,
    }));
    res.status(201).json({
      token: signToken(user, membership),
      merchantStatus: "active",
      store: { slug: created.store.slug, name: created.store.name },
    });
  } catch (error) {
    await platformUserRepository.updateUser(user.id, { isActive: false }).catch(() => {});
    throw error;
  }
}));

router.use(requireAuth);

async function merchant(req) {
  return requireMerchant(companyId(req), req.user.id);
}

router.get("/me", handle(async (req, res) => {
  const profile = await findMerchantByUser(companyId(req), req.user.id);
  if (!profile) return res.status(404).json({ message: "Velvet merchant profile was not found." });
  res.json({
    status: profile.status,
    store: { id: profile.store_id, name: profile.store_name, slug: profile.slug, logoUrl: profile.logo_url, status: profile.store_status },
    payoutMethod: profile.payout_method,
    overview: await merchantOverview(companyId(req), profile.id),
  });
}));

router.patch("/store", handle(async (req, res) => {
  const profile = await merchant(req);
  const store = await updateStoreIdentity(companyId(req), profile.id, {
    name: req.body.name,
    logoUrl: req.body.logoUrl || req.body.logo_url,
  });
  res.json({ store, imagesRegenerated: false });
}));

router.put("/payout", handle(async (req, res) => {
  const profile = await merchant(req);
  const saved = await updatePayout(companyId(req), profile.id, {
    payoutMethod: req.body.payoutMethod || req.body.payout_method,
    payoutDetails: req.body.payoutDetails || req.body.payout_details || {},
  });
  res.json({ payoutMethod: saved.payout_method });
}));

router.get("/catalog", handle(async (req, res) => {
  await merchant(req);
  res.json({ offers: await listOffers(companyId(req)) });
}));

router.get("/merchant-products", handle(async (req, res) => {
  const profile = await merchant(req);
  res.json({ products: await listSelections(companyId(req), profile.id) });
}));

router.post("/merchant-products", handle(async (req, res) => {
  const profile = await merchant(req);
  const selection = await addSelection(companyId(req), profile.id, req.body.offerId || req.body.offer_id, profile.store_name);
  res.status(201).json(selection);
}));

router.post("/merchant-products/:id/remove", handle(async (req, res) => {
  const profile = await merchant(req);
  res.json(await removeSelection(companyId(req), profile.id, req.params.id));
}));

router.post("/merchant-products/:id/retry-image", handle(async (req, res) => {
  const profile = await merchant(req);
  res.json(await retryImage(companyId(req), profile.id, req.params.id, profile.store_name));
}));

router.get("/orders", handle(async (req, res) => {
  const profile = await merchant(req);
  res.json({ orders: await listMerchantOrders(companyId(req), profile.id) });
}));

router.post("/orders/:id/whatsapp", handle(async (req, res) => {
  const profile = await merchant(req);
  res.json(await recordWhatsApp(companyId(req), profile.id, req.params.id));
}));

router.post("/orders/:id/confirm", handle(async (req, res) => {
  const profile = await merchant(req);
  const result = await confirmOrder(companyId(req), profile.id, req.params.id, req.user.id);
  if (result?.conflict) return res.status(409).json({ message: "A line does not have enough stock.", code: "STOCK_CONFLICT" });
  res.json(result);
}));

router.post("/orders/:id/cancel", handle(async (req, res) => {
  const profile = await merchant(req);
  res.json(await cancelUnconfirmed(companyId(req), profile.id, req.params.id, req.user.id));
}));

router.post("/orders/:id/resolve", handle(async (req, res) => {
  const profile = await merchant(req);
  res.json(await resolveLine(companyId(req), profile.id, req.params.id, {
    action: req.body.action,
    lineId: req.body.lineId || req.body.line_id,
    replacementOfferId: req.body.replacementOfferId || req.body.replacement_offer_id,
    actorUserId: req.user.id,
  }));
}));

router.get("/notifications", handle(async (req, res) => {
  const profile = await merchant(req);
  const result = await velvetQuery(
    `select id, order_id, kind, message, read_at, created_at
     from public.velvet_dropship_notifications
     where company_id = $1 and merchant_id = $2
     order by created_at desc`,
    [companyId(req), profile.id],
  );
  res.json({ notifications: result.rows });
}));

router.get("/earnings", handle(async (req, res) => {
  const profile = await merchant(req);
  res.json({ orders: await earnings(companyId(req), profile.id) });
}));

router.get("/settlements", handle(async (req, res) => {
  const profile = await merchant(req);
  res.json({ settlements: await merchantStatements(companyId(req), profile.id) });
}));

router.post("/notifications/:id/read", handle(async (req, res) => {
  const profile = await merchant(req);
  const result = await velvetQuery(
    `update public.velvet_dropship_notifications
     set read_at = now()
     where company_id = $1 and merchant_id = $2 and id = $3
     returning *`,
    [companyId(req), profile.id, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ message: "Notification was not found." });
  res.json(result.rows[0]);
}));

export default router;
