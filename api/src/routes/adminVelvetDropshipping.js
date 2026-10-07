import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { httpError } from "../velvetDropshipping/domain.js";
import { listOffers, upsertOffer } from "../velvetDropshipping/catalog.js";
import { setActivation } from "../velvetDropshipping/merchants.js";
import {
  advanceFulfillment,
  listCompanyOrders,
  markWarehouseMiss,
  operationalCancel,
} from "../velvetDropshipping/orders.js";
import { adminTotals, closeThursday, listSettlements, paySettlement } from "../velvetDropshipping/settlements.js";
import { velvetQuery } from "../velvetDropshipping/database.js";

const router = Router();
router.use(requireAuth);

const handle = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((error) => {
    if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message, code: error.code || undefined });
    return next(error);
  });

function companyId(req) {
  if (!req.companyId) throw httpError(400, "Company context is required.");
  return req.companyId;
}

router.get("/merchants", requirePermission("company_dropship.merchants.read"), handle(async (req, res) => {
  const result = await velvetQuery(
    `select m.*, s.id as store_id, s.name as store_name, s.slug, s.status as store_status
     from public.velvet_dropship_merchants m
     left join public.velvet_dropship_stores s on s.merchant_id = m.id
     where m.company_id = $1
     order by m.created_at desc`,
    [companyId(req)],
  );
  res.json({ merchants: result.rows });
}));

router.post("/merchants/:id/activation", requirePermission("company_dropship.merchants.manage"), handle(async (req, res) => {
  res.json(await setActivation(companyId(req), req.params.id, {
    merchantStatus: req.body.merchantStatus || req.body.merchant_status,
    storeStatus: req.body.storeStatus || req.body.store_status,
  }));
}));

router.get("/offers", requirePermission("company_dropship.catalog.manage"), handle(async (req, res) => {
  const offers = await listOffers(companyId(req));
  res.json({
    offers: offers.map((offer) => ({
      ...offer,
      profit: (Number(offer.selling_unit_price) - Number(offer.merchant_unit_price)).toFixed(2),
    })),
  });
}));

router.put("/offers", requirePermission("company_dropship.catalog.manage"), handle(async (req, res) => {
  res.json(await upsertOffer(companyId(req), req.body, req.user.id));
}));

router.get("/orders", requirePermission("company_dropship.orders.read"), handle(async (req, res) => {
  res.json({
    orders: await listCompanyOrders(companyId(req), {
      merchantId: req.query.merchantId || null,
      storeId: req.query.storeId || null,
    }),
    totals: await adminTotals(companyId(req)),
  });
}));

router.post("/orders/:id/fulfillment", requirePermission("company_dropship.fulfillment.manage"), handle(async (req, res) => {
  res.json(await advanceFulfillment(companyId(req), req.params.id, req.body.status, req.user.id));
}));

router.post("/orders/:id/warehouse-miss", requirePermission("company_dropship.fulfillment.manage"), handle(async (req, res) => {
  res.json(await markWarehouseMiss(companyId(req), req.params.id, req.body.lineId || req.body.line_id, req.user.id));
}));

router.post("/orders/:id/cancel", requirePermission("company_dropship.orders.manage"), handle(async (req, res) => {
  res.json(await operationalCancel(companyId(req), req.params.id, req.user.id));
}));

router.post("/settlements/close", requirePermission("company_dropship.settlements.manage"), handle(async (req, res) => {
  res.json({ settlements: await closeThursday(companyId(req), req.body.thursday) });
}));

router.get("/settlements", requirePermission("company_dropship.settlements.read"), handle(async (req, res) => {
  res.json({ settlements: await listSettlements(companyId(req)) });
}));

router.post("/settlements/:id/pay", requirePermission("company_dropship.settlements.manage"), handle(async (req, res) => {
  res.json(await paySettlement(companyId(req), req.params.id, req.body.reference || null, req.user.id));
}));

export default router;
