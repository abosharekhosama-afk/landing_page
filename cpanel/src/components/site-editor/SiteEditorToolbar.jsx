import React from "react";
import { ChevronDown, Laptop, Redo2, Search, Smartphone, Undo2, Wrench } from "lucide-react";

const localeNames = { ar: "العربية", en: "English" };

export default function SiteEditorToolbar({ connection, currentPage, dispatch, language, onLocaleChange, previewLabel, state }) {
  const ar = language === "ar";
  const later = ar ? "غير متاح في هذا المسار الوظيفي" : "Unavailable in this workflow";
  const currentTitle = currentPage?.localizedTitle?.[language] || currentPage?.title;
  return <div className="site-editor-toolbar" aria-label={ar ? "أدوات عرض المحرر" : "Editor view controls"}>
    <label className="site-editor-select-field"><span>{ar ? "اللغة" : "Locale"}</span><select aria-label={ar ? "لغة المحرر" : "Editor locale"} onChange={(event) => onLocaleChange(event.target.value)} value={state.activeLocale}>{(connection?.supportedLocales || [state.activeLocale]).map((locale) => <option key={locale} value={locale}>{localeNames[locale] || locale.toUpperCase()}</option>)}</select><ChevronDown size={14} /></label>
    <button aria-controls={state.activePanel === "pages-menu" ? "site-editor-pages-panel" : undefined} aria-expanded={state.activePanel === "pages-menu"} className="site-editor-page-shell" onClick={() => dispatch({ type: "toggle-panel", panel: "pages-menu" })} type="button"><span>{ar ? "الصفحة" : "Page"}</span><strong>{currentTitle || (ar ? "لا توجد صفحة" : "No page")}</strong><ChevronDown size={14} /></button>
    <div className="site-editor-device-toggle" role="group" aria-label={ar ? "حجم المعاينة" : "Preview device"}><button aria-pressed={state.viewportMode === "desktop"} className={state.viewportMode === "desktop" ? "active" : ""} onClick={() => dispatch({ type: "set-viewport", viewport: "desktop" })} type="button"><Laptop size={16} /><span>{ar ? "سطح المكتب" : "Desktop"}</span></button><button aria-pressed={state.viewportMode === "mobile"} className={state.viewportMode === "mobile" ? "active" : ""} onClick={() => dispatch({ type: "set-viewport", viewport: "mobile" })} type="button"><Smartphone size={16} /><span>{ar ? "الجوال" : "Mobile"}</span></button></div>
    <div className="site-editor-trusted-path" title={previewLabel || ""}><span>{ar ? "المسار الموثوق" : "Trusted path"}</span><strong>{currentPage?.previewPath || previewLabel || (ar ? "غير معين" : "Not assigned")}</strong></div>
    <div className="site-editor-toolbar-spacer" />
    <button aria-label={ar ? "تراجع" : "Undo"} className="site-editor-icon-control" disabled={!state.history.past.length} onClick={() => dispatch({ type: "undo" })} type="button"><Undo2 size={17} /></button>
    <button aria-label={ar ? "إعادة" : "Redo"} className="site-editor-icon-control" disabled={!state.history.future.length} onClick={() => dispatch({ type: "redo" })} type="button"><Redo2 size={17} /></button>
    <label className="site-editor-zoom"><span>{ar ? "التكبير" : "Zoom"}</span><select aria-label={ar ? "تكبير اللوحة" : "Canvas zoom"} onChange={(event) => dispatch({ type: "set-zoom", zoom: event.target.value })} value={state.zoom}><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option><option value="fit">{ar ? "ملاءمة" : "Fit"}</option></select></label>
    <button className="site-editor-toolbar-action" disabled title={later} type="button"><Wrench size={16} />{ar ? "الأدوات" : "Tools"}</button><button className="site-editor-toolbar-action" disabled title={later} type="button"><Search size={16} />{ar ? "بحث" : "Search"}</button>
  </div>;
}
