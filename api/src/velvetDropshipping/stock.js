import { recordAudit } from "./database.js";
import { httpError, warehouseMissMovements } from "./domain.js";

export const PRODUCT_DELTA_SQL = `
update public.products
set stock_qty = stock_qty + $3,
    updated_at = now()
where company_id = $1
  and id = $2
  and stock_qty + $3 >= 0
returning stock_qty
`;

export const VARIANT_DELTA_SQL = `
update public.product_variants
set stock = stock + $4,
    updated_at = now()
where company_id = $1
  and product_id = $2
  and id = $3
  and stock + $4 >= 0
returning stock
`;

export const INSERT_MOVEMENT_SQL = `
insert into public.velvet_dropship_inventory_movements
  (company_id, order_id, line_id, product_id, variant_id, reason, qty_delta, idempotency_key)
values ($1,$2,$3,$4,$5,$6,$7,$8)
on conflict (company_id, idempotency_key) do nothing
returning id
`;

function stockConflict(message = "Insufficient catalog stock.") {
  return httpError(409, message, "STOCK_CONFLICT");
}

export async function applyCatalogDelta(client, { companyId, productId, variantId = null, delta }) {
  if (variantId) {
    const variant = await client.query(VARIANT_DELTA_SQL, [companyId, productId, variantId, delta]);
    if (!variant.rowCount) throw stockConflict();
  }
  const product = await client.query(PRODUCT_DELTA_SQL, [companyId, productId, delta]);
  if (!product.rowCount) throw stockConflict();
  return product.rows[0];
}

export async function insertMovement(client, movement) {
  const inserted = await client.query(INSERT_MOVEMENT_SQL, [
    movement.companyId,
    movement.orderId,
    movement.lineId,
    movement.productId,
    movement.variantId || null,
    movement.reason,
    movement.qtyDelta,
    movement.idempotencyKey,
  ]);
  if (inserted.rowCount) {
    await recordAudit(client, {
      companyId: movement.companyId,
      actorUserId: movement.actorUserId || null,
      action: "inventory",
      entityType: "order_line",
      entityId: movement.lineId,
      payload: {
        orderId: movement.orderId,
        reason: movement.reason,
        quantity: Math.abs(Number(movement.qtyDelta)),
        qtyDelta: movement.qtyDelta,
      },
    });
  }
  return inserted.rowCount > 0;
}

export async function deductForConfirm(client, line) {
  const inserted = await insertMovement(client, {
    ...line,
    reason: line.reason || "confirm",
    qtyDelta: -Number(line.quantity),
    idempotencyKey: `confirm:${line.orderId}:${line.lineId}`,
  });
  if (!inserted) return false;
  await applyCatalogDelta(client, {
    companyId: line.companyId,
    productId: line.productId,
    variantId: line.variantId,
    delta: -Number(line.quantity),
  });
  return true;
}

export async function recordWarehouseMiss(client, line) {
  const movements = warehouseMissMovements(line.quantity);
  let wrote = false;
  for (const movement of movements) {
    const inserted = await insertMovement(client, {
      ...line,
      reason: movement.reason,
      qtyDelta: movement.qtyDelta,
      idempotencyKey: `${movement.reason}:${line.lineId}`,
    });
    if (!inserted) continue;
    wrote = true;
    await applyCatalogDelta(client, {
      companyId: line.companyId,
      productId: line.productId,
      variantId: line.variantId,
      delta: movement.qtyDelta,
    });
  }
  return wrote;
}

export async function reverseConfirm(client, line) {
  const inserted = await insertMovement(client, {
    ...line,
    reason: "operational_cancel",
    qtyDelta: Number(line.quantity),
    idempotencyKey: `operational_cancel:${line.lineId}`,
  });
  if (!inserted) return false;
  await applyCatalogDelta(client, {
    companyId: line.companyId,
    productId: line.productId,
    variantId: line.variantId,
    delta: Number(line.quantity),
  });
  return true;
}
