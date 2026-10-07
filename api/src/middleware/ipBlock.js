import { findActiveIpBlock, normalizeIp } from "../security/ipBlocking.js";

/**
 * Authoritative client IP from Express after `trust proxy` evaluation.
 * Never read X-Forwarded-For (or similar) manually — those headers are
 * client-controllable and must not bypass tenant IP blocking.
 */
export function resolveClientIp(req) {
  return normalizeIp(req?.ip || req?.socket?.remoteAddress || "");
}

/**
 * Tenant-scoped IP enforcement. Runs only when company context is already
 * resolved (storefront / public host / authenticated company scope).
 * Always stamps req.clientIp for downstream login-history recording.
 */
export function enforceIpBlock(req, res, next) {
  const ip = resolveClientIp(req);
  req.clientIp = ip;
  if (!req.companyId || !ip) return next();
  const block = findActiveIpBlock(req.companyId, ip);
  if (block) {
    return res.status(403).json({ message: "Access denied." });
  }
  return next();
}
