import React from "react";
import PageTreeItem from "./PageTreeItem.jsx";

export default function PageTree({ company, currentPageId, language, onSelectPage, pages }) {
  return <ul className="site-editor-page-tree">{pages.map((page) => <PageTreeItem company={company} current={page.id === currentPageId} key={page.id} language={language} onSelectPage={onSelectPage} page={page} />)}</ul>;
}