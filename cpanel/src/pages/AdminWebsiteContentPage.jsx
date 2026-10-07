import React from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Database,
  Ellipsis,
  Languages,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  EmptyManagementState,
  ManagementShell,
  UnsupportedDialog,
  ml,
} from "./AdminManagementShared.jsx";
import {
  additionalLanguagesFromCompany,
  companyPlanLabel,
  originalLanguageFromCompany,
} from "../utils/websiteContent.js";

function PageHeader({ actions, description, title }) {
  return <header className="website-content-header"><div><h1>{title}</h1><p>{description}</p></div><div className="website-content-header-actions">{actions}</div></header>;
}

function UnsupportedButton({ children, className = "website-content-secondary", disabled = false, onClick }) {
  return <button className={className} disabled={disabled} onClick={onClick} type="button">{children}</button>;
}

function SectionHeading({ children, count, expanded = true, language, onToggle }) {
  return <div className="website-content-section-heading"><div><h2>{children}</h2>{Number.isInteger(count) && <span>{count}</span>}</div>{onToggle && <button aria-expanded={expanded} aria-label={ml(language, "Toggle section", "تبديل القسم")} onClick={onToggle} type="button"><ChevronDown className={expanded ? "expanded" : ""} size={20} /></button>}</div>;
}

function CMSPage({ collections = [], formCollections = [], company, language, onUnsupported }) {
  const [query, setQuery] = React.useState("");
  const [collectionsOpen, setCollectionsOpen] = React.useState(true);
  const plan = companyPlanLabel(company);
  const filterRows = (rows) => rows.filter((row) => String(row?.name || row?.title || "").toLowerCase().includes(query.trim().toLowerCase()));
  const visibleCollections = filterRows(Array.isArray(collections) ? collections : []);
  const visibleForms = filterRows(Array.isArray(formCollections) ? formCollections : []);
  const createLabel = ml(language, "Create Collection", "إنشاء مجموعة");
  return <>
    <PageHeader actions={<><UnsupportedButton disabled>{plan || ml(language, "Plan unavailable", "الخطة غير متاحة")}</UnsupportedButton><UnsupportedButton onClick={onUnsupported}><Ellipsis size={18} />{ml(language, "More Actions", "إجراءات أخرى")}</UnsupportedButton><UnsupportedButton className="website-content-primary" onClick={onUnsupported}><Plus size={18} />{createLabel}</UnsupportedButton></>} description={ml(language, "Store and manage content to display anywhere on your site.", "خزّن المحتوى وأدِره لعرضه في أي مكان على موقعك.")} title="CMS" />
    <label className="website-content-search"><Search size={18} /><input aria-label={ml(language, "Search collections", "البحث في المجموعات")} onChange={(event) => setQuery(event.target.value)} placeholder={ml(language, "Search", "بحث")} value={query} /></label>
    <section className="website-content-panel cms-collections-panel">
      <SectionHeading count={collections.length} expanded={collectionsOpen} language={language} onToggle={() => setCollectionsOpen((value) => !value)}>{ml(language, "Your Collections", "مجموعاتك")}</SectionHeading>
      {collectionsOpen && <div className="website-content-section-body">{visibleCollections.length ? <div className="cms-card-list">{visibleCollections.map((collection) => <article key={collection.id || collection.name}><Database size={22} /><div><strong>{collection.name || collection.title}</strong>{collection.itemCount !== null && collection.itemCount !== undefined && Number.isFinite(Number(collection.itemCount)) && <span>{ml(language, `${Number(collection.itemCount)} items`, `${Number(collection.itemCount)} عناصر`)}</span>}</div><button aria-label={ml(language, "Collection actions", "إجراءات المجموعة")} onClick={onUnsupported} type="button"><Ellipsis size={18} /></button></article>)}</div> : <EmptyManagementState action={<button className="website-content-primary" onClick={onUnsupported} type="button"><Plus size={18} />{createLabel}</button>} description={query ? ml(language, "No real collections match this search.", "لا توجد مجموعات فعلية تطابق هذا البحث.") : ml(language, "Collections store reusable content that can be displayed throughout your site.", "تخزّن المجموعات محتوى قابلاً لإعادة الاستخدام وعرضه في أنحاء موقعك.")} icon={Database} title={query ? ml(language, "No collections found", "لم يتم العثور على مجموعات") : ml(language, "Create a collection", "إنشاء مجموعة")} />}</div>}
    </section>
    <section className="website-content-panel cms-form-panel">
      <SectionHeading count={formCollections.length}>{ml(language, "Form Collections", "مجموعات النماذج")}</SectionHeading>
      <p className="website-content-section-copy">{ml(language, "Form collections appear when connected forms provide real tenant submission data.", "تظهر مجموعات النماذج عندما توفر النماذج المتصلة بيانات إرسال فعلية خاصة بالشركة.")}</p>
      {visibleForms.length ? <div className="cms-card-list">{visibleForms.map((collection) => <article key={collection.id || collection.name}><Database size={22} /><div><strong>{collection.name || collection.title}</strong>{collection.itemCount !== null && collection.itemCount !== undefined && Number.isFinite(Number(collection.itemCount)) && <span>{ml(language, `${Number(collection.itemCount)} items`, `${Number(collection.itemCount)} عناصر`)}</span>}</div><button aria-label={ml(language, "Collection actions", "إجراءات المجموعة")} onClick={onUnsupported} type="button"><Ellipsis size={18} /></button></article>)}</div> : <div className="website-content-compact-empty"><CircleHelp size={32} /><div><strong>{ml(language, "No form collections yet", "لا توجد مجموعات نماذج بعد")}</strong><span>{ml(language, "No tenant-scoped form collection records are available.", "لا تتوفر سجلات فعلية لمجموعات النماذج ضمن نطاق الشركة.")}</span></div></div>}
    </section>
  </>;
}

function LanguageIdentity({ language, original }) {
  return <div className="multilingual-original-row"><span className="multilingual-language-mark"><Languages size={24} /></span><div><strong>{original.name || ml(language, "Not configured", "غير مهيأة")}</strong><span>{original.code || ml(language, "No language code", "لا يوجد رمز لغة")}</span></div>{original.code && <span className="website-content-status">{ml(language, "Default", "افتراضية")}</span>}{original.locale && <div className="multilingual-meta"><small>{ml(language, "Locale", "الإعداد المحلي")}</small><strong>{original.locale}</strong></div>}{original.direction && <div className="multilingual-meta"><small>{ml(language, "Text direction", "اتجاه النص")}</small><strong>{original.direction.toUpperCase()}</strong></div>}</div>;
}

function MultilingualPage({ company, language, onUnsupported }) {
  const original = originalLanguageFromCompany(company, language);
  const additional = additionalLanguagesFromCompany(company, language);
  return <>
    <PageHeader actions={<><UnsupportedButton onClick={onUnsupported}><Settings size={18} />{ml(language, "Settings", "الإعدادات")}</UnsupportedButton><UnsupportedButton className="website-content-primary" onClick={onUnsupported}><Plus size={18} />{ml(language, "Add Language", "إضافة لغة")}</UnsupportedButton></>} description={ml(language, "Add languages and translate your site to reach visitors in new markets.", "أضف لغات وترجم موقعك للوصول إلى زوار في أسواق جديدة.")} title={ml(language, "Multilingual", "متعدد اللغات")} />
    <section className="website-content-panel multilingual-original-panel"><div className="website-content-section-heading"><div><h2>{ml(language, "Original language", "اللغة الأصلية")}</h2></div></div><p className="website-content-section-copy">{ml(language, "This language comes from the current company settings and is used as the source language.", "تأتي هذه اللغة من إعدادات الشركة الحالية وتُستخدم كلغة مصدر.")}</p><LanguageIdentity language={language} original={original} /></section>
    <section className="website-content-panel multilingual-additional-panel"><SectionHeading count={additional.length}>{ml(language, "Additional languages", "اللغات الإضافية")}</SectionHeading>{additional.length ? <div className="multilingual-table-wrap"><table><thead><tr><th>{ml(language, "Language", "اللغة")}</th><th>{ml(language, "Language code", "رمز اللغة")}</th><th>{ml(language, "Translation progress", "تقدم الترجمة")}</th><th>{ml(language, "Status", "الحالة")}</th><th><span className="sr-only">{ml(language, "Actions", "الإجراءات")}</span></th></tr></thead><tbody>{additional.map((item) => <tr key={item.code}><td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.progress === null ? ml(language, "Unavailable", "غير متاح") : `${item.progress}%`}</td><td>{item.status || ml(language, "Not confirmed", "غير مؤكدة")}</td><td><button aria-label={ml(language, "Language actions", "إجراءات اللغة")} onClick={onUnsupported} type="button"><Ellipsis size={18} /></button></td></tr>)}</tbody></table></div> : <EmptyManagementState action={<button className="website-content-primary" onClick={onUnsupported} type="button"><Plus size={18} />{ml(language, "Add Language", "إضافة لغة")}</button>} description={ml(language, "Additional language management is not configured for this company yet.", "إدارة اللغات الإضافية غير مهيأة لهذه الشركة بعد.")} icon={Languages} title={ml(language, "No additional languages", "لا توجد لغات إضافية")} />}</section>
    <section className="multilingual-learning"><div className="website-content-section-heading"><div><h2>{ml(language, "Learn about multilingual sites", "تعرّف على المواقع متعددة اللغات")}</h2></div></div><div className="multilingual-learning-grid"><article><span><BookOpen size={22} /></span><div><strong>{ml(language, "Plan your site languages", "خطط للغات موقعك")}</strong><p>{ml(language, "Review generic guidance before adding another language.", "راجع الإرشادات العامة قبل إضافة لغة أخرى.")}</p></div><ChevronRight size={18} /></article><article><span><Sparkles size={22} /></span><div><strong>{ml(language, "Prepare content for translation", "جهّز المحتوى للترجمة")}</strong><p>{ml(language, "Keep source content consistent across pages and collections.", "حافظ على اتساق المحتوى المصدر عبر الصفحات والمجموعات.")}</p></div><ChevronRight size={18} /></article></div></section>
  </>;
}

export default function AdminWebsiteContentPage({ activePage, company, currentUser, language = "en", onNavigate, t, ...layout }) {
  const [unsupported, setUnsupported] = React.useState(false);
  const onUnsupported = () => setUnsupported(true);
  return <ManagementShell activePage={activePage} className="website-content-page" company={company} currentUser={currentUser} language={language} onNavigate={onNavigate} {...layout}>{activePage === "admin-website-content-multilingual" ? <MultilingualPage company={company} language={language} onUnsupported={onUnsupported} /> : <CMSPage company={company} language={language} onUnsupported={onUnsupported} />}{unsupported && <UnsupportedDialog language={language} onClose={() => setUnsupported(false)} t={t} />}</ManagementShell>;
}
