import { MockSmsProvider } from "./MockSmsProvider.js";

/**
 * Provider-independent SMS registry.
 *
 * Providers are registered under a lowercase key and resolved at send time
 * from SMS_PROVIDER. Development falls back to the test-only mock provider;
 * production never falls back to mock. Provider-specific configuration
 * (credentials, endpoints) lives inside each provider class — the registry
 * only maps keys to instances.
 *
 * Unknown keys throw instead of silently falling back: a misconfigured
 * SMS_PROVIDER must fail loudly, never send through the wrong provider.
 */
export function createSmsRegistry({ defaultProviderKey = "mock" } = {}) {
  const providers = new Map();

  function normalizeKey(key) {
    return String(key || "").trim().toLowerCase();
  }

  return {
    /** Register (or replace) a provider instance under a key. */
    register(key, provider) {
      const normalized = normalizeKey(key);
      if (!normalized) throw new Error("SMS provider key is required.");
      if (!provider || typeof provider.send !== "function") {
        throw new Error(`SMS provider "${normalized}" must implement send().`);
      }
      providers.set(normalized, provider);
      return provider;
    },

    /** Resolve a provider by key. Throws for unknown keys — no silent fallback. */
    resolve(key) {
      const normalized = normalizeKey(key) || defaultProviderKey;
      const provider = providers.get(normalized);
      if (!provider) {
        throw new Error(`SMS provider is not configured: "${normalized}".`);
      }
      return provider;
    },

    /** True if a provider is registered under the key. */
    has(key) {
      return providers.has(normalizeKey(key));
    },

    /** Registered provider keys (sorted for deterministic output). */
    list() {
      return [...providers.keys()].sort();
    },

    defaultProviderKey,
  };
}

// Process-wide registry with the mock provider available out of the box.
export const smsRegistry = createSmsRegistry();
smsRegistry.register("mock", new MockSmsProvider());

/**
 * Legacy singletons kept for existing consumers (smsService, routes).
 * Resolves the active provider from SMS_PROVIDER; unknown keys throw.
 */
export function registerSmsProvider(key, provider) {
  return smsRegistry.register(key, provider);
}

export function getSmsProvider() {
  const configured = String(process.env.SMS_PROVIDER || "").trim().toLowerCase();
  // Mock is a development/test provider only. Production must opt into an
  // explicitly registered real provider; otherwise SMS remains safely disabled.
  if (!configured) {
    if (process.env.NODE_ENV === "production") return null;
    return smsRegistry.resolve("mock");
  }
  if (process.env.NODE_ENV === "production" && configured === "mock") return null;
  return smsRegistry.resolve(configured);
}
