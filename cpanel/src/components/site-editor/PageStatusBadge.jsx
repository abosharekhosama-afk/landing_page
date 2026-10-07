import React from "react";
import { siteEditorText } from "../../utils/siteEditor.js";

export default function PageStatusBadge({ language, page }) {
  const key = page.draftStatus === "draft" ? "pages.draft" : "pages.publishedSource";
  return <span className={`site-editor-page-badge ${page.draftStatus === "draft" ? "draft" : "available"}`}>{siteEditorText(key, language)}</span>;
}