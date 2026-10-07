import net from "node:net";

export function normalizeIp(value) {
  let ip = String(value || "").trim().toLowerCase();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip.includes("%")) ip = ip.split("%", 1)[0];
  return ip;
}
function ipv4ToBigInt(ip) { const parts = ip.split("."); if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 255)) return null; return parts.reduce((value, part) => (value << 8n) + BigInt(Number(part)), 0n); }
function ipv6ToBigInt(ip) { const normalized = normalizeIp(ip); if (net.isIP(normalized) !== 6) return null; const [head, tail] = normalized.split("::"); const left = head ? head.split(":").filter(Boolean) : []; const right = tail ? tail.split(":").filter(Boolean) : []; const expand = (parts) => { const result=[]; for (const part of parts) { if (part.includes(".")) { const v4=ipv4ToBigInt(part); if (v4===null) return null; result.push(Number((v4>>16n)&0xffffn).toString(16), Number(v4&0xffffn).toString(16)); } else if (/^[0-9a-f]{1,4}$/.test(part)) result.push(part); else return null; } return result; }; const l=expand(left), r=expand(right); if (!l||!r) return null; const missing=8-l.length-r.length; if (!normalized.includes("::") && missing!==0) return null; if (missing<0) return null; return [...l,...Array(missing).fill("0"),...r].reduce((v,g)=>(v<<16n)+BigInt(parseInt(g,16)),0n); }
function ipToBigInt(ip) { const normalized=normalizeIp(ip); if(net.isIP(normalized)===4)return {version:4,value:ipv4ToBigInt(normalized),bits:32n}; if(net.isIP(normalized)===6)return {version:6,value:ipv6ToBigInt(normalized),bits:128n}; return null; }
export function parseIpOrCidr(value) { const raw=normalizeIp(value); if(!raw)return null; const slash=raw.indexOf("/"); const address=slash===-1?raw:raw.slice(0,slash); const parsed=ipToBigInt(address); if(!parsed?.value && parsed?.value!==0n)return null; const prefix=slash===-1?Number(parsed.bits):Number(raw.slice(slash+1)); if(!Number.isInteger(prefix)||prefix<0||BigInt(prefix)>parsed.bits)return null; return {...parsed,address,prefix}; }
export function isValidIpOrCidr(value) { return Boolean(parseIpOrCidr(value)); }
export function ipMatchesRule(ip, rule) { const target=parseIpOrCidr(ip); const network=parseIpOrCidr(rule); if(!target||!network||target.version!==network.version)return false; if(network.prefix===Number(network.bits))return target.value===network.value; const shift=network.bits-BigInt(network.prefix); return (target.value>>shift)===(network.value>>shift); }
