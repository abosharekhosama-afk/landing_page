import crypto from "node:crypto";
import { Router } from "express";
import { effectiveTenantRole, requireAuth } from "../middleware/auth.js";
import { assertTransition, csvCell } from "../dropshipping/domain.js";
import { upsertDropshippingProductConfiguration } from "../dropshipping/adminProducts.js";
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
const permissions = {
  overview: "dropshipping.reports.read",
  marketers: "dropshipping.marketers.manage",
  products: "dropshipping.products.manage",
  orders: "dropshipping.orders.manage",
  earnings: "dropshipping.earnings.manage",
  withdrawals: "dropshipping.withdrawals.manage",
  reports: "dropshipping.reports.read",
  settings: "dropshipping.settings.manage",
};
function authorize(area, { read = false } = {}) {
  return (req, res, next) => {
    if (["admin", "company_admin", "super_admin"].includes(effectiveTenantRole(req))) return next();
    const required = read
      ? permissions[area].replace(/\.manage$/, ".read")
      : permissions[area];
    if (
      req.membershipRole === "employee" &&
      req.user.permissions?.includes(required)
    )
      return next();
    return res
      .status(403)
      .json({ message: "Dropshipping permission required." });
  };
}
function reportFilters(req, values, alias = "o") {
  const clauses = [];
  const add = (value, sql) => { if (value !== undefined && value !== "") { values.push(value); clauses.push(sql.replace("?", `$${values.length}`)); } };
  add(req.query.dateFrom, `${alias}.created_at >= ?::timestamptz`);
  add(req.query.dateTo, `${alias}.created_at < (?::date + interval '1 day')`);
  add(req.query.marketer, `${alias}.dropshipper_id = ?::uuid`);
  add(req.query.status, `${alias}.delivery_status = ?`);
  add(req.query.region, `${alias}.region = ?`);
  add(req.query.product, `exists(select 1 from public.dropshipping_order_items ri where ri.company_id=${alias}.company_id and ri.order_id=${alias}.id and ri.product_id=?)`);
  add(req.query.category, `exists(select 1 from public.dropshipping_order_items ri join public.products rp on rp.id=ri.product_id and rp.company_id=ri.company_id where ri.company_id=${alias}.company_id and ri.order_id=${alias}.id and rp.category_id=?)`);
  add(req.query.brand, `exists(select 1 from public.dropshipping_order_items ri join public.products rp on rp.id=ri.product_id and rp.company_id=ri.company_id where ri.company_id=${alias}.company_id and ri.order_id=${alias}.id and rp.brand_id=?)`);
  return clauses.length ? ` and ${clauses.join(" and ")}` : "";
}
async function audit(
  req,
  action,
  entityType,
  entityId,
  beforeData,
  afterData,
  summary,
) {
  await dropshippingQuery(
    `insert into public.company_activity_logs(id,company_id,actor_user_id,actor_email,actor_name,actor_role,action,entity_type,entity_id,summary,before_data,after_data,ip_address,user_agent)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14)`,
    [
      crypto.randomUUID(),
      req.companyId,
      req.user.id,
      req.user.email || "",
      req.user.name || "",
      req.membershipRole || "",
      action,
      entityType,
      String(entityId),
      summary,
      JSON.stringify(beforeData ?? null),
      JSON.stringify(afterData ?? null),
      req.ip,
      String(req.get("user-agent") || "").slice(0, 500),
    ],
  );
}
async function notifyDropshipper(
  client,
  companyId,
  dropshipperId,
  type,
  title,
  body,
  payload = {},
) {
  await client.query(
    `insert into public.dropshipping_notifications(company_id,user_id,audience,type,title,body,payload)
    select $1,user_id,'dropshipper',$3,$4,$5,$6::jsonb from public.dropshipper_profiles where company_id=$1 and id=$2`,
    [companyId, dropshipperId, type, title, body, JSON.stringify(payload)],
  );
}
router.use(requireAuth);

router.get(
  "/overview",
  authorize("overview", { read: true }),
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      `select
  (select count(*) from public.dropshipper_profiles where company_id=$1) total_marketers,
  (select count(*) from public.dropshipper_profiles where company_id=$1 and status='pending') pending_marketers,
  (select count(*) from public.dropshipper_profiles where company_id=$1 and status='approved') approved_marketers,
  (select count(*) from public.dropshipper_profiles where company_id=$1 and status='suspended') suspended_marketers,
  count(o.id) total_orders,count(o.id) filter(where o.delivery_status='delivered') delivered_orders,count(o.id) filter(where o.delivery_status='cancelled') cancelled_orders,
  count(o.id) filter(where o.delivery_status='returned') returned_orders,coalesce(sum(o.customer_selling_total),0) total_sales,coalesce(sum(o.marketer_profit),0) total_marketer_profits,
  (select coalesce(sum(amount),0) from public.withdrawal_requests where company_id=$1 and status in ('pending','approved')) pending_withdrawals
  from public.dropshipping_orders o where o.company_id=$1`,
      [req.companyId],
    );
    res.json(rows[0]);
  }),
);

router.get(
  "/marketers",
  authorize("marketers", { read: true }),
  handle(async (req, res) => {
    const values = [req.companyId];
    let where = "p.company_id=$1";
    if (req.query.status) {
      values.push(req.query.status);
      where += ` and p.status=$${values.length}`;
    }
    if (req.query.search) {
      values.push(`%${String(req.query.search).trim()}%`);
      where += ` and (p.full_name ilike $${values.length} or p.phone ilike $${values.length} or u.email ilike $${values.length})`;
    }
    const { rows } = await dropshippingQuery(
      `select p.*,u.email,w.available_balance,w.pending_balance,w.paid_balance,w.lifetime_earnings from public.dropshipper_profiles p join public.users u on u.id=p.user_id left join public.dropshipper_wallets w on w.company_id=p.company_id and w.dropshipper_id=p.id where ${where} order by p.created_at desc`,
      values,
    );
    res.json(rows);
  }),
);
router.get(
  "/marketers/:id",
  authorize("marketers", { read: true }),
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      `select p.*,u.email,w.available_balance,w.pending_balance,w.withdrawal_reserved,w.paid_balance,w.lifetime_earnings from public.dropshipper_profiles p join public.users u on u.id=p.user_id left join public.dropshipper_wallets w on w.company_id=p.company_id and w.dropshipper_id=p.id where p.company_id=$1 and p.id=$2`,
      [req.companyId, req.params.id],
    );
    if (!rows[0])
      return res.status(404).json({ message: "Marketer not found." });
    res.json(rows[0]);
  }),
);
async function setMarketerStatus(req, status) {
  return withDropshippingTransaction(async (client) => {
    const before = (
      await client.query(
        "select * from public.dropshipper_profiles where company_id=$1 and id=$2 for update",
        [req.companyId, req.params.id],
      )
    ).rows[0];
    if (!before)
      throw Object.assign(new Error("Marketer not found."), {
        statusCode: 404,
      });
    const fields =
      status === "approved"
        ? ",approved_by=$4,approved_at=coalesce(approved_at,now()),rejection_reason=null,suspended_at=null,suspension_reason=null"
        : status === "rejected"
          ? ",rejected_by=$4,rejected_at=now(),rejection_reason=$5"
          : status === "suspended"
            ? ",suspended_at=now(),suspension_reason=$5"
            : "";
    const after = (
      await client.query(
        `update public.dropshipper_profiles set status=$3${fields},updated_at=now() where company_id=$1 and id=$2 returning *`,
        [
          req.companyId,
          req.params.id,
          status,
          req.user.id,
          String(req.body.reason || "").trim() || null,
        ],
      )
    ).rows[0];
    if (status === "approved")
      await client.query(
        "insert into public.dropshipper_wallets(company_id,dropshipper_id) values($1,$2) on conflict(company_id,dropshipper_id) do nothing",
        [req.companyId, req.params.id],
      );
    await notifyDropshipper(
      client,
      req.companyId,
      req.params.id,
      `account_${status}`,
      `Account ${status}`,
      status === "rejected" || status === "suspended"
        ? String(req.body.reason || "")
        : `Your dropshipping account is ${status}.`,
    );
    return { before, after };
  });
}
for (const [path, status] of [
  ["approve", "approved"],
  ["reject", "rejected"],
  ["suspend", "suspended"],
  ["reactivate", "approved"],
])
  router.post(
    `/marketers/:id/${path}`,
    authorize("marketers"),
    handle(async (req, res) => {
      if (
        ["rejected", "suspended"].includes(status) &&
        !String(req.body.reason || "").trim()
      )
        return res.status(400).json({ message: "A reason is required." });
      const result = await setMarketerStatus(req, status);
      await audit(
        req,
        `dropshipping.marketer.${path}`,
        "dropshipper",
        req.params.id,
        result.before,
        result.after,
        `Marketer ${path}`,
      );
      res.json(result.after);
    }),
  );
router.patch(
  "/marketers/:id/limits",
  authorize("marketers"),
  handle(async (req, res) => {
    const before = (
      await dropshippingQuery(
        "select * from public.dropshipper_profiles where company_id=$1 and id=$2",
        [req.companyId, req.params.id],
      )
    ).rows[0];
    const { rows } = await dropshippingQuery(
      "update public.dropshipper_profiles set maximum_markup=$3,maximum_selling_price=$4,notes=coalesce($5,notes),updated_at=now() where company_id=$1 and id=$2 returning *",
      [
        req.companyId,
        req.params.id,
        req.body.maximumMarkup ?? null,
        req.body.maximumSellingPrice ?? null,
        req.body.notes ?? null,
      ],
    );
    if (!rows[0])
      return res.status(404).json({ message: "Marketer not found." });
    await audit(
      req,
      "dropshipping.marketer.limits",
      "dropshipper",
      req.params.id,
      before,
      rows[0],
      "Pricing limits updated",
    );
    res.json(rows[0]);
  }),
);

router.get(
  "/products",
  authorize("products", { read: true }),
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      `select
        p.id as product_id,
        dp.id as id,
        dp.company_id as company_id,
        coalesce(dp.enabled, false) as enabled,
        dp.dropshipping_price,
        dp.suggested_selling_price,
        dp.minimum_selling_price,
        dp.maximum_selling_price,
        dp.marketer_fee,
        dp.fixed_fee,
        dp.percentage_fee,
        dp.available_stock,
        dp.allow_media_download,
        dp.marketing_caption,
        dp.marketing_hashtags,
        dp.social_short_description,
        p.name,
        p.slug,
        p.stock_qty,
        p.is_active
      from public.products p
      left join public.dropshipping_products dp
        on dp.company_id=p.company_id and dp.product_id=p.id
      where p.company_id=$1
      order by p.updated_at desc`,
      [req.companyId],
    );
    res.json(rows);
  }),
);
router.patch(
  "/products/:productId",
  authorize("products"),
  handle(async (req, res) => {
    const before =
      (
        await dropshippingQuery(
          "select * from public.dropshipping_products where company_id=$1 and product_id=$2",
          [req.companyId, req.params.productId],
        )
      ).rows[0] || null;
    const input = req.body;
    const saved = await withDropshippingTransaction(async (client) => {
      const configuration = await upsertDropshippingProductConfiguration(
        client,
        req.companyId,
        req.params.productId,
        input,
      );
      if (Array.isArray(input.marketingMedia)) {
        await client.query(
          "delete from public.dropshipping_product_media where company_id=$1 and product_id=$2",
          [req.companyId, req.params.productId],
        );
        for (const [index, media] of input.marketingMedia.entries()) {
          await client.query(
            `insert into public.dropshipping_product_media(company_id,product_id,media_type,public_url,title,downloadable,sort_order) values($1,$2,$3,$4,$5::jsonb,$6,$7)`,
            [
              req.companyId,
              req.params.productId,
              media.type,
              media.url,
              JSON.stringify(media.title || {}),
              media.downloadable !== false,
              index,
            ],
          );
        }
      }
      return configuration;
    });
    await audit(
      req,
      "dropshipping.product.update",
      "product",
      req.params.productId,
      before,
      saved,
      "Dropshipping pricing updated",
    );
    res.json(saved);
  }),
);
router.post(
  "/products/bulk",
  authorize("products"),
  handle(async (req, res) => {
    const ids = Array.isArray(req.body.productIds)
      ? req.body.productIds.map(String)
      : [];
    if (!ids.length)
      return res.status(400).json({ message: "productIds are required." });
    const { rows } = await dropshippingQuery(
      `insert into public.dropshipping_products(company_id,product_id,enabled,dropshipping_price) select $1,p.id,$3,coalesce($4,p.price,0) from public.products p where p.company_id=$1 and p.id=any($2::text[]) on conflict(company_id,product_id) do update set enabled=$3,dropshipping_price=coalesce($4,public.dropshipping_products.dropshipping_price),updated_at=now() returning *`,
      [
        req.companyId,
        ids,
        req.body.enabled === true,
        req.body.dropshippingPrice ?? null,
      ],
    );
    await audit(
      req,
      "dropshipping.product.bulk",
      "product",
      "bulk",
      null,
      { ids, count: rows.length },
      "Bulk dropshipping product update",
    );
    res.json(rows);
  }),
);

router.get(
  "/orders",
  authorize("orders", { read: true }),
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      `select o.*,p.full_name marketer_name from public.dropshipping_orders o join public.dropshipper_profiles p on p.company_id=o.company_id and p.id=o.dropshipper_id where o.company_id=$1 order by o.created_at desc`,
      [req.companyId],
    );
    res.json(rows);
  }),
);
router.get(
  "/orders/:id",
  authorize("orders", { read: true }),
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      `select o.*,p.full_name marketer_name,coalesce(jsonb_agg(i order by i.created_at) filter(where i.id is not null),'[]') items from public.dropshipping_orders o join public.dropshipper_profiles p on p.company_id=o.company_id and p.id=o.dropshipper_id left join public.dropshipping_order_items i on i.company_id=o.company_id and i.order_id=o.id where o.company_id=$1 and o.id=$2 group by o.id,p.full_name`,
      [req.companyId, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ message: "Order not found." });
    const history = (await dropshippingQuery(
      "select * from public.dropshipping_order_status_history where company_id=$1 and order_id=$2 order by created_at",
      [req.companyId, req.params.id],
    )).rows;
    res.json({ ...rows[0], history });
  }),
);
router.post(
  "/orders/:id/status",
  authorize("orders"),
  handle(async (req, res) => {
    const target = String(req.body.status || "");
    const result = await withDropshippingTransaction(async (client) => {
      const before = (
        await client.query(
          "select * from public.dropshipping_orders where company_id=$1 and id=$2 for update",
          [req.companyId, req.params.id],
        )
      ).rows[0];
      if (!before)
        throw Object.assign(new Error("Order not found."), { statusCode: 404 });
      assertTransition(before.delivery_status, target);
      if (target === "cancelled" || target === "returned") {
        await client.query(
          `update public.dropshipping_products dp set available_stock=dp.available_stock+i.quantity,updated_at=now()
           from (select company_id,product_id,sum(quantity) quantity from public.dropshipping_order_items where company_id=$1 and order_id=$2 group by company_id,product_id) i
           where dp.company_id=i.company_id and dp.product_id=i.product_id and dp.available_stock is not null`,
          [req.companyId, before.id],
        );
      }
      let profit = before.profit_status;
      const stamps = { delivered: null, cancelled: null, returned: null };
      if (target === "delivered") {
        profit = "pending_release";
        stamps.delivered = "now()";
        await client.query(
          "insert into public.dropshipper_wallets(company_id,dropshipper_id) values($1,$2) on conflict do nothing",
          [req.companyId, before.dropshipper_id],
        );
        await client.query(
          "update public.dropshipper_wallets set pending_balance=pending_balance+$1,updated_at=now() where company_id=$2 and dropshipper_id=$3",
          [before.marketer_profit, req.companyId, before.dropshipper_id],
        );
        await client.query(
          "insert into public.dropshipper_transactions(company_id,dropshipper_id,order_id,amount,pending_impact,transaction_type,description,idempotency_key,created_by) values($1,$2,$3,$4,$4,'earning_pending','Delivered order pending release',$5,$6) on conflict(company_id,idempotency_key) do nothing",
          [
            req.companyId,
            before.dropshipper_id,
            before.id,
            before.marketer_profit,
            `order:${before.id}:pending`,
            req.user.id,
          ],
        );
      }
      if (target === "cancelled" || target === "returned") {
        profit = "cancelled";
        stamps[target] = "now()";
        const pending =
          (
            await client.query(
              "select 1 from public.dropshipper_transactions where company_id=$1 and idempotency_key=$2",
              [req.companyId, `order:${before.id}:pending`],
            )
          ).rowCount > 0;
        const approved =
          (
            await client.query(
              "select 1 from public.dropshipper_transactions where company_id=$1 and idempotency_key=$2",
              [req.companyId, `order:${before.id}:approved`],
            )
          ).rowCount > 0;
        if (pending && !approved) {
          await client.query(
            "update public.dropshipper_wallets set pending_balance=pending_balance-$1,updated_at=now() where company_id=$2 and dropshipper_id=$3",
            [before.marketer_profit, req.companyId, before.dropshipper_id],
          );
          await client.query(
            "insert into public.dropshipper_transactions(company_id,dropshipper_id,order_id,amount,pending_impact,transaction_type,description,idempotency_key,created_by) values($1,$2,$3,$4,-$4,'earning_cancelled','Order cancelled or returned',$5,$6) on conflict do nothing",
            [
              req.companyId,
              before.dropshipper_id,
              before.id,
              before.marketer_profit,
              `order:${before.id}:cancelled`,
              req.user.id,
            ],
          );
        } else if (approved) {
          profit = "reversed";
          const wallet = (
            await client.query(
              "select * from public.dropshipper_wallets where company_id=$1 and dropshipper_id=$2 for update",
              [req.companyId, before.dropshipper_id],
            )
          ).rows[0];
          const availableImpact = -Math.min(
            Number(wallet.available_balance),
            Number(before.marketer_profit),
          );
          const debtImpact = Number(before.marketer_profit) + availableImpact;
          await client.query(
            "update public.dropshipper_wallets set available_balance=available_balance+$1,debt_balance=debt_balance+$2,lifetime_earnings=greatest(0,lifetime_earnings-$3),updated_at=now() where id=$4",
            [availableImpact, debtImpact, before.marketer_profit, wallet.id],
          );
          await client.query(
            "insert into public.dropshipper_transactions(company_id,dropshipper_id,order_id,amount,available_impact,debt_impact,transaction_type,description,idempotency_key,created_by) values($1,$2,$3,$4,$5,$6,'earning_reversed','Approved earning reversed',$7,$8) on conflict do nothing",
            [
              req.companyId,
              before.dropshipper_id,
              before.id,
              before.marketer_profit,
              availableImpact,
              debtImpact,
              `order:${before.id}:reversed`,
              req.user.id,
            ],
          );
        }
      }
      const after = (
        await client.query(
          `update public.dropshipping_orders set delivery_status=$3,profit_status=$4,delivered_at=case when $3='delivered' then now() else delivered_at end,cancelled_at=case when $3='cancelled' then now() else cancelled_at end,returned_at=case when $3='returned' then now() else returned_at end,return_status=case when $3='returned' then 'returned' else return_status end,updated_at=now() where company_id=$1 and id=$2 returning *`,
          [req.companyId, req.params.id, target, profit],
        )
      ).rows[0];
      await client.query(
        "insert into public.dropshipping_order_status_history(company_id,order_id,from_status,to_status,note,created_by) values($1,$2,$3,$4,$5,$6)",
        [
          req.companyId,
          before.id,
          before.delivery_status,
          target,
          req.body.note || null,
          req.user.id,
        ],
      );
      await notifyDropshipper(
        client,
        req.companyId,
        before.dropshipper_id,
        "order_status_changed",
        "Order status changed",
        `Order ${before.id} is now ${target}.`,
        { orderId: before.id, status: target },
      );
      return { before, after };
    });
    await audit(
      req,
      "dropshipping.order.status",
      "dropshipping_order",
      req.params.id,
      result.before,
      result.after,
      `Status changed to ${target}`,
    );
    res.json(result.after);
  }),
);

router.get(
  "/earnings",
  authorize("earnings", { read: true }),
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      `select t.*,p.full_name marketer_name from public.dropshipper_transactions t join public.dropshipper_profiles p on p.company_id=t.company_id and p.id=t.dropshipper_id where t.company_id=$1 order by t.created_at desc`,
      [req.companyId],
    );
    res.json(rows);
  }),
);
router.post(
  "/earnings/:id/release",
  authorize("earnings"),
  handle(async (req, res) => {
    const result = await withDropshippingTransaction(async (client) => {
      const order = (
        await client.query(
          "select o.*,s.profit_release_delay_days from public.dropshipping_orders o join public.dropshipping_settings s on s.company_id=o.company_id where o.company_id=$1 and o.id=$2 for update of o",
          [req.companyId, req.params.id],
        )
      ).rows[0];
      if (!order || order.profit_status !== "pending_release")
        throw Object.assign(new Error("Earning is not pending release."), {
          statusCode: 409,
        });
      if (
        new Date(order.delivered_at).getTime() +
          Number(order.profit_release_delay_days) * 86400000 >
        Date.now()
      )
        throw Object.assign(
          new Error("Return-protection period has not completed."),
          { statusCode: 409 },
        );
      const wallet = (
        await client.query(
          "select * from public.dropshipper_wallets where company_id=$1 and dropshipper_id=$2 for update",
          [req.companyId, order.dropshipper_id],
        )
      ).rows[0];
      const debtPaid = Math.min(
        Number(wallet.debt_balance || 0),
        Number(order.marketer_profit),
      );
      const availableImpact = Number(order.marketer_profit) - debtPaid;
      const changed = await client.query(
        "update public.dropshipper_wallets set pending_balance=pending_balance-$1,available_balance=available_balance+$3,debt_balance=greatest(0,debt_balance-$1),lifetime_earnings=lifetime_earnings+$1,updated_at=now() where id=$2 and pending_balance>=$1",
        [order.marketer_profit, wallet.id, availableImpact],
      );
      if (!changed.rowCount)
        throw Object.assign(
          new Error("Wallet pending balance is inconsistent."),
          { statusCode: 409 },
        );
      await client.query(
        "insert into public.dropshipper_transactions(company_id,dropshipper_id,order_id,amount,available_impact,pending_impact,debt_impact,transaction_type,description,idempotency_key,created_by) values($1,$2,$3,$4,$5,-$4,$6,'earning_approved','Return period completed',$7,$8)",
        [
          req.companyId,
          order.dropshipper_id,
          order.id,
          order.marketer_profit,
          availableImpact,
          -debtPaid,
          `order:${order.id}:approved`,
          req.user.id,
        ],
      );
      const updated = (
        await client.query(
          "update public.dropshipping_orders set profit_status='approved',return_status='expired',updated_at=now() where id=$1 returning *",
          [order.id],
        )
      ).rows[0];
      await notifyDropshipper(
        client,
        req.companyId,
        order.dropshipper_id,
        "earning_approved",
        "Earning approved",
        `Profit for order ${order.id} is now available.`,
        { orderId: order.id },
      );
      return updated;
    });
    await audit(
      req,
      "dropshipping.earning.release",
      "dropshipping_order",
      req.params.id,
      null,
      result,
      "Earning released",
    );
    res.json(result);
  }),
);
router.post(
  "/earnings/:id/adjust",
  authorize("earnings"),
  handle(async (req, res) => {
    const reason = String(req.body.reason || "").trim();
    if (!reason)
      return res.status(400).json({ message: "A reason is required." });
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount === 0)
      return res
        .status(400)
        .json({ message: "A non-zero amount is required." });
    const result = await withDropshippingTransaction(async (client) => {
      const wallet = (
        await client.query(
          "select * from public.dropshipper_wallets where company_id=$1 and dropshipper_id=$2 for update",
          [req.companyId, req.params.id],
        )
      ).rows[0];
      if (!wallet || Number(wallet.available_balance) + amount < 0)
        throw Object.assign(
          new Error("Adjustment would create a negative balance."),
          { statusCode: 409 },
        );
      await client.query(
        "update public.dropshipper_wallets set available_balance=available_balance+$1,lifetime_earnings=greatest(0,lifetime_earnings+$1),updated_at=now() where id=$2",
        [amount, wallet.id],
      );
      return (
        await client.query(
          "insert into public.dropshipper_transactions(company_id,dropshipper_id,amount,available_impact,transaction_type,description,idempotency_key,created_by) values($1,$2,$3,$3,'manual_adjustment',$4,$5,$6) returning *",
          [
            req.companyId,
            req.params.id,
            amount,
            reason,
            `adjustment:${crypto.randomUUID()}`,
            req.user.id,
          ],
        )
      ).rows[0];
    });
    await audit(
      req,
      "dropshipping.earning.adjust",
      "dropshipper",
      req.params.id,
      null,
      result,
      reason,
    );
    res.status(201).json(result);
  }),
);

router.get(
  "/withdrawals",
  authorize("withdrawals", { read: true }),
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      `select w.id,w.dropshipper_id,w.amount,w.payment_method,w.status,w.requested_at,w.approved_at,w.paid_at,w.rejected_at,w.rejection_reason,w.reference_number,p.full_name,w.payment_details from public.withdrawal_requests w join public.dropshipper_profiles p on p.company_id=w.company_id and p.id=w.dropshipper_id where w.company_id=$1 order by w.requested_at desc`,
      [req.companyId],
    );
    const canViewPaymentDetails = ["admin", "company_admin", "super_admin"].includes(effectiveTenantRole(req))
      || req.user.permissions?.includes("dropshipping.withdrawals.manage");
    res.json(canViewPaymentDetails ? rows : rows.map(({ payment_details, ...row }) => row));
  }),
);
async function processWithdrawal(req, target) {
  return withDropshippingTransaction(async (client) => {
    const before = (
      await client.query(
        "select * from public.withdrawal_requests where company_id=$1 and id=$2 for update",
        [req.companyId, req.params.id],
      )
    ).rows[0];
    if (!before)
      throw Object.assign(new Error("Withdrawal not found."), {
        statusCode: 404,
      });
    const allowed = {
      approved: ["pending"],
      paid: ["approved"],
      rejected: ["pending", "approved"],
    };
    if (!allowed[target].includes(before.status))
      throw Object.assign(
        new Error(`Cannot mark ${before.status} withdrawal as ${target}.`),
        { statusCode: 409 },
      );
    let walletSql = "";
    let txType = "";
    let impacts = [0, 0];
    if (target === "paid") {
      walletSql =
        "withdrawal_reserved=withdrawal_reserved-$1,paid_balance=paid_balance+$1";
      txType = "withdrawal_paid";
      impacts = [-Number(before.amount), Number(before.amount)];
    }
    if (target === "rejected") {
      walletSql =
        "withdrawal_reserved=withdrawal_reserved-$1,available_balance=available_balance+$1";
      txType = "withdrawal_rejected";
      impacts = [-Number(before.amount), 0];
    }
    if (walletSql)
      await client.query(
        `update public.dropshipper_wallets set ${walletSql},updated_at=now() where company_id=$2 and dropshipper_id=$3 and withdrawal_reserved>=$1`,
        [before.amount, req.companyId, before.dropshipper_id],
      );
    const after = (
      await client.query(
        `update public.withdrawal_requests set status=$3,approved_at=case when $3='approved' then now() else approved_at end,paid_at=case when $3='paid' then now() else paid_at end,rejected_at=case when $3='rejected' then now() else rejected_at end,rejection_reason=case when $3='rejected' then $4 else rejection_reason end,reference_number=coalesce($5,reference_number),processed_by=$6 where company_id=$1 and id=$2 returning *`,
        [
          req.companyId,
          req.params.id,
          target,
          req.body.reason || null,
          req.body.referenceNumber || null,
          req.user.id,
        ],
      )
    ).rows[0];
    if (txType)
      await client.query(
        "insert into public.dropshipper_transactions(company_id,dropshipper_id,withdrawal_request_id,amount,available_impact,reserved_impact,paid_impact,transaction_type,description,idempotency_key,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
        [
          req.companyId,
          before.dropshipper_id,
          before.id,
          before.amount,
          target === "rejected" ? before.amount : 0,
          impacts[0],
          impacts[1],
          txType,
          `Withdrawal ${target}`,
          `withdrawal:${before.id}:${target}`,
          req.user.id,
        ],
      );
    await notifyDropshipper(
      client,
      req.companyId,
      before.dropshipper_id,
      `withdrawal_${target}`,
      `Withdrawal ${target}`,
      `Your withdrawal is ${target}.`,
      { withdrawalId: before.id },
    );
    return { before, after };
  });
}
for (const target of ["approved", "paid", "rejected"])
  router.post(
    `/withdrawals/:id/${target === "approved" ? "approve" : target === "paid" ? "pay" : "reject"}`,
    authorize("withdrawals"),
    handle(async (req, res) => {
      if (target === "rejected" && !String(req.body.reason || "").trim())
        return res.status(400).json({ message: "A reason is required." });
      if (target === "paid" && !String(req.body.referenceNumber || "").trim())
        return res
          .status(400)
          .json({ message: "A payment reference is required." });
      const result = await processWithdrawal(req, target);
      await audit(
        req,
        `dropshipping.withdrawal.${target}`,
        "withdrawal",
        req.params.id,
        result.before,
        result.after,
        `Withdrawal ${target}`,
      );
      res.json(result.after);
    }),
  );

router.get(
  "/reports",
  authorize("reports", { read: true }),
  handle(async (req, res) => {
    const values = [req.companyId];
    const filters = reportFilters(req, values);
    const { rows } = await dropshippingQuery(
      `select p.id dropshipper_id,p.full_name,count(o.id) total_orders,count(o.id) filter(where o.delivery_status='confirmed') confirmed_orders,count(o.id) filter(where o.delivery_status='delivered') delivered_orders,count(o.id) filter(where o.delivery_status='cancelled') cancelled_orders,count(o.id) filter(where o.delivery_status='returned') returned_orders,coalesce(sum(o.customer_selling_total),0) total_sales,coalesce(sum(o.dropshipping_cost_total),0) dropshipping_cost,coalesce(sum(o.fees_total),0) fees,coalesce(sum(o.marketer_profit),0) gross_profit,coalesce(w.paid_balance,0) paid_profit,coalesce(w.pending_balance,0) pending_profit,coalesce(avg(o.customer_selling_total),0) average_order_value,case when count(o.id)>0 then round(100.0*count(o.id) filter(where o.delivery_status='delivered')/count(o.id),2) else 0 end delivery_success_rate from public.dropshipper_profiles p left join public.dropshipping_orders o on o.company_id=p.company_id and o.dropshipper_id=p.id left join public.dropshipper_wallets w on w.company_id=p.company_id and w.dropshipper_id=p.id where p.company_id=$1${filters} group by p.id,w.id order by total_sales desc`,
      values,
    );
    res.json(rows);
  }),
);
router.get(
  "/reports/export",
  authorize("reports", { read: true }),
  handle(async (req, res) => {
    const values = [req.companyId];
    const filters = reportFilters(req, values);
    const { rows } = await dropshippingQuery(
      `select o.id,p.full_name,o.customer_name,o.customer_phone,o.region,o.delivery_status,o.customer_selling_total,o.dropshipping_cost_total,o.fees_total,o.marketer_profit,o.created_at from public.dropshipping_orders o join public.dropshipper_profiles p on p.company_id=o.company_id and p.id=o.dropshipper_id where o.company_id=$1${filters} order by o.created_at desc`,
      values,
    );
    const keys = [
      "id",
      "full_name",
      "customer_name",
      "customer_phone",
      "region",
      "delivery_status",
      "customer_selling_total",
      "dropshipping_cost_total",
      "fees_total",
      "marketer_profit",
      "created_at",
    ];
    res
      .type("text/csv")
      .attachment("dropshipping-report.csv")
      .send(
        [
          keys.map(csvCell).join(","),
          ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(",")),
        ].join("\r\n"),
      );
  }),
);
router.get(
  "/settings",
  authorize("settings", { read: true }),
  handle(async (req, res) => {
    const { rows } = await dropshippingQuery(
      "select * from public.dropshipping_settings where company_id=$1",
      [req.companyId],
    );
    res.json(rows[0]);
  }),
);
router.patch(
  "/settings",
  authorize("settings"),
  handle(async (req, res) => {
    const before = (
      await dropshippingQuery(
        "select * from public.dropshipping_settings where company_id=$1",
        [req.companyId],
      )
    ).rows[0];
    const b = req.body;
    const { rows } = await dropshippingQuery(
      `update public.dropshipping_settings set dropshipping_enabled=coalesce($2,dropshipping_enabled),default_fixed_fee=coalesce($3,default_fixed_fee),default_percentage_fee=coalesce($4,default_percentage_fee),default_minimum_order=coalesce($5,default_minimum_order),minimum_withdrawal_amount=coalesce($6,minimum_withdrawal_amount),profit_release_delay_days=coalesce($7,profit_release_delay_days),marketer_price_limit_type=coalesce($8,marketer_price_limit_type),default_maximum_markup=$9,default_maximum_selling_price=$10,allow_video_download=coalesce($11,allow_video_download),allow_image_download=coalesce($12,allow_image_download),require_admin_order_confirmation=coalesce($13,require_admin_order_confirmation),updated_at=now() where company_id=$1 returning *`,
      [
        req.companyId,
        b.dropshippingEnabled,
        b.defaultFixedFee,
        b.defaultPercentageFee,
        b.defaultMinimumOrder,
        b.minimumWithdrawalAmount,
        b.profitReleaseDelayDays,
        b.marketerPriceLimitType,
        b.defaultMaximumMarkup ?? null,
        b.defaultMaximumSellingPrice ?? null,
        b.allowVideoDownload,
        b.allowImageDownload,
        b.requireAdminOrderConfirmation,
      ],
    );
    await audit(
      req,
      "dropshipping.settings.update",
      "dropshipping_settings",
      req.companyId,
      before,
      rows[0],
      "Dropshipping settings updated",
    );
    res.json(rows[0]);
  }),
);

export default router;
