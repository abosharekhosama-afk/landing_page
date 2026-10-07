import fs from "node:fs";
import path from "node:path";

const configuredApiUrl = process.env.EXPORT_API_URL || process.env.VITE_API_URL || process.argv[2] || "";
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, "");
const apiBaseUrl = normalizedApiUrl.endsWith("/api") ? normalizedApiUrl : `${normalizedApiUrl}/api`;
const email = process.env.EXPORT_ADMIN_EMAIL || process.argv[3] || "";
const password = process.env.EXPORT_ADMIN_PASSWORD || process.argv[4] || "";
const outputPath = path.resolve(process.env.EXPORT_OUTPUT || process.argv[5] || "live-store-export.json");

if (!normalizedApiUrl || !email || !password) {
  console.error("Usage: node backend/scripts/export-live-store.js <backendUrlOrApiBaseUrl> <adminEmail> <adminPassword> [outputPath]");
  console.error("Example: node backend/scripts/export-live-store.js https://your-backend.example.com admin@epchemical.com admin-password live-store-export.json");
  process.exit(1);
}

function fullUrl(pathname) {
  return `${apiBaseUrl}${pathname}`;
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function api(pathname, options = {}) {
  const requestUrl = fullUrl(pathname);
  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await readResponseBody(response);
  if (!response.ok) {
    const message = typeof body === "string" ? body : body?.message;
    throw new Error(`${requestUrl} failed (${response.status}): ${message || response.statusText}`);
  }
  return body;
}

async function verifyBackendApi() {
  const healthUrl = fullUrl("/health");
  console.log(`Checking backend API: ${healthUrl}`);

  let response;
  try {
    response = await fetch(healthUrl, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new Error(`Could not reach the backend API at ${healthUrl}: ${error.message}`);
  }

  const body = await readResponseBody(response);
  const isBackendHealth =
    response.ok &&
    typeof body === "object" &&
    body?.ok === true &&
    body?.service === "eb-chemical-backend";

  if (isBackendHealth) {
    return;
  }

  const contentType = response.headers.get("content-type") || "unknown";
  const isJsonApiNotFound =
    response.status === 404 &&
    contentType.includes("application/json") &&
    typeof body === "object";

  if (isJsonApiNotFound) {
    console.warn("Backend health endpoint is unavailable; continuing with the login endpoint check.");
    return;
  }

  if (!isBackendHealth) {
    throw new Error(
      [
        `The URL ${apiBaseUrl} does not expose the EB Chemical backend API.`,
        `Health check returned ${response.status} (${contentType}) instead of the backend health response.`,
        "This usually means the supplied Vercel URL is frontend-only.",
        "Export is not possible from that URL. Use the backend URL configured as VITE_API_URL in the deployed frontend.",
      ].join(" "),
    );
  }
}

async function optional(pathname, token, fallback) {
  try {
    return await api(pathname, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.warn(`Skipping ${pathname}: ${error.message}`);
    return fallback;
  }
}

await verifyBackendApi();

const loginUrl = fullUrl("/auth/login");
console.log(`Calling admin login endpoint: ${loginUrl}`);
let login;
try {
  login = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
} catch (error) {
  if (error.message.includes("(405)")) {
    throw new Error(
      `Admin login returned 405 at ${loginUrl}. The supplied URL is likely frontend-only, so export is not possible from it. Use the backend URL configured as VITE_API_URL in the deployed frontend.`,
    );
  }
  throw error;
}
const token = login.token;

try {
  const snapshot = await api("/admin/export-store", {
    headers: { Authorization: `Bearer ${token}` },
  });
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Exported full store snapshot to ${outputPath}`);
  process.exit(0);
} catch (error) {
  console.warn(`Full export endpoint unavailable, falling back to public/admin endpoints: ${error.message}`);
}

const [products, orders, employees, reviews, offers, categoryCards, workSessions] = await Promise.all([
  optional("/products", token, []),
  optional("/orders", token, []),
  optional("/employee", token, []),
  optional("/reviews/all", token, []),
  optional("/home-offers/all", token, []),
  optional("/home-offers/category-cards/all", token, []),
  optional("/employee/work-sessions", token, []),
]);

const staffUsers = employees.map((employee) => ({
  ...employee,
  role: employee.role || "employee",
  password: employee.password || "employee123",
}));
const orderCustomers = new Map();
for (const order of orders) {
  const customer = order.customer || {};
  const emailKey = customer.email || order.customerEmail || order.customerUserId;
  if (!emailKey) continue;
  orderCustomers.set(emailKey, {
    id: order.customerUserId || `customer-${String(emailKey).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    name: customer.name || order.customerName || "Customer",
    email: customer.email || "",
    phone: customer.phone || "",
    password: "",
    role: "customer",
    permissions: [],
    isActive: true,
  });
}

const store = {
  version: 1,
  savedAt: new Date().toISOString(),
  users: [login.user, ...staffUsers, ...orderCustomers.values()].filter(Boolean),
  products,
  orders,
  offers,
  categoryCards,
  reviews,
  workSessions,
  carts: {},
};

fs.writeFileSync(outputPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
console.log(`Exported fallback store snapshot to ${outputPath}`);
console.log("Note: fallback export can only include data exposed by the current API.");
