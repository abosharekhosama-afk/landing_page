import net from "node:net";

function ipv4ToBigInt(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((value, part) => (value << 8n) + BigInt(Number(part)), 0n);
}

function ipv6ToBigInt(ip) {
  const normalized = String(ip || "").trim().toLowerCase();
  if (net.isIP(normalized) !== 6) return null;
  const [head, tail] = normalized.split("::");
  const expand = (parts) => {
    const result = [];
    for (const part of parts.filter(Boolean)) {
      if (part.includes(".")) {
        const v4 = ipv4ToBigInt(part);
        if (v4 === null) return null;
        result.push(Number((v4 >> 16n) & 0xffffn).toString(16), Number(v4 & 0xffffn).toString(16));
      } else if (/^[0-9a-f]{1,4}$/.test(part)) result.push(part);
      else return null;
    }
    return result;
  };
  const left = expand(head ? head.split(":") : []);
  const right = expand(tail ? tail.split(":") : []);
  if (!left || !right) return null;
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (!normalized.includes("::") && missing !== 0)) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8) return null;
  return groups.reduce((value, part) => (value << 16n) + BigInt(parseInt(part, 16)), 0n);
}

export function normalizeIp(value) {
  let ip = String(value || "").trim().toLowerCase();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

export function parseIpOrCidr(value) {
  const raw = normalizeIp(value);
  if (!raw) return null;
  const slash = raw.indexOf("/");
  const address = slash === -1 ? raw : raw.slice(0, slash);
  const version = net.isIP(address);
  if (!version) return null;
  const bits = version === 4 ? 32n : 128n;
  const parsedValue = version === 4 ? ipv4ToBigInt(address) : ipv6ToBigInt(address);
  if (parsedValue === null) return null;
  const prefix = slash === -1 ? Number(bits) : Number(raw.slice(slash + 1));
  if (!Number.isInteger(prefix) || prefix < 0 || BigInt(prefix) > bits) return null;
  return { version, value: parsedValue, bits, prefix };
}

export function isValidIpOrCidr(value) {
  return Boolean(parseIpOrCidr(value));
}

export function ipMatchesRule(ip, rule) {
  const target = parseIpOrCidr(ip);
  const network = parseIpOrCidr(rule);
  if (!target || !network || target.version !== network.version) return false;
  const shift = network.bits - BigInt(network.prefix);
  if (shift === 0n) return target.value === network.value;
  return (target.value >> shift) === (network.value >> shift);
}
