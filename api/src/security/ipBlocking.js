import { ipBlockRepository } from "../data/store.js";
import { isValidIpOrCidr, ipMatchesRule, normalizeIp, parseIpOrCidr } from "./ipAddress.js";
export { isValidIpOrCidr, ipMatchesRule, normalizeIp, parseIpOrCidr } from "./ipAddress.js";
/** Aliases used by Employee4 tests / older call sites. */
export const validateIpOrCidr = isValidIpOrCidr;
export const isIpInCidr = ipMatchesRule;
export function findActiveIpBlock(companyId, ip) { return ipBlockRepository.findByCompany(companyId, (block) => block.is_active !== false && (!block.expires_at || new Date(block.expires_at) > new Date()) && ipMatchesRule(ip, block.ip_address)); }
