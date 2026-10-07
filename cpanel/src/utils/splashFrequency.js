export const SPLASH_FREQUENCIES = Object.freeze(["EVERY_VISIT", "ONCE_PER_SESSION", "ONCE_PER_DAY"]);

export function splashFrequencyKey(adId, frequency = "ONCE_PER_SESSION") {
  return `splash-ad:${String(adId)}:${frequency}`;
}

export function shouldDisplaySplash(ad, storage = null, now = new Date()) {
  if (!ad?.id) return false;
  const frequency = SPLASH_FREQUENCIES.includes(ad.frequency) ? ad.frequency : "ONCE_PER_SESSION";
  if (frequency === "EVERY_VISIT" || !storage) return true;
  const key = splashFrequencyKey(ad.id, frequency);
  const stored = storage.getItem(key);
  if (frequency === "ONCE_PER_DAY") return stored !== now.toISOString().slice(0, 10);
  return stored !== "1";
}

export function markSplashDisplayed(ad, storage = null, now = new Date()) {
  if (!ad?.id || !storage) return;
  const frequency = SPLASH_FREQUENCIES.includes(ad.frequency) ? ad.frequency : "ONCE_PER_SESSION";
  if (frequency === "EVERY_VISIT") return;
  const key = splashFrequencyKey(ad.id, frequency);
  storage.setItem(key, frequency === "ONCE_PER_DAY" ? now.toISOString().slice(0, 10) : "1");
}
