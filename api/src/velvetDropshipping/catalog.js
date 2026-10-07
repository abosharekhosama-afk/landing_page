import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { httpError, resolveMerchantImage, UNBRANDED_FALLBACK, unitProfit } from "./domain.js";
import { recordAudit, velvetQuery } from "./database.js";
import { assertCleanSource, generateMerchantImage } from "./images.js";

const uploadDir = path.resolve("uploads/velvet-dropshipping");

async function saveGenerated(buffer) {
  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${crypto.randomUUID()}.webp`;
  await fs.writeFile(path.join(uploadDir, fileName), buffer);
  return `/api/velvet-dropshipping/images/${fileName}`;
}

export function generatedImagePath(fileName) {
  if (!/^[0-9a-f-]{36}\.webp$/i.test(fileName)) throw httpError(404, "Image was not found.");
  return path.join(uploadDir, fileName);
}

export async function listOffers(companyId) {
  const result = await velvetQuery(
    `select o.*, p.name as product_name, p.category, p.image_url, p.stock_qty
     from public.velvet_dropship_offers o
     join public.products p on p.company_id = o.company_id and p.id = o.product_id
     where o.company_id = $1 and o.active = true
     order by p.category, p.name`,
    [companyId],
  );
  return result.rows;
}

export async function upsertOffer(companyId, body, actorUserId = null) {
  const selling = body.sellingUnitPrice ?? body.selling_unit_price;
  const merchant = body.merchantUnitPrice ?? body.merchant_unit_price;
  unitProfit(selling, merchant);
  const productId = String(body.productId || body.product_id || "").trim();
  if (!productId) throw httpError(400, "productId is required.");
  const variantId = body.variantId || body.variant_id || null;
  const cleanImageUrl = body.cleanImageUrl || body.clean_image_url || null;
  assertCleanSource({ cleanImageUrl, catalogImageUrl: body.catalogImageUrl || body.catalog_image_url });
  const result = await velvetQuery(
    `insert into public.velvet_dropship_offers
       (company_id, product_id, variant_id, selling_unit_price, merchant_unit_price, clean_image_url, active)
     values ($1,$2,$3,$4,$5,$6,true)
     on conflict (company_id, product_id, coalesce(variant_id, ''))
     do update set selling_unit_price = excluded.selling_unit_price,
                   merchant_unit_price = excluded.merchant_unit_price,
                   clean_image_url = excluded.clean_image_url,
                   active = true,
                   updated_at = now()
     returning *`,
    [companyId, productId, variantId, selling, merchant, cleanImageUrl],
  );
  await recordAudit(null, {
    companyId,
    actorUserId,
    action: "price_change",
    entityType: "offer",
    entityId: result.rows[0].id,
    payload: { sellingUnitPrice: selling, merchantUnitPrice: merchant, productId },
  });
  return result.rows[0];
}

async function brandSelection(offer, storeName) {
  if (!offer.clean_image_url) return resolveMerchantImage({ cleanImageUrl: null });
  try {
    const response = await fetch(offer.clean_image_url);
    if (!response.ok) return resolveMerchantImage({ cleanImageUrl: offer.clean_image_url, generationSucceeded: false });
    const cleanImage = Buffer.from(await response.arrayBuffer());
    const generated = await generateMerchantImage({ cleanImage, storeName });
    if (!generated.buffer) return resolveMerchantImage({ cleanImageUrl: offer.clean_image_url, generationSucceeded: false });
    const url = await saveGenerated(generated.buffer);
    return resolveMerchantImage({
      cleanImageUrl: offer.clean_image_url,
      generationSucceeded: true,
      generatedImageUrl: url,
    });
  } catch {
    return resolveMerchantImage({ cleanImageUrl: offer.clean_image_url, generationSucceeded: false });
  }
}

export async function listSelections(companyId, merchantId) {
  const result = await velvetQuery(
    `select mp.id, mp.offer_id, mp.image_status, mp.active,
            coalesce(mp.generated_image_url, $3) as display_url,
            p.name as product_name
     from public.velvet_dropship_merchant_products mp
     join public.velvet_dropship_offers o on o.id = mp.offer_id
     join public.products p on p.company_id = mp.company_id and p.id = o.product_id
     where mp.company_id = $1 and mp.merchant_id = $2 and mp.active = true
     order by p.name`,
    [companyId, merchantId, UNBRANDED_FALLBACK],
  );
  return result.rows;
}

export async function addSelection(companyId, merchantId, offerId, storeName) {
  const offer = await velvetQuery(
    "select * from public.velvet_dropship_offers where company_id = $1 and id = $2 and active = true",
    [companyId, offerId],
  );
  if (!offer.rowCount) throw httpError(404, "Velvet offer was not found.");
  const image = await brandSelection(offer.rows[0], storeName);
  const saved = await velvetQuery(
    `insert into public.velvet_dropship_merchant_products
       (company_id, merchant_id, offer_id, generated_image_url, image_status, active)
     values ($1,$2,$3,$4,$5,true)
     on conflict (merchant_id, offer_id)
     do update set active = true, updated_at = now()
     returning *`,
    [companyId, merchantId, offerId, image.generatedImageUrl, image.imageStatus],
  );
  return { ...saved.rows[0], displayUrl: image.displayUrl || UNBRANDED_FALLBACK };
}

export async function removeSelection(companyId, merchantId, selectionId) {
  const result = await velvetQuery(
    `update public.velvet_dropship_merchant_products
     set active = false, updated_at = now()
     where company_id = $1 and merchant_id = $2 and id = $3
     returning *`,
    [companyId, merchantId, selectionId],
  );
  if (!result.rowCount) throw httpError(404, "Selection was not found.");
  return result.rows[0];
}

export async function retryImage(companyId, merchantId, selectionId, storeName) {
  const selection = await velvetQuery(
    `select mp.*, o.clean_image_url
     from public.velvet_dropship_merchant_products mp
     join public.velvet_dropship_offers o on o.id = mp.offer_id
     where mp.company_id = $1 and mp.merchant_id = $2 and mp.id = $3`,
    [companyId, merchantId, selectionId],
  );
  if (!selection.rowCount) throw httpError(404, "Selection was not found.");
  const image = await brandSelection(selection.rows[0], storeName);
  const updated = await velvetQuery(
    `update public.velvet_dropship_merchant_products
     set generated_image_url = $4, image_status = $5, updated_at = now()
     where company_id = $1 and merchant_id = $2 and id = $3
     returning *`,
    [companyId, merchantId, selectionId, image.generatedImageUrl, image.imageStatus],
  );
  return { ...updated.rows[0], displayUrl: image.displayUrl };
}

export async function publicStore(companyId, slug) {
  const store = await velvetQuery(
    `select s.*, m.status as merchant_status
     from public.velvet_dropship_stores s
     join public.velvet_dropship_merchants m on m.id = s.merchant_id
     where s.company_id = $1 and s.slug = $2`,
    [companyId, slug],
  );
  if (!store.rowCount) throw httpError(404, "Store was not found.");
  const row = store.rows[0];
  const checkoutEnabled = row.status === "active" && row.merchant_status === "active";
  const products = checkoutEnabled
    ? (await velvetQuery(
      `select mp.id as selection_id, o.id as offer_id, o.product_id, o.variant_id,
              o.selling_unit_price, p.name, p.category, p.stock_qty,
              coalesce(mp.generated_image_url, $3) as image_url
       from public.velvet_dropship_merchant_products mp
       join public.velvet_dropship_offers o on o.id = mp.offer_id and o.active = true
       join public.products p on p.company_id = mp.company_id and p.id = o.product_id
       where mp.company_id = $1 and mp.merchant_id = $2 and mp.active = true
       order by p.category, p.name`,
      [companyId, row.merchant_id, UNBRANDED_FALLBACK],
    )).rows
    : [];
  return {
    store: { name: row.name, slug: row.slug, logoUrl: row.logo_url, status: row.status },
    checkoutEnabled,
    products,
  };
}
