/**
 * SMS Provider Preset Templates - Ready-to-use configurations
 */
export const PRESETS = {
  MADA: {
    name: 'Mada (مدى)', provider_type: 'dynamic_http', description: 'بوابة مدي',
    base_url: 'https://api.mada.ps/v1/sms', http_method: 'POST', content_type: 'json',
    auth_type: 'api_key', headers: {'Content-Type':'application/json'},
    payload_structure: {api_key:'{api_key}',sender:'{sender}',numbers:'{to}',message:'{message}'},
    response_mapping: {successPath:'success',successValue:true,messageIdPath:'message_id',errorPath:'error'},
    capabilities: {supportsBalance:true,supportsUnicode:true,maxMessageLength:160},
    phone_normalization: {countryCode:'970',stripPrefixes:['0','+'],validateLength:9,onlyPalestinian:true},
  },
  HOT_SMS: {
    name: 'HotSMS', provider_type: 'dynamic_http', description: 'هوت سمس',
    base_url: 'https://sms.hotsms.ps/api/send', http_method: 'POST', content_type: 'json',
    auth_type: 'bearer', headers: {'Content-Type':'application/json','Authorization':'Bearer {token}'},
    payload_structure: {username:'{username}',password:'{password}',numbers:'{to}',sender:'{sender}',message:'{message}'},
    response_mapping: {successPath:'status',successValue:'success',messageIdPath:'msg_id',errorPath:'error'},
    capabilities: {supportsBalance:true,supportsUnicode:true,maxMessageLength:160},
    phone_normalization: {countryCode:'970',stripPrefixes:['0','+'],validateLength:9,onlyPalestinian:true},
  },
  SUPER_CODE: {
    name: 'SuperCode', provider_type: 'dynamic_http', description: 'سوبر كود',
    base_url: 'https://www.super-code.net/api/v1/send', http_method: 'POST', content_type: 'json',
    auth_type: 'api_key', headers: {'Content-Type':'application/json','X-API-Key':'{api_key}'},
    payload_structure: {to:'{to}',from:'{sender}',text:'{message}'},
    response_mapping: {successPath:'response_code',successValue:200,messageIdPath:'message_id',errorPath:'error'},
    capabilities: {supportsBalance:true,supportsDeliveryReport:true,supportsUnicode:true,maxMessageLength:160},
    phone_normalization: {countryCode:'970',stripPrefixes:['0','+'],validateLength:9,onlyPalestinian:true},
  },
  TWILIO: {
    name: 'Twilio', provider_type: 'twilio', description: 'Global SMS',
    base_url: 'https://api.twilio.com/2010-04-01', http_method: 'POST', content_type: 'form',
    auth_type: 'basic', headers: {'Content-Type':'application/x-www-form-urlencoded'},
    payload_structure: {To:'{to}',From:'{sender}',Body:'{message}'},
    response_mapping: {successPath:'status',successValue:'queued',messageIdPath:'sid',errorPath:'error'},
    capabilities: {supportsBalance:true,supportsDeliveryReport:true,supportsUnicode:true,maxMessageLength:1600},
    phone_normalization: {countryCode:'',stripPrefixes:[],validateLength:0,onlyPalestinian:false},
  },
  UNIFONIC: {
    name: 'Unifonic', provider_type: 'dynamic_http', description: 'MENA SMS',
    base_url: 'https://api.unifonic.com/rest/messages', http_method: 'POST', content_type: 'json',
    auth_type: 'bearer', headers: {'Content-Type':'application/json','Authorization':'Bearer {token}'},
    payload_structure: {recipient:'{to}',senderId:'{sender}',body:'{message}'},
    response_mapping: {successPath:'success',successValue:true,messageIdPath:'data.messageId',errorPath:'error'},
    capabilities: {supportsBalance:true,supportsDeliveryReport:true,supportsUnicode:true,maxMessageLength:160},
    phone_normalization: {countryCode:'966',stripPrefixes:['0','+'],validateLength:9,onlyPalestinian:false},
  },
  GENERIC_HTTP: {
    name: 'Custom HTTP', provider_type: 'dynamic_http', description: 'Custom provider',
    base_url: 'https://api.example.com/sms', http_method: 'POST', content_type: 'json',
    auth_type: 'api_key', headers: {'Content-Type':'application/json'},
    payload_structure: {to:'{to}',from:'{sender}',text:'{message}'},
    response_mapping: {successPath:'success',successValue:true,messageIdPath:'id',errorPath:'error'},
    capabilities: {supportsBalance:false,supportsUnicode:true,maxMessageLength:160},
    phone_normalization: {countryCode:'',stripPrefixes:[],validateLength:0,onlyPalestinian:false},
  },
  MOCK: {
    name: 'Mock (Testing)', provider_type: 'mock', description: 'For testing only',
    base_url: 'http://mock.local', http_method: 'POST', content_type: 'json',
    auth_type: 'none', headers: {},
    payload_structure: {},
    response_mapping: {successPath:'success',successValue:true,messageIdPath:'mock_id',errorPath:'error'},
    capabilities: {supportsBalance:true,supportsUnicode:true,maxMessageLength:160},
    phone_normalization: {countryCode:'970',stripPrefixes:['0','+'],validateLength:9,onlyPalestinian:false},
  },
};

export function getPreset(name) { return PRESETS[name] || null; }
export function getAllPresets() { return Object.entries(PRESETS).map(([k,v]) => ({id:k,...v})); }
export function getPresetsByCategory(cat) {
  const cats = {palestinian:['MADA','HOT_SMS','SUPER_CODE'],global:['TWILIO','UNIFONIC'],testing:['MOCK'],custom:['GENERIC_HTTP']};
  return (cats[cat]||[]).map(k => ({id:k,...PRESETS[k]}));
}
export function applyPreset(name, overrides={}) {
  const p = getPreset(name);
  if (!p) throw new Error(`Unknown preset: ${name}`);
  return {...p,...overrides,preset_name:name};
}
export default {PRESETS,getPreset,getAllPresets,getPresetsByCategory,applyPreset};
