/** Provider-independent dynamic HTTP SMS sender with SSRF-safe networking. */
import dns from "node:dns/promises";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import { normalizeForProvider } from "../phonePreprocessor.js";

const TIMEOUT = 5000;
const MAX_REDIRECTS = 3;

const BLOCKED_NETWORKS = new net.BlockList();
for (const [network, prefix, family] of [
  ["0.0.0.0", 8, "ipv4"], ["10.0.0.0", 8, "ipv4"], ["100.64.0.0", 10, "ipv4"],
  ["127.0.0.0", 8, "ipv4"], ["169.254.0.0", 16, "ipv4"], ["172.16.0.0", 12, "ipv4"],
  ["192.0.0.0", 24, "ipv4"], ["192.0.2.0", 24, "ipv4"], ["192.168.0.0", 16, "ipv4"],
  ["198.18.0.0", 15, "ipv4"], ["198.51.100.0", 24, "ipv4"], ["203.0.113.0", 24, "ipv4"], ["224.0.0.0", 4, "ipv4"], ["240.0.0.0", 4, "ipv4"],
  ["::", 128, "ipv6"], ["::1", 128, "ipv6"], ["fc00::", 7, "ipv6"], ["fe80::", 10, "ipv6"], ["ff00::", 8, "ipv6"], ["2001:db8::", 32, "ipv6"],
]) BLOCKED_NETWORKS.addSubnet(network, prefix, family);

function isBlockedIp(address) {
  const ip = String(address || "").toLowerCase().replace(/^::ffff:/, "");
  const family = net.isIPv4(ip) ? "ipv4" : net.isIPv6(ip) ? "ipv6" : null;
  return !family || BLOCKED_NETWORKS.check(ip, family);
}

function assertSafeUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error("Invalid provider URL."); }
  if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("Provider URL must use http or https.");
  if (url.username || url.password) throw new Error("Provider URL credentials are not allowed.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal") {
    throw new Error("Provider URL targets a blocked host.");
  }
  if (net.isIP(host) && isBlockedIp(host)) throw new Error("Provider URL targets a private or reserved address.");
  return url;
}

async function resolveSafeAddresses(hostname) {
  if (net.isIP(hostname)) return [hostname];
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isBlockedIp(record.address))) {
    throw new Error("Provider URL resolves to a private or reserved address.");
  }
  return records.map((record) => record.address);
}

function requestOnce(url, options, resolvedAddress) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const headers = { ...(options.headers || {}) };
    headers.host = url.host;
    const requestOptions = {
      protocol: url.protocol,
      hostname: resolvedAddress,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      method: options.method,
      path: `${url.pathname}${url.search}`,
      headers,
      timeout: TIMEOUT,
    };
    if (url.protocol === "https:") requestOptions.servername = url.hostname;
    const req = transport.request(requestOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("timeout", () => req.destroy(new Error("SMS provider request timed out.")));
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function safeRequest(input, options) {
  let url = assertSafeUrl(input);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const addresses = await resolveSafeAddresses(url.hostname);
    const response = await requestOnce(url, options, addresses[0]);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (redirects === MAX_REDIRECTS) throw new Error("Too many redirects from SMS provider.");
    const location = response.headers.location;
    if (!location) throw new Error("SMS provider returned an invalid redirect.");
    url = assertSafeUrl(new URL(location, url).toString());
  }
  throw new Error("Too many redirects from SMS provider.");
}

function extractField(obj, path) {
  if (!path || !obj) return null;
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

function isSuccess(response, mapping) {
  if (!mapping) return true;
  const val = extractField(response, mapping.successPath);
  return val === mapping.successValue || (mapping.successValue === true && !!val);
}

export class DynamicHttpSmsProvider {
  constructor(config, secrets = {}) { this.config = config; this.secrets = secrets; this.name = config.name || "DynamicHTTP"; }

  interpolate(template, values) {
    if (typeof template !== "string") return template;
    let result = template;
    for (const [key, value] of Object.entries(values)) result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value || "");
    return result;
  }

  buildPayload(to, message, sender) {
    const { payload_structure = {}, phone_normalization } = this.config;
    const phone = normalizeForProvider(to, phone_normalization) || to;
    const values = { to: phone, message, sender, timestamp: new Date().toISOString(), ...this.secrets };
    const payload = {};
    for (const [key, template] of Object.entries(payload_structure)) {
      payload[key] = typeof template === "string" && template.startsWith("{") && template.endsWith("}")
        ? this.secrets[template.slice(1, -1)] || ""
        : this.interpolate(template, values);
    }
    return payload;
  }

  buildHeaders() {
    const { headers = {}, auth_type } = this.config;
    const result = { ...headers };
    for (const [key, value] of Object.entries(result)) if (typeof value === "string" && value.includes("{")) result[key] = this.interpolate(value, this.secrets);
    if (auth_type === "basic" && this.secrets.username && this.secrets.password) {
      result.Authorization = `Basic ${Buffer.from(`${this.secrets.username}:${this.secrets.password}`).toString("base64")}`;
    }
    return result;
  }

  async send({ to, message, sender }) {
    const { base_url, http_method = "POST", content_type = "json", response_mapping } = this.config;
    try {
      const payload = this.buildPayload(to, message, sender);
      const headers = this.buildHeaders();
      if (!headers["Content-Type"] && !headers["content-type"]) headers["Content-Type"] = content_type === "form" ? "application/x-www-form-urlencoded" : "application/json";
      const body = http_method === "GET" ? undefined : content_type === "form" ? new URLSearchParams(payload).toString() : JSON.stringify(payload);
      const response = await safeRequest(base_url, { method: http_method, headers, body });
      const ct = String(response.headers["content-type"] || "");
      const data = ct.includes("json") ? JSON.parse(response.body || "null") : response.body;
      const ok = response.status >= 200 && response.status < 300 && isSuccess(data, response_mapping);
      const messageId = extractField(data, response_mapping?.messageIdPath) || `dyn_${Date.now()}`;
      const error = extractField(data, response_mapping?.errorPath) || extractField(data, response_mapping?.errorMessagePath) || (!ok ? `HTTP ${response.status}` : null);
      return { success: ok, messageId, provider: this.name, error: ok ? null : error, status: ok ? "SENT" : "FAILED" };
    } catch (error) {
      return { success: false, messageId: null, provider: this.name, error: error.message, status: "FAILED" };
    }
  }

  async getBalance() { return this.config.capabilities?.supportsBalance ? { success: true, balance: null, message: "Not implemented" } : { success: true, balance: null }; }
  async getRechargeHistory() { return this.config.capabilities?.supportsRechargeHistory ? { supported: true, history: [], message: "No recharge history available" } : { supported: false, history: [], message: "Not supported" }; }
  async getDeliveryStatus(messageId) { return this.config.capabilities?.supportsDeliveryReport ? { supported: true, status: "UNKNOWN", messageId } : { supported: false, status: null }; }
  async sendTest({ to, message, sender }) { return this.send({ to, message: message || "Test", sender: sender || "TEST" }); }
  getInfo() { return { name: this.name, type: this.config.provider_type, capabilities: this.config.capabilities }; }
}

export { assertSafeUrl, isBlockedIp };
export default DynamicHttpSmsProvider;
