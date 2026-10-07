import React from "react";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  Globe,
  LoaderCircle,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  SquarePen,
  User,
  X,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import { fetchCustomers } from "../utils/customersApi.js";
import { fetchEmployees } from "../utils/employeesApi.js";
import {
  archiveInboxConversation,
  assignInboxConversation,
  createInboxConversation,
  fetchInboxConversation,
  fetchInboxConversations,
  markInboxConversationRead,
  replyToInboxConversation,
  restoreInboxConversation,
  updateInboxConversation,
} from "../utils/inboxApi.js";
import { canUseInboxAction } from "../utils/roles.js";
import {
  formatInboxWhen,
  inboxAssigneeLabel,
  inboxContactLabel,
  inboxInitials,
  inboxReplyBlocked,
} from "../utils/inboxUi.js";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";

const LABELS = {
  en: {
    all: "All",
    archive: "Archive",
    archived: "Archived",
    assign: "Assign to",
    assignClear: "Unassigned",
    assignDenied: "You do not have permission to assign conversations.",
    channelInternal: "Internal",
    close: "Close conversation",
    closed: "Closed",
    connectMeta: "Connect Meta",
    create: "Start conversation",
    createDenied: "You do not have permission to start conversations.",
    createError: "Could not start the conversation.",
    createSubmit: "Send first message",
    createTitle: "New conversation",
    description: "Manage tenant-scoped customer conversations from one workspace.",
    emptyFiltered: "No matching conversations",
    emptyFilteredDescription: "Try changing your search or filters.",
    emptyList: "No conversations yet",
    emptyListDescription: "Start a conversation with a contact to see messages here.",
    emptyThread: "Select a conversation",
    emptyThreadDescription: "Choose a conversation from the list or start a new one.",
    error: "Inbox unavailable",
    errorDescription: "Conversations could not be loaded from the company API.",
    externalBanner: "Facebook and Instagram messaging is not connected. Internal conversations are available below.",
    filterArchived: "Archived",
    filterOpen: "Open",
    filterUnread: "Unread",
    assignee: "Assignee",
    backToList: "Back to conversations",
    contactArchived: "This contact is archived. Restore the contact before replying.",
    emptyMessages: "No messages in this conversation yet.",
    filterAssignee: "Assignee",
    filterUnassigned: "Unassigned",
    loadMore: "Load more",
    readOnly: "You have read-only access to this inbox.",
    initialMessage: "First message",
    loading: "Loading conversations…",
    loadingThread: "Loading messages…",
    markRead: "Mark as read",
    messagePlaceholder: "Write a reply…",
    metaDeferred: "Meta Business integration",
    newMessage: "New Message",
    noContacts: "No active contacts available.",
    open: "Open",
    openContact: "View contact",
    openInInbox: "Open in Inbox",
    reopen: "Reopen conversation",
    replyDenied: "You do not have permission to reply.",
    replyError: "Could not send the reply.",
    restore: "Restore",
    retry: "Try again",
    search: "Search conversations",
    searchContacts: "Search contacts…",
    selectContact: "Contact",
    send: "Send",
    settings: "Settings",
    status: "Status",
    subject: "Subject",
    subjectOptional: "Subject (optional)",
    subtitle: "Manage customer conversations for this company",
    title: "Inbox",
    unread: "Unread",
    updateDenied: "You do not have permission to update this conversation.",
  },
  ar: {
    all: "الكل",
    archive: "أرشفة",
    archived: "مؤرشف",
    assign: "تعيين إلى",
    assignClear: "غير معيّن",
    assignDenied: "ليست لديك صلاحية تعيين المحادثات.",
    channelInternal: "داخلي",
    close: "إغلاق المحادثة",
    closed: "مغلقة",
    connectMeta: "ربط ميتا",
    create: "بدء محادثة",
    createDenied: "ليست لديك صلاحية بدء المحادثات.",
    createError: "تعذّر بدء المحادثة.",
    createSubmit: "إرسال أول رسالة",
    createTitle: "محادثة جديدة",
    description: "أدر محادثات العملاء ضمن الشركة من مساحة عمل واحدة.",
    emptyFiltered: "لا توجد محادثات مطابقة",
    emptyFilteredDescription: "جرّب تغيير البحث أو عوامل التصفية.",
    emptyList: "لا توجد محادثات بعد",
    emptyListDescription: "ابدأ محادثة مع جهة اتصال لعرض الرسائل هنا.",
    emptyThread: "اختر محادثة",
    emptyThreadDescription: "اختر محادثة من القائمة أو ابدأ محادثة جديدة.",
    error: "البريد الوارد غير متاح",
    errorDescription: "تعذّر تحميل المحادثات من واجهة الشركة.",
    externalBanner: "مراسلة فيسبوك وإنستغرام غير متصلة. المحادثات الداخلية متاحة أدناه.",
    filterArchived: "مؤرشف",
    filterOpen: "مفتوحة",
    filterUnread: "غير مقروء",
    assignee: "المعيّن",
    backToList: "العودة إلى المحادثات",
    contactArchived: "جهة الاتصال مؤرشفة. استعدها قبل الرد.",
    emptyMessages: "لا توجد رسائل في هذه المحادثة بعد.",
    filterAssignee: "المعيّن",
    filterUnassigned: "غير معيّن",
    loadMore: "تحميل المزيد",
    readOnly: "لديك صلاحية قراءة فقط لهذا البريد.",
    initialMessage: "أول رسالة",
    loading: "جارٍ تحميل المحادثات…",
    loadingThread: "جارٍ تحميل الرسائل…",
    markRead: "تحديد كمقروء",
    messagePlaceholder: "اكتب رداً…",
    metaDeferred: "تكامل ميتا للأعمال",
    newMessage: "رسالة جديدة",
    noContacts: "لا توجد جهات اتصال نشطة.",
    open: "مفتوحة",
    openContact: "عرض جهة الاتصال",
    openInInbox: "فتح في البريد",
    reopen: "إعادة فتح المحادثة",
    replyDenied: "ليست لديك صلاحية الرد.",
    replyError: "تعذّر إرسال الرد.",
    restore: "استعادة",
    retry: "إعادة المحاولة",
    search: "البحث في المحادثات",
    searchContacts: "البحث في جهات الاتصال…",
    selectContact: "جهة الاتصال",
    send: "إرسال",
    settings: "الإعدادات",
    status: "الحالة",
    subject: "الموضوع",
    subjectOptional: "الموضوع (اختياري)",
    subtitle: "إدارة محادثات العملاء لهذه الشركة",
    title: "البريد الوارد",
    unread: "غير مقروء",
    updateDenied: "ليست لديك صلاحية تحديث هذه المحادثة.",
  },
};

function ConversationListItem({ active, conversation, language, labels, onSelect }) {
  const preview = conversation.lastMessage?.body || conversation.subject || labels.channelInternal;
  const assignee = inboxAssigneeLabel(conversation);
  return (
    <button className={`admin-inbox-conversation-item${active ? " active" : ""}${conversation.unreadCount > 0 ? " unread" : ""}`} onClick={() => onSelect(conversation.id)} type="button">
      <span className="admin-inbox-conversation-avatar">{inboxInitials(inboxContactLabel(conversation))}</span>
      <span className="admin-inbox-conversation-copy">
        <span className="admin-inbox-conversation-top"><strong>{inboxContactLabel(conversation)}</strong><time>{formatInboxWhen(conversation.lastMessageAt || conversation.updatedAt, language)}</time></span>
        <span className="admin-inbox-conversation-bottom"><span>{conversation.subject || labels.channelInternal}</span>{conversation.unreadCount > 0 && <i>{conversation.unreadCount}</i>}</span>
        {assignee && <span className="admin-inbox-conversation-assignee">{labels.assignee}: {assignee}</span>}
        <span className="admin-inbox-conversation-preview">{preview}</span>
      </span>
    </button>
  );
}

function InboxUnsupported({ onClose, t }) {
  return (
    <div className="customers-modal-backdrop" onMouseDown={onClose} role="presentation">
      <div aria-modal="true" className="customers-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="Close" onClick={onClose} type="button"><X size={18}/></button>
        <AdminUnderDevelopmentContent t={t}/>
      </div>
    </div>
  );
}

function NewConversationDialog({ contacts, language, labels, loadingContacts, onClose, onSubmit, submitting }) {
  const [contactId, setContactId] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [initialMessage, setInitialMessage] = React.useState("");
  const [contactQuery, setContactQuery] = React.useState("");
  const filtered = contacts.filter((contact) => {
    if (contact.isArchived) return false;
    const haystack = [contact.displayName, contact.name, contact.email, contact.phone].join(" ").toLowerCase();
    return !contactQuery.trim() || haystack.includes(contactQuery.trim().toLowerCase());
  });

  return (
    <div className="customers-modal-backdrop" onMouseDown={() => !submitting && onClose()} role="presentation">
      <div aria-modal="true" className="customers-modal admin-inbox-create-modal" dir={language === "ar" ? "rtl" : "ltr"} onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="Close" disabled={submitting} onClick={onClose} type="button"><X size={18}/></button>
        <h2>{labels.createTitle}</h2>
        <label><span>{labels.selectContact}</span><input aria-label={labels.searchContacts} onChange={(event) => setContactQuery(event.target.value)} placeholder={labels.searchContacts} type="search" value={contactQuery}/><select aria-label={labels.selectContact} disabled={loadingContacts || submitting} onChange={(event) => setContactId(event.target.value)} required value={contactId}><option value="">{loadingContacts ? "…" : labels.selectContact}</option>{filtered.map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName || contact.name || contact.email || contact.id}</option>)}</select></label>
        {!loadingContacts && !filtered.length && <p className="admin-inbox-inline-note">{labels.noContacts}</p>}
        <label><span>{labels.subjectOptional}</span><input disabled={submitting} maxLength={200} onChange={(event) => setSubject(event.target.value)} type="text" value={subject}/></label>
        <label><span>{labels.initialMessage}</span><textarea disabled={submitting} maxLength={10000} onChange={(event) => setInitialMessage(event.target.value)} required rows={4} value={initialMessage}/></label>
        <footer><button className="customers-secondary-button" disabled={submitting} onClick={onClose} type="button">{language === "ar" ? "إلغاء" : "Cancel"}</button><button className="customers-primary-button" disabled={submitting || !contactId || !initialMessage.trim()} onClick={() => onSubmit({ contactId, subject, initialMessage: initialMessage.trim() })} type="button">{submitting ? <LoaderCircle className="crm-spin" size={16}/> : <Send size={15}/>}{labels.createSubmit}</button></footer>
      </div>
    </div>
  );
}

function ThreadPanel({
  actionBusy,
  actionError,
  canArchive,
  canAssign,
  canReply,
  canUpdate,
  conversation,
  currentUser,
  employees,
  language,
  labels,
  messages,
  onArchive,
  onAssign,
  onBack,
  onMarkRead,
  onNavigate,
  onReply,
  onRestore,
  onToggleStatus,
  replyBusy,
  replyError,
  showBack,
  threadError,
  threadLoading,
}) {
  const [draft, setDraft] = React.useState("");
  const listRef = React.useRef(null);
  const blocked = inboxReplyBlocked(conversation);
  const assignee = inboxAssigneeLabel(conversation);
  const readOnly = !canReply && !canAssign && !canUpdate && !canArchive;

  React.useEffect(() => { setDraft(""); }, [conversation?.id]);
  React.useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, conversation?.id]);

  if (threadLoading) {
    return <div className="admin-inbox-thread admin-inbox-thread-loading"><LoaderCircle className="crm-spin" size={28}/><p>{labels.loadingThread}</p></div>;
  }
  if (threadError) {
    return <div className="admin-inbox-thread admin-inbox-thread-error" role="alert"><MessagesSquare size={34}/><strong>{labels.error}</strong><p>{threadError}</p><button className="customers-secondary-button" onClick={onBack} type="button">{labels.backToList}</button></div>;
  }
  if (!conversation) {
    return (
      <div className="admin-inbox-conversation-empty">
        <div className="admin-inbox-hero-visual" aria-hidden="true"><span/><span/><MessagesSquare size={52}/></div>
        <h2>{labels.emptyThread}</h2>
        <p>{labels.emptyThreadDescription}</p>
      </div>
    );
  }

  const blockedLabel = blocked === "archived" ? labels.archived : blocked === "closed" ? labels.closed : blocked === "contactArchived" ? labels.contactArchived : null;

  return (
    <section className="admin-inbox-thread">
      <header className="admin-inbox-thread-header">
        {showBack && <button aria-label={labels.backToList} className="admin-inbox-mobile-back" onClick={onBack} type="button"><ArrowLeft size={18}/></button>}
        <div className="admin-inbox-thread-title">
          <strong>{inboxContactLabel(conversation)}</strong>
          <span>{conversation.subject || labels.channelInternal}</span>
          <div className="admin-inbox-thread-meta">
            <span className={`admin-inbox-status-pill ${conversation.status}`}>{conversation.status === "closed" ? labels.closed : labels.open}</span>
            {conversation.archivedAt && <span className="admin-inbox-status-pill archived">{labels.archived}</span>}
            {conversation.unreadCount > 0 && <span className="admin-inbox-status-pill unread">{labels.unread}</span>}
            {assignee && <span className="admin-inbox-status-pill">{labels.assignee}: {assignee}</span>}
          </div>
        </div>
        <div className="admin-inbox-thread-actions">
          {typeof onNavigate === "function" && conversation.contactId && (
            <button className="customers-secondary-button" onClick={() => onNavigate("admin-customers-detail", { path: `/admin/customers/${conversation.contactId}` })} type="button"><User size={15}/>{labels.openContact}</button>
          )}
          {canAssign && (
            <label className="admin-inbox-assign-field">
              <span>{labels.assign}</span>
              <select disabled={actionBusy || Boolean(conversation.archivedAt)} onChange={(event) => onAssign(event.target.value || null)} value={conversation.assignedEmployeeId || ""}>
                <option value="">{labels.assignClear}</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name || employee.email || employee.id}</option>)}
              </select>
            </label>
          )}
          {canUpdate && !conversation.archivedAt && (
            <button className="customers-secondary-button" disabled={actionBusy} onClick={onToggleStatus} type="button">
              {conversation.status === "closed" ? labels.reopen : labels.close}
            </button>
          )}
          {canArchive && (conversation.archivedAt
            ? <button className="customers-secondary-button" disabled={actionBusy} onClick={onRestore} type="button"><RotateCcw size={15}/>{labels.restore}</button>
            : <button className="customers-secondary-button" disabled={actionBusy} onClick={onArchive} type="button"><Archive size={15}/>{labels.archive}</button>)}
          {conversation.unreadCount > 0 && (
            <button className="customers-secondary-button" disabled={actionBusy} onClick={onMarkRead} type="button">{labels.markRead}</button>
          )}
        </div>
      </header>
      {(actionError || replyError) && <div className="admin-inbox-inline-error" role="alert">{actionError || replyError}</div>}
      <div className="admin-inbox-messages" ref={listRef}>
        {!messages.length ? <div className="admin-inbox-list-empty admin-inbox-messages-empty"><p>{labels.emptyMessages}</p></div> : messages.map((message) => {
          const mine = message.senderUserId === currentUser?.id;
          const staff = message.senderType === "staff";
          return (
            <article className={`admin-inbox-message${staff ? " staff" : " customer"}${mine ? " mine" : ""}`} key={message.id}>
              <header><strong>{message.sender?.name || message.sender?.email || (staff ? "Staff" : "Customer")}</strong><time>{formatInboxWhen(message.createdAt, language)}</time></header>
              <p>{message.body}</p>
            </article>
          );
        })}
      </div>
      <footer className="admin-inbox-composer">
        {readOnly && <p className="admin-inbox-inline-note">{labels.readOnly}</p>}
        {!readOnly && !canReply && <p className="admin-inbox-inline-note">{labels.replyDenied}</p>}
        {canReply && blockedLabel && <p className="admin-inbox-inline-note">{blockedLabel}</p>}
        {canReply && !blocked && (
          <>
            <textarea aria-label={labels.messagePlaceholder} disabled={replyBusy} maxLength={10000} onChange={(event) => setDraft(event.target.value)} placeholder={labels.messagePlaceholder} rows={3} value={draft}/>
            <button className="customers-primary-button" disabled={replyBusy || !draft.trim()} onClick={() => onReply(draft.trim())} type="button">{replyBusy ? <LoaderCircle className="crm-spin" size={16}/> : <Send size={15}/>}{labels.send}</button>
          </>
        )}
      </footer>
    </section>
  );
}

export default function AdminInboxPage({ language = "en", t: translate, currentUser, onNavigate, company, ...layout }) {
  const labels = LABELS[language] || LABELS.en;
  const ar = language === "ar";
  const [listFilter, setListFilter] = React.useState("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [conversations, setConversations] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [conversation, setConversation] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [contacts, setContacts] = React.useState([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listError, setListError] = React.useState("");
  const [threadLoading, setThreadLoading] = React.useState(false);
  const [threadError, setThreadError] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [showUnsupported, setShowUnsupported] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [loadingContacts, setLoadingContacts] = React.useState(false);
  const [createBusy, setCreateBusy] = React.useState(false);
  const [createError, setCreateError] = React.useState("");
  const [replyBusy, setReplyBusy] = React.useState(false);
  const [replyError, setReplyError] = React.useState("");
  const [actionBusy, setActionBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState("");
  const [assigneeFilter, setAssigneeFilter] = React.useState("");
  const [nextCursor, setNextCursor] = React.useState(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const listRequest = React.useRef(0);
  const threadRequest = React.useRef(0);

  const canCreate = canUseInboxAction(currentUser, "inbox.create");
  const canReply = canUseInboxAction(currentUser, "inbox.reply");
  const canAssign = canUseInboxAction(currentUser, "inbox.assign");
  const canUpdate = canUseInboxAction(currentUser, "inbox.update");
  const canArchive = canUseInboxAction(currentUser, "inbox.archive");

  React.useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const buildListFilters = React.useCallback((cursor = null) => {
    const filters = { q: query, limit: 50 };
    if (listFilter === "archived") filters.archived = true;
    else {
      filters.archived = false;
      if (listFilter === "unread") filters.unread = true;
      if (listFilter === "open") filters.status = "open";
    }
    if (assigneeFilter === "__unassigned__") filters.unassigned = true;
    else if (assigneeFilter) filters.assignedTo = assigneeFilter;
    if (cursor) filters.cursor = cursor;
    return filters;
  }, [assigneeFilter, listFilter, query]);

  React.useEffect(() => {
    const controller = new AbortController();
    const requestId = ++listRequest.current;
    setListLoading(true);
    setListError("");
    setNextCursor(null);
    fetchInboxConversations(buildListFilters(), { signal: controller.signal }).then((data) => {
      if (requestId !== listRequest.current) return;
      setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
      setNextCursor(data?.nextCursor || null);
      setListLoading(false);
    }).catch((error) => {
      if (error?.name === "AbortError" || requestId !== listRequest.current) return;
      setConversations([]);
      setNextCursor(null);
      setListError(error?.message || labels.errorDescription);
      setListLoading(false);
    });
    return () => controller.abort();
  }, [buildListFilters, company?.id, labels.errorDescription, refreshKey]);

  React.useEffect(() => {
    if (!canAssign && !canCreate) return undefined;
    const controller = new AbortController();
    fetchEmployees().then((data) => {
      if (controller.signal.aborted) return;
      setEmployees(Array.isArray(data) ? data.filter((employee) => employee.isActive !== false) : []);
    }).catch(() => setEmployees([]));
    return () => controller.abort();
  }, [canAssign, canCreate, company?.id]);

  React.useEffect(() => {
    if (!selectedId) {
      setConversation(null);
      setMessages([]);
      setThreadError("");
      setThreadLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const requestId = ++threadRequest.current;
    setThreadLoading(true);
    setThreadError("");
    fetchInboxConversation(selectedId, { signal: controller.signal }).then(async (data) => {
      if (requestId !== threadRequest.current) return;
      setConversation(data.conversation || null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setThreadLoading(false);
      if (data.conversation?.unreadCount > 0) {
        try {
          await markInboxConversationRead(selectedId);
          setConversation((current) => current ? { ...current, unreadCount: 0 } : current);
          setConversations((current) => current.map((item) => item.id === selectedId ? { ...item, unreadCount: 0 } : item));
        } catch {
          /* read state is best-effort */
        }
      }
    }).catch((error) => {
      if (error?.name === "AbortError" || requestId !== threadRequest.current) return;
      setConversation(null);
      setMessages([]);
      setThreadError(error?.message || labels.errorDescription);
      setThreadLoading(false);
    });
    return () => controller.abort();
  }, [labels.errorDescription, refreshKey, selectedId]);

  React.useEffect(() => {
    if (!showCreate) return undefined;
    const controller = new AbortController();
    setLoadingContacts(true);
    fetchCustomers({ archived: "false", limit: 100 }, { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      setContacts(Array.isArray(data) ? data : []);
      setLoadingContacts(false);
    }).catch(() => {
      setContacts([]);
      setLoadingContacts(false);
    });
    return () => controller.abort();
  }, [showCreate]);

  const hasFilters = Boolean(query) || listFilter !== "all" || Boolean(assigneeFilter);
  const refresh = () => setRefreshKey((value) => value + 1);

  async function loadMoreConversations() {
    if (!nextCursor || loadingMore || listLoading) return;
    setLoadingMore(true);
    try {
      const data = await fetchInboxConversations(buildListFilters(nextCursor));
      setConversations((current) => [...current, ...(Array.isArray(data?.conversations) ? data.conversations : [])]);
      setNextCursor(data?.nextCursor || null);
    } catch {
      setListError(labels.errorDescription);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleCreate(payload) {
    if (!canCreate) return;
    setCreateBusy(true);
    setCreateError("");
    try {
      const created = await createInboxConversation(payload);
      setShowCreate(false);
      setListFilter("all");
      setSearchInput("");
      setQuery("");
      setSelectedId(created.id);
      refresh();
    } catch (error) {
      setCreateError(error?.message || labels.createError);
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleReply(body) {
    if (!canReply || !selectedId) return;
    setReplyBusy(true);
    setReplyError("");
    try {
      const message = await replyToInboxConversation(selectedId, body);
      setMessages((current) => [...current, message]);
      setConversation((current) => current ? { ...current, lastMessage: message, lastMessageAt: message.createdAt, status: "open" } : current);
      setConversations((current) => current.map((item) => item.id === selectedId ? { ...item, lastMessage: message, lastMessageAt: message.createdAt, status: "open", unreadCount: 0 } : item).sort((a, b) => String(b.lastMessageAt || b.updatedAt).localeCompare(String(a.lastMessageAt || a.updatedAt))));
    } catch (error) {
      setReplyError(error?.message || labels.replyError);
    } finally {
      setReplyBusy(false);
    }
  }

  async function runAction(action) {
    if (!selectedId) return;
    setActionBusy(true);
    setActionError("");
    try {
      const updated = await action();
      setConversation(updated);
      setConversations((current) => {
        const next = current.map((item) => item.id === updated.id ? { ...item, ...updated } : item);
        if (listFilter !== "archived" && updated.archivedAt) return next.filter((item) => item.id !== updated.id);
        return next;
      });
      if (updated.archivedAt && listFilter !== "archived") {
        setSelectedId(null);
      }
      refresh();
    } catch (error) {
      setActionError(error?.message || labels.errorDescription);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleMarkRead() {
    if (!selectedId) return;
    setActionBusy(true);
    setActionError("");
    try {
      await markInboxConversationRead(selectedId);
      setConversation((current) => current ? { ...current, unreadCount: 0 } : current);
      setConversations((current) => current.map((item) => item.id === selectedId ? { ...item, unreadCount: 0 } : item));
    } catch (error) {
      setActionError(error?.message || labels.errorDescription);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <AdminLayout
      activePage="admin-inbox"
      company={company}
      currentUser={currentUser}
      hideHeader
      language={language}
      t={translate}
      {...layout}
    >
      <div className="admin-inbox-page" dir={ar ? "rtl" : "ltr"}>
        <header className="admin-inbox-page-header">
          <div><h1>{labels.title}</h1><p>{labels.subtitle}</p></div>
          <div className="admin-inbox-header-actions">
            <button className="customers-secondary-button" onClick={() => setShowUnsupported(true)} type="button"><Globe size={16}/>{labels.connectMeta}</button>
            <button className="customers-secondary-button" onClick={() => setShowUnsupported(true)} type="button"><Settings size={16}/>{labels.settings}<ChevronDown size={14}/></button>
            {canCreate && <button className="customers-primary-button" onClick={() => setShowCreate(true)} type="button"><SquarePen size={16}/>{labels.newMessage}</button>}
          </div>
        </header>

        <section className="admin-inbox-setup-banner admin-inbox-info-banner"><MessageCircle size={18}/><span>{labels.externalBanner}</span><button onClick={() => setShowUnsupported(true)} type="button">{labels.metaDeferred}</button></section>

        <section className={`admin-inbox-workspace${selectedId ? " has-selection" : ""}`}>
          <aside aria-label={labels.all} className="admin-inbox-conversations">
            <div className="inbox-channel-picker admin-inbox-filter-tabs">
              {["all", "open", "unread", "archived"].map((key) => (
                <button className={listFilter === key ? "active" : ""} key={key} onClick={() => { setListFilter(key); setSelectedId(null); }} type="button">
                  <MessagesSquare size={15}/>{labels[key === "all" ? "all" : key === "open" ? "filterOpen" : key === "unread" ? "filterUnread" : "filterArchived"]}
                </button>
              ))}
            </div>
            <div className="admin-inbox-list-toolbar">
              {(canAssign || employees.length > 0) && (
                <label className="admin-inbox-assign-filter">
                  <span>{labels.filterAssignee}</span>
                  <select aria-label={labels.filterAssignee} disabled={listLoading} onChange={(event) => { setAssigneeFilter(event.target.value); setSelectedId(null); }} value={assigneeFilter}>
                    <option value="">{labels.all}</option>
                    <option value="__unassigned__">{labels.filterUnassigned}</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name || employee.email || employee.id}</option>)}
                  </select>
                </label>
              )}
              <label className="contacts-search admin-inbox-search"><Search size={16}/><input aria-label={labels.search} onChange={(event) => setSearchInput(event.target.value)} placeholder={labels.search} value={searchInput}/>{searchInput && <button aria-label="Clear" onClick={() => setSearchInput("")} type="button"><X size={14}/></button>}</label>
              <button aria-label={labels.retry} className="customers-icon-button" disabled={listLoading} onClick={refresh} type="button"><RefreshCw className={listLoading ? "crm-spin" : ""} size={16}/></button>
            </div>
            <div className="admin-inbox-list-scroll">
              {listLoading ? <div className="admin-inbox-list-loading"><LoaderCircle className="crm-spin" size={24}/><span>{labels.loading}</span></div>
                : listError ? <div className="admin-inbox-list-empty admin-inbox-error" role="alert"><MessagesSquare size={28}/><strong>{labels.error}</strong><p>{labels.errorDescription}</p><small>{listError}</small><button className="customers-secondary-button" onClick={refresh} type="button">{labels.retry}</button></div>
                  : conversations.length ? <>
                    {conversations.map((item) => <ConversationListItem active={item.id === selectedId} conversation={item} key={item.id} labels={labels} language={language} onSelect={setSelectedId}/>)}
                    {nextCursor && <button className="admin-inbox-load-more customers-secondary-button" disabled={loadingMore} onClick={loadMoreConversations} type="button">{loadingMore ? <LoaderCircle className="crm-spin" size={16}/> : null}{labels.loadMore}</button>}
                  </>
                    : <div className="admin-inbox-list-empty"><span className="admin-inbox-mini-visual"><MessagesSquare size={27}/></span><strong>{hasFilters ? labels.emptyFiltered : labels.emptyList}</strong><p>{hasFilters ? labels.emptyFilteredDescription : labels.emptyListDescription}</p>{canCreate && !hasFilters && <button className="customers-primary-button" onClick={() => setShowCreate(true)} type="button"><SquarePen size={15}/>{labels.create}</button>}</div>}
            </div>
          </aside>

          <ThreadPanel
            actionBusy={actionBusy}
            actionError={actionError}
            canArchive={canArchive}
            canAssign={canAssign}
            canReply={canReply}
            canUpdate={canUpdate}
            conversation={conversation}
            currentUser={currentUser}
            employees={employees}
            language={language}
            labels={labels}
            messages={messages}
            onArchive={() => runAction(() => archiveInboxConversation(selectedId))}
            onAssign={(employeeId) => runAction(() => assignInboxConversation(selectedId, employeeId))}
            onBack={() => setSelectedId(null)}
            onMarkRead={handleMarkRead}
            onNavigate={onNavigate}
            onReply={handleReply}
            onRestore={() => runAction(() => restoreInboxConversation(selectedId))}
            onToggleStatus={() => runAction(() => updateInboxConversation(selectedId, { status: conversation.status === "closed" ? "open" : "closed" }))}
            replyBusy={replyBusy}
            replyError={replyError}
            showBack={Boolean(selectedId)}
            threadError={threadError}
            threadLoading={threadLoading && Boolean(selectedId)}
          />
        </section>
        {createError && <div className="crm-contact-notice error" role="alert"><span>{createError}</span><button aria-label="Close" onClick={() => setCreateError("")} type="button"><X size={15}/></button></div>}
      </div>
      {showUnsupported && <InboxUnsupported onClose={() => setShowUnsupported(false)} t={translate}/>}
      {showCreate && <NewConversationDialog contacts={contacts} language={language} labels={labels} loadingContacts={loadingContacts} onClose={() => !createBusy && setShowCreate(false)} onSubmit={handleCreate} submitting={createBusy}/>}
    </AdminLayout>
  );
}
