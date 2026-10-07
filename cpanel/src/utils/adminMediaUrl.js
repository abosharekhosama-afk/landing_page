export function isAdminMediaVideoUrl(value) {
  const url = String(value || "");
  if (!url) return false;
  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url)) return true;
  return /\/videos?\//i.test(url);
}