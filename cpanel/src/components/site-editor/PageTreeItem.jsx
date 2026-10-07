import React from "react";
import { FileText } from "lucide-react";
import { siteEditorText, trustedPagePreview } from "../../utils/siteEditor.js";
import PageActionsMenu from "./PageActionsMenu.jsx";
import PageStatusBadge from "./PageStatusBadge.jsx";

export default function PageTreeItem({ company, current, language, onSelectPage, page }) {
  const title = page.localizedTitle?.[language] || page.title;
  const previewUrl = trustedPagePreview(company, page);
  return <li><div className={`site-editor-page-row ${current ? "current" : ""}`}><button aria-current={current ? "page" : undefined} className="site-editor-page-select" onClick={() => onSelectPage(page.id)} type="button"><span className="site-editor-page-icon"><FileText size={16} /></span><span className="site-editor-page-copy"><strong>{title}</strong><small>{page.previewPath}</small></span>{current && <span className="site-editor-current-dot" title={siteEditorText("pages.current", language)} />}</button><PageActionsMenu language={language} page={page} previewUrl={previewUrl} /></div><div className="site-editor-page-meta"><PageStatusBadge language={language} page={page} /><span>{page.pageType}</span></div></li>;
}