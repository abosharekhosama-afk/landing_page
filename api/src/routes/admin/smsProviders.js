/**
 * SMS Provider Admin Routes
 */
import { Router } from 'express';
import { requireAuth, requireAnyPermission } from '../../middleware/auth.js';
import { listSmsProvidersForCompany, getSmsProviderById, createSmsProviderForCompany, updateSmsProvider, deleteSmsProvider, activateSmsProvider, deactivateSmsProvider } from '../../data/postgresStore.js';
import { encryptSecrets, decryptSecrets } from '../../sms/smsProviderCrypto.js';
import { getPreset, getAllPresets } from '../../sms/presetTemplates.js';
import { DynamicHttpSmsProvider } from '../../sms/providers/DynamicHttpSmsProvider.js';

const router = Router();
router.use(requireAuth);
router.use(requireAnyPermission('sms.providers.manage', 'sms.manage'));

router.get('/', async (req, res) => {
  try {
    const providers = await listSmsProvidersForCompany(req.companyId);
    res.json({ success: true, data: providers.map(p => ({ ...p, encrypted_secrets: Object.keys(p.encrypted_secrets || {}) })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/presets', async (req, res) => {
  try { res.json({ success: true, data: getAllPresets().map(p => ({ id: p.id, name: p.name, description: p.description, capabilities: p.capabilities, base_url: p.base_url, http_method: p.http_method, content_type: p.content_type, auth_type: p.auth_type, secret_fields: p.secret_fields || [] })) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await getSmsProviderById(req.companyId, req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: { ...p, encrypted_secrets: Object.keys(p.encrypted_secrets || {}) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function normalizeProviderData(data) {
  const out = { ...data };
  if (out.content_type) out.content_type = String(out.content_type).toLowerCase();
  if (out.auth_type) out.auth_type = String(out.auth_type).toLowerCase();
  if (out.http_method) out.http_method = String(out.http_method).toUpperCase();
  if (out.provider_type) out.provider_type = String(out.provider_type).toLowerCase();
  // The storefront form sends `is_enabled`; the schema column is `is_active`.
  if (out.is_enabled !== undefined && out.is_active === undefined) {
    out.is_active = out.is_enabled;
  }
  delete out.is_enabled;
  return out;
}

function extractSecrets(body) {
  const raw = body.secret_config || {};
  const secrets = {};
  for (const f of ['api_key', 'token', 'username', 'password', 'account', 'sender', 'apiSecret']) {
    if (raw[f]) secrets[f] = encryptSecrets({ [f]: String(raw[f]) })[f];
  }
  for (const f of ['api_key', 'apiSecret', 'password', 'token', 'username']) {
    if (body[f]) secrets[f] = encryptSecrets({ [f]: String(body[f]) })[f];
  }
  return secrets;
}

router.post('/', async (req, res) => {
  if (!req.body.name || !req.body.base_url) return res.status(400).json({ error: 'name and base_url required' });
  try {
    let data = normalizeProviderData({ ...req.body });
    if (data.preset_id || data.preset) { const pr = getPreset(data.preset_id || data.preset); if (pr) data = { ...pr, ...data }; }
    data.encrypted_secrets = extractSecrets(req.body);
    delete data.secret_config;
    // Drop anything the schema does not store so the raw INSERT never receives unknown columns.
    for (const k of ['secret_config', 'extra_config', 'preset_id']) delete data[k];
    res.status(201).json({ success: true, data: await createSmsProviderForCompany(req.companyId, data) });
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') console.error('[sms:providers] POST failed:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await getSmsProviderById(req.companyId, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const data = normalizeProviderData({ ...req.body });
    const newSecrets = extractSecrets(req.body);
    if (Object.keys(newSecrets).length > 0) {
      data.encrypted_secrets = { ...existing.encrypted_secrets, ...newSecrets };
    }
    delete data.secret_config;
    delete data.id;
    res.json({ success: true, data: await updateSmsProvider(req.companyId, req.params.id, data) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const d = await deleteSmsProvider(req.companyId, req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/deactivate', async (req, res) => {
  try {
    const p = await deactivateSmsProvider(req.companyId, req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: p });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/activate', async (req, res) => {
  try {
    const p = await activateSmsProvider(req.companyId, req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: p });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/test', async (req, res) => {
  const to = req.body.phone || req.body.to;
  if (!to) return res.status(400).json({ error: 'phone is required' });
  try {
    const provider = await getSmsProviderById(req.companyId, req.params.id);
    if (!provider) return res.status(404).json({ error: 'Not found' });
    const sms = new DynamicHttpSmsProvider(provider, decryptSecrets(provider.encrypted_secrets));
    const result = await sms.send({ to, message: req.body.message || 'Test', sender: req.body.sender || 'TEST' });
    res.json({ success: true, data: result, message: 'Test message sent.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/balance', async (req, res) => {
  try {
    const provider = await getSmsProviderById(req.companyId, req.params.id);
    if (!provider) return res.status(404).json({ error: 'Not found' });
    if (!provider.capabilities?.supportsBalance) return res.json({ success: true, data: { supported: false } });
    const sms = new DynamicHttpSmsProvider(provider, decryptSecrets(provider.encrypted_secrets));
    res.json({ success: true, data: await sms.getBalance() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
