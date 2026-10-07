import crypto from "node:crypto";
import { canCancelUnconfirmed, httpError, lineProfit, settlementProfit, unitProfit } from "./domain.js";
import { recordAudit, velvetQuery, withVelvetTransaction } from "./database.js";
import { deductForConfirm, recordWarehouseMiss, reverseConfirm } from "./stock.js";
import { orderProfitFromLines } from "./settlements.js";
import { buyerWhatsAppLink, nextAttempt } from "./whatsapp.js";

const ACTIVE = "active";

async function loadLines(client, companyId, orderId) {
  const result = await client.query(
    `select * from public.velvet_dropship_order_lines
     where company_id = $1 and order_id = $2
     order by created_at`,
    [companyId, orderId],
  );
  return result.rows;
}

async function lockOrder(client, companyId, orderId) {
  const result = await client.query(
    `select * from public.velvet_dropship_orders
     where company_id = $1 and id = $2
     for update`,
    [companyId, orderId],
  );
  if (!result.rowCount) throw httpError(404, "Order was not found.");
  return result.rows[0];
}

function recalc(lines) {
  const active = lines.filter((line) => line.line_status === ACTIVE);
  return {
    merchandiseTotal: active.reduce((sum, line) => sum + Number(line.selling_unit_price) * Number(line.quantity), 0).toFixed(2),
    merchantProfitTotal: orderProfitFromLines(active.map((line) => ({ ...line, line_status: ACTIVE }))),
  };
}

async function saveTotals(client, order, lines) {
  const totals = recalc(lines);
  await client.query(
    `update public.velvet_dropship_orders
     set merchandise_total = $3, merchant_profit_total = $4, updated_at = now()
     where company_id = $1 and id = $2`,
    [order.company_id, order.id, totals.merchandiseTotal, totals.merchantProfitTotal],
  );
  return totals;
}

export async function createOrder(client, { companyId, store, items, customer, delivery, idempotencyKey }) {
  const existing = await client.query(
    `select * from public.velvet_dropship_orders where company_id = $1 and idempotency_key = $2`,
    [companyId, idempotencyKey],
  );
  if (existing.rowCount) return existing.rows[0];
  if (store.status !== "active" || store.merchant_status !== "active") {
    throw httpError(409, "This store is not accepting orders.");
  }
  const orderId = crypto.randomUUID();
  const lines = [];
  for (const item of items) {
    const offer = await client.query(
      `select o.*, p.name, p.stock_qty
       from public.velvet_dropship_offers o
       join public.velvet_dropship_merchant_products mp
         on mp.offer_id = o.id and mp.merchant_id = $2 and mp.active = true
       join public.products p on p.company_id = o.company_id and p.id = o.product_id
       where o.company_id = $1 and o.id = $3 and o.active = true`,
      [companyId, store.merchant_id, item.offerId],
    );
    if (!offer.rowCount) throw httpError(400, "One or more products are not in this store.");
    const row = offer.rows[0];
    if (Number(row.stock_qty) <= 0) throw httpError(409, "This product is not available.");
    const profit = unitProfit(row.selling_unit_price, row.merchant_unit_price);
    lines.push({
      offerId: row.id,
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.name,
      quantity: Number(item.quantity),
      sellingUnitPrice: row.selling_unit_price,
      merchantUnitPrice: row.merchant_unit_price,
      profitUnitAmount: profit,
    });
  }
  const merchandiseTotal = lines.reduce((sum, line) => sum + Number(line.sellingUnitPrice) * line.quantity, 0).toFixed(2);
  const merchantProfitTotal = settlementProfit(lines.map((line) => ({
    profitUnitAmount: line.profitUnitAmount,
    quantity: line.quantity,
    lineStatus: "active",
  })));
  const inserted = await client.query(
    `insert into public.velvet_dropship_orders
       (id, company_id, merchant_id, store_id, status, customer_name, customer_phone, city, address,
        delivery_amount, delivery_amount_status, merchandise_total, merchant_profit_total, idempotency_key)
     values ($1,$2,$3,$4,'PENDING_MERCHANT_CONFIRMATION',$5,$6,$7,$8,$9,$10,$11,$12,$13)
     on conflict (company_id, idempotency_key) do nothing
     returning *`,
    [
      orderId, companyId, store.merchant_id, store.id, customer.name, customer.phone, customer.city, customer.address,
      delivery.deliveryAmount, delivery.deliveryAmountStatus, merchandiseTotal, merchantProfitTotal, idempotencyKey,
    ],
  );
  if (!inserted.rowCount) {
    const replay = await client.query(
      `select * from public.velvet_dropship_orders where company_id = $1 and idempotency_key = $2`,
      [companyId, idempotencyKey],
    );
    return replay.rows[0];
  }
  for (const line of lines) {
    await client.query(
      `insert into public.velvet_dropship_order_lines
         (company_id, order_id, offer_id, product_id, variant_id, product_name, quantity,
          selling_unit_price, merchant_unit_price, profit_unit_amount, line_status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')`,
      [
        companyId, inserted.rows[0].id, line.offerId, line.productId, line.variantId, line.productName,
        line.quantity, line.sellingUnitPrice, line.merchantUnitPrice, line.profitUnitAmount,
      ],
    );
  }
  await recordAudit(client, {
    companyId,
    actorUserId: null,
    action: "order_status",
    entityType: "order",
    entityId: inserted.rows[0].id,
    payload: { from: null, to: "PENDING_MERCHANT_CONFIRMATION" },
  });
  return inserted.rows[0];
}

export async function confirmOrder(companyId, merchantId, orderId, actorUserId = null) {
  return withVelvetTransaction(async (client) => {
    const order = await lockOrder(client, companyId, orderId);
    if (order.merchant_id !== merchantId) throw httpError(404, "Order was not found.");
    if (order.status === "CONFIRMED") return order;
    if (!["PENDING_MERCHANT_CONFIRMATION", "NEEDS_ITEM_RESOLUTION"].includes(order.status) || order.held_fulfillment_status) {
      throw httpError(409, "This order cannot be confirmed.");
    }
    const lines = (await loadLines(client, companyId, orderId)).filter((line) => line.line_status === ACTIVE);
    if (!lines.length) throw httpError(409, "The order has no items to confirm.");
    for (const line of lines) {
      const stock = await client.query(
        line.variant_id
          ? `select stock as qty from public.product_variants where company_id = $1 and product_id = $2 and id = $3 for update`
          : `select stock_qty as qty from public.products where company_id = $1 and id = $2 for update`,
        line.variant_id ? [companyId, line.product_id, line.variant_id] : [companyId, line.product_id],
      );
      if (!stock.rowCount || Number(stock.rows[0].qty) < Number(line.quantity)) {
        await client.query(
          `update public.velvet_dropship_order_lines set line_status = 'missing_in_warehouse' where id = $1`,
          [line.id],
        );
        await client.query(
          `update public.velvet_dropship_orders
           set status = 'NEEDS_ITEM_RESOLUTION', updated_at = now()
           where company_id = $1 and id = $2`,
          [companyId, orderId],
        );
        await recordAudit(client, {
          companyId,
          actorUserId,
          action: "order_status",
          entityType: "order",
          entityId: orderId,
          payload: { from: order.status, to: "NEEDS_ITEM_RESOLUTION", lineId: line.id, code: "STOCK_CONFLICT" },
        });
        return { conflict: true, code: "STOCK_CONFLICT" };
      }
    }
    for (const line of lines) {
      await deductForConfirm(client, {
        companyId,
        actorUserId,
        orderId,
        lineId: line.id,
        productId: line.product_id,
        variantId: line.variant_id,
        quantity: line.quantity,
      });
    }
    const confirmed = await client.query(
      `update public.velvet_dropship_orders set status = 'CONFIRMED', updated_at = now()
       where company_id = $1 and id = $2 returning *`,
      [companyId, orderId],
    );
    await recordAudit(client, {
      companyId,
      actorUserId,
      action: "order_status",
      entityType: "order",
      entityId: orderId,
      payload: { from: order.status, to: "CONFIRMED" },
    });
    return confirmed.rows[0];
  });
}

export async function recordWhatsApp(companyId, merchantId, orderId) {
  return withVelvetTransaction(async (client) => {
    const order = await lockOrder(client, companyId, orderId);
    if (order.merchant_id !== merchantId) throw httpError(404, "Order was not found.");
    const attempt = nextAttempt(order);
    await client.query(
      `update public.velvet_dropship_orders
       set whatsapp_attempt_count = $3, whatsapp_attempt_day = $4, updated_at = now()
       where company_id = $1 and id = $2`,
      [companyId, orderId, attempt.whatsappAttemptCount, attempt.whatsappAttemptDay],
    );
    const lines = await loadLines(client, companyId, orderId);
    const url = buyerWhatsAppLink({
      phone: order.customer_phone,
      items: lines.filter((line) => line.line_status === ACTIVE).map((line) => ({
        quantity: line.quantity,
        name: line.product_name,
      })),
      merchandiseTotal: order.merchandise_total,
      deliveryAmount: order.delivery_amount_status === "set" ? order.delivery_amount : null,
    });
    return { url, deliveryAmount: order.delivery_amount, deliveryAmountStatus: order.delivery_amount_status, attemptCount: attempt.whatsappAttemptCount };
  });
}

export async function cancelUnconfirmed(companyId, merchantId, orderId, actorUserId = null) {
  return withVelvetTransaction(async (client) => {
    const order = await lockOrder(client, companyId, orderId);
    if (order.merchant_id !== merchantId) throw httpError(404, "Order was not found.");
    if (order.status !== "PENDING_MERCHANT_CONFIRMATION") throw httpError(409, "This order cannot be cancelled.");
    if (!canCancelUnconfirmed(order.whatsapp_attempt_count)) {
      throw httpError(409, "Record two WhatsApp attempts on the same day before cancelling.");
    }
    const updated = await client.query(
      `update public.velvet_dropship_orders
       set status = 'CANCELLED_UNCONFIRMED', updated_at = now()
       where company_id = $1 and id = $2 returning *`,
      [companyId, orderId],
    );
    await recordAudit(client, {
      companyId,
      actorUserId,
      action: "order_status",
      entityType: "order",
      entityId: orderId,
      payload: { from: order.status, to: "CANCELLED_UNCONFIRMED" },
    });
    return updated.rows[0];
  });
}

export async function markWarehouseMiss(companyId, orderId, lineId, actorUserId = null) {
  return withVelvetTransaction(async (client) => {
    const order = await lockOrder(client, companyId, orderId);
    if (!["CONFIRMED", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "NEEDS_ITEM_RESOLUTION"].includes(order.status)) {
      throw httpError(409, "This order cannot record a warehouse miss.");
    }
    const lineResult = await client.query(
      `select * from public.velvet_dropship_order_lines
       where company_id = $1 and order_id = $2 and id = $3
       for update`,
      [companyId, orderId, lineId],
    );
    if (!lineResult.rowCount || lineResult.rows[0].line_status !== ACTIVE) {
      throw httpError(409, "The line is not an active confirmed item.");
    }
    const line = lineResult.rows[0];
    const held = order.held_fulfillment_status || (order.status === "NEEDS_ITEM_RESOLUTION" ? "CONFIRMED" : order.status);
    await recordWarehouseMiss(client, {
      companyId,
      actorUserId,
      orderId,
      lineId: line.id,
      productId: line.product_id,
      variantId: line.variant_id,
      quantity: line.quantity,
    });
    await client.query(
      `update public.velvet_dropship_order_lines set line_status = 'missing_in_warehouse' where id = $1`,
      [lineId],
    );
    await client.query(
      `update public.velvet_dropship_orders
       set status = 'NEEDS_ITEM_RESOLUTION', held_fulfillment_status = $3, updated_at = now()
       where company_id = $1 and id = $2`,
      [companyId, orderId, held],
    );
    await client.query(
      `insert into public.velvet_dropship_notifications (company_id, merchant_id, order_id, kind, message)
       values ($1,$2,$3,'warehouse_miss','An item is missing. Contact the buyer.')`,
      [companyId, order.merchant_id, orderId],
    );
    await recordAudit(client, {
      companyId,
      actorUserId,
      action: "order_status",
      entityType: "order",
      entityId: orderId,
      payload: { from: order.status, to: "NEEDS_ITEM_RESOLUTION", lineId },
    });
    return lockOrder(client, companyId, orderId);
  });
}

export async function resolveLine(companyId, merchantId, orderId, { action, lineId, replacementOfferId, actorUserId = null }) {
  return withVelvetTransaction(async (client) => {
    const order = await lockOrder(client, companyId, orderId);
    if (order.merchant_id !== merchantId) throw httpError(404, "Order was not found.");
    if (order.status !== "NEEDS_ITEM_RESOLUTION") throw httpError(409, "This order is not waiting for item resolution.");
    const lineResult = await client.query(
      `select * from public.velvet_dropship_order_lines where company_id = $1 and order_id = $2 and id = $3 for update`,
      [companyId, orderId, lineId],
    );
    if (!lineResult.rowCount) throw httpError(404, "Line was not found.");
    const line = lineResult.rows[0];
    if (action === "remove") {
      await recordAudit(client, {
        companyId,
        actorUserId,
        action: "missing_item_remove",
        entityType: "order_line",
        entityId: lineId,
        payload: { orderId },
      });
      await client.query(
        `update public.velvet_dropship_order_lines
         set line_status = 'removed', profit_unit_amount = 0
         where id = $1`,
        [lineId],
      );
    } else if (action === "replace") {
      const offer = await client.query(
        `select o.*, p.name, p.stock_qty
         from public.velvet_dropship_offers o
         join public.products p on p.company_id = o.company_id and p.id = o.product_id
         where o.company_id = $1 and o.id = $2 and o.active = true`,
        [companyId, replacementOfferId],
      );
      if (!offer.rowCount) throw httpError(404, "Replacement offer was not found.");
      const replacement = offer.rows[0];
      if (order.held_fulfillment_status && Number(replacement.stock_qty) < Number(line.quantity)) {
        throw httpError(409, "Replacement stock is not available.", "STOCK_CONFLICT");
      }
      const profit = unitProfit(replacement.selling_unit_price, replacement.merchant_unit_price);
      const inserted = await client.query(
        `insert into public.velvet_dropship_order_lines
           (company_id, order_id, offer_id, product_id, variant_id, product_name, quantity,
            selling_unit_price, merchant_unit_price, profit_unit_amount, line_status, replaces_line_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11)
         returning *`,
        [
          companyId, orderId, replacement.id, replacement.product_id, replacement.variant_id, replacement.name,
          line.quantity, replacement.selling_unit_price, replacement.merchant_unit_price, profit, lineId,
        ],
      );
      await recordAudit(client, {
        companyId,
        actorUserId,
        action: "missing_item_replace",
        entityType: "order_line",
        entityId: lineId,
        payload: { orderId, replacementOfferId, replacementLineId: inserted.rows[0].id },
      });
      if (order.held_fulfillment_status) {
        await deductForConfirm(client, {
          companyId,
          actorUserId,
          orderId,
          lineId: inserted.rows[0].id,
          productId: replacement.product_id,
          variantId: replacement.variant_id,
          quantity: line.quantity,
          reason: "replacement",
        });
        await client.query(
          `update public.velvet_dropship_inventory_movements
           set reason = 'replacement'
           where company_id = $1 and idempotency_key = $2`,
          [companyId, `confirm:${orderId}:${inserted.rows[0].id}`],
        );
      }
      await client.query(
        `update public.velvet_dropship_order_lines
         set line_status = 'replaced', profit_unit_amount = 0
         where id = $1`,
        [lineId],
      );
    } else {
      throw httpError(400, "Resolution must remove or replace the line.");
    }
    const lines = await loadLines(client, companyId, orderId);
    await saveTotals(client, order, lines);
    const remaining = lines.filter((entry) => entry.line_status === ACTIVE);
    let status = order.status;
    if (!remaining.length) status = "CANCELLED_OPERATIONAL";
    else if (order.held_fulfillment_status) status = order.held_fulfillment_status;
    else status = "PENDING_MERCHANT_CONFIRMATION";
    const updated = await client.query(
      `update public.velvet_dropship_orders set status = $3, updated_at = now()
       where company_id = $1 and id = $2 returning *`,
      [companyId, orderId, status],
    );
    await recordAudit(client, {
      companyId,
      actorUserId,
      action: "order_status",
      entityType: "order",
      entityId: orderId,
      payload: { from: order.status, to: status },
    });
    return updated.rows[0];
  });
}

export async function advanceFulfillment(companyId, orderId, status, actorUserId = null) {
  const allowed = {
    CONFIRMED: "PROCESSING",
    PROCESSING: "PACKED",
    PACKED: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED_COLLECTED",
  };
  return withVelvetTransaction(async (client) => {
    const order = await lockOrder(client, companyId, orderId);
    if (allowed[order.status] !== status) throw httpError(409, `Cannot move an order from ${order.status} to ${status}.`);
    const updated = await client.query(
      `update public.velvet_dropship_orders set status = $3, updated_at = now()
       where company_id = $1 and id = $2 returning *`,
      [companyId, orderId, status],
    );
    await recordAudit(client, {
      companyId,
      actorUserId,
      action: "order_status",
      entityType: "order",
      entityId: orderId,
      payload: { from: order.status, to: status },
    });
    return updated.rows[0];
  });
}

export async function operationalCancel(companyId, orderId, actorUserId = null) {
  return withVelvetTransaction(async (client) => {
    const order = await lockOrder(client, companyId, orderId);
    if (order.status === "DELIVERED_COLLECTED" || order.status === "CANCELLED_OPERATIONAL") {
      throw httpError(409, "This order cannot be cancelled.");
    }
    const lines = (await loadLines(client, companyId, orderId)).filter((line) => line.line_status === ACTIVE);
    for (const line of lines) {
      const confirmed = await client.query(
        `select 1 from public.velvet_dropship_inventory_movements
         where company_id = $1 and idempotency_key = $2`,
        [companyId, `confirm:${orderId}:${line.id}`],
      );
      const reversed = await client.query(
        `select 1 from public.velvet_dropship_inventory_movements
         where company_id = $1 and reason = 'warehouse_miss_reversal' and line_id = $2`,
        [companyId, line.id],
      );
      if (confirmed.rowCount && !reversed.rowCount) {
        await reverseConfirm(client, {
          companyId,
          actorUserId,
          orderId,
          lineId: line.id,
          productId: line.product_id,
          variantId: line.variant_id,
          quantity: line.quantity,
        });
      }
    }
    const updated = await client.query(
      `update public.velvet_dropship_orders
       set status = 'CANCELLED_OPERATIONAL', merchant_profit_total = 0, updated_at = now()
       where company_id = $1 and id = $2 returning *`,
      [companyId, orderId],
    );
    await recordAudit(client, {
      companyId,
      actorUserId,
      action: "order_status",
      entityType: "order",
      entityId: orderId,
      payload: { from: order.status, to: "CANCELLED_OPERATIONAL" },
    });
    return updated.rows[0];
  });
}

export async function listMerchantOrders(companyId, merchantId) {
  const result = await velvetQuery(
    `select o.*,
            coalesce(json_agg(json_build_object(
              'id', l.id,
              'productName', l.product_name,
              'quantity', l.quantity,
              'lineStatus', l.line_status
            ) order by l.created_at) filter (where l.id is not null), '[]'::json) as lines
     from public.velvet_dropship_orders o
     left join public.velvet_dropship_order_lines l
       on l.order_id = o.id and l.company_id = o.company_id
     where o.company_id = $1 and o.merchant_id = $2
     group by o.id
     order by o.created_at desc`,
    [companyId, merchantId],
  );
  return result.rows;
}

export async function listCompanyOrders(companyId, { merchantId = null, storeId = null } = {}) {
  const result = await velvetQuery(
    `select * from public.velvet_dropship_orders
     where company_id = $1
       and ($2::uuid is null or merchant_id = $2)
       and ($3::uuid is null or store_id = $3)
     order by created_at desc`,
    [companyId, merchantId || null, storeId || null],
  );
  return result.rows;
}

export function profitSnapshot(selling, merchant, quantity) {
  return lineProfit(unitProfit(selling, merchant), quantity);
}
