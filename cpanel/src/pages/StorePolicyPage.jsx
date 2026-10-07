import React from "react";

export default function StorePolicyPage({ policy, language = "en", onNavigate, t }) {
  if (!policy) return <section className="page-shell"><div className="empty-panel"><h1>{t?.("common.notFound") || "Policy not found"}</h1><button className="primary-action" onClick={() => onNavigate("home")}>Home</button></div></section>;
  const title = language === "ar" ? policy.title_ar || policy.title_en : policy.title_en || policy.title_ar;
  const content = language === "ar" ? policy.content_ar || policy.content_en : policy.content_en || policy.content_ar;
  return <section className="page-shell"><div className="page-heading"><p className="eyebrow">{policy.type}</p><h1>{title}</h1></div><article className="policy-content">{content}</article></section>;
}
