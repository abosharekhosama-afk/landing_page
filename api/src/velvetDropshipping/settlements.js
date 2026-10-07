import { assertThursdayDate, httpError, lineProfit } from "./domain.js";
import { recordAudit, velvetQuery, withVelvetTransaction } from "./database.js";

export async function earnings(companyId, merchantId) {
  const orders = await velvetQuery(
    `select o.id, o.status, o.merchandise_total, o.merchant_profit_total, o.created_at,
            s.thursday, s.paid_at
     from public.velvet_dropship_orders o
     left join public.velvet_dropship_settlement_lines sl on sl.order_id = o.id
     left join public.velvet_dropship_settlements s on s.id = sl.settlement_id
     where o.company_id = $1 and o.merchant_id = $2
     order by o.created_at desc`,
    [companyId, merchantId],
  );
  return orders.rows.map((row) => ({
    orderId: row.id,
    sellingTotal: row.merchandise_total,
    merchantPrice: (Number(row.merchandise_total) - Number(row.merchant_profit_total)).toFixed(2),
    merchantProfit: row.merchant_profit_total,
    paymentState: row.paid_at ? "paid" : row.thursday ? "on_settlement" : "unsettled",
    thursday: row.thursday,
  }));
}

export async function listSettlements(companyId, merchantId = null) {
  const result = await velvetQuery(
    `select * from public.velvet_dropship_settlements
     where company_id = $1 and ($2::uuid is null or merchant_id = $2)
     order by thursday desc`,
    [companyId, merchantId],
  );
  return result.rows;
}

export function groupStatementRows(rows) {
  const statements = new Map();
  for (const row of rows) {
    if (!statements.has(row.id)) {
      statements.set(row.id, {
        id: row.id,
        thursday: row.thursday,
        total: row.total_profit,
        payoutMethod: row.payout_method,
        paymentStatus: row.paid_at ? "paid" : "unpaid",
        orders: [],
      });
    }
    if (!row.order_id) continue;
    statements.get(row.id).orders.push({
      orderId: row.order_id,
      sellingTotal: row.merchandise_total,
      merchantPrice: (Number(row.merchandise_total) - Number(row.merchant_profit_total)).toFixed(2),
      profit: row.profit_amount,
    });
  }
  return [...statements.values()];
}

export async function merchantStatements(companyId, merchantId) {
  const result = await velvetQuery(
    `select s.id, s.thursday, s.total_profit, s.payout_method, s.paid_at,
            sl.order_id, sl.profit_amount,
            o.merchandise_total, o.merchant_profit_total
     from public.velvet_dropship_settlements s
     left join public.velvet_dropship_settlement_lines sl
       on sl.settlement_id = s.id and sl.company_id = s.company_id
     left join public.velvet_dropship_orders o
       on o.id = sl.order_id and o.company_id = s.company_id and o.merchant_id = s.merchant_id
     where s.company_id = $1 and s.merchant_id = $2
     order by s.thursday desc, sl.order_id asc`,
    [companyId, merchantId],
  );
  return groupStatementRows(result.rows);
}

export async function closeThursday(companyId, thursday) {
  assertThursdayDate(thursday);
  const merchants = await velvetQuery(
    `select distinct merchant_id from public.velvet_dropship_orders
     where company_id = $1 and status = 'DELIVERED_COLLECTED'`,
    [companyId],
  );
  const settlements = [];
  for (const merchant of merchants.rows) {
    settlements.push(await closeMerchant(companyId, merchant.merchant_id, thursday));
  }
  return settlements.filter(Boolean);
}

async function closeMerchant(companyId, merchantId, thursday) {
  return withVelvetTransaction(async (client) => {
    const existing = await client.query(
      `select * from public.velvet_dropship_settlements
       where company_id = $1 and merchant_id = $2 and thursday = $3`,
      [companyId, merchantId, thursday],
    );
    if (existing.rowCount) return existing.rows[0];
    const orders = await client.query(
      `select o.*
       from public.velvet_dropship_orders o
       where o.company_id = $1 and o.merchant_id = $2 and o.status = 'DELIVERED_COLLECTED'
         and not exists (
           select 1 from public.velvet_dropship_settlement_lines sl where sl.order_id = o.id
         )
       for update`,
      [companyId, merchantId],
    );
    if (!orders.rowCount) return null;
    const total = orders.rows.reduce((sum, row) => sum + Number(row.merchant_profit_total), 0).toFixed(2);
    const settlement = await client.query(
      `insert into public.velvet_dropship_settlements (company_id, merchant_id, thursday, total_profit)
       values ($1,$2,$3,$4)
       on conflict (company_id, merchant_id, thursday) do nothing
       returning *`,
      [companyId, merchantId, thursday, total],
    );
    const saved = settlement.rows[0] || existing.rows[0];
    if (!settlement.rowCount) return saved;
    for (const order of orders.rows) {
      await client.query(
        `insert into public.velvet_dropship_settlement_lines (company_id, settlement_id, order_id, profit_amount)
         values ($1,$2,$3,$4)
         on conflict (order_id) do nothing`,
        [companyId, saved.id, order.id, order.merchant_profit_total],
      );
    }
    return saved;
  });
}

export async function paySettlement(companyId, settlementId, reference = null, actorUserId = null) {
  return withVelvetTransaction(async (client) => {
    const settlement = await client.query(
      `select s.*, m.payout_method, m.payout_details
       from public.velvet_dropship_settlements s
       join public.velvet_dropship_merchants m on m.id = s.merchant_id
       where s.company_id = $1 and s.id = $2
       for update`,
      [companyId, settlementId],
    );
    if (!settlement.rowCount) throw httpError(404, "Settlement was not found.");
    if (!settlement.rows[0].payout_method) throw httpError(409, "The merchant has no payout method.");
    if (settlement.rows[0].paid_at) return settlement.rows[0];
    const paid = await client.query(
      `update public.velvet_dropship_settlements
       set paid_at = now(), payout_method = $3, payout_details = $4::jsonb, reference = $5
       where id = $2 and company_id = $1
       returning *`,
      [
        companyId,
        settlementId,
        settlement.rows[0].payout_method,
        JSON.stringify(settlement.rows[0].payout_details || {}),
        reference,
      ],
    );
    await recordAudit(client, {
      companyId,
      actorUserId,
      action: "settlement_payment",
      entityType: "settlement",
      entityId: settlementId,
      payload: { payoutMethod: paid.rows[0].payout_method, reference },
    });
    return paid.rows[0];
  });
}

export function orderProfitFromLines(lines) {
  return lines.reduce((sum, line) => {
    if (line.line_status && line.line_status !== "active") return sum;
    return sum + Number(lineProfit(line.profit_unit_amount, line.quantity));
  }, 0).toFixed(2);
}

export async function adminTotals(companyId) {
  const result = await velvetQuery(
    `select coalesce(sum(merchandise_total), 0) as sales,
            coalesce(sum(merchant_profit_total), 0) as profit,
            count(*)::int as orders
     from public.velvet_dropship_orders
     where company_id = $1`,
    [companyId],
  );
  const row = result.rows[0] || { sales: 0, profit: 0, orders: 0 };
  return {
    totalSales: Number(row.sales || 0).toFixed(2),
    totalMerchantProfit: Number(row.profit || 0).toFixed(2),
    orderCount: Number(row.orders || 0),
  };
}
