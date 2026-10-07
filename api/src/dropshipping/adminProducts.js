import { money } from "./domain.js";

export async function upsertDropshippingProductConfiguration(
  client,
  companyId,
  productId,
  input,
) {
  const catalogProduct = await client.query(
    "select id from public.products where company_id=$1 and id=$2 for share",
    [companyId, productId],
  );
  if (!catalogProduct.rows[0]) {
    throw Object.assign(new Error("Product not found."), { statusCode: 404 });
  }

  const { rows } = await client.query(
    `insert into public.dropshipping_products(company_id,product_id,enabled,dropshipping_price,suggested_selling_price,minimum_selling_price,maximum_selling_price,marketer_fee,fixed_fee,percentage_fee,available_stock,allow_media_download,marketing_caption,marketing_hashtags,social_short_description)
 values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15::jsonb) on conflict(company_id,product_id) do update set enabled=excluded.enabled,dropshipping_price=excluded.dropshipping_price,suggested_selling_price=excluded.suggested_selling_price,minimum_selling_price=excluded.minimum_selling_price,maximum_selling_price=excluded.maximum_selling_price,marketer_fee=excluded.marketer_fee,fixed_fee=excluded.fixed_fee,percentage_fee=excluded.percentage_fee,available_stock=excluded.available_stock,allow_media_download=excluded.allow_media_download,marketing_caption=excluded.marketing_caption,marketing_hashtags=excluded.marketing_hashtags,social_short_description=excluded.social_short_description,updated_at=now() returning *`,
    [
      companyId,
      productId,
      input.enabled === true,
      money(input.dropshippingPrice ?? 0),
      input.suggestedSellingPrice ?? null,
      input.minimumSellingPrice ?? null,
      input.maximumSellingPrice ?? null,
      input.marketerFee ?? 0,
      input.fixedFee ?? null,
      input.percentageFee ?? null,
      input.availableStock ?? null,
      input.allowMediaDownload !== false,
      JSON.stringify(input.marketingCaption || {}),
      input.marketingHashtags || [],
      JSON.stringify(input.socialShortDescription || {}),
    ],
  );
  return rows[0];
}
