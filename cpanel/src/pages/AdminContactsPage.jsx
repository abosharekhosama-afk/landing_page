import React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Filter, MoreHorizontal, RefreshCw, Search, SlidersHorizontal, UserPlus, Users, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import ContactFormDialog from "../components/ContactFormDialog.jsx";
import { createCustomer, customerReviewCount, fetchCustomers } from "../utils/customersApi.js";
import { canUseCustomerAction } from "../utils/roles.js";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";

const PAGE_SIZE = 25;
const LABELS = {
  en: {
    active: "Active", all: "All", allContacts: "All contacts", archived: "Archived", created: "Date created", create: "Add Contact", customer: "Customer", customers: "Customers", email: "Email", emptyDescription: "Customer contacts will appear here after registration, an order, or manual creation.", emptyTitle: "No contacts yet", filteredDescription: "Try changing the search or filters.", filteredTitle: "No matching contacts", importExport: "Import / Export", labels: "Labels", lead: "Lead", loading: "Loading contacts…", manageSegments: "Manage Segments", manageView: "Manage View", name: "Name", next: "Next page", orders: "Orders", page: "Page", phone: "Phone", previous: "Previous page", refresh: "Refresh contacts", results: "results", retry: "Try again", reviews: "Reviews", searchPlaceholder: "Search contacts…", select: "Select contact", source: "Source", status: "Status", subtitle: "Manage tenant-scoped customers and leads.", title: "Contacts", type: "Type", unavailableDescription: "Contacts could not be loaded from the company API.", unavailableTitle: "Contacts unavailable", view: "View",
    createSuccess: "Contact created successfully.", createDenied: "You do not have permission to create contacts.",
  },
  ar: {
    active: "نشط", all: "الكل", allContacts: "كل جهات الاتصال", archived: "مؤرشف", created: "تاريخ الإنشاء", create: "إضافة جهة اتصال", customer: "عميل", customers: "العملاء", email: "البريد الإلكتروني", emptyDescription: "ستظهر جهات اتصال العملاء هنا بعد التسجيل أو الطلب أو الإضافة اليدوية.", emptyTitle: "لا توجد جهات اتصال بعد", filteredDescription: "جرّب تغيير البحث أو عوامل التصفية.", filteredTitle: "لا توجد نتائج مطابقة", importExport: "استيراد / تصدير", labels: "التصنيفات", lead: "عميل محتمل", loading: "جارٍ تحميل جهات الاتصال…", manageSegments: "إدارة الشرائح", manageView: "إدارة العرض", name: "الاسم", next: "الصفحة التالية", orders: "الطلبات", page: "الصفحة", phone: "الهاتف", previous: "الصفحة السابقة", refresh: "تحديث جهات الاتصال", results: "نتائج", retry: "إعادة المحاولة", reviews: "المراجعات", searchPlaceholder: "البحث في جهات الاتصال…", select: "تحديد جهة اتصال", source: "المصدر", status: "الحالة", subtitle: "إدارة العملاء والعملاء المحتملين ضمن الشركة الحالية.", title: "جهات الاتصال", type: "النوع", unavailableDescription: "تعذّر تحميل جهات الاتصال من واجهة الشركة.", unavailableTitle: "جهات الاتصال غير متاحة", view: "عرض",
    createSuccess: "تم إنشاء جهة الاتصال بنجاح.", createDenied: "ليست لديك صلاحية إنشاء جهات اتصال.",
  },
};

function validDate(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function formatDate(value, language) { const date = validDate(value); return date ? new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", { dateStyle: "medium" }).format(date) : "—"; }
function initials(contact) { return String(contact?.displayName || contact?.name || contact?.email || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function ContactsUnsupported({ onClose, t }) {
  React.useEffect(() => { const handler = (event) => event.key === "Escape" && onClose(); document.addEventListener("keydown", handler); return () => document.removeEventListener("keydown", handler); }, [onClose]);
  return <div className="customers-modal-backdrop" onMouseDown={onClose} role="presentation"><div aria-modal="true" className="customers-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label="Close" onClick={onClose} type="button"><X size={18}/></button><AdminUnderDevelopmentContent t={t}/></div></div>;
}

export default function AdminContactsPage({ language = "en", t: translate, company, currentUser, onNavigate, ...layout }) {
  const labels = LABELS[language] || LABELS.en;
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState("");
  const [archived, setArchived] = React.useState("false");
  const [page, setPage] = React.useState(1);
  const [customers, setCustomers] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showUnsupported, setShowUnsupported] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const requestSequence = React.useRef(0);
  const canCreate = canUseCustomerAction(currentUser, "customers.create");

  React.useEffect(() => { const timer = window.setTimeout(() => { setPage(1); setQuery(searchInput.trim()); }, 350); return () => window.clearTimeout(timer); }, [searchInput]);

  React.useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestSequence.current;
    setLoading(true); setError("");
    fetchCustomers({ q: query, type, archived, page, limit: PAGE_SIZE }, { signal: controller.signal }).then((data) => {
      if (requestId !== requestSequence.current) return;
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setCustomers(items);
      setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length);
      setSummary(data?.summary && typeof data.summary === "object" ? data.summary : null);
      setLoading(false);
    }).catch((requestError) => {
      if (requestError?.name === "AbortError" || requestId !== requestSequence.current) return;
      setCustomers([]); setTotal(0); setSummary(null); setError(requestError?.message || labels.unavailableDescription); setLoading(false);
    });
    return () => controller.abort();
  }, [archived, company?.id, labels.unavailableDescription, page, query, refreshKey, type]);

  const hasFilters = Boolean(query || type || archived !== "false");
  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE) || 1);
  const audiences = [
    { label: labels.allContacts, value: summary?.total ?? total },
    { label: labels.customers, value: summary?.customers ?? customers.filter((contact) => contact.type === "customer").length },
    { label: labels.active, value: summary?.active ?? customers.filter((contact) => !contact.isArchived).length },
    { label: labels.archived, value: summary?.archived ?? customers.filter((contact) => contact.isArchived).length },
  ];

  function openContact(contact) { if (typeof onNavigate === "function") onNavigate("admin-customers-detail", { path: `/admin/customers/${contact.id}` }); }
  function refresh() { setRefreshKey((value) => value + 1); }
  async function create(values) { await createCustomer(values); setShowCreate(false); setNotice(labels.createSuccess); setPage(1); refresh(); }

  return (
    <AdminLayout
      activePage="admin-customers"
      company={company}
      currentUser={currentUser}
      hideHeader
      language={language}
      onNavigate={onNavigate}
      t={translate}
      {...layout}
    >
      <div className="admin-contacts-page crm-contacts-phase-one" dir={language === "ar" ? "rtl" : "ltr"}>
        <header className="admin-contacts-header"><div><h1>{labels.title}</h1><p>{labels.subtitle}</p></div><div className="admin-contacts-header-actions"><button aria-label="More" className="customers-icon-button" onClick={() => setShowUnsupported(true)} type="button"><MoreHorizontal size={18}/></button><button className="customers-secondary-button" onClick={() => setShowUnsupported(true)} type="button">{labels.manageSegments}</button>{canCreate && <button className="customers-primary-button" onClick={() => setShowCreate(true)} type="button"><UserPlus size={16}/>{labels.create}</button>}</div></header>
        {notice && <div className="crm-contact-notice" role="status"><span>{notice}</span><button aria-label="Close" onClick={() => setNotice("")} type="button"><X size={15}/></button></div>}

        <section className="admin-contacts-summary-strip"><span><Users size={18}/><strong>{error ? "—" : total}</strong> {labels.results}</span><button aria-label={labels.refresh} disabled={loading} onClick={refresh} type="button"><RefreshCw className={loading ? "crm-spin" : ""} size={16}/>{labels.refresh}</button></section>
        <section className="admin-contacts-overview"><header><h2>{labels.allContacts}</h2></header><div className="admin-contacts-audience-grid">{audiences.map((audience, index) => <article key={audience.label}><div><span>{audience.label}</span><strong>{error ? "—" : audience.value}</strong></div><span aria-hidden="true" className={`audience-mark mark-${index + 1}`}/></article>)}</div></section>

        <section className="admin-contacts-table-card">
          <div className="admin-contacts-toolbar"><div className="crm-contact-filter"><Filter size={15}/><label><span>{labels.type}</span><select aria-label={labels.type} onChange={(event) => { setPage(1); setType(event.target.value); }} value={type}><option value="">{labels.all}</option><option value="customer">{labels.customer}</option><option value="lead">{labels.lead}</option></select></label></div><div className="crm-contact-filter"><SlidersHorizontal size={15}/><label><span>{labels.status}</span><select aria-label={labels.status} onChange={(event) => { setPage(1); setArchived(event.target.value); }} value={archived}><option value="false">{labels.active}</option><option value="true">{labels.archived}</option><option value="all">{labels.all}</option></select></label></div><div className="contacts-toolbar-spacer"/><label className="contacts-search"><Search size={16}/><input aria-label={labels.searchPlaceholder} onChange={(event) => setSearchInput(event.target.value)} placeholder={labels.searchPlaceholder} value={searchInput}/>{searchInput && <button aria-label="Clear" onClick={() => setSearchInput("")} type="button"><X size={14}/></button>}</label><button className="customers-secondary-button" onClick={() => setShowUnsupported(true)} type="button">{labels.importExport}<ChevronDown size={13}/></button></div>
          <div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th><input aria-label={labels.select} type="checkbox"/></th><th>{labels.name}</th><th>{labels.email}</th><th>{labels.phone}</th><th>{labels.type}</th><th>{labels.labels}</th><th>{labels.source}</th><th>{labels.orders}</th><th>{labels.reviews}</th><th>{labels.status}</th><th>{labels.created}</th><th className="admin-data-table-actions"/></tr></thead><tbody>
            {loading ? Array.from({ length: 5 }, (_, index) => <tr className="crm-contact-skeleton-row" key={index}><td colSpan={12}><span/></td></tr>) : error ? <tr><td colSpan={12}><div className="contacts-table-empty admin-contacts-error" role="alert"><Users size={35}/><strong>{labels.unavailableTitle}</strong><p>{labels.unavailableDescription}</p><small>{error}</small><button className="customers-secondary-button" onClick={refresh} type="button">{labels.retry}</button></div></td></tr> : customers.length ? customers.map((contact) => <tr className="admin-contacts-row" key={contact.id} onClick={() => openContact(contact)}><td onClick={(event) => event.stopPropagation()}><input aria-label={`${labels.select} ${contact.name || contact.id}`} type="checkbox"/></td><td><button className="admin-contact-name-cell" onClick={() => openContact(contact)} type="button"><span className="admin-contact-avatar-sm">{initials(contact)}</span><span className="admin-data-table-cell-clip" title={contact.displayName || contact.name}>{contact.displayName || contact.name || "—"}</span></button></td><td><span className="admin-data-table-cell-clip" title={contact.email}>{contact.email || "—"}</span></td><td>{contact.phone || "—"}</td><td>{contact.type === "lead" ? labels.lead : labels.customer}</td><td><div className="crm-contact-labels">{contact.labels?.length ? contact.labels.map((label) => <span key={label}>{label}</span>) : "—"}</div></td><td>{contact.source || "—"}</td><td>{contact.orderCount ?? 0}</td><td>{customerReviewCount(contact)}</td><td><span className={`crm-contact-status ${contact.isArchived ? "archived" : "active"}`}>{contact.isArchived ? labels.archived : labels.active}</span></td><td>{formatDate(contact.createdAt, language)}</td><td className="admin-data-table-actions"><div className="contacts-row-actions"><button aria-label={`${labels.view} ${contact.name || contact.id}`} className="contacts-view-button" onClick={(event) => { event.stopPropagation(); openContact(contact); }} type="button"><Eye size={15}/>{labels.view}</button></div></td></tr>) : <tr><td colSpan={11}><div className="contacts-table-empty"><Users size={38}/><strong>{hasFilters ? labels.filteredTitle : labels.emptyTitle}</strong><p>{hasFilters ? labels.filteredDescription : labels.emptyDescription}</p></div></td></tr>}
          </tbody></table></div>
          {!error && <footer className="crm-contacts-pagination"><span>{labels.page} {page} / {totalPages}</span><div><button aria-label={labels.previous} className="customers-icon-button" disabled={loading || page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">{language === "ar" ? <ChevronRight size={17}/> : <ChevronLeft size={17}/>}</button><button aria-label={labels.next} className="customers-icon-button" disabled={loading || page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} type="button">{language === "ar" ? <ChevronLeft size={17}/> : <ChevronRight size={17}/>}</button></div></footer>}
        </section>
      </div>
      {showCreate && <ContactFormDialog language={language} onClose={() => setShowCreate(false)} onSubmit={create}/>} {showUnsupported && <ContactsUnsupported onClose={() => setShowUnsupported(false)} t={translate}/>}
    </AdminLayout>
  );
}
