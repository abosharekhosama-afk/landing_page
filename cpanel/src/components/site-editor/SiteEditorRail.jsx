import React from "react";
import {
  BriefcaseBusiness, FileText, Image, Layers3, LayoutGrid, Palette,
  Plus, Puzzle, Rows3, Search, Sparkles, Table2, Wrench, X,
} from "lucide-react";
import { siteEditorText, siteEditorTools } from "../../utils/siteEditor.js";
import SiteEditorPagesPanel, { siteEditorPagesPanelId } from "./SiteEditorPagesPanel.jsx";
import SiteDesignPanel from "./SiteDesignPanel.jsx";

const icons = {
  ai: Sparkles,
  apps: LayoutGrid,
  business: Puzzle,
  cms: Table2,
  design: Palette,
  layers: Layers3,
  marketing: BriefcaseBusiness,
  media: Image,
  pages: FileText,
  plus: Plus,
  sections: Rows3,
};

function placeholderCopy(tool, ar) {
  return {
    title: tool ? siteEditorText(tool.labelKey, ar ? "ar" : "en") : "",
    description: ar ? "تم تجهيز هذه اللوحة لمرحلة لاحقة من محرر الموقع." : "This panel is intentionally reserved for a later site-editor phase.",
    icon: tool ? icons[tool.icon] : Wrench,
  };
}

function utilityPlaceholder(panel, ar) {
  if (panel === "tools") return { title: ar ? "الأدوات" : "Tools", description: ar ? "ستظهر أدوات المحرر المتقدمة هنا عند توفرها." : "Advanced editor tools will appear here when they are available.", icon: Wrench };
  if (panel === "search") return { title: ar ? "البحث" : "Search", description: ar ? "سيتيح البحث العثور على الصفحات والأقسام والعناصر في مرحلة لاحقة." : "Search will find pages, sections, and elements in a later phase.", icon: Search };
  return null;
}

export default function SiteEditorRail({ company, dispatch, language, onSelectPage, pages, state }) {
  const ar = language === "ar";
  const activeTool = siteEditorTools.find((item) => item.id === state.activePanel);
  const placeholder = state.activePanel === "site-design"
    ? null
    : state.activePanel === "add-section"
      ? null
      : activeTool && activeTool.id !== "pages-menu"
        ? placeholderCopy(activeTool, ar)
        : utilityPlaceholder(state.activePanel, ar);
  const PlaceholderIcon = placeholder?.icon;
  const primaryTools = siteEditorTools.slice(0, 9);
  const footerTools = siteEditorTools.slice(9);

  const renderTool = (tool) => {
    const Icon = icons[tool.icon];
    const label = siteEditorText(tool.labelKey, language);
    const active = state.activePanel === tool.id;
    const controls = active ? (tool.id === "pages-menu" ? siteEditorPagesPanelId : `site-editor-panel-${tool.id}`) : undefined;
    return <button
      aria-controls={controls}
      aria-label={label}
      aria-pressed={active}
      className={active ? "active" : ""}
      data-accent={tool.accent}
      data-tooltip={label}
      key={tool.id}
      onClick={() => dispatch({ type: "toggle-panel", panel: tool.id })}
      type="button"
    ><span className="site-editor-tool-icon"><Icon size={21} /></span><span className="site-editor-sr-label">{label}</span></button>;
  };

  return <>
    <nav className="site-editor-rail" aria-label={ar ? "أدوات المحرر" : "Editor tools"}>
      <div className="site-editor-rail-primary">{primaryTools.map(renderTool)}</div>
      <div className="site-editor-rail-footer">{footerTools.map(renderTool)}</div>
    </nav>
    {state.activePanel === "pages-menu" && <SiteEditorPagesPanel company={company} dispatch={dispatch} language={language} onSelectPage={onSelectPage} pages={pages} state={state} />}
    {state.activePanel === "site-design" && <SiteDesignPanel dispatch={dispatch} language={language} state={state} />}
    {placeholder && <aside className="site-editor-panel" aria-label={placeholder.title} id={activeTool ? `site-editor-panel-${activeTool.id}` : undefined}>
      <header><div><PlaceholderIcon size={20} /><h2>{placeholder.title}</h2></div><button aria-label={ar ? "إغلاق اللوحة" : "Close panel"} onClick={() => dispatch({ type: "close-panel" })} type="button"><X size={18} /></button></header>
      <div className="site-editor-panel-empty"><span><PlaceholderIcon size={28} /></span><strong>{ar ? "قريباً في مرحلة لاحقة" : "Coming in a later phase"}</strong><p>{placeholder.description}</p></div>
    </aside>}
  </>;
}
