import { httpError, latestThursdayStart, slugify } from "./domain.js";
import { velvetQuery } from "./database.js";

export async function findMerchantByUser(companyId, userId) {
  const result = await velvetQuery(
    `select m.*, s.id as store_id, s.name as store_name, s.slug, s.logo_url, s.status as store_status
     from public.velvet_dropship_merchants m
     left join public.velvet_dropship_stores s on s.merchant_id = m.id
     where m.company_id = $1 and m.user_id = $2`,
    [companyId, userId],
  );
  return result.rows[0] || null;
}

export async function merchantOverview(companyId, merchantId, now = new Date()) {
  const weekStart = latestThursdayStart(now);
  const counts = await velvetQuery(
    `select
       count(*) filter (where status = 'PENDING_MERCHANT_CONFIRMATION')::int as new_orders,
       count(*) filter (where status = 'CONFIRMED')::int as confirmed_orders,
       coalesce(sum(merchant_profit_total) filter (
         where status = 'DELIVERED_COLLECTED' and updated_at >= $3
       ), 0) as week_profit
     from public.velvet_dropship_orders
     where company_id = $1 and merchant_id = $2`,
    [companyId, merchantId, weekStart],
  );
  const due = await velvetQuery(
    `select coalesce(sum(o.merchant_profit_total), 0) as amount_due
     from public.velvet_dropship_orders o
     left join public.velvet_dropship_settlement_lines sl on sl.order_id = o.id
     left join public.velvet_dropship_settlements s on s.id = sl.settlement_id
     where o.company_id = $1 and o.merchant_id = $2
       and o.status = 'DELIVERED_COLLECTED'
       and s.paid_at is null`,
    [companyId, merchantId],
  );
  const row = counts.rows[0] || {};
  return {
    newOrders: Number(row.new_orders || 0),
    confirmedOrders: Number(row.confirmed_orders || 0),
    weekProfit: Number(row.week_profit || 0).toFixed(2),
    amountDue: Number(due.rows[0]?.amount_due || 0).toFixed(2),
  };
}

export async function requireMerchant(companyId, userId) {
  const merchant = await findMerchantByUser(companyId, userId);
  if (!merchant) throw httpError(404, "Velvet merchant profile was not found.");
  return merchant;
}

export async function createMerchantAndStore(client, { companyId, userId, storeName, logoUrl = null }) {
  const merchant = await client.query(
    `insert into public.velvet_dropship_merchants (company_id, user_id, status)
     values ($1,$2,'active')
     returning *`,
    [companyId, userId],
  );
  let slug = slugify(storeName);
  const taken = await client.query(
    "select 1 from public.velvet_dropship_stores where company_id = $1 and slug = $2",
    [companyId, slug],
  );
  if (taken.rowCount) throw httpError(409, "That store name is already in use.");
  const store = await client.query(
    `insert into public.velvet_dropship_stores (company_id, merchant_id, name, slug, logo_url, status)
     values ($1,$2,$3,$4,$5,'active')
     returning *`,
    [companyId, merchant.rows[0].id, storeName.trim(), slug, logoUrl],
  );
  return { merchant: merchant.rows[0], store: store.rows[0] };
}

export async function updateStoreIdentity(companyId, merchantId, { name, logoUrl }) {
  const current = await velvetQuery(
    "select * from public.velvet_dropship_stores where company_id = $1 and merchant_id = $2",
    [companyId, merchantId],
  );
  if (!current.rowCount) throw httpError(404, "Store was not found.");
  const updated = await velvetQuery(
    `update public.velvet_dropship_stores
     set name = coalesce($3, name),
         logo_url = coalesce($4, logo_url),
         updated_at = now()
     where company_id = $1 and merchant_id = $2
     returning *`,
    [companyId, merchantId, name?.trim() || null, logoUrl || null],
  );
  return updated.rows[0];
}

export async function updatePayout(companyId, merchantId, { payoutMethod, payoutDetails }) {
  if (!["bank", "wallet", "direct_handover"].includes(payoutMethod)) {
    throw httpError(400, "Payout method must be bank, wallet, or direct handover.");
  }
  const updated = await velvetQuery(
    `update public.velvet_dropship_merchants
     set payout_method = $3, payout_details = $4::jsonb, updated_at = now()
     where company_id = $1 and id = $2
     returning *`,
    [companyId, merchantId, payoutMethod, JSON.stringify(payoutDetails || {})],
  );
  if (!updated.rowCount) throw httpError(404, "Velvet merchant profile was not found.");
  return updated.rows[0];
}

export async function setActivation(companyId, merchantId, { merchantStatus, storeStatus }) {
  if (merchantStatus && !["active", "inactive"].includes(merchantStatus)) {
    throw httpError(400, "Merchant status must be active or inactive.");
  }
  if (storeStatus && !["active", "inactive"].includes(storeStatus)) {
    throw httpError(400, "Store status must be active or inactive.");
  }
  if (merchantStatus) {
    await velvetQuery(
      `update public.velvet_dropship_merchants set status = $3, updated_at = now()
       where company_id = $1 and id = $2`,
      [companyId, merchantId, merchantStatus],
    );
  }
  if (storeStatus) {
    await velvetQuery(
      `update public.velvet_dropship_stores set status = $3, updated_at = now()
       where company_id = $1 and merchant_id = $2`,
      [companyId, merchantId, storeStatus],
    );
  }
  const result = await velvetQuery(
    `select m.*, s.slug, s.status as store_status
     from public.velvet_dropship_merchants m
     left join public.velvet_dropship_stores s on s.merchant_id = m.id
     where m.company_id = $1 and m.id = $2`,
    [companyId, merchantId],
  );
  if (!result.rowCount) throw httpError(404, "Velvet merchant profile was not found.");
  return result.rows[0];
}
