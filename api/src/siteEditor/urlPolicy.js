export const LOCAL_CONNECTION_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function localConnectionsEnabled() {
  return process.env.NODE_ENV === "development"
    && process.env.SITE_EDITOR_ALLOW_LOCAL_CONNECTIONS === "true";
}

export function parseSafeConnectionUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const isLocalHttp = url.protocol === "http:"
      && LOCAL_CONNECTION_HOSTNAMES.has(hostname)
      && localConnectionsEnabled();
    if (url.username || url.password || !url.hostname) return null;
    if (url.protocol !== "https:" && !isLocalHttp) return null;
    return url;
  } catch {
    return null;
  }
}
