import React from "react";
import { Archive, ArrowLeft, BellRing, CalendarDays, ChevronDown, ClipboardList, Edit3, FileText, Inbox, LoaderCircle, Mail, MessageSquare, Paperclip, ReceiptText, RotateCcw, Send, ShoppingBag, ShoppingCart, Tags, User, Users, Workflow, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import ContactFormDialog from "../components/ContactFormDialog.jsx";
import { archiveCustomer, customerReviewCount, fetchCustomer, restoreCustomer, updateCustomer } from "../utils/customersApi.js";
import { createInboxConversation, fetchInboxConversation, fetchInboxConversations, markInboxConversationRead, replyToInboxConversation } from "../utils/inboxApi.js";
import { formatInboxWhen, inboxReplyBlocked } from "../utils/inboxUi.js";
import { invoicesForContact, ordersForContact } from "../utils/contacts.js";
import { apiRequest } from "../utils/api.js";
import { canonicalOrderStatus, formatCompanyCurrency } from "../utils/sales.js";
import { canUseCustomerAction, canUseInboxAction } from "../utils/roles.js";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";

const TAB_KEYS = ["overview", "inbox", "pipelines", "notes", "subscriptions", "bookings", "invoices", "orders"];

const COPY = {
  en: {
    accountType: "Account type", accountTypeAdd: "Add account type", accountTypeEmpty: "No account type set", accountTypeRetail: "Retail", accountTypeSaved: "Account type updated.", accountTypeTrader: "Trader", accountTypeWholesale: "Wholesale", activity: "Timeline", allActivity: "All activities", archived: "Archived", attachments: "Attachments", back: "Contacts", bookings: "Bookings", contactCreated: "Contact created", contactUnavailable: "Contact details unavailable", contactUnavailableDescription: "Contact details could not be loaded from the company API.", edit: "Edit", email: "Primary email", filter: "Filter", goBooking: "Go to Booking Calendar", goPipelines: "Go to Pipelines", inbox: "Inbox", invoiceEmpty: "No invoices yet", invoiceEmptyDescription: "Real invoices for this contact will appear here.", invoices: "Invoices", labels: "Labels", editLabels: "Edit Labels", noLabelsAssigned: "No labels assigned", language: "Language", memberInfo: "Member information", more: "More Actions", newAppointment: "Create New Appointment", newNote: "New Note", noBookings: "No bookings yet", noBookingsDescription: "Bookings will appear here when a supported booking source is available.", noContact: "Contact not found", noContactDescription: "The requested contact could not be found.", noConversation: "No conversation available", noConversationDescription: "Start an internal conversation with this contact from the Inbox.", noConversationsYet: "No conversations yet for this contact.", noPipelines: "No pipeline boards yet", noPipelinesDescription: "Create a pipeline to organize and track real contact progress.", notes: "Notes", notesEmpty: "No notes yet", notesEmptyDescription: "Add private notes for your team about this contact.", notesSaved: "Notes saved.", orderCreated: "Order placed", orderEmpty: "This contact hasn't placed any orders yet", orderEmptyDescription: "Real orders for this contact will appear here.", orders: "Orders", reviews: "Reviews", overview: "Overview", past: "Past", phone: "Primary phone", pipelines: "Pipelines", purchaseStats: "Purchase statistics", purchases: "Purchases", save: "Save", saving: "Saving…", segments: "Segments", send: "Send Message", setup: "Set up", subject: "Subject", subscriptions: "Subscriptions", subscriptionsEmpty: "Nothing to show yet", subscriptionsEmptyDescription: "Supported plans, subscriptions, or recurring invoices will appear here.", tasks: "Tasks & reminders", tasksEmpty: "No tasks are available for this contact.", totalAmount: "Total amount", upcoming: "Upcoming", unavailable: "Unavailable", workflows: "Workflows",
  },
  ar: {
    accountType: "نوع الحساب", accountTypeAdd: "إضافة نوع الحساب", accountTypeEmpty: "لم يتم تحديد نوع الحساب", accountTypeRetail: "تجزئة", accountTypeSaved: "تم تحديث نوع الحساب.", accountTypeTrader: "تاجر", accountTypeWholesale: "جملة", activity: "الخط الزمني", allActivity: "كل الأنشطة", attachments: "المرفقات", back: "جهات الاتصال", bookings: "الحجوزات", contactCreated: "تم إنشاء جهة الاتصال", contactUnavailable: "تفاصيل جهة الاتصال غير متاحة", contactUnavailableDescription: "تعذر تحميل تفاصيل جهة الاتصال من واجهة الشركة.", edit: "تعديل", email: "البريد الأساسي", filter: "تصفية", goBooking: "الانتقال إلى تقويم الحجوزات", goPipelines: "الانتقال إلى المسارات", inbox: "البريد الوارد", invoiceEmpty: "لا توجد فواتير بعد", invoiceEmptyDescription: "ستظهر الفواتير الحقيقية لجهة الاتصال هنا.", invoices: "الفواتير", labels: "التصنيفات", editLabels: "تعديل التصنيفات", noLabelsAssigned: "لا توجد تصنيفات", language: "اللغة", memberInfo: "معلومات العضو", more: "إجراءات أخرى", newAppointment: "موعد جديد", newNote: "ملاحظة جديدة", noBookings: "لا توجد حجوزات بعد", noBookingsDescription: "ستظهر الحجوزات عند توفر مصدر حجوزات مدعوم.", noContact: "لم يتم العثور على جهة الاتصال", noContactDescription: "لم يتم العثور على جهة الاتصال المطلوبة.", noConversation: "لا توجد محادثة متاحة", noConversationDescription: "ابدأ محادثة داخلية مع جهة الاتصال من البريد الوارد.", noConversationsYet: "لا توجد محادثات بعد لجهة الاتصال هذه.", noPipelines: "لا توجد لوحات مسارات بعد", noPipelinesDescription: "أنشئ مساراً لتنظيم وتتبع تقدم جهات الاتصال الحقيقي.", notes: "ملاحظات", notesEmpty: "لا توجد ملاحظات بعد", notesEmptyDescription: "أضف ملاحظات خاصة لفريقك حول جهة الاتصال هذه.", notesSaved: "تم حفظ الملاحظات.", orderCreated: "تم تقديم طلب", orderEmpty: "لم تقدم جهة الاتصال أي طلبات بعد", orderEmptyDescription: "ستظهر الطلبات الحقيقية لجهة الاتصال هنا.", orders: "الطلبات", reviews: "المراجعات", overview: "نظرة عامة", past: "السابقة", phone: "الهاتف الأساسي", pipelines: "المسارات", purchaseStats: "إحصاءات الشراء", purchases: "المشتريات", save: "حفظ", saving: "جارٍ الحفظ…", segments: "الشرائح", send: "إرسال رسالة", setup: "إعداد", subject: "الموضوع", subscriptions: "الاشتراكات", subscriptionsEmpty: "لا يوجد ما يمكن عرضه بعد", subscriptionsEmptyDescription: "ستظهر الخطط أو الاشتراكات أو الفواتير المتكررة المدعومة هنا.", tasks: "المهام والتذكيرات", tasksEmpty: "لا توجد مهام متاحة لجهة الاتصال.", totalAmount: "المبلغ الإجمالي", upcoming: "القادمة", unavailable: "غير متاح", workflows: "سير العمل",
  },
};

const CRM_COPY = {
  en: { active: "Active", archive: "Archive contact", archiveConfirm: "Archive this contact?", archiveDescription: "Archiving removes this contact from the active list. It does not delete the customer or their orders.", archived: "Archived", archiveSuccess: "Contact archived.", cancel: "Cancel", created: "Created", editSuccess: "Contact updated.", labelsValue: "Labels", notesValue: "Notes", notFound: "Contact not found", permissionDenied: "You do not have permission to view this contact.", restore: "Restore contact", restoreSuccess: "Contact restored.", retry: "Try again", source: "Source", status: "Status", type: "Type", updated: "Updated" },
  ar: { active: "نشط", archive: "أرشفة جهة الاتصال", archiveConfirm: "هل تريد أرشفة جهة الاتصال؟", archiveDescription: "تؤدي الأرشفة إلى إزالة جهة الاتصال من القائمة النشطة، ولا تحذف العميل أو طلباته.", archived: "مؤرشف", archiveSuccess: "تمت أرشفة جهة الاتصال.", cancel: "إلغاء", created: "تاريخ الإنشاء", editSuccess: "تم تحديث جهة الاتصال.", labelsValue: "التصنيفات", notesValue: "الملاحظات", notFound: "لم يتم العثور على جهة الاتصال", permissionDenied: "ليست لديك صلاحية عرض جهة الاتصال هذه.", restore: "استعادة جهة الاتصال", restoreSuccess: "تمت استعادة جهة الاتصال.", retry: "إعادة المحاولة", source: "المصدر", status: "الحالة", type: "النوع", updated: "آخر تحديث" },
};

const TAB_ICONS = { overview: User, inbox: Inbox, pipelines: Workflow, notes: MessageSquare, subscriptions: Archive, bookings: CalendarDays, invoices: FileText, orders: ShoppingCart };

function formatDate(value, language) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", { dateStyle: "medium" }).format(date) : "—";
}

function initials(contact) {
  return String(contact?.name || contact?.email || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function UnsupportedDialog({ onClose, t }) {
  return <div className="customers-modal-backdrop" onMouseDown={onClose} role="presentation"><div aria-modal="true" className="customers-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label="Close" onClick={onClose} type="button"><X size={18}/></button><AdminUnderDevelopmentContent t={t}/></div></div>;
}

function EmptyVisual({ icon: Icon, tone = "blue" }) {
  return <div aria-hidden="true" className={`contact-empty-visual tone-${tone}`}><span/><span/><Icon size={43}/></div>;
}

const ACCOUNT_TYPE_OPTIONS = ["retail", "trader", "wholesale"];
const ACCOUNT_TYPE_LABEL_KEYS = { retail: "accountTypeRetail", trader: "accountTypeTrader", wholesale: "accountTypeWholesale" };

function AccountTypeField({ canUpdate, contact, labels, onSave }) {
  const accountType = ACCOUNT_TYPE_OPTIONS.includes(contact?.accountType) ? contact.accountType : "";
  const [draft, setDraft] = React.useState(accountType);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  React.useEffect(() => { setDraft(accountType); setEditing(false); setSaveError(""); }, [contact?.id]);

  function startEdit() { if (!canUpdate) return; setDraft(accountType); setEditing(true); setSaveError(""); }
  function cancelEdit() { setEditing(false); setDraft(accountType); setSaveError(""); }
  async function submit() {
    if (saving || !canUpdate || !draft || draft === accountType) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(draft);
      setEditing(false);
    } catch (error) {
      setSaveError(error?.message || labels.contactUnavailableDescription);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return <div className="crm-account-type-editor" role="group" aria-label={labels.accountType}><label className="crm-account-type-select"><span>{labels.accountType}</span><select disabled={saving} onChange={(event) => setDraft(event.target.value)} value={draft}>{ACCOUNT_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{labels[ACCOUNT_TYPE_LABEL_KEYS[value]]}</option>)}</select></label>{saveError && <p className="crm-account-type-error" role="alert">{saveError}</p>}<footer className="crm-account-type-actions"><button className="customers-secondary-button" disabled={saving} onClick={cancelEdit} type="button">{labels.cancel}</button><button className="customers-primary-button" disabled={saving || !draft || draft === accountType} onClick={submit} type="button">{saving && <LoaderCircle className="crm-spin" size={16}/>}{saving ? labels.saving : labels.save}</button></footer></div>;
  }
  if (!accountType) {
    return <>{<p className="crm-account-type-empty">{labels.accountTypeEmpty}</p>}{canUpdate && <button onClick={startEdit} type="button">{labels.accountTypeAdd}</button>}</>;
  }
  return <>{<p className="crm-account-type-value">{labels[ACCOUNT_TYPE_LABEL_KEYS[accountType]]}</p>}{canUpdate && <button onClick={startEdit} type="button"><Edit3 size={14}/>{labels.edit}</button>}</>;
}

function OverviewTab({ canUpdate, contact, language, labels, money, onEditLabels, onSaveAccountType, onUnsupported, orders }) {
  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const events = [
    ...orders.slice(0, 5).map((order) => ({ date: order.createdAt, id: order.id, label: `${labels.orderCreated} · ${order.reference || order.id || ""}`, value: money(Number(order.total || 0)) })),
    ...(contact.createdAt ? [{ date: contact.createdAt, id: "contact-created", label: labels.contactCreated, value: "" }] : []),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return <div className="contact-overview-grid"><div className="contact-overview-main">
    <section className="contact-tasks-card"><header><h2>{labels.tasks}</h2><button onClick={onUnsupported} type="button"><BellRing size={15}/>{labels.setup}</button></header><p>{labels.tasksEmpty}</p></section>
    <section className="contact-timeline-card"><header><h2>{labels.activity}</h2><button onClick={onUnsupported} type="button">{labels.allActivity}<ChevronDown size={14}/></button></header>{events.length ? <div className="contact-timeline-list">{events.map((event) => <article key={event.id}><span className="timeline-icon"><ClipboardList size={17}/></span><div><strong>{event.label}</strong>{event.value && <small>{event.value}</small>}</div><time>{formatDate(event.date, language)}</time></article>)}</div> : <div className="contact-timeline-empty"><ClipboardList size={31}/><p>{labels.unavailable}</p></div>}</section>
  </div><aside className="contact-profile-sidebar">
    <section><h3>{labels.purchaseStats}</h3><div className="contact-purchase-stat"><ShoppingBag size={18}/><span>{labels.purchases}</span><strong>{orders.length}</strong></div><div className="contact-purchase-stat"><ReceiptText size={18}/><span>{labels.totalAmount}</span><strong><bdi dir="ltr">{money(total)}</bdi></strong></div></section>
    <section><h3>{labels.labels}</h3><Tags size={20}/>{contact.labels?.length ? <div className="crm-contact-labels contact-labels-chips">{contact.labels.map((label) => <span key={label}>{label}</span>)}</div> : <p>{labels.noLabelsAssigned}</p>}{canUpdate && <button onClick={onEditLabels} type="button">{labels.editLabels}</button>}</section>
    <section><h3>{labels.segments}</h3><Users size={20}/><p>{labels.unavailable}</p><button onClick={onUnsupported} type="button">{labels.setup}</button></section>
    <section><h3>{labels.attachments}</h3><Paperclip size={20}/><p>{labels.unavailable}</p><button onClick={onUnsupported} type="button">{labels.setup}</button></section>
    <section><h3>{labels.memberInfo}</h3><User size={20}/><AccountTypeField canUpdate={canUpdate} contact={contact} labels={labels} onSave={onSaveAccountType}/></section>
    <section><h3>{labels.workflows}</h3><Workflow size={20}/><p>{labels.unavailable}</p><button onClick={onUnsupported} type="button">{labels.setup}</button></section>
  </aside></div>;
}

function ContactInboxTab({ contact, currentUser, labels, language, onNavigate }) {
  const [conversations, setConversations] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [activeConversation, setActiveConversation] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [threadLoading, setThreadLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [replyBusy, setReplyBusy] = React.useState(false);
  const [replyError, setReplyError] = React.useState("");
  const [createBusy, setCreateBusy] = React.useState(false);
  const [createSubject, setCreateSubject] = React.useState("");
  const [createMessage, setCreateMessage] = React.useState("");
  const canReply = canUseInboxAction(currentUser, "inbox.reply");
  const canCreate = canUseInboxAction(currentUser, "inbox.create");
  const blocked = inboxReplyBlocked(activeConversation);

  React.useEffect(() => {
    if (!contact?.id) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchInboxConversations({ contactId: contact.id, limit: 100, archived: "false" }, { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      const items = Array.isArray(data?.conversations) ? data.conversations : [];
      setConversations(items);
      setSelectedId(items[0]?.id || null);
      setLoading(false);
    }).catch((requestError) => {
      if (requestError?.name === "AbortError") return;
      setConversations([]);
      setError(requestError?.message || labels.contactUnavailableDescription);
      setLoading(false);
    });
    return () => controller.abort();
  }, [contact?.id, labels.contactUnavailableDescription]);

  React.useEffect(() => {
    if (!selectedId) { setMessages([]); setActiveConversation(null); return undefined; }
    const controller = new AbortController();
    setThreadLoading(true);
    setReplyError("");
    fetchInboxConversation(selectedId, { signal: controller.signal }).then(async (data) => {
      if (controller.signal.aborted) return;
      setActiveConversation(data.conversation || null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setThreadLoading(false);
      if (data.conversation?.unreadCount > 0) {
        try { await markInboxConversationRead(selectedId); } catch { /* best effort */ }
      }
    }).catch((requestError) => {
      if (requestError?.name === "AbortError") return;
      setMessages([]);
      setActiveConversation(null);
      setReplyError(requestError?.message || labels.contactUnavailableDescription);
      setThreadLoading(false);
    });
    return () => controller.abort();
  }, [labels.contactUnavailableDescription, selectedId]);

  async function sendReply() {
    if (!canReply || !selectedId || !draft.trim() || blocked) return;
    setReplyBusy(true);
    setReplyError("");
    try {
      const message = await replyToInboxConversation(selectedId, draft.trim());
      setMessages((current) => [...current, message]);
      setDraft("");
      setActiveConversation((current) => current ? { ...current, status: "open" } : current);
    } catch (requestError) {
      setReplyError(requestError?.message || labels.contactUnavailableDescription);
    } finally {
      setReplyBusy(false);
    }
  }

  async function startConversation() {
    if (!canCreate || !createMessage.trim() || contact.isArchived) return;
    setCreateBusy(true);
    setReplyError("");
    try {
      const created = await createInboxConversation({
        contactId: contact.id,
        subject: createSubject.trim(),
        initialMessage: createMessage.trim(),
      });
      setConversations((current) => [created, ...current]);
      setSelectedId(created.id);
      setCreateSubject("");
      setCreateMessage("");
    } catch (requestError) {
      setReplyError(requestError?.message || labels.contactUnavailableDescription);
    } finally {
      setCreateBusy(false);
    }
  }

  if (loading) return <section className="contact-inbox-tab"><div className="contact-inbox-thread"><LoaderCircle className="crm-spin" size={28}/></div></section>;
  if (error) return <section className="contact-inbox-tab"><div className="contact-inbox-thread" role="alert"><EmptyVisual icon={Mail}/><h2>{labels.contactUnavailable}</h2><p>{error}</p></div></section>;

  const blockedLabel = blocked === "archived" ? labels.archived : blocked === "closed" ? labels.closed : blocked === "contactArchived" ? labels.archived : null;

  return (
    <section className="contact-inbox-tab">
      <div className="contact-inbox-thread-panel">
        {conversations.length > 1 && (
          <div className="contact-inbox-thread-list">
            {conversations.map((item) => (
              <button className={`admin-inbox-conversation-item${selectedId === item.id ? " active" : ""}`} key={item.id} onClick={() => setSelectedId(item.id)} type="button">
                <span className="admin-inbox-conversation-copy"><strong>{item.subject || labels.inbox}</strong><span className="admin-inbox-conversation-preview">{item.lastMessage?.body || "—"}</span></span>
              </button>
            ))}
          </div>
        )}
        <div className="contact-inbox-thread">
          {threadLoading ? <LoaderCircle className="crm-spin" size={24}/> : selectedId ? (
            <div className="contact-inbox-thread-panel">
              {messages.length ? messages.map((message) => (
                <article className="contact-inbox-message" key={message.id}>
                  <header><strong>{message.sender?.name || message.sender?.email || "—"}</strong><time>{formatInboxWhen(message.createdAt, language)}</time></header>
                  <p>{message.body}</p>
                </article>
              )) : <p>{labels.noConversationDescription}</p>}
              {replyError && <p className="admin-inbox-inline-error" role="alert">{replyError}</p>}
              {canReply && blockedLabel && <p className="admin-inbox-inline-note">{blockedLabel}</p>}
              {canReply && !blocked && (
                <div className="contact-inbox-composer">
                  <textarea aria-label={labels.send} disabled={replyBusy} onChange={(event) => setDraft(event.target.value)} placeholder={labels.send} rows={3} value={draft}/>
                  <button className="customers-primary-button" disabled={replyBusy || !draft.trim()} onClick={sendReply} type="button"><Send size={15}/>{labels.send}</button>
                </div>
              )}
              {!canReply && <p className="admin-inbox-inline-note">{labels.send}</p>}
            </div>
          ) : canCreate && !contact.isArchived ? (
            <div className="contact-inbox-start">
              <EmptyVisual icon={Mail}/>
              <h2>{labels.noConversationsYet}</h2>
              <p>{labels.noConversationDescription}</p>
              <label><span>{labels.subject}</span><input disabled={createBusy} maxLength={200} onChange={(event) => setCreateSubject(event.target.value)} type="text" value={createSubject}/></label>
              <label><span>{labels.send}</span><textarea disabled={createBusy} maxLength={10000} onChange={(event) => setCreateMessage(event.target.value)} rows={4} value={createMessage}/></label>
              <button className="customers-primary-button" disabled={createBusy || !createMessage.trim()} onClick={startConversation} type="button">{createBusy ? <LoaderCircle className="crm-spin" size={16}/> : <Send size={15}/>}{labels.send}</button>
            </div>
          ) : (
            <>
              <EmptyVisual icon={Mail}/>
              <h2>{labels.noConversationsYet}</h2>
              <p>{labels.noConversationDescription}</p>
            </>
          )}
        </div>
      </div>
      <aside>
        <Mail size={24}/>
        <h3>{labels.inbox}</h3>
        <p>{labels.noConversationDescription}</p>
        <button className="customers-primary-button" onClick={() => onNavigate?.("admin-inbox")} type="button"><Send size={15}/>{language === "ar" ? "فتح في البريد" : "Open in Inbox"}</button>
      </aside>
    </section>
  );
}

function PipelinesTab({ labels, onNavigate }) {
  return <section className="contact-pipelines-tab"><EmptyVisual icon={Workflow} tone="green"/><h2>{labels.noPipelines}</h2><p>{labels.noPipelinesDescription}</p><button onClick={() => onNavigate?.("admin-pipelines")} type="button">{labels.goPipelines}</button></section>;
}

function NotesTab({ canUpdate, contact, labels, onSave }) {
  const notes = contact?.notes || "";
  const [draft, setDraft] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const editing = draft !== null;

  React.useEffect(() => { setDraft(null); setSaveError(""); }, [contact?.id]);

  function startEdit() { if (!canUpdate) return; setDraft(notes); setSaveError(""); }
  function cancelEdit() { setDraft(null); setSaveError(""); }
  async function submit() {
    if (saving || !canUpdate) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(draft.trim() ? draft : "");
      setDraft(null);
    } catch (error) {
      setSaveError(error?.message || labels.contactUnavailableDescription);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return <section className="contact-notes-tab contact-notes-editor"><header><h2>{labels.notes}</h2></header>{saveError && <p className="crm-contact-notes-error" role="alert">{saveError}</p>}<textarea aria-label={labels.notes} className="contact-notes-textarea" disabled={saving} maxLength={4000} onChange={(event) => setDraft(event.target.value)} rows={8} value={draft}/><footer><button className="customers-secondary-button" disabled={saving} onClick={cancelEdit} type="button">{labels.cancel}</button><button className="customers-primary-button" disabled={saving} onClick={submit} type="button">{saving ? <LoaderCircle className="crm-spin" size={16}/> : <MessageSquare size={15}/>}{saving ? labels.saving : labels.save}</button></footer></section>;
  }
  if (!notes) {
    return <section className="contact-notes-tab"><header><h2>{labels.notes} (0)</h2></header><EmptyVisual icon={MessageSquare} tone="yellow"/><h3>{labels.notesEmpty}</h3><p>{labels.notesEmptyDescription}</p>{canUpdate && <button className="customers-secondary-button" onClick={startEdit} type="button"><MessageSquare size={15}/>{labels.newNote}</button>}</section>;
  }
  return <section className="contact-notes-tab contact-notes-filled"><header><h2>{labels.notes}</h2></header><div className="contact-notes-body">{notes}</div>{canUpdate && <button className="customers-secondary-button" onClick={startEdit} type="button"><Edit3 size={15}/>{labels.edit}</button>}</section>;
}

function SubscriptionsTab({ labels }) {
  return <section className="contact-subscriptions-tab"><header><h2>{labels.subscriptions}</h2></header><div><EmptyVisual icon={Archive} tone="coral"/><h3>{labels.subscriptionsEmpty}</h3><p>{labels.subscriptionsEmptyDescription}</p></div></section>;
}

function BookingsTab({ labels, onNavigate, onUnsupported }) {
  const [view, setView] = React.useState("upcoming");
  return <section className="contact-bookings-tab"><header><h2>{labels.bookings}</h2><div><button className="customers-secondary-button" onClick={() => onNavigate?.("admin-bookings-calendar")} type="button"><CalendarDays size={15}/>{labels.goBooking}</button><button className="customers-secondary-button" onClick={onUnsupported} type="button"><ClipboardList size={15}/>{labels.newAppointment}</button></div></header><div className="contact-booking-filters"><div><button className={view === "upcoming" ? "active" : ""} onClick={() => setView("upcoming")} type="button">{labels.upcoming}</button><button className={view === "past" ? "active" : ""} onClick={() => setView("past")} type="button">{labels.past}</button></div><button className="customers-secondary-button" onClick={onUnsupported} type="button">{labels.filter}</button></div><div className="contact-booking-empty"><EmptyVisual icon={CalendarDays} tone="green"/><h3>{labels.noBookings}</h3><p>{labels.noBookingsDescription}</p></div></section>;
}

function InvoicesTab({ error, invoices, labels, language, money }) {
  return <section className="contact-records-tab"><header><h2>{labels.invoices}</h2></header>{error ? <div className="contact-records-empty" role="alert"><EmptyVisual icon={FileText}/><h3>{labels.contactUnavailable}</h3><p>{error}</p></div> : invoices.length ? <div className="contact-records-scroll"><div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>#</th><th>{language === "ar" ? "التاريخ" : "Issue date"}</th><th>{language === "ar" ? "الإجمالي" : "Total"}</th><th>{language === "ar" ? "الحالة" : "Status"}</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td>{invoice.invoice_number || invoice.id}</td><td>{formatDate(invoice.issue_date || invoice.createdAt, language)}</td><td><bdi dir="ltr">{money(Number(invoice.total || 0))}</bdi></td><td>{invoice.status || "—"}</td></tr>)}</tbody></table></div></div> : <div className="contact-records-empty"><EmptyVisual icon={FileText} tone="yellow"/><h3>{labels.invoiceEmpty}</h3><p>{labels.invoiceEmptyDescription}</p></div>}</section>;
}

function OrdersTab({ labels, language, money, orders }) {
  return <section className="contact-records-tab"><header><h2>{labels.orders}</h2></header>{orders.length ? <div className="contact-records-scroll"><div className="admin-data-table-wrap"><table className="admin-data-table"><thead><tr><th>{language === "ar" ? "المرجع" : "Reference"}</th><th>{language === "ar" ? "التاريخ" : "Date"}</th><th>{language === "ar" ? "الإجمالي" : "Total"}</th><th>{language === "ar" ? "الحالة" : "Status"}</th><th>{language === "ar" ? "العناصر" : "Items"}</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>{order.reference || order.id}</td><td>{formatDate(order.createdAt, language)}</td><td><bdi dir="ltr">{money(Number(order.total || 0))}</bdi></td><td>{canonicalOrderStatus(order.status) || "—"}</td><td>{Array.isArray(order.items) ? order.items.length : 0}</td></tr>)}</tbody></table></div></div> : <div className="contact-records-empty"><EmptyVisual icon={ShoppingCart} tone="green"/><h3>{labels.orderEmpty}</h3><p>{labels.orderEmptyDescription}</p></div>}</section>;
}

function ArchiveConfirmDialog({ busy, contact, language, onClose, onConfirm }) {
  const copy = CRM_COPY[language] || CRM_COPY.en;
  React.useEffect(() => { const handler = (event) => event.key === "Escape" && !busy && onClose(); document.addEventListener("keydown", handler); return () => document.removeEventListener("keydown", handler); }, [busy, onClose]);
  return <div className="customers-modal-backdrop" onMouseDown={() => !busy && onClose()} role="presentation"><div aria-labelledby="archive-contact-title" aria-modal="true" className="customers-modal crm-contact-confirm" dir={language === "ar" ? "rtl" : "ltr"} onMouseDown={(event) => event.stopPropagation()} role="alertdialog"><h2 id="archive-contact-title">{copy.archiveConfirm}</h2><p>{copy.archiveDescription}</p><strong>{contact.displayName || contact.name}</strong><footer><button className="customers-secondary-button" disabled={busy} onClick={onClose} type="button">{copy.cancel}</button><button className="customers-primary-button crm-danger-button" disabled={busy} onClick={onConfirm} type="button">{busy && <LoaderCircle className="crm-spin" size={16}/>} {copy.archive}</button></footer></div></div>;
}

export default function AdminContactDetailPage({ language = "en", t: translate, currentUser, company, orders = [], onNavigate, ...layout }) {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [contact, setContact] = React.useState(null);
  const [contactOrders, setContactOrders] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [invoiceError, setInvoiceError] = React.useState("");
  const [loadError, setLoadError] = React.useState("");
  const [loadStatus, setLoadStatus] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [showUnsupported, setShowUnsupported] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [showArchive, setShowArchive] = React.useState(false);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const labels = { ...(COPY[language] || COPY.en), ...(CRM_COPY[language] || CRM_COPY.en) };
  const contactId = React.useMemo(() => { const match = window.location.pathname.match(/\/admin\/customers\/([^/]+)$/); return match?.[1] ? decodeURIComponent(match[1]) : null; }, []);
  const canUpdate = canUseCustomerAction(currentUser, "customers.update");
  const canArchive = canUseCustomerAction(currentUser, "customers.archive");

  React.useEffect(() => {
    if (!contactId) { setLoading(false); setLoadStatus(404); return undefined; }
    const controller = new AbortController();
    setLoading(true); setLoadError(""); setLoadStatus(0); setInvoiceError("");
    Promise.allSettled([fetchCustomer(contactId, { signal: controller.signal }), apiRequest("/admin/invoices", { signal: controller.signal })]).then(([contactResult, invoicesResult]) => {
      if (controller.signal.aborted) return;
      if (contactResult.status === "rejected") { setContact(null); setLoadStatus(contactResult.reason?.status || 0); setLoadError(contactResult.reason?.message || labels.contactUnavailableDescription); setLoading(false); return; }
      const found = contactResult.value; setContact(found);
      if (invoicesResult.status === "fulfilled") setInvoices(invoicesForContact(Array.isArray(invoicesResult.value) ? invoicesResult.value : [], found));
      else { setInvoices([]); setInvoiceError(invoicesResult.reason?.message || labels.contactUnavailableDescription); }
      setLoading(false);
    });
    return () => controller.abort();
  }, [company?.id, contactId, labels.contactUnavailableDescription, refreshKey]);

  React.useEffect(() => { setContactOrders(contact ? ordersForContact(orders, contact) : []); }, [contact, orders]);
  const money = React.useCallback((value) => formatCompanyCurrency(value, company, language), [company, language]);
  const unsupported = () => setShowUnsupported(true);
  const shell = (content) => <AdminLayout activePage="admin-customers-detail" company={company} currentUser={currentUser} hideHeader language={language} onNavigate={onNavigate} t={translate} {...layout}>{content}</AdminLayout>;
  async function saveEdit(values) { const saved = await updateCustomer(contactId, values, contact); setContact(saved); setShowEdit(false); setNotice(labels.editSuccess); }
  async function saveAccountType(value) { const saved = await updateCustomer(contactId, { accountType: value }, contact); setContact(saved); setNotice(labels.accountTypeSaved); }
  async function saveNotes(value) { const saved = await updateCustomer(contactId, { notes: value }, contact); setContact(saved); setNotice(labels.notesSaved); }
  async function archive() { if (actionBusy) return; setActionBusy(true); setActionError(""); try { const saved = await archiveCustomer(contactId); setContact(saved); setShowArchive(false); setNotice(labels.archiveSuccess); } catch (error) { setActionError(error?.message || labels.contactUnavailableDescription); } finally { setActionBusy(false); } }
  async function restore() { if (actionBusy) return; setActionBusy(true); setActionError(""); try { const saved = await restoreCustomer(contactId); setContact(saved); setNotice(labels.restoreSuccess); } catch (error) { setActionError(error?.message || labels.contactUnavailableDescription); } finally { setActionBusy(false); } }

  if (loading) return shell(<div aria-busy="true" className="admin-contact-detail admin-contact-detail-skeleton"><span/><span/><span/></div>);
  if (loadStatus === 404) return shell(<div className="admin-empty-state"><User size={40}/><strong>{labels.notFound}</strong><span>{labels.noContactDescription}</span><button className="customers-secondary-button" onClick={() => onNavigate?.("admin-customers", { path: "/admin/customers" })} type="button">{labels.back}</button></div>);
  if (loadStatus === 403) return shell(<div className="admin-empty-state admin-contacts-error" role="alert"><User size={40}/><strong>{labels.permissionDenied}</strong><small>{loadError}</small></div>);
  if (loadError) return shell(<div className="admin-empty-state admin-contacts-error" role="alert"><User size={40}/><strong>{labels.contactUnavailable}</strong><span>{labels.contactUnavailableDescription}</span><small>{loadError}</small><button className="customers-secondary-button" onClick={() => setRefreshKey((value) => value + 1)} type="button">{labels.retry}</button></div>);
  if (!contact) return shell(<div className="admin-empty-state"><User size={40}/><strong>{labels.noContact}</strong><span>{labels.noContactDescription}</span></div>);

  return shell(<><div className="admin-contact-detail crm-contact-detail-phase-one" dir={language === "ar" ? "rtl" : "ltr"}>
    <nav className="contact-breadcrumb"><button onClick={() => onNavigate?.("admin-customers", { path: "/admin/customers" })} type="button">{language === "ar" && <ArrowLeft size={15}/>} {labels.back} {language !== "ar" && <ArrowLeft size={15}/>}</button><span>/</span><strong>{contact.displayName || contact.name || "—"}</strong></nav>
    {notice && <div className="crm-contact-notice" role="status"><span>{notice}</span><button aria-label="Close" onClick={() => setNotice("")} type="button"><X size={15}/></button></div>}{actionError && <div className="crm-contact-notice error" role="alert"><span>{actionError}</span><button aria-label="Close" onClick={() => setActionError("")} type="button"><X size={15}/></button></div>}
    <section className="admin-contact-identity-card"><div className="contact-identity-heading"><span className="admin-contact-avatar-lg">{initials(contact)}</span><div><h1>{contact.displayName || contact.name || "—"}</h1><span className={`crm-contact-status ${contact.isArchived ? "archived" : "active"}`}>{contact.isArchived ? labels.archived : labels.active}</span></div></div><div className="contact-identity-actions">{canUpdate && <button aria-label={labels.edit} className="customers-secondary-button" onClick={() => setShowEdit(true)} type="button"><Edit3 size={17}/>{labels.edit}</button>}{canArchive && (contact.isArchived ? <button className="customers-primary-button" disabled={actionBusy} onClick={restore} type="button"><RotateCcw size={16}/>{labels.restore}</button> : <button className="customers-secondary-button crm-danger-outline" disabled={actionBusy} onClick={() => setShowArchive(true)} type="button"><Archive size={16}/>{labels.archive}</button>)}</div><div className="contact-identity-fields"><div><span>{labels.email}</span><strong>{contact.email || "—"}</strong></div><div><span>{labels.phone}</span><strong>{contact.phone || "—"}</strong></div><div><span>{labels.type}</span><strong>{contact.type || "—"}</strong></div><div><span>{labels.source}</span><strong>{contact.source || "—"}</strong></div><div><span>{labels.orders}</span><strong>{contact.orderCount ?? contactOrders.length}</strong></div><div><span>{labels.reviews}</span><strong>{customerReviewCount(contact)}</strong></div><div><span>{labels.labelsValue}</span><strong>{contact.labels?.length ? contact.labels.join(", ") : "—"}</strong></div><div><span>{labels.created}</span><strong>{formatDate(contact.createdAt, language)}</strong></div><div><span>{labels.updated}</span><strong>{formatDate(contact.updatedAt, language)}</strong></div><div className="crm-contact-notes-value"><span>{labels.notesValue}</span><strong>{contact.notes || "—"}</strong></div></div></section>
    <div className="admin-contact-tabs" role="tablist">{TAB_KEYS.map((key) => { const Icon = TAB_ICONS[key]; return <button aria-selected={activeTab === key} className={activeTab === key ? "active" : ""} key={key} onClick={() => setActiveTab(key)} role="tab" type="button"><Icon size={15}/>{labels[key]}</button>; })}</div>
    <div className="admin-contact-tab-content">{activeTab === "overview" && <OverviewTab canUpdate={canUpdate} contact={contact} labels={labels} language={language} money={money} onEditLabels={() => setShowEdit(true)} onSaveAccountType={saveAccountType} onUnsupported={unsupported} orders={contactOrders}/>} {activeTab === "inbox" && <ContactInboxTab contact={contact} currentUser={currentUser} labels={labels} language={language} onNavigate={onNavigate}/>} {activeTab === "pipelines" && <PipelinesTab labels={labels} onNavigate={onNavigate}/>} {activeTab === "notes" && <NotesTab canUpdate={canUpdate} contact={contact} labels={labels} onSave={saveNotes}/>} {activeTab === "subscriptions" && <SubscriptionsTab labels={labels}/>} {activeTab === "bookings" && <BookingsTab labels={labels} onNavigate={onNavigate} onUnsupported={unsupported}/>} {activeTab === "invoices" && <InvoicesTab error={invoiceError} invoices={invoices} labels={labels} language={language} money={money}/>} {activeTab === "orders" && <OrdersTab labels={labels} language={language} money={money} orders={contactOrders}/>}</div>
  </div>{showEdit && <ContactFormDialog contact={contact} language={language} onClose={() => setShowEdit(false)} onSubmit={saveEdit}/>} {showArchive && <ArchiveConfirmDialog busy={actionBusy} contact={contact} language={language} onClose={() => setShowArchive(false)} onConfirm={archive}/>} {showUnsupported && <UnsupportedDialog onClose={() => setShowUnsupported(false)} t={translate}/>}</>);
}
