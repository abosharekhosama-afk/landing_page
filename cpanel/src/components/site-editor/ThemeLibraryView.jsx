import React from "react";
import { ArrowLeft, Check, Palette, RotateCcw, X } from "lucide-react";
import { siteEditorText } from "../../utils/siteEditor.js";
import { colorThemeIsCustomized } from "../../utils/siteEditorDesign.js";

export default function ThemeLibraryView({ dispatch, language, state }) {
  const ar = language === "ar";
  const design = state.design;
  const presets = Array.isArray(design.definition?.themePresets) ? design.definition.themePresets : [];
  const currentThemeId = design.currentThemeId;
  const customized = design.available && colorThemeIsCustomized(design.definition, design.currentThemeId, design.colorTheme);

  return <aside className="site-editor-panel site-editor-theme-library" id="site-editor-panel-site-design" aria-label={ar ? "تغيير السمة" : "Change Theme"}>
    <header>
      <div>
        <button aria-label={ar ? "العودة إلى تصميم الموقع" : "Back to Site Design"} className="site-editor-design-back" onClick={() => dispatch({ type: "design-back" })} type="button"><ArrowLeft size={18} /></button>
        <h2>{ar ? "تغيير السمة" : "Change Theme"}</h2>
      </div>
      <button aria-label={ar ? "إغلاق اللوحة" : "Close panel"} onClick={() => dispatch({ type: "close-site-design" })} type="button"><X size={18} /></button>
    </header>
    <div className="site-editor-design-body">
      {customized ? <p className="site-editor-design-customized-banner">{ar ? "مخصص: تم تعديل ألوان هذه السمة يدويًا." : "Customized: this theme's colors were edited manually."}</p> : null}
      {presets.length === 0 ? <div className="site-editor-panel-empty"><span><Palette size={28} /></span><strong>{ar ? "لا تتوفر تصاميم جاهزة لهذا الموقع." : "No theme presets are available for this website."}</strong></div>
        : <ul className="site-editor-theme-list">
          {presets.map((preset) => {
            const active = preset.themeId === currentThemeId;
            const name = preset.name?.[language] || preset.name?.en || preset.themeId;
            const description = preset.description?.[language] || preset.description?.en || "";
            return <li key={preset.themeId}>
              <button aria-pressed={active} aria-current={active ? "true" : undefined} className={`site-editor-theme-card ${active ? "active" : ""}`} onClick={() => dispatch({ type: "design-apply-theme", themeId: preset.themeId })} type="button">
                <span className="site-editor-theme-swatches">{(preset.previewSwatches || []).map((swatch) => <i key={swatch} style={{ backgroundColor: swatch }} />)}</span>
                <span className="site-editor-theme-copy">
                  <strong>{name}</strong>
                  {description ? <small>{description}</small> : null}
                </span>
                <span className="site-editor-theme-state">{active ? <span className="site-editor-theme-current"><Check size={14} />{ar ? "الحالية" : "Current"}</span> : <span className="site-editor-theme-apply">{ar ? "تطبيق" : "Apply"}</span>}</span>              </button>
            </li>;
          })}
        </ul>}
      <div className="site-editor-design-actions">
        <button className="site-editor-design-reset" onClick={() => dispatch({ type: "design-reset-default" })} type="button"><RotateCcw size={15} />{ar ? "استعادة الافتراضي" : "Reset to Default"}</button>
      </div>
    </div>
  </aside>;
}