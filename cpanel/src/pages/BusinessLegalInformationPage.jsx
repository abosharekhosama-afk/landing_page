import React from "react";
export default function BusinessLegalInformationPage({ information, language = "en", onNavigate }) {
  if (!information) return <section className="page-shell"><div className="empty-panel"><h1>{language === "ar" ? "معلومات النشاط غير متاحة" : "Business information unavailable"}</h1><button className="primary-action" onClick={() => onNavigate("home")} type="button">{language === "ar" ? "الرئيسية" : "Home"}</button></div></section>;
  const info = information.business_information || {};
  const body = typeof info === "string" ? info : info[language] || info.en || info.ar || "";
  return <section className="page-shell"><div className="page-heading"><p className="eyebrow">{language === "ar" ? "المعلومات القانونية" : "Legal information"}</p><h1>{information.authority_name || (language === "ar" ? "معلومات النشاط" : "Business information")}</h1></div><article className="policy-content">{information.registration_number && <p><strong>{language === "ar" ? "رقم التسجيل:" : "Registration number:"}</strong> {information.registration_number}</p>}{body && <p>{body}</p>}{information.authority_logo_url && <div className="admin-media-preview"><img alt={information.authority_name || "Authority logo"} src={information.authority_logo_url} /></div>}</article></section>;
}
