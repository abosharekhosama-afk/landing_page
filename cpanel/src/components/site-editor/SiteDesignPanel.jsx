import React from "react";
import { ChevronRight, Palette, Paintbrush, RotateCcw, Type, Undo2, Image as ImageIcon, MoveRight, Redo2, X } from "lucide-react";
import { siteEditorText } from "../../utils/siteEditor.js";
import { colorThemeIsCustomized, textThemePresetsAvailable } from "../../utils/siteEditorDesign.js";
import ThemeLibraryView from "./ThemeLibraryView.jsx";
import ColorThemeView from "./ColorThemeView.jsx";
import TextThemeLibraryView from "./TextThemeLibraryView.jsx";

export default function SiteDesignPanel({ dispatch, language, state }) {
  const ar = language === "ar";
  const design = state.design;
  const canUndo = design.history.past.length > 0;
  const canRedo = design.history.future.length > 0;
  const colorsEnabled = design.available && design.definition?.capabilities?.colors === true;
  const customized = design.available && colorThemeIsCustomized(design.definition, design.currentThemeId, design.colorTheme);
  const textThemesEnabled = design.available && textThemePresetsAvailable(design.definition);

  if (!design.available) {
    return <aside className="site-editor-panel site-editor-design-panel" id="site-editor-panel-site-design" aria-label={siteEditorText("tool.site-design", language)}>
      <header>
        <div><Palette size={20} /><h2>{siteEditorText("tool.site-design", language)}</h2></div>
        <button aria-label={ar ? "إغلاق اللوحة" : "Close panel"} onClick={() => dispatch({ type: "close-site-design" })} type="button"><X size={18} /></button>
      </header>
      <div className="site-editor-panel-empty"><span><Palette size={28} /></span><strong>{ar ? "هذا الموقع لا يدعم تصميم الموقع حتى الآن." : "This website does not support Site Design yet."}</strong></div>
    </aside>;
  }

  if (design.activeView === "themes") {
    return <ThemeLibraryView dispatch={dispatch} language={language} state={state} />;
  }

  if (design.activeView === "colors") {
    return <ColorThemeView dispatch={dispatch} language={language} state={state} />;
  }

  if (design.activeView === "text-themes") {
    return <TextThemeLibraryView dispatch={dispatch} language={language} state={state} />;
  }

  return <aside className="site-editor-panel site-editor-design-panel" id="site-editor-panel-site-design" aria-label={siteEditorText("tool.site-design", language)}>
    <header>
      <div><Palette size={20} /><h2>{siteEditorText("tool.site-design", language)}</h2></div>
      <button aria-label={ar ? "إغلاق اللوحة" : "Close panel"} onClick={() => dispatch({ type: "close-site-design" })} type="button"><X size={18} /></button>
    </header>
    <div className="site-editor-design-body">
      <p className="site-editor-design-notice">{ar ? "معاينة فقط. ستتم إضافة حفظ تصميم الموقع في المرحلة القادمة." : "Preview only. Saving Site Design will be added in the next phase."}</p>
      <div className="site-editor-design-rows">
        <button className="site-editor-design-row enabled" onClick={() => dispatch({ type: "design-open-view", view: "themes" })} type="button">
          <span className="site-editor-design-row-icon"><Palette size={16} /></span>
          <span className="site-editor-design-row-copy"><strong>{ar ? "سمة الموقع" : "Site Theme"}</strong><small>{ar ? "اختر سمة جاهزة للموقع" : "Choose a site theme"}</small></span>
          {customized ? <span className="site-editor-design-customized">{ar ? "مخصص" : "Customized"}</span> : <ChevronRight size={16} />}
        </button>
        <button className={`site-editor-design-row ${colorsEnabled ? "enabled" : "disabled"}`} disabled={!colorsEnabled} onClick={() => dispatch({ type: "design-open-color-theme" })} type="button">
          <span className="site-editor-design-row-icon"><Paintbrush size={16} /></span>
          <span className="site-editor-design-row-copy"><strong>{ar ? "سمة الألوان" : "Color Theme"}</strong><small>{ar ? (colorsEnabled ? "خصص ألوان الموقع" : "غير مدعومة لهذا الموقع") : (colorsEnabled ? "Customize the site colors" : "Unsupported for this website")}</small></span>
          {colorsEnabled ? (customized ? <span className="site-editor-design-customized">{ar ? "مخصص" : "Customized"}</span> : <ChevronRight size={16} />) : null}
        </button>
        <button className={`site-editor-design-row ${textThemesEnabled ? "enabled" : "disabled"}`} disabled={!textThemesEnabled} onClick={() => dispatch({ type: "design-open-text-theme" })} type="button">
          <span className="site-editor-design-row-icon"><Type size={16} /></span>
          <span className="site-editor-design-row-copy"><strong>{ar ? "سمة الخطوط" : "Text Theme"}</strong><small>{ar ? (textThemesEnabled ? "اختر خطوط الموقع" : "غير مدعومة لهذا الموقع") : (textThemesEnabled ? "Choose the site typography" : "Unsupported for this website")}</small></span>
          {textThemesEnabled ? <ChevronRight size={16} /> : null}
        </button>
        <button className="site-editor-design-row disabled" disabled type="button">
          <span className="site-editor-design-row-icon"><ImageIcon size={16} /></span>
          <span className="site-editor-design-row-copy"><strong>{ar ? "خلفية الصفحة" : "Page Background"}</strong><small>{ar ? "ستتوفر في مرحلة لاحقة" : "Coming in a later phase"}</small></span>
        </button>
        <button className="site-editor-design-row disabled" disabled type="button">
          <span className="site-editor-design-row-icon"><MoveRight size={16} /></span>
          <span className="site-editor-design-row-copy"><strong>{ar ? "انتقالات الصفحة" : "Page Transitions"}</strong><small>{ar ? "ستتوفر في مرحلة لاحقة" : "Coming in a later phase"}</small></span>
        </button>
      </div>
      <div className="site-editor-design-actions">
        <button disabled={!canUndo} onClick={() => dispatch({ type: "design-undo" })} type="button"><Undo2 size={15} />{ar ? "التراجع عن تغيير السمة" : "Undo Theme Change"}</button>
        <button disabled={!canRedo} onClick={() => dispatch({ type: "design-redo" })} type="button"><Redo2 size={15} />{ar ? "إعادة تغيير السمة" : "Redo Theme Change"}</button>
        <button className="site-editor-design-reset" onClick={() => dispatch({ type: "design-reset-default" })} type="button"><RotateCcw size={15} />{ar ? "استعادة الافتراضي" : "Reset to Default"}</button>
      </div>
    </div>
  </aside>;
}