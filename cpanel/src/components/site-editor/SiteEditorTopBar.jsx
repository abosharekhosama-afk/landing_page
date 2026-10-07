import React from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Eye, Save, UploadCloud } from "lucide-react";
import { siteEditorText } from "../../utils/siteEditor.js";

export default function SiteEditorTopBar({ canSave, company, direction, language, onBack, onSave, previewUrl, state }) {
  const ar = language === "ar";
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;
  const unavailable = ar ? "النشر غير متاح في هذه المرحلة" : "Publishing is not available in this phase";
  const statusKey = state.saveStatus === "saving" ? "editor.saving"
    : state.saveStatus === "saved" ? "editor.saved"
      : state.saveStatus === "error" ? "editor.saveFailed"
        : state.saveStatus === "conflict" ? "editor.conflict"
          : state.isDirty ? "editor.unsaved" : "editor.loaded";
  const saveEnabled = canSave && state.isDirty && state.saveStatus !== "saving";

  return <header className="site-editor-topbar">
    <div className="site-editor-topbar-start">
      <span className="site-editor-product-mark" aria-label="iGroup">iG</span>
      <a className="site-editor-back" href="/admin/dashboard" onClick={onBack}><BackIcon size={17} />{ar ? "العودة إلى لوحة التحكم" : "Back to CPanel"}</a>
      <span className="site-editor-topbar-divider" />
      <div className="site-editor-site-identity"><strong>{company?.name || (ar ? "موقع الشركة" : "Company website")}</strong><small>{ar ? "مسودة منفصلة عن الموقع المنشور" : "Draft, separate from the published site"}</small></div>
    </div>
    <div className="site-editor-save-state" aria-live="polite"><span className={state.isDirty ? "dirty" : ""} />{siteEditorText(statusKey, language)}</div>
    <div className="site-editor-topbar-actions">
      <button disabled={!saveEnabled} onClick={onSave} type="button"><Save size={15} />{ar ? "حفظ" : "Save"}</button>
      {previewUrl ? <a href={previewUrl} rel="noopener noreferrer" target="_blank"><Eye size={16} />{ar ? "معاينة" : "Preview"}<ExternalLink size={13} /></a> : <button disabled type="button"><Eye size={16} />{ar ? "معاينة" : "Preview"}</button>}
      <button className="site-editor-publish" disabled title={unavailable} type="button"><UploadCloud size={16} />{ar ? "نشر" : "Publish"}</button>
    </div>
  </header>;
}
