import React from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { apiRequest } from "../utils/api.js";

const SECRET_FIELDS = ["api_key", "token", "username", "password"];

function SmsSecretField({ field, editing, setEditing, showSecrets, setShowSecrets, ar, t }) {
  const isSecret = SECRET_FIELDS.includes(field);
  return (
    <div key={field} className="full-field sms-secret-input-wrapper">
      <label>
        {t(SECRET_FIELD_LABELS[field]?.en || "Credential", SECRET_FIELD_LABELS[field]?.ar || "بيانات الاعتماد")}
        <div className="sms-secret-input-group">
          <input
            type={isSecret && showSecrets[field] ? "text" : isSecret ? "password" : "text"}
            value={editing.secret_config?.[field] || ""}
            onChange={(e) =>
              setEditing({
                ...editing,
                secret_config: { ...editing.secret_config, [field]: e.target.value },
              })
            }
            placeholder={isSecret ? "••••••••" : field}
            autoComplete={isSecret ? "new-password" : "on"}
            className={isSecret ? "has-toggle" : ""}
          />
          {isSecret && (
            <button
              type="button"
              className="sms-secret-toggle"
              aria-label={showSecrets[field] ? t("Hide", "إخفاء") : t("Show", "إظهار")}
              onClick={() => setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }))}
            >
              {showSecrets[field] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
      </label>
    </div>
  );
}

export function SmsSecretFieldRenderer(props) {
  return SmsSecretField(props);
}

// Credential fields derived from auth_type — works for ALL presets automatically
const AUTH_TYPE_FIELDS = {
  api_key: ["api_key"],
  bearer: ["token"],
  basic: ["username", "password"],
  none: [],
};

const SECRET_FIELD_LABELS = {
  api_key: { en: "API Key", ar: "مفتاح API" },
  token: { en: "Token", ar: "رمز الوصول (Token)" },
  username: { en: "Username", ar: "اسم المستخدم" },
  password: { en: "Password", ar: "كلمة المرور" },
  sender: { en: "Sender Name", ar: "اسم المرسل" },
  account: { en: "Account ID", ar: "معرّف الحساب" },
};

function emptyForm() {
  return { id: null, preset_id: "GENERIC_HTTP", name: "", base_url: "", http_method: "POST", content_type: "JSON", auth_type: "NONE", secret_config: {}, extra_config: {}, is_enabled: true };
}

export default function SmsProvidersSection({ language = "en", canManageProviders = false, onNotice }) {
  const ar = language === "ar";
  const t = (en, arText) => (ar ? arText : en);
  const [providers, setProviders] = React.useState([]);
  const [presets, setPresets] = React.useState([]);
  const [editing, setEditing] = React.useState(null);
  const [showSecrets, setShowSecrets] = React.useState({});
  const [testPhone, setTestPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showHelp, setShowHelp] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!canManageProviders) return;
    setError("");
    try {
      const [list, presetList] = await Promise.all([
        apiRequest("/admin/sms/providers"),
        apiRequest("/admin/sms/providers/presets"),
      ]);
      setProviders(list?.items || list?.data || []);
      setPresets(presetList?.items || presetList?.data || []);
    } catch (e) { setError(e.message); }
  }, [canManageProviders]);

  React.useEffect(() => { void load(); }, [load]);

  const applyPreset = (presetId) => {
    const preset = presets.find((p) => p.id === presetId);
    const contentType = String(preset?.content_type || "JSON").toUpperCase();
    setEditing((prev) => ({
      ...prev,
      preset_id: presetId,
      base_url: preset?.base_url || "",
      http_method: preset?.http_method || "POST",
      content_type: ["JSON", "FORM", "QUERY"].includes(contentType) ? contentType : "JSON",
      auth_type: String(preset?.auth_type || "none").toUpperCase(),
      secret_config: {},
    }));
  };

  const saveProvider = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: editing.name,
        preset_id: editing.preset_id,
        provider_type: editing.provider_type || "dynamic_http",
        base_url: editing.base_url,
        http_method: editing.http_method || "POST",
        content_type: editing.content_type || "JSON",
        auth_type: editing.auth_type || "NONE",
        secret_config: editing.secret_config || {},
        extra_config: editing.extra_config || {},
        is_active: editing.is_enabled !== false,
        is_enabled: editing.is_enabled !== false,
      };
      if (editing.id) await apiRequest(`/admin/sms/providers/${editing.id}`, { method: "PUT", body: payload });
      else await apiRequest("/admin/sms/providers", { method: "POST", body: payload });
      setEditing(null);
      onNotice?.(t("Provider saved successfully.", "تم حفظ المزود بنجاح."));
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const activateProvider = async (provider) => {
    setBusy(true);
    try {
      await apiRequest(`/admin/sms/providers/${provider.id}/activate`, { method: "PUT" });
      onNotice?.(t("Provider activated.", "تم تفعيل المزود."));
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const deleteProvider = async (provider) => {
    if (!window.confirm(t(`Delete provider "${provider.name}"?`, `حذف المزود "${provider.name}"؟`))) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/sms/providers/${provider.id}`, { method: "DELETE" });
      onNotice?.(t("Provider deleted.", "تم حذف المزود."));
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const testProvider = async (provider) => {
    if (!testPhone.trim()) {
      setError(t("Enter a test phone number first.", "أدخل رقم هاتف للاختبار أولاً."));
      return;
    }
    setBusy(true);
    try {
      const result = await apiRequest(`/admin/sms/providers/${provider.id}/test`, { method: "POST", body: { phone: testPhone.trim(), message: t("Test message from cPanel", "رسالة اختبار من لوحة التحكم") } });
      onNotice?.(result?.message || t("Test message sent.", "تم إرسال رسالة الاختبار."));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (!canManageProviders) return null;
  const credentialFields = editing ? (AUTH_TYPE_FIELDS[String(editing.auth_type || "none").toLowerCase()] || ["api_key"]) : [];
  const selectedPreset = editing ? presets.find((p) => p.id === editing.preset_id) : null;

  return (
    <section className="admin-panel-card">
      <header className="admin-section-head">
        <h2>{t("SMS Providers", "مزودات الرسائل القصيرة")}</h2>
        <div className="row-actions">
          <button className="text-action" type="button" onClick={() => setShowHelp((v) => !v)}>{t("Help", "مساعدة")}</button>
          <button className="admin-primary-button" type="button" onClick={() => setEditing(emptyForm())} disabled={busy}>+ {t("Add Provider", "إضافة مزود")}</button>
        </div>
      </header>
      <p className="template-help">{t("Configure external SMS gateways used to send order and notification messages. Secrets are encrypted at rest.", "قم بإعداد بوابات الرسائل القصيرة الخارجية المستخدمة لإرسال رسائل الطلبات والإشعارات. يتم تشفير المفاتيح السرية.")}</p>
      {showHelp && (
        <div className="admin-code-block sms-help-panel">
          <h4>{t("How does the SMS integration work?", "كيف تعمل عملية ربط مزود الرسائل؟")}</h4>
          <p>{t(
            "Your system does not send SMS by itself — it delegates to an external SMS gateway (provider). When an order event occurs, the backend makes an HTTP request to the provider's API URL with your credentials, and the provider delivers the message to the phone number.",
            "النظام لا يرسل الرسائل بنفسه، بل يفوض ذلك لبوبة خارجية (المزود). عند حدوث حدث مثل تأكيد الطلب، يقوم الباك اند بطلب HTTP إلى رابط الـ API الخاص بالمزود مع بيانات اعتمادك، ليقوم المزود بتسليم الرسالة للرقم."
          )}</p>
          <h4>{t("Where do I get the values?", "من أين أحصل على القيم؟")}</h4>
          <ol>
            <li><strong>{t("Base URL", "رابط الـ API")}:</strong> {t("the provider gives you an API endpoint in their dashboard/docs. Choosing a preset fills it automatically.", "يعطيك المزود رابط الـ API في لوحته أو توثيقه. اختيار القالب الجاهز يملؤه تلقائياً.")}</li>
            <li><strong>{t("Credentials (api_key / password)", "بيانات الاعتماد")}:</strong> {t("created in the provider's dashboard under \"API keys\" or given at registration. Stored encrypted.", "تُنشأ في لوحة تحكم المزود ضمن قسم \"مفاتيح API\" أو تُعطى عند التسجيل. تُحفظ مشفّرة في النظام.")}</li>
            <li><strong>{t("Sender name", "اسم المرسل")}:</strong> {t("the approved sender ID shown on recipients' phones (e.g. your brand name) — approved by the provider.", "الاسم المعتمد الذي يظهر على هواتف المستلمين (مثل اسم علامتك) — يعتمده المزود.")}</li>
            <li><strong>{t("Test phone", "رقم الاختبار")}:</strong> {t("your own number to verify everything works before going live.", "رقمك الشخصي للتحقق قبل الاستخدام الفعلي.")}</li>
          </ol>
          <h4>{t("Option differences", "الفرق بين الخيارات")}</h4>
          <ul>
            <li><strong>HTTP method:</strong> <code>POST</code> {t("sends data in the request body — used by most modern providers. Use", "ترسل البيانات داخل جسم الطلب — تستخدمها معظم المزودات الحديثة. استخدم")} <code>GET</code> {t("only if the provider requires parameters in the URL itself.", "فقط إذا كان المزود يتطلب تمرير البارامترات في الرابط.")}</li>
            <li><strong>Content type:</strong> <code>JSON</code> {t("(structured body, e.g. Unifonic),", "(جسم منظم، مثل Unifonic)،")} <code>FORM</code> {t("(classic web form, e.g. Mada),", "(نموذج ويب كلاسيكي، مثل مدى)،")} <code>QUERY</code> {t("(parameters appended to the URL).", "(البارامترات تُضاف إلى الرابط).")} {t("Match exactly what the provider's API documentation states.", "طابق ما ذُكر في توثيق الـ API للمزود بالضبط.")}</li>
            <li><strong>{t("Preset vs Custom HTTP", "القالب الجاهز مقابل Custom HTTP")}:</strong> {t("a preset pre-fills URL/fields for a known provider (Mada, Twilio...). Choose Custom HTTP for any other provider and fill values manually from their docs.", "القالب الجاهز يملأ الرابط والحقول مسبقاً لمزود معروف. اختر Custom HTTP لأي مزود آخر واملأ القيم يدوياً من توثيقه.")}</li>
          </ul>
          <p><strong>{t("Note:", "ملاحظة:")} </strong>{t("only one provider can be Active at a time — activating one deactivates the others. Deactivated providers are kept but not used.", "مزود واحد فقط يمكن أن يكون نشطاً في نفس الوقت — تفعيل واحد يلغي تفعيل الباقي. المزودات المعطّلة تبقى محفوظة لكنها لا تُستخدم.")}</p>
        </div>
      )}
      {editing && (
        <form onSubmit={saveProvider} className="admin-form-grid sms-provider-form">
          <h3 className="full-field">{editing.id ? t("Edit Provider", "تعديل المزود") : t("Add Provider", "إضافة مزود جديد")}</h3>
          <label>{t("Preset template", "القالب الجاهز")}
            <select value={editing.preset_id} onChange={(e) => applyPreset(e.target.value)}>
              {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name || preset.id}</option>)}
            </select>
          </label>
          <label>{t("Display name", "اسم العرض")}
            <input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required placeholder={t("e.g. Mada main account", "مثال: حساب مدى الرئيسي")} />
          </label>
          <label className="full-field">{t("API base URL", "رابط الـ API")}
            <input value={editing.base_url || ""} onChange={(e) => setEditing({ ...editing, base_url: e.target.value })} required placeholder={selectedPreset?.base_url || "https://provider.example/send"} />
          </label>
          <label>{t("HTTP method", "طريقة HTTP")}
            <select value={editing.http_method || "POST"} onChange={(e) => setEditing({ ...editing, http_method: e.target.value })}>
              {["POST", "GET"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>{t("Content type", "نوع المحتوى")}
            <select value={editing.content_type || "JSON"} onChange={(e) => setEditing({ ...editing, content_type: e.target.value })}>
              {["JSON", "FORM", "QUERY"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          {credentialFields.length > 0 && <div className="full-field sms-secrets-head">{t("Provider credentials (stored encrypted)", "بيانات اعتماد المزود (تُحفظ مشفّرة)")} <KeyRound size={14} /></div>}
                    {credentialFields.map((field) => (
            <SmsSecretField
              key={field}
              field={field}
              editing={editing}
              setEditing={setEditing}
              showSecrets={showSecrets}
              setShowSecrets={setShowSecrets}
              ar={ar}
              t={t}
            />
          ))}
          <div className="row-actions full-field sms-form-actions">
            <label className="checkbox-line sms-enabled-toggle">
              <input type="checkbox" checked={editing.is_enabled !== false} onChange={(e) => setEditing({ ...editing, is_enabled: e.target.checked })} />
              {t("Enabled", "مفعّل")}
            </label>
            <div className="row-actions sms-form-actions-buttons">
              <button className="admin-primary-button" type="submit" disabled={busy}>{busy ? t("Saving...", "جارٍ الحفظ...") : t("Save", "حفظ")}</button>
              <button className="admin-secondary-button" type="button" onClick={() => setEditing(null)}>{t("Cancel", "إلغاء")}</button>
            </div>
          </div>
        </form>
      )}
      <div className="admin-data-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>{t("Name", "الاسم")}</th>
              <th>{t("Preset", "القالب")}</th>
              <th>{t("Status", "الحالة")}</th>
              <th>{t("Actions", "إجراءات")}</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 && <tr><td colSpan="4">{t("No providers configured yet.", "لا توجد مزودات مضافة بعد.")}</td></tr>}
            {providers.map((provider) => (
              <tr key={provider.id}>
                <td>{provider.name}<div className="admin-code-block">{provider.base_url}</div></td>
                <td>{provider.preset_id}</td>
                <td>{provider.is_active ? <strong>{t("Active", "نشط")}</strong> : (provider.is_enabled ? t("Enabled", "مفعّل") : t("Disabled", "معطّل"))}</td>
                <td>
                  <div className="row-actions">
                    {!provider.is_active && <button className="text-action" type="button" disabled={busy} onClick={() => void activateProvider(provider)}>{t("Activate", "تفعيل")}</button>}
                    <button className="text-action" type="button" onClick={() => setEditing({ ...emptyForm(), ...provider, secret_config: provider.secret_config || {} })}>{t("Edit", "تعديل")}</button>
                    <button className="text-action" type="button" disabled={busy} onClick={() => void testProvider(provider)}>{t("Test", "اختبار")}</button>
                    <button className="text-action danger" type="button" disabled={busy} onClick={() => void deleteProvider(provider)}>{t("Delete", "حذف")}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="full-field sms-test-row">
        <label>{t("Test phone number", "رقم هاتف الاختبار")}
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+970599123456" inputMode="tel" />
        </label>
      </div>
    </section>
  );
}
