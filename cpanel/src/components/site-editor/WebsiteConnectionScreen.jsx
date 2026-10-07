import React from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, RefreshCw, Save, XCircle } from "lucide-react";
import {
  syncSiteEditorManifest,
  updateSiteEditorConnection,
  validateSiteEditorConnection,
} from "../../utils/siteEditorApi.js";
import { siteEditorText } from "../../utils/siteEditor.js";

function defaultManifestUrl(storefrontBaseUrl) {
  const base = String(storefrontBaseUrl || "").trim().replace(/\/+$/, "");
  return base ? `${base}/api/site-manifest` : "";
}

function statusLabel(status, language, ar) {
  if (status === "connected") return ar ? "متصل" : "Connected";
  if (status === "error") return ar ? "خطأ في الاتصال" : "Connection error";
  return ar ? "غير متصل" : "Not connected";
}

function formatSyncTime(value, ar) {
  if (!value) return ar ? "أبدًا" : "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(ar ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" });
}

export default function WebsiteConnectionScreen({ company, connection, language, canManageConnection, canSyncManifest, onBack, onConnected }) {
  const ar = language === "ar";
  const BackIcon = language === "ar" ? ArrowRight : ArrowLeft;
  const summary = connection || {};
  const initial = {
    storefrontBaseUrl: summary.storefrontBaseUrl || company?.storefrontUrl || "",
    siteManifestUrl: summary.siteManifestUrl || "",
    siteId: summary.siteId || (company?.id ? `${company.id}-storefront` : ""),
    defaultLocale: summary.defaultLocale || "en",
    supportedLocales: (Array.isArray(summary.supportedLocales) ? summary.supportedLocales : ["en", "ar"]).join(", "),
  };
  const [form, setForm] = React.useState(initial);
  const [busy, setBusy] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [noticeKind, setNoticeKind] = React.useState("");

  const resolvedManifestUrl = form.siteManifestUrl.trim() || defaultManifestUrl(form.storefrontBaseUrl);

  function patch(next) { setForm((current) => ({ ...current, ...next })); }
  function report(message, kind) { setNotice(message); setNoticeKind(kind || ""); }

  async function handleValidate() {
    const url = resolvedManifestUrl;
    if (!url) return report(ar ? "أدخل رابط المتجر أو بيان الموقع أولاً." : "Enter a storefront URL or site manifest URL first.", "error");
    setBusy("validate");
    setNotice("");
    try {
      const result = await validateSiteEditorConnection(url);
      report(ar ? `التحقق سليم — ${result.siteName || result.siteId}، ${result.pageCount} صفحة.` : `Valid connection — ${result.siteName || result.siteId}, ${result.pageCount} pages.`, "ok");
    } catch (error) {
      report(error.message || (ar ? "فشل التحقق من الاتصال." : "Connection validation failed."), "error");
    } finally {
      setBusy("");
    }
  }

  async function handleConnect() {
    const url = resolvedManifestUrl;
    if (!url) return report(ar ? "أدخل رابط المتجر أو بيان الموقع أولاً." : "Enter a storefront URL or site manifest URL first.", "error");
    if (!form.siteId.trim()) return report(ar ? "معرّف الموقع مطلوب." : "Site ID is required.", "error");
    setBusy("connect");
    setNotice("");
    try {
      await updateSiteEditorConnection({
        storefrontBaseUrl: form.storefrontBaseUrl.trim(),
        siteManifestUrl: url,
        siteId: form.siteId.trim(),
        defaultLocale: form.defaultLocale.trim() || "en",
        supportedLocales: form.supportedLocales.split(",").map((item) => item.trim()).filter(Boolean),
      });
      await syncSiteEditorManifest(url);
      report(ar ? "تم الاتصال والمزامنة بنجاح." : "Connected and synced successfully.", "ok");
      onConnected?.();
    } catch (error) {
      report(error.message || (ar ? "تعذر الاتصال بالمتحف." : "Could not connect the storefront."), "error");
    } finally {
      setBusy("");
    }
  }

  async function handleResync() {
    const url = summary.siteManifestUrl || form.siteManifestUrl.trim();
    if (!url) return report(ar ? "لا يوجد رابط بيان محفوظ لإعادة المزامنة." : "No saved manifest URL to resync.", "error");
    setBusy("resync");
    setNotice("");
    try {
      const result = await syncSiteEditorManifest(url);
      report(ar ? `تمت إعادة المزامنة — ${result.siteName || result.siteId}، ${result.pageCount} صفحة.` : `Resynced — ${result.siteName || result.siteId}, ${result.pageCount} pages.`, "ok");
      onConnected?.(result);
    } catch (error) {
      report(error.message || (ar ? "تعذرت إعادة مزامنة البيان." : "Could not resync the manifest."), "error");
    } finally {
      setBusy("");
    }
  }

  const connected = summary.connectionStatus === "connected" || summary.hasManifest === true;
  const canAct = canManageConnection && canSyncManifest;

  return <section className="site-editor-root site-editor-connection-root site-editor-enter" dir={ar ? "rtl" : "ltr"}>
    <header className="site-editor-topbar">
      <div className="site-editor-topbar-start">
        <span className="site-editor-product-mark" aria-label="iGroup">iG</span>
        <a className="site-editor-back" href="/admin/dashboard" onClick={onBack}><BackIcon size={17} />{ar ? "العودة إلى لوحة التحكم" : "Back to CPanel"}</a>
        <span className="site-editor-topbar-divider" />
        <div className="site-editor-site-identity"><strong>{company?.name || (ar ? "موقع الشركة" : "Company website")}</strong><small>{ar ? "اتصل بمتجرك لبدء التحرير" : "Connect your storefront to start editing"}</small></div>
      </div>
    </header>
    <div className="site-editor-connection">
      <div className="site-editor-connection-card">
        <header>
          <span className="site-editor-connection-mark"><CheckCircle2 size={22} /></span>
          <div>
            <h1>{siteEditorText("connection.title", language)}</h1>
            <p>{siteEditorText("connection.description", language)}</p>
          </div>
        </header>

        <div className="site-editor-connection-status">
          <span className={connected ? "ok" : summary.connectionStatus === "error" ? "bad" : ""} />
          <div>
            <strong>{statusLabel(summary.connectionStatus, language, ar)}</strong>
            <small>{siteEditorText("connection.lastSync", language)}: {formatSyncTime(summary.lastManifestSyncAt, ar)}</small>
          </div>
        </div>

        <form className="site-editor-connection-form" onSubmit={(event) => { event.preventDefault(); handleConnect(); }}>
          <label>
            <span>{siteEditorText("connection.storefrontBaseUrl", language)}</span>
            <input autoComplete="off" dir="ltr" onChange={(event) => patch({ storefrontBaseUrl: event.target.value })} placeholder="https://" type="url" value={form.storefrontBaseUrl} />
            <small>{siteEditorText("connection.storefrontBaseUrlHint", language)}</small>
          </label>

          <label>
            <span>{siteEditorText("connection.siteManifestUrl", language)}</span>
            <input autoComplete="off" dir="ltr" onChange={(event) => patch({ siteManifestUrl: event.target.value })} placeholder={defaultManifestUrl(form.storefrontBaseUrl)} type="url" value={form.siteManifestUrl} />
            <small>{siteEditorText("connection.siteManifestUrlHint", language).replace("{url}", defaultManifestUrl(form.storefrontBaseUrl))}</small>
          </label>

          <div className="site-editor-connection-grid">
            <label>
              <span>{siteEditorText("connection.siteId", language)}</span>
              <input autoComplete="off" dir="ltr" onChange={(event) => patch({ siteId: event.target.value })} value={form.siteId} />
            </label>
            <label>
              <span>{siteEditorText("connection.defaultLocale", language)}</span>
              <input autoComplete="off" dir="ltr" onChange={(event) => patch({ defaultLocale: event.target.value })} value={form.defaultLocale} />
            </label>
          </div>

          <label>
            <span>{siteEditorText("connection.supportedLocales", language)}</span>
            <input autoComplete="off" dir="ltr" onChange={(event) => patch({ supportedLocales: event.target.value })} value={form.supportedLocales} />
          </label>

          {summary.connectionError ? <div className="site-editor-connection-alert error"><XCircle size={15} /><span>{summary.connectionError}</span></div> : null}

          <footer className="site-editor-connection-actions">
            <button disabled={!canManageConnection || busy} onClick={handleValidate} type="button"><RefreshCw size={15} />{busy === "validate" ? siteEditorText("connection.pending", language) : siteEditorText("connection.validate", language)}</button>
            {connected ? (
              <button className="primary" disabled={!canAct || busy} onClick={handleResync} type="button"><RefreshCw size={15} />{busy === "resync" ? siteEditorText("connection.pending", language) : siteEditorText("connection.resync", language)}</button>
            ) : (
              <button className="primary" disabled={!canAct || busy} type="submit"><Save size={15} />{busy === "connect" ? siteEditorText("connection.pending", language) : siteEditorText("connection.connectSync", language)}</button>
            )}
          </footer>

          {notice ? <div className={`site-editor-connection-notice ${noticeKind}`} role="status">{noticeKind === "ok" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}<span>{notice}</span></div> : null}
        </form>
      </div>
    </div>
  </section>;
}
