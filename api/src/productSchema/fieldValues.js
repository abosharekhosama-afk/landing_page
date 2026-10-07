import crypto from "node:crypto";
import { dropshippingQuery, withDropshippingTransaction } from "../dropshipping/database.js";

export const supportedTenantFieldTypes = new Set([
  "text", "textarea", "rich_text", "number", "boolean", "select",
  "multi_select", "image", "multiple_images", "video", "url",
  "repeatable_list", "key_value",
]);

export function validateTenantFieldValue(definition, value) {
  if (!supportedTenantFieldTypes.has(definition.field_type)) throw Object.assign(new Error("Unsupported field type."), { statusCode: 400 });
  if ((value === null || value === "" || value === undefined) && definition.is_required) throw Object.assign(new Error(`${definition.field_key} is required.`), { statusCode: 400 });
  if (value == null || value === "") return null;
  if (definition.field_type === "number" && !Number.isFinite(Number(value))) throw Object.assign(new Error(`${definition.field_key} must be numeric.`), { statusCode: 400 });
  if (definition.field_type === "boolean" && typeof value !== "boolean") throw Object.assign(new Error(`${definition.field_key} must be boolean.`), { statusCode: 400 });
  if (["multi_select", "multiple_images", "repeatable_list", "key_value"].includes(definition.field_type) && !Array.isArray(value)) throw Object.assign(new Error(`${definition.field_key} must be a list.`), { statusCode: 400 });
  if (["url", "image", "video"].includes(definition.field_type)) {
    try { const parsed = new URL(String(value)); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); }
    catch { throw Object.assign(new Error(`${definition.field_key} must be an HTTP(S) URL.`), { statusCode: 400 }); }
  }
  const maxLength = Number(definition.validation?.maxLength || 0);
  if (maxLength && typeof value === "string" && value.length > maxLength) throw Object.assign(new Error(`${definition.field_key} is too long.`), { statusCode: 400 });
  if (definition.field_key === "product_faqs" && Array.isArray(value)) {
    value.forEach((item, index) => {
      const question = item?.question;
      const answer = item?.answer;
      if (!question || !answer || typeof question !== "object" || typeof answer !== "object") {
        throw Object.assign(new Error(`product_faqs item ${index + 1} must include localized question and answer values.`), { statusCode: 400 });
      }
      if (!["en", "ar"].some((locale) => String(question[locale] || "").trim()) || !["en", "ar"].some((locale) => String(answer[locale] || "").trim())) {
        throw Object.assign(new Error(`product_faqs item ${index + 1} requires a question and answer.`), { statusCode: 400 });
      }
      if (item.sort_order != null && !Number.isInteger(Number(item.sort_order))) {
        throw Object.assign(new Error(`product_faqs item ${index + 1} has an invalid sort order.`), { statusCode: 400 });
      }
      if (item.is_active != null && typeof item.is_active !== "boolean") {
        throw Object.assign(new Error(`product_faqs item ${index + 1} has an invalid active state.`), { statusCode: 400 });
      }
    });
  }
  return value;
}

export async function listTenantFieldDefinitions(companyId, { activeOnly = true } = {}) {
  const { rows } = await dropshippingQuery(
    `select id,field_key,label,help_text,field_type,section,sort_order,is_required,is_active,default_value,validation,options,accepted_media_types,maximum_file_size,repeatable,translatable,storefront_mapping_key
     from public.product_field_definitions where company_id=$1${activeOnly ? " and is_active=true" : ""} order by section,sort_order,field_key`,
    [companyId],
  );
  return rows;
}

export async function listTenantProductFieldValues(companyId, productId) {
  const owned = await dropshippingQuery(
    "select id from public.products where company_id=$1 and id=$2",
    [companyId, productId],
  );
  if (!owned.rows[0]) throw Object.assign(new Error("Product not found."), { statusCode: 404 });
  const { rows } = await dropshippingQuery(
    `select d.field_key,d.storefront_mapping_key,v.locale,v.value
     from public.product_field_values v join public.product_field_definitions d
       on d.company_id=v.company_id and d.id=v.field_definition_id
     where v.company_id=$1 and v.product_id=$2 and d.is_active=true order by d.sort_order,v.locale`,
    [companyId, productId],
  );
  return rows;
}

export async function replaceTenantProductFieldValues(companyId, productId, entries) {
  if (!Array.isArray(entries)) throw Object.assign(new Error("values must be an array."), { statusCode: 400 });
  return withDropshippingTransaction((client) => replaceTenantProductFieldValuesWithClient(client, companyId, productId, entries));
}

/**
 * The product row lock serializes field saves for one tenant/product. Updating
 * first and inserting only when absent keeps saves idempotent without relying
 * on PostgreSQL being able to infer a particular ON CONFLICT index shape.
 */
export async function replaceTenantProductFieldValuesWithClient(client, companyId, productId, entries) {
  if (!Array.isArray(entries)) throw Object.assign(new Error("values must be an array."), { statusCode: 400 });
  const owned = await client.query("select id from public.products where company_id=$1 and id=$2 for update", [companyId, productId]);
  if (!owned.rows[0]) throw Object.assign(new Error("Product not found."), { statusCode: 404 });
  const definitions = await client.query("select * from public.product_field_definitions where company_id=$1 and is_active=true", [companyId]);
  const byKey = new Map(definitions.rows.map((row) => [row.field_key, row]));
  const seen = new Set();
  const saved = [];
  for (const entry of entries) {
    const definition = byKey.get(String(entry?.key || ""));
    if (!definition) throw Object.assign(new Error(`Unknown or inactive field key: ${entry?.key || ""}.`), { statusCode: 400 });
    const locale = definition.translatable ? String(entry.locale || "").toLowerCase() : "neutral";
    if (definition.translatable && !["en", "ar"].includes(locale)) throw Object.assign(new Error(`${definition.field_key} requires en or ar locale.`), { statusCode: 400 });
    const identity = `${definition.id}:${locale}`;
    if (seen.has(identity)) throw Object.assign(new Error(`Duplicate value for ${definition.field_key}/${locale}.`), { statusCode: 400 });
    seen.add(identity);
    const value = validateTenantFieldValue(definition, entry.value);
    if (value === null) {
      await client.query(
        `delete from public.product_field_values
         where company_id=$1 and product_id=$2 and field_definition_id=$3 and locale=$4`,
        [companyId, productId, definition.id, locale],
      );
      saved.push({ key: definition.field_key, locale, value: null, deleted: true });
      continue;
    }
    const serializedValue = JSON.stringify(value);
    let result = await client.query(
      `update public.product_field_values set value=$5::jsonb,updated_at=now()
       where company_id=$1 and product_id=$2 and field_definition_id=$3 and locale=$4
       returning id,locale,value`,
      [companyId, productId, definition.id, locale, serializedValue],
    );
    if (!result.rows[0]) {
      result = await client.query(
        `insert into public.product_field_values(id,company_id,product_id,field_definition_id,locale,value)
         values($1,$2,$3,$4,$5,$6::jsonb) returning id,locale,value`,
        [crypto.randomUUID(), companyId, productId, definition.id, locale, serializedValue],
      );
    }
    saved.push({ key: definition.field_key, ...result.rows[0] });
  }
  return saved;
}
