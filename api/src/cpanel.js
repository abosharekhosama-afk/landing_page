function normalizeOrigin(origin = "") {
  return origin.trim().replace(/\/+$/, "");
}

function parseOriginList(value = "") {
  return value.split(",").map(normalizeOrigin).filter(Boolean);
}

const defaultOrigins = [
  "https://cpanel-staging.igroup.website",
];

const raw = process.env.CPANEL_ORIGINS || defaultOrigins.join(",");
export const cpanelOrigins = [...new Set(parseOriginList(raw))];
