import crypto from "node:crypto";
import { Router } from "express";
import {
  companyMembershipRepository,
  platformUserRepository,
  productRepository,
} from "../data/store.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { calculateLine, money } from "../dropshipping/domain.js";
import {
  dropshippingQuery,
  withDropshippingTransaction,
} from "../dropshipping/database.js";

const router = Router();
const handle = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((error) =>
    error?.statusCode
      ? res.status(error.statusCode).json({ message: error.message })
      : next(error),
  );
const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const normalizePhone = (value) => {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return (
    digits.startsWith("970") || digits.startsWith("972")
      ? digits.slice(3)
      : digits
  ).replace(/^0+/, "");
};
const required = (value, name) => {
  const text = String(value || "").trim();
  if (!text)
    throw Object.assign(new Error(`${name} is required.`), { statusCode: 400 });
  return text;
};

async function profileFor(req, { approved = false } = {}) {
  const { rows } = await dropshippingQuery(
    "select * from public.dropshipper_profiles where company_id=$1 and user_id=$2 limit 1",
    [req.companyId, req.user.id],
  );
  const profile = rows[0];
  if (!profile)
    throw Object.assign(new Error("Dropshipper profile not found."), {
      statusCode: 403,
    });
  if (approved && profile.status !== "approved")
    throw Object.assign(
      new Error(`Dropshipper account is ${profile.status}.`),
      { statusCode: 403 },
    );
  return profile;
}

router.post(
  "/register",
  rateLimit({ key: "dropshipping-register", max: 5, windowMs: 15 * 60_000 }),
  handle(async (req, res) => {
    const settings = (await dropshippingQuery(
      "select dropshipping_enabled from public.dropshipping_settings where company_id=$1",
      [req.companyId],
    )).rows[0];
    if (!settings?.dropshipping_enabled) return res.status(404).json({ message: "Dropshipping registration is unavailable." });
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const fullName = required(req.body.fullName || req.body.name, "fullName");
    const password = required(req.body.password, "password");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "A valid email is required." });
    if (password.length < 8)
      return res
        .status(400)
        .json({ message: "Password must contain at least 8 characters." });
    if (phone.length < 7)
      return res.status(400).json({ message: "A valid phone is required." });
    if (await platformUserRepository.findByEmail(email))
      return res.status(409).json({ message: "Email already exists." });
    const duplicate = await dropshippingQuery(
      "select 1 from public.dropshipper_profiles where company_id=$1 and phone=$2",
      [req.companyId, phone],
    );
    if (duplicate.rowCount)
      return res.status(409).json({ message: "Phone already exists." });
    const user = await platformUserRepository.createUser({
      name: fullName,
      email,
      phone,
      password,
      role: "customer",
    });
    try {
      const membershipResult =
        await companyMembershipRepository.createOrUpdateMembership(
          req.companyId,
          { email, name: fullName, role: "customer", status: "active" },
        );
      await dropshippingQuery(
        `insert into public.dropshipper_profiles(company_id,user_id,full_name,phone,address,region,social_media_accounts)
       values($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [
          req.companyId,
          user.id,
          fullName,
          phone,
          String(req.body.address || "").trim() || null,
          String(req.body.region || "").trim() || null,
          JSON.stringify(req.body.socialMediaAccounts || {}),
        ],
      );
      await dropshippingQuery(
        "insert into public.dropshipping_notifications(company_id,audience,type,title,body,payload) values($1,'admin','dropshipper_registered','New dropshipper registration',$2,$3::jsonb)",
        [req.companyId, fullName, JSON.stringify({ userId: user.id })],
      );
      const membership = membershipResult;
      return res.status(201).json({
        token: signToken(user, membership),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "customer",
        },
        profileStatus: "pending",
      });
    } catch (error) {
      await platformUserRepository
        .updateUser(user.id, { isActive: false })
        .catch(() => {});
      throw error;
    }
  }),
);

router.use(requireAuth);
router.get(
  "/account-status",
  handle(async (req, res) => res.json(await profileFor(req))),
);
router.use(
  handle(async (req, _res, next) => {
    const settings = (await dropshippingQuery(
      "select * from public.dropshipping_settings where company_id=$1",
      [req.companyId],
    )).rows[0];
    if (!settings?.dropshipping_enabled) {
      throw Object.assign(new Error("Dropshipping is not enabled for this company."), { statusCode: 403 });
    }
    req.dropshippingSettings = settings;
    next();
  }),
);
router.use(
  handle(async (req, _res, next) => {
    req.dropshipper = await profileFor(req, { approved: true });
    next();
  }),
);

router.get(
  "/products",
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      "select * from public.dropshipping_products where company_id=$1 and enabled=true and coalesce(available_stock,1)>0 order by updated_at desc",
      [req.companyId],
    );
    const mediaRows = rows.length
      ? (
          await dropshippingQuery(
          "select m.* from public.dropshipping_product_media m join public.dropshipping_settings s on s.company_id=m.company_id where m.company_id=$1 and m.product_id=any($2::text[]) and m.downloadable=true and (m.media_type<>'video' or s.allow_video_download) and (m.media_type<>'image' or s.allow_image_download) order by m.sort_order",
            [req.companyId, rows.map((row) => row.product_id)],
          )
        ).rows
      : [];
    const catalog = new Map(
      productRepository
        .getByCompany(req.companyId)
        .filter((p) => p.isActive !== false)
        .map((p) => [String(p.id), p]),
    );
    res.json(
      rows
        .filter((row) => catalog.has(String(row.product_id)))
        .map((row) => ({
          ...catalog.get(String(row.product_id)),
          dropshipping: {
            ...row,
            media: mediaRows.filter(
              (item) => item.product_id === row.product_id,
            ),
          },
        })),
    );
  }),
);
router.get(
  "/products/:id",
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      "select * from public.dropshipping_products where company_id=$1 and enabled=true and product_id=$2 and coalesce(available_stock,1)>0",
      [req.companyId, req.params.id],
    );
    const product = productRepository.findByCompany(
      req.companyId,
      (p) => String(p.id) === String(req.params.id) && p.isActive !== false,
    );
    if (!rows[0] || !product)
      return res
        .status(404)
        .json({ message: "Dropshipping product not found." });
    const media = (
      await dropshippingQuery(
      "select m.* from public.dropshipping_product_media m join public.dropshipping_settings s on s.company_id=m.company_id where m.company_id=$1 and m.product_id=$2 and m.downloadable=true and (m.media_type<>'video' or s.allow_video_download) and (m.media_type<>'image' or s.allow_image_download) order by m.sort_order",
        [req.companyId, req.params.id],
      )
    ).rows;
    res.json({ ...product, dropshipping: { ...rows[0], media } });
  }),
);

router.post(
  "/orders",
  rateLimit({ key: "dropshipping-order", max: 30 }),
  handle(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length)
      return res
        .status(400)
        .json({ message: "At least one order item is required." });
    const idempotencyKey = String(req.get("Idempotency-Key") || "").trim() || crypto.randomUUID();
    const existing = (await dropshippingQuery(
      "select * from public.dropshipping_orders where company_id=$1 and dropshipper_id=$2 and idempotency_key=$3",
      [req.companyId, req.dropshipper.id, idempotencyKey],
    )).rows[0];
    if (existing) return res.status(200).json(existing);
    const order = await withDropshippingTransaction(async (client) => {
      const totals = { selling: 0, cost: 0, fees: 0, profit: 0 };
      const snapshots = [];
      for (const input of items) {
        const configured = (
          await client.query(
            "select * from public.dropshipping_products where company_id=$1 and product_id=$2 and enabled=true for update",
            [req.companyId, String(input.productId)],
          )
        ).rows[0];
        const product = productRepository.findByCompany(
          req.companyId,
          (p) =>
            String(p.id) === String(input.productId) && p.isActive !== false,
        );
        if (!configured || !product)
          throw Object.assign(
            new Error("Product is not enabled for dropshipping."),
            { statusCode: 400 },
          );
        const variant =
          input.variantId == null
            ? null
            : (product.variants || []).find(
                (v) => String(v.id) === String(input.variantId),
              );
        if (input.variantId != null && !variant)
          throw Object.assign(
            new Error("Variant does not belong to the selected product."),
            { statusCode: 400 },
          );
        const qty = Number(input.quantity);
        const stock =
          configured.available_stock ?? variant?.stock ?? product.stockQty ?? 0;
        if (!Number.isSafeInteger(qty) || qty < 1 || qty > Number(stock))
          throw Object.assign(
            new Error("Requested quantity exceeds available stock."),
            { statusCode: 400 },
          );
        const customerPrice = Number(
          money(input.customerUnitPrice, "customerUnitPrice"),
        );
        const minimum =
          configured.minimum_selling_price == null
            ? Number(configured.dropshipping_price)
            : Number(configured.minimum_selling_price);
        let maximum = configured.maximum_selling_price == null
          ? (req.dropshippingSettings.default_maximum_selling_price == null ? Infinity : Number(req.dropshippingSettings.default_maximum_selling_price))
          : Number(configured.maximum_selling_price);
        if (req.dropshippingSettings.default_maximum_markup != null) {
          maximum = Math.min(maximum, Number(configured.dropshipping_price) + Number(req.dropshippingSettings.default_maximum_markup));
        }
        if (req.dropshipper.maximum_selling_price != null)
          maximum = Math.min(
            maximum,
            Number(req.dropshipper.maximum_selling_price),
          );
        if (req.dropshipper.maximum_markup != null)
          maximum = Math.min(
            maximum,
            Number(configured.dropshipping_price) +
              Number(req.dropshipper.maximum_markup),
          );
        if (customerPrice < minimum || customerPrice > maximum)
          throw Object.assign(
            new Error(
              `Selling price must be between ${minimum} and ${maximum}.`,
            ),
            { statusCode: 400 },
          );
        const line = calculateLine({
          quantity: qty,
          customerUnitPrice: customerPrice,
          dropshippingUnitPrice: configured.dropshipping_price,
          fixedFee: Number(configured.marketer_fee || 0) + Number(configured.fixed_fee ?? req.dropshippingSettings.default_fixed_fee ?? 0),
          percentageFee: configured.percentage_fee ?? req.dropshippingSettings.default_percentage_fee,
        });
        totals.selling += Number(line.sellingTotal);
        totals.cost += Number(line.costTotal);
        totals.fees += Number(line.fees);
        totals.profit += Number(line.profit);
        snapshots.push({
          input,
          configured,
          product,
          variant,
          line,
          qty,
          customerPrice,
        });
        if (configured.available_stock != null)
          await client.query(
            "update public.dropshipping_products set available_stock=available_stock-$1,updated_at=now() where id=$2",
            [qty, configured.id],
          );
      }
      if (totals.selling < Number(req.dropshippingSettings.default_minimum_order || 0)) {
        throw Object.assign(new Error("Order total is below the configured minimum."), { statusCode: 400 });
      }
      const inserted = (
        await client.query(
          `insert into public.dropshipping_orders(company_id,dropshipper_id,customer_name,customer_phone,customer_secondary_phone,delivery_address,region,notes,customer_selling_total,dropshipping_cost_total,fees_total,marketer_profit,payment_method,idempotency_key)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,
          [
            req.companyId,
            req.dropshipper.id,
            required(req.body.customerName, "customerName"),
            normalizePhone(required(req.body.customerPhone, "customerPhone")),
            normalizePhone(req.body.customerSecondaryPhone) || null,
            required(req.body.deliveryAddress, "deliveryAddress"),
            required(req.body.region, "region"),
            String(req.body.notes || "").trim() || null,
            totals.selling.toFixed(2),
            totals.cost.toFixed(2),
            totals.fees.toFixed(2),
            totals.profit.toFixed(2),
            req.body.paymentMethod || "cash_on_delivery",
          idempotencyKey,
          ],
        )
      ).rows[0];
      for (const row of snapshots)
        await client.query(
          `insert into public.dropshipping_order_items(company_id,order_id,product_id,variant_id,quantity,dropshipping_unit_price,customer_unit_price,fee_amount,marketer_profit,product_snapshot)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
          [
            req.companyId,
            inserted.id,
            row.product.id,
            row.variant?.id || null,
            row.qty,
            row.configured.dropshipping_price,
            row.customerPrice,
            row.line.fees,
            row.line.profit,
            JSON.stringify({
              id: row.product.id,
              name: row.product.name,
              sku: row.variant?.sku || row.product.sku,
              variant: row.variant || null,
            }),
          ],
        );
      await client.query(
        "insert into public.dropshipping_order_status_history(company_id,order_id,to_status,created_by) values($1,$2,'new',$3)",
        [req.companyId, inserted.id, req.user.id],
      );
      await client.query(
        "insert into public.dropshipping_notifications(company_id,audience,type,title,body,payload) values($1,'admin','dropshipping_order_created','New dropshipping order',$2,$3::jsonb)",
        [
          req.companyId,
          inserted.customer_name,
          JSON.stringify({
            orderId: inserted.id,
            dropshipperId: req.dropshipper.id,
          }),
        ],
      );
      return inserted;
    });
    res.status(201).json(order);
  }),
);

router.get(
  "/orders",
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      "select * from public.dropshipping_orders where company_id=$1 and dropshipper_id=$2 order by created_at desc",
      [req.companyId, req.dropshipper.id],
    );
    res.json(rows);
  }),
);
router.get(
  "/orders/:id",
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      `select o.*,coalesce(jsonb_agg(i order by i.created_at) filter(where i.id is not null),'[]') items from public.dropshipping_orders o left join public.dropshipping_order_items i on i.company_id=o.company_id and i.order_id=o.id where o.company_id=$1 and o.dropshipper_id=$2 and o.id=$3 group by o.id`,
      [req.companyId, req.dropshipper.id, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ message: "Order not found." });
    const history = (await dropshippingQuery(
      "select from_status,to_status,note,created_at from public.dropshipping_order_status_history where company_id=$1 and order_id=$2 order by created_at",
      [req.companyId, req.params.id],
    )).rows;
    res.json({ ...rows[0], history });
  }),
);
router.post(
  "/orders/:id/cancel",
  handle(async (req, res) => {
    const cancelled = await withDropshippingTransaction(async (client) => {
      const { rows } = await client.query(
        "update public.dropshipping_orders set delivery_status='cancelled',profit_status='cancelled',cancelled_at=now(),updated_at=now() where company_id=$1 and dropshipper_id=$2 and id=$3 and delivery_status='new' returning *",
        [req.companyId, req.dropshipper.id, req.params.id],
      );
      if (!rows[0]) throw Object.assign(new Error("Only new orders can be cancelled."), { statusCode: 409 });
      await client.query(
        `update public.dropshipping_products dp set available_stock=dp.available_stock+i.quantity,updated_at=now()
         from (select company_id,product_id,sum(quantity) quantity from public.dropshipping_order_items where company_id=$1 and order_id=$2 group by company_id,product_id) i
         where dp.company_id=i.company_id and dp.product_id=i.product_id and dp.available_stock is not null`,
        [req.companyId, req.params.id],
      );
      await client.query(
        "insert into public.dropshipping_order_status_history(company_id,order_id,from_status,to_status,created_by) values($1,$2,'new','cancelled',$3)",
        [req.companyId, req.params.id, req.user.id],
      );
      return rows[0];
    });
    res.json(cancelled);
  }),
);

router.get(
  "/dashboard",
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      `select w.*,count(o.id) total_orders,count(o.id) filter(where o.delivery_status='delivered') delivered_orders,count(o.id) filter(where o.delivery_status='cancelled') cancelled_orders,coalesce(sum(o.customer_selling_total) filter(where o.created_at>=date_trunc('month',now())),0) monthly_sales,coalesce(sum(o.marketer_profit) filter(where o.created_at>=date_trunc('month',now())),0) monthly_profit from public.dropshipper_wallets w left join public.dropshipping_orders o on o.company_id=w.company_id and o.dropshipper_id=w.dropshipper_id where w.company_id=$1 and w.dropshipper_id=$2 group by w.id`,
      [req.companyId, req.dropshipper.id],
    );
    res.json(
      rows[0] || {
        available_balance: "0.00",
        pending_balance: "0.00",
        paid_balance: "0.00",
        lifetime_earnings: "0.00",
      },
    );
  }),
);
router.get(
  "/wallet",
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      "select * from public.dropshipper_wallets where company_id=$1 and dropshipper_id=$2",
      [req.companyId, req.dropshipper.id],
    );
    res.json(
      rows[0] || {
        available_balance: "0.00",
        pending_balance: "0.00",
        withdrawal_reserved: "0.00",
        debt_balance: "0.00",
        paid_balance: "0.00",
        lifetime_earnings: "0.00",
      },
    );
  }),
);
router.get(
  "/transactions",
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      "select * from public.dropshipper_transactions where company_id=$1 and dropshipper_id=$2 order by created_at desc",
      [req.companyId, req.dropshipper.id],
    );
    res.json(rows);
  }),
);
router.get(
  "/withdrawals",
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      "select id,amount,payment_method,status,requested_at,approved_at,paid_at,rejected_at,rejection_reason,reference_number from public.withdrawal_requests where company_id=$1 and dropshipper_id=$2 order by requested_at desc",
      [req.companyId, req.dropshipper.id],
    );
    res.json(rows);
  }),
);
router.post(
  "/withdrawals",
  rateLimit({ key: "dropshipping-withdrawal", max: 5, windowMs: 60 * 60_000 }),
  handle(async (req, res) => {
    const amount = money(req.body.amount);
    const result = await withDropshippingTransaction(async (client) => {
      const settings = (
        await client.query(
          "select * from public.dropshipping_settings where company_id=$1",
          [req.companyId],
        )
      ).rows[0];
      if (Number(amount) < Number(settings?.minimum_withdrawal_amount || 0))
        throw Object.assign(
          new Error("Amount is below the minimum withdrawal."),
          { statusCode: 400 },
        );
      const wallet = (
        await client.query(
          "select * from public.dropshipper_wallets where company_id=$1 and dropshipper_id=$2 for update",
          [req.companyId, req.dropshipper.id],
        )
      ).rows[0];
      if (!wallet || Number(wallet.available_balance) < Number(amount))
        throw Object.assign(new Error("Insufficient available balance."), {
          statusCode: 409,
        });
      const withdrawal = (
        await client.query(
          "insert into public.withdrawal_requests(company_id,dropshipper_id,amount,payment_method,payment_details) values($1,$2,$3,$4,$5::jsonb) returning *",
          [
            req.companyId,
            req.dropshipper.id,
            amount,
            required(req.body.paymentMethod, "paymentMethod"),
            JSON.stringify(req.body.paymentDetails || {}),
          ],
        )
      ).rows[0];
      await client.query(
        "update public.dropshipper_wallets set available_balance=available_balance-$1,withdrawal_reserved=withdrawal_reserved+$1,updated_at=now() where id=$2",
        [amount, wallet.id],
      );
      await client.query(
        "insert into public.dropshipper_transactions(company_id,dropshipper_id,withdrawal_request_id,amount,available_impact,reserved_impact,transaction_type,description,idempotency_key,created_by) values($1,$2,$3,$4,-$4,$4,'withdrawal_requested','Withdrawal reserved',$5,$6)",
        [
          req.companyId,
          req.dropshipper.id,
          withdrawal.id,
          amount,
          `withdrawal:${withdrawal.id}:requested`,
          req.user.id,
        ],
      );
      return withdrawal;
    });
    res.status(201).json(result);
  }),
);
router.get(
  "/profile",
  handle(async (req, res) => res.json(req.dropshipper)),
);
router.patch(
  "/profile",
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      "update public.dropshipper_profiles set full_name=coalesce($3,full_name),address=coalesce($4,address),region=coalesce($5,region),social_media_accounts=coalesce($6::jsonb,social_media_accounts),updated_at=now() where company_id=$1 and id=$2 returning *",
      [
        req.companyId,
        req.dropshipper.id,
        req.body.fullName || null,
        req.body.address || null,
        req.body.region || null,
        req.body.socialMediaAccounts
          ? JSON.stringify(req.body.socialMediaAccounts)
          : null,
      ],
    );
    res.json(rows[0]);
  }),
);

export default router;
