export function isSplashActive(ad, now = new Date()) {
  if (!ad?.is_active) return false;
  const t = now.getTime();
  return (!ad.start_date || new Date(ad.start_date).getTime() <= t)
    && (!ad.end_date || new Date(ad.end_date).getTime() >= t);
}

export function isSplashExcluded(ad, pageKey) {
  return Array.isArray(ad.excluded_pages) && ad.excluded_pages.includes(pageKey);
}

export function getVisibleSplashAds(items = [], pageKey = "/", now = new Date()) {
  return items
    .filter((ad) => isSplashActive(ad, now) && !isSplashExcluded(ad, pageKey))
    .sort((a, b) => String(a.id || "").localeCompare(String(b.id || "")));
}
