import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { replaceTenantProductFieldValuesWithClient, validateTenantFieldValue } from "../src/productSchema/fieldValues.js";

const migration = fs.readFileSync(new URL("../supabase/migrations/011_tenant_product_content.sql", import.meta.url), "utf8");
const bilingualRepeatersMigration = fs.readFileSync(new URL("../supabase/migrations/015_icare_bilingual_product_repeaters.sql", import.meta.url), "utf8");
const foundationMigration = fs.readFileSync(new URL("../supabase/migrations/001_multi_company_foundation.sql", import.meta.url), "utf8");
const localeMigration = fs.readFileSync(new URL("../supabase/migrations/013_product_field_value_locale_uniqueness.sql", import.meta.url), "utf8");
const defaultSchema = fs.readFileSync(new URL("../src/productSchema/schema.js", import.meta.url), "utf8");
const routes = fs.readFileSync(new URL("../src/routes/productFieldDefinitions.js", import.meta.url), "utf8");
const service = fs.readFileSync(new URL("../src/productSchema/fieldValues.js", import.meta.url), "utf8");
const cpanel = fs.readFileSync(new URL("../../cpanel/src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
const employeeCpanel = fs.readFileSync(new URL("../../cpanel/src/pages/EmployeeDashboardPage.jsx", import.meta.url), "utf8");
const structuredEditor = fs.readFileSync(new URL("../../cpanel/src/components/TenantProductFields.jsx", import.meta.url), "utf8");

test("iCare definitions contain beauty fields but no EB-only detail slots", () => {
  assert.match(migration, /'icare','benefits'/);
  assert.match(migration, /'icare','complete_ingredients'/);
  for (const key of ["dsiHowItWorks1", "dsiImpact1", "dsiSafeToUse", "dsiPracticalBanner", "dsiFaq"]) assert.doesNotMatch(migration, new RegExp(`'icare','${key}'`, "i"));
});

test("iCare multilingual list fields migrate additively to bilingual repeaters", () => {
  assert.match(bilingualRepeatersMigration, /where company_id\s*=\s*'icare'/i);
  for (const key of ["skin_types", "hair_types", "benefits", "featured_ingredients", "complete_ingredients", "warnings", "suitable_for"]) {
    assert.match(bilingualRepeatersMigration, new RegExp(key));
  }
  assert.match(bilingualRepeatersMigration, /field_type\s*=\s*'repeatable_list'[\s\S]*repeatable\s*=\s*true[\s\S]*translatable\s*=\s*true/i);
  assert.doesNotMatch(bilingualRepeatersMigration, /delete from|truncate/i);
});

test("EB default schema retains its existing fields", () => {
  for (const key of ["dsiHowItWorks1", "dsiImpact1", "dsiSafeToUse", "dsiPracticalBanner", "dsiFaq"]) assert.match(defaultSchema, new RegExp(`"${key}"`));
  assert.match(defaultSchema, /sharedCatalogProductSchema|resolveDefaultProductSchema/);
});

test("field values are tenant and product scoped with locale uniqueness", () => {
  assert.match(foundationMigration, /unique \(company_id, product_id, field_definition_id\)/i);
  assert.match(migration, /unique index[\s\S]*company_id, product_id, field_definition_id, locale/i);
  assert.match(localeMigration, /columns = array\['company_id','field_definition_id','product_id'\]/i);
  assert.match(localeMigration, /company_id, product_id, field_definition_id, locale/i);
  assert.match(service, /where v\.company_id=\$1 and v\.product_id=\$2/);
  assert.match(service, /where company_id=\$1 and id=\$2 for update/);
});

test("unknown and inactive field keys are rejected", () => {
  assert.match(service, /Unknown or inactive field key/);
  assert.match(service, /is_active=true/);
});

test("field validation enforces server types", () => {
  assert.throws(() => validateTenantFieldValue({ field_type: "number", field_key: "volume", validation: {} }, "x"), /numeric/);
  assert.throws(() => validateTenantFieldValue({ field_type: "multiple_images", field_key: "gallery", validation: {} }, "x"), /list/);
  assert.equal(validateTenantFieldValue({ field_type: "boolean", field_key: "active", validation: {} }, true), true);
});

test("FAQ values require localized question and answer data", () => {
  const definition = { field_type: "key_value", field_key: "product_faqs", validation: {} };
  assert.throws(() => validateTenantFieldValue(definition, [{ question: { en: "Question" } }]), /localized question and answer/);
  const value = [{ question: { en: "Question", ar: "سؤال" }, answer: { en: "Answer", ar: "جواب" }, sort_order: 0, is_active: true }];
  assert.deepEqual(validateTenantFieldValue(definition, value), value);
});

test("admin field routes derive tenant from authenticated request", () => {
  assert.match(routes, /router\.use\(requireAuth\)/);
  assert.match(routes, /req\.companyId/);
  assert.doesNotMatch(routes, /req\.body\.company|req\.query\.company|x-company-id/i);
  assert.match(routes, /PRODUCT_FIELD_VALUE_CONFLICT/);
  assert.match(routes, /error\?\.code === "23505"/);
});

test("CPanel uses server definitions and schema-gated cosmetics fields on the legacy branch", () => {
  assert.match(cpanel, /productFieldApi\.definitions\(\)/);
  assert.match(cpanel, /usesTenantDefinitions/);
  assert.match(cpanel, /showSchemaDetailMedia/);
  assert.match(cpanel, /fetchCompanyProductSchema/);
});

test("company admin and employee use the same tenant-aware product wizard", () => {
  assert.match(cpanel, /export function ProductWizard/);
  assert.match(employeeCpanel, /import \{ ProductWizard \} from "\.\/AdminDashboardPage\.jsx"/);
  assert.doesNotMatch(employeeCpanel, /AdminProductForm/);
  assert.match(employeeCpanel, /canCreateProducts \|\| \(canUpdateProducts && editingProduct\)/);
});

test("visual editors never require raw JSON and support ordered bilingual rows", () => {
  assert.doesNotMatch(structuredEditor, /JSON\.parse|JSON\.stringify/);
  assert.match(structuredEditor, /moveStructuredItem/);
  assert.match(structuredEditor, /createTranslator\(language\)/);
  assert.match(structuredEditor, /productForm\.question/);
  assert.match(structuredEditor, /productForm\.english/);
  assert.match(structuredEditor, /productForm\.arabic/);
});

test("migration seed is repeatable and uses neutral structured FAQ values", () => {
  assert.match(migration, /on conflict\(company_id,field_key\) do update/i);
  assert.match(migration, /'product_faqs'[\s\S]*'faqs'\)/);
  assert.match(migration, /'showcase_units'[\s\S]*false,'showcaseUnits'/);
});

function fieldValueClient(definitions, { owned = true } = {}) {
  const values = new Map();
  let inserts = 0;
  return {
    get inserts() { return inserts; },
    values,
    async query(sql, params) {
      if (sql.includes("from public.products")) return { rows: owned ? [{ id: params[1] }] : [] };
      if (sql.includes("from public.product_field_definitions")) return { rows: definitions };
      if (sql.startsWith("update public.product_field_values")) {
        const identity = params.slice(0, 4).join(":");
        if (!values.has(identity)) return { rows: [] };
        const row = { ...values.get(identity), value: JSON.parse(params[4]) };
        values.set(identity, row);
        return { rows: [row] };
      }
      if (sql.includes("insert into public.product_field_values")) {
        inserts += 1;
        const identity = params.slice(1, 5).join(":");
        const row = { id: params[0], locale: params[4], value: JSON.parse(params[5]) };
        values.set(identity, row);
        return { rows: [row] };
      }
      if (sql.startsWith("delete from public.product_field_values")) {
        values.delete(params.slice(0, 4).join(":"));
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test("structured bilingual, FAQ, and showcase values persist idempotently", async () => {
  const definitions = [
    { id: "benefits", field_key: "benefits", field_type: "repeatable_list", translatable: true, is_required: false, validation: {} },
    { id: "faqs", field_key: "product_faqs", field_type: "key_value", translatable: false, is_required: false, validation: {} },
    { id: "showcase", field_key: "showcase_units", field_type: "repeatable_list", translatable: false, is_required: false, validation: {} },
  ];
  const entries = [
    { key: "benefits", locale: "en", value: ["Hydrates"] },
    { key: "benefits", locale: "ar", value: ["يرطب"] },
    { key: "product_faqs", locale: "neutral", value: [{ question: { en: "Q", ar: "س" }, answer: { en: "A", ar: "ج" }, sort_order: 0, is_active: true }] },
    { key: "showcase_units", locale: "neutral", value: [{ title: { en: "Title", ar: "عنوان" }, body: { en: "Body", ar: "نص" }, sort_order: 0, is_active: true }] },
  ];
  const client = fieldValueClient(definitions);

  const first = await replaceTenantProductFieldValuesWithClient(client, "icare", "product-1", entries);
  const second = await replaceTenantProductFieldValuesWithClient(client, "icare", "product-1", entries);

  assert.equal(first.length, 4);
  assert.equal(second.length, 4);
  assert.equal(client.inserts, 4, "the repeated save updates the same four rows");
  assert.equal(client.values.size, 4);
});

test("updating one locale preserves the other locale without duplicate rows", async () => {
  const definitions = [{ id: "how", field_key: "how_to_use", field_type: "rich_text", translatable: true, is_required: false, validation: {} }];
  const client = fieldValueClient(definitions);
  await replaceTenantProductFieldValuesWithClient(client, "icare", "product-1", [
    { key: "how_to_use", locale: "en", value: "Apply gently" },
    { key: "how_to_use", locale: "ar", value: "يوضع بلطف" },
  ]);
  await replaceTenantProductFieldValuesWithClient(client, "icare", "product-1", [
    { key: "how_to_use", locale: "en", value: "Apply twice daily" },
  ]);
  assert.equal(client.inserts, 2);
  assert.equal(client.values.size, 2);
  assert.equal(client.values.get("icare:product-1:how:en").value, "Apply twice daily");
  assert.equal(client.values.get("icare:product-1:how:ar").value, "يوضع بلطف");
});

test("empty localized values delete only the matching locale", async () => {
  const definitions = [{ id: "benefits", field_key: "benefits", field_type: "repeatable_list", translatable: true, is_required: false, validation: {} }];
  const client = fieldValueClient(definitions);
  await replaceTenantProductFieldValuesWithClient(client, "icare", "product-1", [
    { key: "benefits", locale: "en", value: ["Hydrates"] },
    { key: "benefits", locale: "ar", value: ["يرطب"] },
  ]);
  await replaceTenantProductFieldValuesWithClient(client, "icare", "product-1", [
    { key: "benefits", locale: "en", value: null },
  ]);
  assert.equal(client.values.has("icare:product-1:benefits:en"), false);
  assert.equal(client.values.get("icare:product-1:benefits:ar").value[0], "يرطب");
});

test("unknown fields and cross-tenant products are rejected before writes", async () => {
  const definitions = [{ id: "benefits", field_key: "benefits", field_type: "repeatable_list", translatable: true, is_required: false, validation: {} }];
  await assert.rejects(
    replaceTenantProductFieldValuesWithClient(fieldValueClient(definitions), "icare", "product-1", [{ key: "eb_only", locale: "en", value: [] }]),
    /Unknown or inactive field key/,
  );
  await assert.rejects(
    replaceTenantProductFieldValuesWithClient(fieldValueClient(definitions, { owned: false }), "icare", "eb-product", [{ key: "benefits", locale: "en", value: [] }]),
    /Product not found/,
  );
});

test("migration 013 is additive, repeatable, and removes legacy uniqueness by columns", () => {
  assert.match(localeMigration, /^begin;/i);
  assert.match(localeMigration, /pg_constraint/);
  assert.match(localeMigration, /pg_index/);
  assert.match(localeMigration, /array_agg\(.*attname.*\)::text\[\]/i, "array_agg must cast name columns to text[] to avoid name[] = text[] error");
  assert.match(localeMigration, /columns = array\[.*\]::text\[\]/i, "comparison must use text[] typed array literal");
  assert.match(localeMigration, /having count\(\*\) > 1/i);
  assert.match(localeMigration, /create unique index if not exists uq_product_field_values_tenant_product_field_locale/i);
  assert.match(localeMigration, /commit;/i);
  assert.doesNotMatch(localeMigration, /drop table|delete from public\.product_field_values/i);
});

test("migration 013 uses ::text[] on both array_agg calls (constraint and index discovery)", () => {
  const constraintAggMatch = localeMigration.match(/array_agg\(a\.attname order by a\.attname\)::text\[\]/);
  assert.ok(constraintAggMatch, "constraint column aggregation must cast to text[]");
  const indexAggMatch = localeMigration.match(/array_agg\(attribute\.attname order by attribute\.attname\)::text\[\]/);
  assert.ok(indexAggMatch, "index column aggregation must cast to text[]");
  const leftSideCasts = localeMigration.match(/array_agg\(.*attname.*\)::text\[\]/g);
  assert.equal(leftSideCasts.length, 2, "exactly two array_agg must carry ::text[] casts");
});
