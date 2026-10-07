const buckets = new Map();
export function rateLimit({ windowMs = 60000, max = 20, key = "default" } = {}) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();
    const now = Date.now(); const bucketKey = `${key}:${req.user?.id || req.ip || "unknown"}`; const current = buckets.get(bucketKey);
    if (!current || current.resetAt <= now) { buckets.set(bucketKey, { count: 1, resetAt: now + windowMs }); return next(); }
    current.count += 1;
    if (current.count > max) { res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000)); return res.status(429).json({ message: "Too many requests. Please try again later." }); }
    return next();
  };
}
