/**
 * SMS Provider Resolver
 * Resolves the appropriate SMS provider for a company
 * Priority: DB provider > Fallback to Twilio/Env
 */

import { getActiveSmsProviderForCompany } from '../../data/postgresStore.js';
import { decryptSecrets } from '../smsProviderCrypto.js';
import { DynamicHttpSmsProvider } from './DynamicHttpSmsProvider.js';

/**
 * Create provider instance from DB config
 */
function createProviderFromConfig(config) {
  if (!config) return null;

  // Decrypt secrets
  const secrets = decryptSecrets(config.encrypted_secrets || {});

  switch (config.provider_type) {
    case 'twilio':
      return createTwilioProvider(config, secrets);
    case 'mock':
      return createMockProvider(config);
    case 'dynamic_http':
    default:
      return new DynamicHttpSmsProvider(config, secrets);
  }
}

/**
 * Create Twilio provider (placeholder - actual Twilio implementation)
 */
function createTwilioProvider(config, secrets) {
  // For now, fall back to DynamicHttpSmsProvider with Twilio preset
  // In production, use actual Twilio SDK
  return new DynamicHttpSmsProvider({
    ...config,
    base_url: `https://api.twilio.com/2010-04-01/Accounts/${secrets.accountSid}/Messages.json`,
  }, secrets);
}

/**
 * Create Mock provider for testing
 */
function createMockProvider(config) {
  return {
    async send({ to, message, sender }) {
      console.log(`[Mock SMS] To: ${to}, From: ${sender}, Message: ${message}`);
      return {
        success: true,
        messageId: `mock_${Date.now()}`,
        provider: 'Mock',
        status: 'SENT',
        rawResponse: { success: true, mock_id: `mock_${Date.now()}` },
      };
    },
    async getBalance() {
      return { success: true, balance: 1000, currency: 'SMS' };
    },
    async getRechargeHistory() {
      return { supported: true, history: [], message: 'Mock provider - no recharge history' };
    },
    async getDeliveryStatus(messageId) {
      return { supported: true, status: 'DELIVERED', messageId };
    },
    async sendTest({ to, message, sender }) {
      return this.send({ to, message: message || 'Test message', sender: sender || 'TEST' });
    },
    getInfo() {
      return { name: 'Mock Provider', type: 'mock', capabilities: { supportsBalance: true } };
    },
    getInfo() {
      return { name: 'Mock Provider', type: 'mock', capabilities: { supportsBalance: true, supportsRechargeHistory: true, supportsDeliveryReport: true } };
    },
    capabilities: { supportsBalance: true, supportsRechargeHistory: true, supportsDeliveryReport: true },
  };
}

/**
 * Smart Provider Resolver
 * Resolves SMS provider based on company configuration
 */
export class SmsProviderResolver {
  constructor(options = {}) {
    this.fallbackEnabled = options.fallbackEnabled !== false;
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 60000; // 1 minute default
  }

  /**
   * Get cached provider or resolve fresh
   */
  async resolve(companyId, forceRefresh = false) {
    if (!forceRefresh && this.cache.has(companyId)) {
      const cached = this.cache.get(companyId);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.provider;
      }
    }

    const provider = await this.resolveProvider(companyId);
    this.cache.set(companyId, { provider, timestamp: Date.now() });
    return provider;
  }

  /**
   * Core resolution logic
   */
  async resolveProvider(companyId) {
    try {
      // Priority 1: Check DB for active provider
      const dbProvider = await getActiveSmsProviderForCompany(companyId);
      if (dbProvider) {
        const instance = createProviderFromConfig(dbProvider);
        if (instance) {
          console.log(`[SmsResolver] Using DB provider: ${dbProvider.name} for company ${companyId}`);
          return instance;
        }
      }

      // Priority 2: Check environment fallback
      if (this.fallbackEnabled) {
        const fallback = this.createEnvFallback();
        if (fallback) {
          console.log(`[SmsResolver] Using Env fallback for company ${companyId}`);
          return fallback;
        }
      }

      // Priority 3: Return mock provider
      console.log(`[SmsResolver] No provider found, using mock for company ${companyId}`);
      return createMockProvider({});
    } catch (error) {
      console.error(`[SmsResolver] Error resolving provider for ${companyId}:`, error);
      // Return mock on error
      return createMockProvider({});
    }
  }

  /**
   * Create fallback provider from environment variables
   */
  createEnvFallback() {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      // Return a Twilio-compatible provider using env vars
      return new DynamicHttpSmsProvider({
        name: 'Twilio (Env)',
        provider_type: 'twilio',
        base_url: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        http_method: 'POST',
        content_type: 'form',
        auth_type: 'basic',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        payload_structure: { To: '{to}', From: '{sender}', Body: '{message}' },
        response_mapping: { successPath: 'status', successValue: 'queued', messageIdPath: 'sid', errorPath: 'error' },
        capabilities: { supportsBalance: true, supportsDeliveryReport: true },
        phone_normalization: {},
      }, {
        username: twilioSid,
        password: twilioToken,
        from: twilioFrom,
      });
    }

    return null;
  }

  /**
   * Clear cache for a company
   */
  invalidate(companyId) {
    this.cache.delete(companyId);
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
let resolverInstance = null;

export function getSmsProviderResolver() {
  if (!resolverInstance) {
    resolverInstance = new SmsProviderResolver();
  }
  return resolverInstance;
}

export default SmsProviderResolver;
