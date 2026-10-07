/**
 * Phone Number Preprocessor for Palestinian Phone Numbers
 * Handles normalization and validation for Palestinian carriers
 */

const PALESTINIAN_PREFIXES = {
  jawwal: ['059', '0159'],
  ooredoo: ['055', '0155'],
  vatel: ['056', '0156'],
  weloo: ['057', '0157'],
  ogero: ['058', '0158'],
  ministry: ['054', '0154'],
};
const COUNTRY_CODE = '970';

export function detectCarrier(phoneNumber) {
  if (!phoneNumber) return null;
  const clean = phoneNumber.replace(/[\s\-\(\)]/g, '');
  for (const [carrier, prefixes] of Object.entries(PALESTINIAN_PREFIXES)) {
    for (const prefix of prefixes) {
      if (clean.startsWith(prefix)) return carrier;
    }
  }
  return null;
}

export function isPalestinianNumber(phoneNumber) {
  return detectCarrier(phoneNumber) !== null;
}

export function normalizePalestinianPhone(phoneNumber) {
  if (!phoneNumber) return null;
  let clean = phoneNumber.replace(/[^\d]/g, '');
  if (clean.startsWith('00970')) clean = clean.substring(5);
  else if (clean.startsWith('970')) clean = clean.substring(3);
  else if (clean.startsWith('0')) clean = clean.substring(1);
  if (!/^5\d{8}$/.test(clean)) return null;
  return COUNTRY_CODE + clean;
}

export function normalizeToE164(phoneNumber) {
  const normalized = normalizePalestinianPhone(phoneNumber);
  return normalized ? '+' + normalized : null;
}

export function formatLocal(phoneNumber) {
  const normalized = normalizePalestinianPhone(phoneNumber);
  if (!normalized) return phoneNumber;
  const local = normalized.substring(3);
  return `${local.substring(0, 3)}-${local.substring(3, 6)}-${local.substring(6)}`;
}

export function validatePhoneFormat(phoneNumber, options = {}) {
  const { requirePalestinian = false } = options;
  if (!phoneNumber) return { valid: false, error: 'Phone number is required' };
  const isPalestinian = isPalestinianNumber(phoneNumber);
  if (requirePalestinian && !isPalestinian) {
    return { valid: false, error: 'Only Palestinian phone numbers are allowed' };
  }
  const normalized = normalizePalestinianPhone(phoneNumber);
  if (!normalized) {
    return { valid: true, normalized: phoneNumber.trim().replace(/[^\d+]/g, '') };
  }
  return { valid: true, normalized, e164: '+' + normalized, carrier: detectCarrier(phoneNumber) };
}

export function getNormalizationConfig(providerConfig = {}) {
  return {
    countryCode: providerConfig.countryCode || COUNTRY_CODE,
    stripPrefixes: providerConfig.stripPrefixes || ['+', '0', '00970'],
    validateLength: providerConfig.validateLength || 9,
    onlyPalestinian: providerConfig.onlyPalestinian || false,
  };
}

export function normalizeForProvider(phoneNumber, providerConfig = {}) {
  const config = getNormalizationConfig(providerConfig);
  let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
  for (const prefix of config.stripPrefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
      break;
    }
  }
  const carrier = detectCarrier(normalized);
  if (config.onlyPalestinian && !carrier) return null;
  if (carrier && !normalized.startsWith(config.countryCode)) {
    normalized = config.countryCode + normalized;
  }
  const numberPart = normalized.replace(/^\+?970/, '');
  if (numberPart.length !== config.validateLength) return null;
  return normalized;
}

export function extractPhoneFromResponse(responseData, phoneFields = ['phone', 'number', 'msisdn', 'recipient']) {
  for (const field of phoneFields) {
    if (responseData[field]) {
      const normalized = normalizePalestinianPhone(responseData[field]);
      if (normalized) return normalized;
    }
  }
  return null;
}

export const CARRIER_NAMES = {
  jawwal: { ar: 'جوال', en: 'Jawwal' },
  ooredoo: { ar: 'أوريدو', en: 'Ooredoo' },
  vatel: { ar: 'فياتل', en: 'Vatel' },
  weloo: { ar: 'ويلو', en: 'Weloo' },
  ogero: { ar: 'أوجيه', en: 'Ogero' },
  ministry: { ar: 'اتصالات', en: 'Ministry' },
};

export function getCarrierDisplayName(carrier, locale = 'en') {
  const names = CARRIER_NAMES[carrier];
  return names ? names[locale] || names.en : carrier;
}

export default {
  detectCarrier,
  isPalestinianNumber,
  normalizePalestinianPhone,
  normalizeToE164,
  formatLocal,
  validatePhoneFormat,
  normalizeForProvider,
  getNormalizationConfig,
  extractPhoneFromResponse,
  getCarrierDisplayName,
  CARRIER_NAMES,
  PALESTINIAN_PREFIXES,
  COUNTRY_CODE,
};
