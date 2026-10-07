import React from "react";
import { Files, Search, X } from "lucide-react";
import { siteEditorText } from "../../utils/siteEditor.js";
import PageTree from "./PageTree.jsx";

export const siteEditorPagesPanelId = "site-editor-pages-panel";

export default function SiteEditorPagesPanel({ company, dispatch, language, onSelectPage, pages, state }) {
  const [query, setQuery] = React.useState("");
  const filtered = pages.filter((page) => (page.localizedTitle?.[language] || page.title).toLowerCase().includes(query.trim().toLowerCase()));
  return <aside className="site-editor-panel site-editor-pages-panel" aria-label={siteEditorText("pages.title", language)} id={siteEditorPagesPanelId}>
    <header><div><Files size={20} /><h2>{siteEditorText("pages.title", language)}</h2></div><button aria-label={language === "ar" ? "إغلاق اللوحة" : "Close panel"} onClick={() => dispatch({ type: "close-panel" })} type="button"><X size={18} /></button></header>
    <div className="site-editor-pages-content">
      <p className="site-editor-pages-intro">{siteEditorText("pages.description", language)}</p>
      <label className="site-editor-pages-search"><Search size={16} /><input aria-label={siteEditorText("pages.search", language)} onChange={(event) => setQuery(event.target.value)} placeholder={siteEditorText("pages.search", language)} type="search" value={query} /></label>
      {state.pagesStatus === "error" ? <div className="site-editor-pages-empty error"><Files size={26} /><p>{siteEditorText("pages.loadError", language)}</p><small>{state.pagesError}</small></div> : pages.length ? <section><h3>{siteEditorText("pages.sitePages", language)}<span>{filtered.length}</span></h3><PageTree company={company} currentPageId={state.currentPageId} language={language} onSelectPage={onSelectPage} pages={filtered} /></section> : <div className="site-editor-pages-empty"><Files size={26} /><p>{siteEditorText("pages.empty", language)}</p></div>}
    </div>
  </aside>;
}