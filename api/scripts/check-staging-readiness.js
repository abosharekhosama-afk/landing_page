import "dotenv/config";

const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const stagingConfirmation = String(process.env.STAGING_PREFLIGHT_CONFIRM || "").toLowerCase();
const pageSize = 1000;

const existingTables = [
  { name: "users", label: "users" },
  { name: "products", label: "products" },
  { name: "orders", label: "orders" },
  { name: "website_media", label: "media" },
  { name: "homepage_offers", label: "homepage offers" },
  { name: "homepage_category_cards", label: "homepage category cards" },
  { name: "reviews", label: "reviews" },
  { name: "carts", label: "carts" },
  { name: "work_sessions", label: "work sessions" },
];

const targetTables = [
  "companies",
  "company_domains",
  "company_memberships",
  "company_settings",
  "product_field_definitions",
  "product_field_values",
];

function fail(message) {
  console.error(`[BLOCKED] ${message}`);
  process.exitCode = 1;
}

function validateEnvironment() {
  const missing = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}.`);
  }
  if (stagingConfirmation !== "staging") {
    throw new Error(
      "Set STAGING_PREFLIGHT_CONFIRM=staging only after confirming the credentials target a staging project.",
    );
  }
  const parsed = new URL(supabaseUrl);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("SUPABASE_URL must use HTTPS unless it targets localhost.");
  }
  return parsed.hostname;
}

async function restRequest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.ok) return response;

  let code = "";
  try {
    const body = await response.json();
    code = body?.code ? ` (${body.code})` : "";
  } catch {
    // Status and table/check context are sufficient; never dump raw responses.
  }
  const error = new Error(`Supabase read failed with HTTP ${response.status}${code}.`);
  error.status = response.status;
  throw error;
}

function parseCount(contentRange) {
  const total = String(contentRange || "").split("/")[1];
  return total && total !== "*" ? Number(total) : null;
}

async function inspectTable(table) {
  try {
    const response = await restRequest(`${table}?select=*`, {
      method: "HEAD",
      headers: {
        Prefer: "count=exact",
        Range: "0-0",
      },
    });
    return {
      exists: true,
      count: parseCount(response.headers.get("content-range")),
    };
  } catch (error) {
    if (error.status === 404) return { exists: false, count: null };
    throw new Error(`${table}: ${error.message}`);
  }
}

async function checkColumns(table, columns) {
  try {
    await restRequest(`${table}?select=${columns.map(encodeURIComponent).join(",")}&limit=0`);
    console.log(`[PASS] ${table} columns: ${columns.join(", ")}`);
    return true;
  } catch (error) {
    console.log(`[BLOCKED] ${table} expected columns could not be verified: ${columns.join(", ")}.`);
    console.log(`          ${error.message} Verify them in the Supabase SQL editor.`);
    return false;
  }
}

async function selectRows(table, columns) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const response = await restRequest(`${table}?select=${columns.map(encodeURIComponent).join(",")}`, {
      headers: { Range: `${offset}-${offset + pageSize - 1}` },
    });
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function maskEmail(email) {
  const [local = "", domain = ""] = String(email).split("@");
  const domainParts = domain.split(".");
  const suffix = domainParts.length > 1 ? `.${domainParts.at(-1)}` : "";
  return `${local.slice(0, 1) || "?"}***@${domain.slice(0, 1) || "?"}***${suffix}`;
}

async function checkEmailSafety() {
  const rows = await selectRows("users", ["email", "role"]);
  const grouped = new Map();
  let employeeCount = 0;

  for (const row of rows) {
    if (["employee", "staff", "manager"].includes(row.role)) employeeCount += 1;
    const normalized = String(row.email || "").trim().toLowerCase();
    if (!normalized) continue;
    const current = grouped.get(normalized) || [];
    current.push(row.email);
    grouped.set(normalized, current);
  }

  const duplicates = [...grouped.entries()].filter(([, emails]) => emails.length > 1);
  console.log(`[INFO] Employees are represented by users.role; matching user rows: ${employeeCount}.`);
  if (!duplicates.length) {
    console.log("[PASS] No duplicate lower(trim(email)) user identities found.");
    return true;
  }

  console.log(`[BLOCKED] Found ${duplicates.length} case-insensitive duplicate email group(s):`);
  for (const [normalized, emails] of duplicates) {
    console.log(`          ${maskEmail(normalized)} (${emails.length} records)`);
  }
  return false;
}

async function checkCompanyState() {
  const companies = await selectRows("companies", ["id", "slug", "name", "status", "is_default"]);
  const domains = await selectRows("company_domains", ["id", "company_id", "domain", "is_active"]);
  const ebChemical = companies.find((company) => company.id === "eb-chemical");
  const defaults = companies.filter((company) => company.is_default === true);
  const defaultIds = new Set(defaults.map((company) => company.id));
  const activeNonDefaultDomains = domains.filter(
    (domain) => domain.is_active === true && !defaultIds.has(domain.company_id),
  );
  const checks = [];

  checks.push({
    pass: Boolean(ebChemical),
    message: ebChemical ? "EB Chemical company row exists." : "EB Chemical company row is missing.",
  });
  checks.push({
    pass: defaults.length === 1,
    message: `Default company count is ${defaults.length}; expected exactly 1.`,
  });
  checks.push({
    pass: ebChemical?.status === "active" && ebChemical?.is_default === true,
    message: "EB Chemical must be active and default.",
  });
  checks.push({
    pass: activeNonDefaultDomains.length === 0,
    message: activeNonDefaultDomains.length
      ? `${activeNonDefaultDomains.length} active non-default domain mapping(s) found while public resolution is disabled.`
      : "No active non-default domain mappings found.",
  });

  for (const check of checks) console.log(`[${check.pass ? "PASS" : "BLOCKED"}] ${check.message}`);
  return checks.every((check) => check.pass);
}

async function main() {
  console.log("READ-ONLY STAGING PREFLIGHT: no database or storage writes will be performed.");
  console.log("Do not run this command with production credentials.");
  const hostname = validateEnvironment();
  const blockers = [];
  console.log(`Target Supabase host: ${hostname}\n`);

  console.log("Existing API tables:");
  const existingStates = new Map();
  for (const table of existingTables) {
    const state = await inspectTable(table.name);
    existingStates.set(table.name, state);
    const count = state.count === null ? "count unavailable" : `${state.count} rows`;
    console.log(`[${state.exists ? "PASS" : "BLOCKED"}] ${table.name}: ${state.exists ? count : "missing"}`);
    if (!state.exists) blockers.push(`Required existing table ${table.name} is missing.`);
  }

  if (existingStates.get("users")?.exists) {
    if (!(await checkColumns("users", ["role", "email"]))) blockers.push("users columns are incomplete.");
    else if (!(await checkEmailSafety())) blockers.push("Duplicate normalized user emails must be resolved.");
  }

  console.log("\nMulti-company target tables:");
  const targetStates = new Map();
  for (const table of targetTables) {
    const state = await inspectTable(table);
    targetStates.set(table, state);
    const count = state.count === null ? "count unavailable" : `${state.count} rows`;
    console.log(`[${state.exists ? "PASS" : "EXPECTED MISSING"}] ${table}: ${state.exists ? count : "not present"}`);
  }

  const targetCount = [...targetStates.values()].filter((state) => state.exists).length;
  if (targetCount === 0) {
    console.log("[INFO] Phase 1 migration has not been applied to this staging database.");
  } else if (targetCount !== targetTables.length) {
    blockers.push("Only part of the Phase 1 target schema exists; investigate before migration or retry.");
  }

  let companyColumnsReady = false;
  let domainColumnsReady = false;
  if (targetStates.get("companies")?.exists) {
    companyColumnsReady = await checkColumns("companies", ["slug", "status", "is_default"]);
    if (!companyColumnsReady) {
      blockers.push("companies columns are incomplete.");
    }
  }
  if (targetStates.get("company_domains")?.exists) {
    domainColumnsReady = await checkColumns("company_domains", ["domain", "is_active"]);
    if (!domainColumnsReady) {
      blockers.push("company_domains columns are incomplete.");
    }
  }
  if (companyColumnsReady && domainColumnsReady) {
    if (!(await checkCompanyState())) blockers.push("Company default/domain safety checks failed.");
  }

  console.log("\nSchema constraints and indexes require SQL editor verification; run the checked-in SQL preflight file.");
  if (blockers.length) {
    console.log("\nStaging readiness blockers:");
    blockers.forEach((blocker) => console.log(`- ${blocker}`));
    process.exitCode = 1;
    return;
  }

  console.log("\n[READY] Read-only checks found no blockers for the next documented staging step.");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Staging readiness check failed.");
});
