export const websiteContentRoutes = Object.freeze({
  "admin-website-content-cms": "/admin/website-content/cms",
  "admin-website-content-multilingual": "/admin/website-content/multilingual",
});

export const websiteContentPageKeys = Object.freeze(Object.keys(websiteContentRoutes));

const pathToPage = Object.freeze(
  Object.fromEntries(Object.entries(websiteContentRoutes).map(([page, path]) => [path, page])),
);

const legacyPaths = Object.freeze({
  "/admin/coming-soon/website-content/cms": "admin-website-content-cms",
  "/admin/coming-soon/website-content/multilingual": "admin-website-content-multilingual",
});

const legacyPageKeys = Object.freeze({
  "admin-tenant-placeholder-website-content-cms": "admin-website-content-cms",
  "admin-tenant-placeholder-website-content-multilingual": "admin-website-content-multilingual",
});

const normalizedPath = (pathname) => pathname && pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;

export function resolveWebsiteContentPage(pathname) {
  const path = normalizedPath(pathname);
  return pathToPage[path] || legacyPaths[path] || null;
}

export function canonicalWebsiteContentPageKey(pageKey) {
  return legacyPageKeys[pageKey] || pageKey;
}

const companySetting = (company, key) =>
  company?.[key] ?? company?.settings?.[key] ?? company?.companySettings?.[key] ?? null;

const cleanCode = (value) => String(value || "").trim().replaceAll("_", "-");

function languageName(code, uiLanguage, explicitName) {
  if (explicitName) return String(explicitName);
  if (!code) return "";
  try {
    return new Intl.DisplayNames([uiLanguage === "ar" ? "ar" : "en"], { type: "language" }).of(code.split("-")[0]) || code;
  } catch {
    return code;
  }
}

export function originalLanguageFromCompany(company, uiLanguage = "en") {
  const locale = cleanCode(companySetting(company, "locale"));
  const code = cleanCode(companySetting(company, "language") || locale.split("-")[0]);
  const direction = String(companySetting(company, "direction") || "").toLowerCase();
  return {
    code,
    direction: direction === "rtl" || direction === "ltr" ? direction : "",
    locale,
    name: languageName(code, uiLanguage),
  };
}

function configuredLanguageRecords(company) {
  const candidates = [
    companySetting(company, "additionalLanguages"),
    companySetting(company, "supportedLanguages"),
    companySetting(company, "languages"),
  ];
  return candidates.find(Array.isArray) || [];
}

export function additionalLanguagesFromCompany(company, uiLanguage = "en") {
  const original = originalLanguageFromCompany(company, uiLanguage).code.split("-")[0].toLowerCase();
  const seen = new Set();
  return configuredLanguageRecords(company).flatMap((entry) => {
    const record = typeof entry === "string" ? { code: entry } : entry;
    if (!record || typeof record !== "object") return [];
    const code = cleanCode(record.code || record.languageCode || record.locale || record.language);
    const baseCode = code.split("-")[0].toLowerCase();
    if (!code || baseCode === original || seen.has(code.toLowerCase())) return [];
    seen.add(code.toLowerCase());
    const progressValue = record.translationProgress ?? record.progress;
    return [{
      code,
      direction: ["rtl", "ltr"].includes(String(record.direction || "").toLowerCase()) ? String(record.direction).toLowerCase() : "",
      name: languageName(code, uiLanguage, record.name || record.label),
      progress: progressValue !== null && progressValue !== undefined && progressValue !== "" && Number.isFinite(Number(progressValue)) ? Number(progressValue) : null,
      status: record.status ? String(record.status) : "",
    }];
  });
}

export function companyPlanLabel(company) {
  return company?.plan?.name || company?.subscription?.planName || companySetting(company, "planName") || "";
}
