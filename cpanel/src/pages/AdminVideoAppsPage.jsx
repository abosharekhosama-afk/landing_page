import React from "react";
import {
  AppWindow,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  Blocks,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Edit3,
  Film,
  Globe2,
  Languages,
  Mail,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  Play,
  Plus,
  Radio,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminMediaField from "../components/AdminMediaField.jsx";
import { AdminUnderDevelopmentContent } from "./AdminPlaceholderPage.jsx";
import { resolveApiAssetUrl } from "../utils/api.js";
import { tenantStorageKey } from "../utils/companyContext.js";
import {
  canManageVideoLibrary,
  canViewTenantApps,
  canViewVideoLibrary,
  enabledCompanyApps,
  normalizeVlogMediaType,
  videoAppsDirection,
  vlogPreviewUrl,
} from "../utils/videoApps.js";

const pageCopy = {
  "admin-vlogs": [
    "Video Library",
    "Manage and organize the video content available to your audience.",
    "الفيديوهات",
    "أدر محتوى الفيديو المتاح لواجهة متجر هذه الشركة.",
  ],
  "admin-tenant-placeholder-video-live-stream": [
    "Live Stream",
    "Host real-time video events when streaming is available.",
    "البث المباشر",
    "استضف فعاليات فيديو مباشرة عند توفر البث.",
  ],
  "admin-tenant-placeholder-video-channels": [
    "Channels",
    "Organize real video content into channels.",
    "القنوات",
    "نظّم محتوى الفيديو الحقيقي ضمن قنوات.",
  ],
  "admin-tenant-placeholder-apps-manage": [
    "Manage Apps",
    "Review apps and business solutions enabled for this company.",
    "إدارة التطبيقات",
    "راجع الوحدات والميزات المفعّلة لهذه الشركة.",
  ],
  "admin-tenant-placeholder-apps-market": [
    "App Market",
    "Explore optional tools that can extend the company workspace.",
    "سوق التطبيقات",
    "استكشف أدوات اختيارية يمكنها توسيع مساحة عمل الشركة.",
  ],
};

function labelsFor(language) {
  return language === "ar"
    ? {
        actionRequired: "يتطلب إجراء",
        apps: "التطبيقات",
        availableFeatures: "ميزات الشركة المتاحة",
        cancel: "إلغاء",
        categories: "التصنيفات",
        channels: "القنوات",
        configure: "إعداد",
        createChannel: "إنشاء قناة",
        defaultChannel: "القناة الافتراضية",
        enabled: "مفعّل",
        enabledModules: "الوحدات المفعّلة",
        explore: "استكشاف",
        getMoreApps: "المزيد من التطبيقات",
        goLive: "بدء البث",
        home: "الرئيسية",
        live: "مباشر",
        manage: "إدارة",
        offers: "العروض",
        open: "فتح",
        save: "حفظ",
        schedule: "جدولة فعالية",
        search: "بحث",
        selectAll: "تحديد الكل",
        settings: "إعدادات صفحة الفيديو",
        sort: "ترتيب",
        underDevelopment: "هذه الميزة قيد التطوير",
        upload: "إضافة فيديو",
        videos: "الفيديوهات",
      }
    : {
        actionRequired: "Action required",
        apps: "Apps",
        availableFeatures: "Business solutions",
        cancel: "Cancel",
        categories: "Categories",
        channels: "Channels",
        configure: "Configure",
        createChannel: "Create channel",
        defaultChannel: "Default channel",
        enabled: "Enabled",
        enabledModules: "Installed / Enabled apps",
        explore: "Explore",
        getMoreApps: "Get More Apps",
        goLive: "Go Live",
        home: "Home",
        live: "Live",
        manage: "Manage",
        offers: "Offers",
        open: "Open Dashboard",
        save: "Save",
        schedule: "Schedule Event",
        search: "Search",
        selectAll: "Select All",
        settings: "Video page settings",
        sort: "Sort",
        underDevelopment: "This feature is under development",
        upload: "Add Videos",
        videos: "Videos",
      };
}

function VideoAppsIllustration({ type = "video" }) {
  return (
    <svg
      aria-hidden="true"
      className={`video-apps-illustration video-apps-illustration-${type}`}
      viewBox="0 0 320 210"
    >
      <rect className="video-apps-illustration-bg" height="166" rx="20" width="270" x="25" y="21" />
      <rect
        className="video-apps-illustration-window"
        height="120"
        rx="10"
        width="214"
        x="54"
        y="45"
      />
      <path
        className="video-apps-illustration-top"
        d="M54 58a13 13 0 0 1 13-13h188a13 13 0 0 1 13 13v13H54z"
      />
      {type === "video" ? (
        <>
          <rect
            className="video-apps-illustration-screen"
            height="66"
            rx="8"
            width="112"
            x="104"
            y="82"
          />
          <path className="video-apps-illustration-accent" d="m150 98 31 17-31 17z" />
        </>
      ) : null}
      {type === "live" ? (
        <>
          <circle className="video-apps-illustration-screen" cx="161" cy="115" r="36" />
          <circle className="video-apps-illustration-accent" cx="161" cy="115" r="11" />
          <path
            className="video-apps-illustration-line"
            d="M129 85a45 45 0 0 0 0 60M193 85a45 45 0 0 1 0 60"
          />
        </>
      ) : null}
      {type === "channel" ? (
        <>
          <rect
            className="video-apps-illustration-soft"
            height="28"
            rx="7"
            width="160"
            x="80"
            y="83"
          />
          <rect
            className="video-apps-illustration-soft"
            height="28"
            rx="7"
            width="160"
            x="80"
            y="121"
          />
          <circle className="video-apps-illustration-accent" cx="96" cy="97" r="8" />
          <circle className="video-apps-illustration-accent" cx="96" cy="135" r="8" />
        </>
      ) : null}
      {type === "apps" ? (
        <>
          <rect
            className="video-apps-illustration-soft"
            height="41"
            rx="9"
            width="41"
            x="105"
            y="85"
          />
          <rect
            className="video-apps-illustration-soft"
            height="41"
            rx="9"
            width="41"
            x="176"
            y="85"
          />
          <rect
            className="video-apps-illustration-soft"
            height="41"
            rx="9"
            width="41"
            x="140"
            y="130"
          />
        </>
      ) : null}
    </svg>
  );
}

function PageHeader({ actions, subtitle, title }) {
  return (
    <header className="video-apps-page-header" data-video-apps-page-header>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions && <div className="video-apps-header-actions">{actions}</div>}
    </header>
  );
}

function UnsupportedDialog({ labels, onClose, t }) {
  React.useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div
      className="video-apps-modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <div
        aria-label={labels.underDevelopment}
        aria-modal="true"
        className="video-apps-placeholder-modal"
        role="dialog"
      >
        <button
          aria-label={labels.cancel}
          className="video-apps-modal-close"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
        <AdminUnderDevelopmentContent t={t} />
      </div>
    </div>
  );
}

function getLocalizedText(value, language = "en") {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return String(value[language] ?? value.en ?? value.ar ?? "");
  }
  return String(value ?? "");
}

function readTenantValue(companyId, key, fallback) {
  if (!companyId || typeof localStorage === "undefined") return fallback;
  try {
    const parsed = JSON.parse(localStorage.getItem(tenantStorageKey(companyId, key)) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function VideosPage({ canManage, language, labels, onNavigate, onUnsupported, vlogs = [], onDeleteVlog, vlogHero, onSaveVlogHero, statusMessage, statusMessageType = "success" }) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState("newest");
  const [selected, setSelected] = React.useState(() => new Set());
  const [heroDraft, setHeroDraft] = React.useState(vlogHero || { title: { en: "", ar: "" }, imageUrl: "", videoUrl: "", posterUrl: "" });
  React.useEffect(() => {
    setSelected(new Set());
  }, [vlogs]);
  React.useEffect(() => {
    setHeroDraft(vlogHero || { title: { en: "", ar: "" }, imageUrl: "", videoUrl: "", posterUrl: "" });
  }, [vlogHero]);
  const rows = vlogs
    .filter((video) =>
      [getLocalizedText(video.title, language), getLocalizedText(video.description, language), video.slug]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
        : String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );

  function toggleVideo(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = rows.length > 0 && rows.every((video) => selected.has(video.id));

  return (
    <section className="video-list-card video-library-list">
      {statusMessage ? (
        <div className={`message-panel ${statusMessageType}`} role={statusMessageType === "error" ? "alert" : "status"}>
          {statusMessage}
        </div>
      ) : null}
      {canManage && (
        <div className="admin-vlog-hero">
          <AdminMediaField label={language === "ar" ? "فيديو الواجهة" : "Hero video"} language={language} name="videoUrl" value={heroDraft.videoUrl || ""} onChange={(event) => setHeroDraft((current) => ({ ...current, videoUrl: event.target.value }))} allowVideo />
          <AdminMediaField label={language === "ar" ? "صورة الواجهة" : "Hero image"} language={language} name="imageUrl" value={heroDraft.imageUrl || ""} onChange={(event) => setHeroDraft((current) => ({ ...current, imageUrl: event.target.value }))} />
          <AdminMediaField label={language === "ar" ? "ملصق الفيديو / صورة بديلة" : "Hero poster / fallback image"} language={language} name="posterUrl" value={heroDraft.posterUrl || ""} onChange={(event) => setHeroDraft((current) => ({ ...current, posterUrl: event.target.value }))} />
          <label>{language === "ar" ? "عنوان الواجهة بالإنجليزية" : "Hero title — English"}<input dir="ltr" value={heroDraft.title?.en || ""} onChange={(event) => setHeroDraft((current) => ({ ...current, title: { ...current.title, en: event.target.value } }))} /></label>
          <label>{language === "ar" ? "عنوان الواجهة بالعربية" : "Hero title — Arabic"}<input dir="rtl" value={heroDraft.title?.ar || ""} onChange={(event) => setHeroDraft((current) => ({ ...current, title: { ...current.title, ar: event.target.value } }))} /></label>
          <button className="admin-primary-button" onClick={() => onSaveVlogHero?.(heroDraft)} type="button">{language === "ar" ? "حفظ الواجهة" : "Save hero"}</button>
        </div>
      )}
      <div className="video-list-toolbar">
        <label className="video-select-all">
          <input
            checked={allSelected}
            onChange={() =>
              setSelected(allSelected ? new Set() : new Set(rows.map((video) => video.id)))
            }
            type="checkbox"
          />
          {labels.selectAll}
        </label>
        <button
          className="video-apps-tool-button"
          onClick={() => setSort((current) => (current === "newest" ? "oldest" : "newest"))}
          type="button"
        >
          <ArrowUpDown size={16} />
          {labels.sort}
        </button>
        <label className="video-apps-search">
          <Search size={17} />
          <input
            aria-label={labels.search}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.search}
            value={query}
          />
        </label>
      </div>
      {rows.length ? (
        <div className="tenant-video-list" data-real-video-list>
          {rows.map((video) => {
            const previewUrl = vlogPreviewUrl(video, resolveApiAssetUrl);
            const isImage = normalizeVlogMediaType(video.mediaType) === "image";
            return (
            <article className="tenant-video-card" key={video.id}>
              <input
                aria-label={`${labels.selectAll}: ${getLocalizedText(video.title, language)}`}
                checked={selected.has(video.id)}
                onChange={() => toggleVideo(video.id)}
                type="checkbox"
              />
              <div className={`tenant-video-thumb ${previewUrl ? "has-preview" : ""}`}>
                {previewUrl ? (
                  <>
                    <img alt="" src={previewUrl} />
                    {!isImage ? (
                      <span aria-hidden="true" className="tenant-video-thumb__play">
                        <Play size={25} />
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span aria-hidden="true">
                    <Play size={25} />
                  </span>
                )}
              </div>
              <div className="tenant-video-copy">
                <h2>{getLocalizedText(video.title, language)}</h2>
                <p>{getLocalizedText(video.description, language) || (language === "ar" ? "بدون وصف" : "No description")}</p>
              </div>
              <div className="tenant-video-meta">
                <span>{language === "ar" ? "النوع" : "Type"}</span>
                <strong>{isImage ? (language === "ar" ? "صورة" : "Image") : (language === "ar" ? "فيديو" : "Video")}</strong>
              </div>
              <span className={`video-status ${video.isActive === false ? "inactive" : ""}`}>
                {video.isActive === false
                  ? language === "ar"
                    ? "غير نشط"
                    : "Inactive"
                  : language === "ar"
                    ? "نشط"
                    : "Active"}
              </span>
              {video.channelName || video.channel?.name ? (
                <span className="video-channel-badge">
                  {video.channelName || video.channel.name}
                </span>
              ) : (
                <span className="video-channel-empty">—</span>
              )}
              <div className="tenant-video-actions">
                <button
                  aria-label={language === "ar" ? "تعديل الفيديو" : "Edit video"}
                  className="video-apps-icon-button"
                  onClick={() => onNavigate("admin-vlogs-new", { path: `/admin/vlogs/new?edit=${encodeURIComponent(video.id)}` })}
                  type="button"
                >
                  <Edit3 size={17} />
                </button>
                {canManage && onDeleteVlog ? (
                  <button
                    aria-label={language === "ar" ? "حذف الفيديو" : "Delete video"}
                    className="video-apps-icon-button danger"
                    onClick={() => onDeleteVlog(video.id)}
                    type="button"
                  >
                    <Trash2 size={17} />
                  </button>
                ) : null}
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <div className="video-apps-empty" data-video-empty>
          <VideoAppsIllustration type="video" />
          <h2>{language === "ar" ? "لا توجد فيديوهات بعد" : "No videos yet"}</h2>
          <p>
            {language === "ar"
              ? "ستظهر سجلات الفيديو الحقيقية لهذه الشركة هنا."
              : "Real video records for this company will appear here."}
          </p>
          {canManage && (
            <button
              className="admin-primary-button"
              onClick={() => onNavigate("admin-vlogs-new")}
              type="button"
            >
              <Plus size={16} />
              {labels.upload}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function LiveStreamPage({ language, labels, onUnsupported }) {
  return (
    <section className="live-stream-onboarding" data-live-stream-onboarding>
      <div className="live-stream-intro">
        <h2>
          {language === "ar"
            ? "ابدأ البث المباشر على موقعك في أي وقت ومن أي مكان"
            : "Go live on your site anytime, from anywhere"}
        </h2>
        <p>
          {language === "ar"
            ? "اختر طريقة بدء البث المناسبة لك. تتوفر خيارات الإعداد عند اكتمال دعم البث."
            : "Choose how you want to start. Streaming setup options will be available when live video support is ready."}
        </p>
      </div>
      <div className="live-stream-options">
        <article className="live-stream-option-card">
          <div className="live-card-illustration schedule">
            <CalendarClock size={56} strokeWidth={1.35} />
            <span>
              <Play size={20} />
            </span>
          </div>
          <div className="live-option-copy">
            <h3>{language === "ar" ? "جدولة فعالية لوقت لاحق" : "Schedule an event for later"}</h3>
            <p>
              {language === "ar"
                ? "خطط للبث مسبقاً وحدد التاريخ والوقت."
                : "Plan a future stream and prepare its date and time."}
            </p>
            <button className="admin-primary-button" onClick={onUnsupported} type="button">
              {labels.schedule}
            </button>
          </div>
        </article>
        <article className="live-stream-option-card">
          <div className="live-card-illustration live-now">
            <Radio size={56} strokeWidth={1.35} />
            <span>{labels.live}</span>
          </div>
          <div className="live-option-copy">
            <h3>{language === "ar" ? "ابدأ البث الآن" : "Go live now"}</h3>
            <p>
              {language === "ar"
                ? "اختر البث من الهاتف أو جهاز سطح المكتب."
                : "Choose to stream from a mobile device or desktop."}
            </p>
            <div className="live-device-actions">
              <button className="secondary-action" onClick={onUnsupported} type="button">
                <Smartphone size={16} />
                {language === "ar" ? "الهاتف" : "Mobile"}
              </button>
              <button className="secondary-action" onClick={onUnsupported} type="button">
                <Monitor size={16} />
                {language === "ar" ? "سطح المكتب" : "Desktop"}
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function ChannelsPage({ channels = [], language, labels, onUnsupported }) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState("name");
  const rows = channels
    .filter((channel) =>
      [channel.name, channel.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      const result = String(a.name || "").localeCompare(String(b.name || ""), language);
      return sort === "name" ? result : -result;
    });
  return (
    <>
      <div className="channels-toolbar">
        <button
          className="video-apps-tool-button"
          onClick={() => setSort((current) => (current === "name" ? "reverse" : "name"))}
          type="button"
        >
          <ArrowUpDown size={16} />
          {labels.sort}
        </button>
        <label className="video-apps-search">
          <Search size={17} />
          <input
            aria-label={labels.search}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.search}
            value={query}
          />
        </label>
      </div>
      <div className="channel-card-grid">
        {rows.map((channel) => (
          <article className="channel-card" key={channel.id}>
            <div className="channel-card-cover">
              {channel.imageUrl ? (
                <img alt="" src={channel.imageUrl} />
              ) : (
                <VideoAppsIllustration type="channel" />
              )}
            </div>
            <div>
              <h2>{channel.name}</h2>
              <p>{channel.description || ""}</p>
              {channel.isDefault === true && (
                <span className="channel-default">
                  <CheckCircle2 size={13} />
                  {labels.defaultChannel}
                </span>
              )}
            </div>
            <button className="video-apps-icon-button" onClick={onUnsupported} type="button">
              <MoreHorizontal size={18} />
            </button>
          </article>
        ))}
        {!rows.length && (
          <article className="channel-card channel-empty-card" data-channel-empty>
            <div className="channel-card-cover">
              <VideoAppsIllustration type="channel" />
            </div>
            <div>
              <h2>{language === "ar" ? "لا توجد قنوات بعد" : "No channels yet"}</h2>
              <p>
                {language === "ar"
                  ? "ستظهر قنوات الشركة الحقيقية هنا عند إنشائها."
                  : "Real company channels will appear here when they are created."}
              </p>
            </div>
          </article>
        )}
        <button className="channel-create-card" onClick={onUnsupported} type="button">
          <span>
            <Plus size={24} />
          </span>
          <strong>{labels.createChannel}</strong>
          <small>
            {language === "ar"
              ? "نظّم فيديوهاتك ضمن قناة جديدة."
              : "Organize videos in a new channel."}
          </small>
        </button>
      </div>
    </>
  );
}

const featureIcons = {
  analytics: BarChart3,
  bookings: CalendarDays,
  forms: ClipboardList,
  marketing: Sparkles,
  multilingual: Languages,
  "store-catalog": Store,
  "video-library": Video,
};

function FeatureRow({ app, labels, language, onNavigate, onUnsupported }) {
  const Icon = featureIcons[app.id] || AppWindow;
  return (
    <article className="manage-app-row">
      <span className={`manage-app-icon feature-${app.id}`}>
        <Icon size={24} />
      </span>
      <div>
        <h3>{app.label[language] || app.label.en}</h3>
        <p>{app.description[language] || app.description.en}</p>
      </div>
      <span className="manage-app-status">
        <CheckCircle2 size={13} />
        {labels.enabled}
      </span>
      <button
        className="secondary-action"
        onClick={() => (app.pageKey ? onNavigate(app.pageKey) : onUnsupported())}
        type="button"
      >
        {app.pageKey ? labels.open : labels.configure}
      </button>
      <ChevronRight className="manage-app-arrow" size={18} />
    </article>
  );
}

const recommendedApps = [
  { id: "campaigns", en: "Campaign Studio", ar: "استوديو الحملات", icon: Mail },
  { id: "appointments", en: "Smart Appointments", ar: "المواعيد الذكية", icon: CalendarDays },
  { id: "forms", en: "Customer Forms", ar: "نماذج العملاء", icon: ClipboardList },
];

function ManageAppsPage({ language, labels, modules, onNavigate, onUnsupported }) {
  const enabled = enabledCompanyApps(modules);
  const installed = enabled.filter((app) => app.group === "installed");
  const business = enabled.filter((app) => app.group === "business");
  const renderEmpty = (copy) => (
    <div className="manage-app-empty-row">
      <Blocks size={22} />
      <span>{copy}</span>
    </div>
  );
  return (
    <div className="manage-app-groups" data-friendly-app-list>
      <section className="manage-app-list-card">
        <div className="manage-app-section-title">
          <h2>{labels.actionRequired}</h2>
          <span>0</span>
        </div>
        {renderEmpty(
          language === "ar"
            ? "لا توجد إجراءات إعداد مؤكدة مطلوبة حالياً."
            : "No confirmed setup actions are required right now.",
        )}
        <div className="manage-app-section-title">
          <h2>{labels.enabledModules}</h2>
          <span>{installed.length}</span>
        </div>
        <div className="manage-app-rows">
          {installed.length
            ? installed.map((app) => (
                <FeatureRow
                  app={app}
                  key={app.id}
                  labels={labels}
                  language={language}
                  onNavigate={onNavigate}
                  onUnsupported={onUnsupported}
                />
              ))
            : renderEmpty(
                language === "ar"
                  ? "لا توجد تطبيقات مفعّلة مؤكدة."
                  : "No enabled company apps are confirmed.",
              )}
        </div>
        <div className="manage-app-section-title">
          <h2>{labels.availableFeatures}</h2>
          <span>{business.length}</span>
        </div>
        <div className="manage-app-rows">
          {business.length
            ? business.map((app) => (
                <FeatureRow
                  app={app}
                  key={app.id}
                  labels={labels}
                  language={language}
                  onNavigate={onNavigate}
                  onUnsupported={onUnsupported}
                />
              ))
            : renderEmpty(
                language === "ar"
                  ? "لا توجد حلول أعمال مفعّلة مؤكدة."
                  : "No enabled business solutions are confirmed.",
              )}
        </div>
      </section>
      <section className="manage-recommended">
        <div className="app-market-section-head">
          <div>
            <h2>{language === "ar" ? "مقترح لك" : "Recommended for you"}</h2>
            <p>
              {language === "ar"
                ? "أمثلة قابلة للاكتشاف وليست مثبتة أو متصلة."
                : "Discoverable examples—not installed or connected."}
            </p>
          </div>
        </div>
        <div className="manage-recommended-grid">
          {recommendedApps.map((app) => (
            <article className="manage-recommended-card" key={app.id}>
              <span>
                <app.icon size={23} />
              </span>
              <div>
                <h3>{language === "ar" ? app.ar : app.en}</h3>
                <small>{language === "ar" ? "مثال قابل للاكتشاف" : "Discoverable example"}</small>
              </div>
              <button className="secondary-action" onClick={onUnsupported} type="button">
                {labels.explore}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const marketCategories = [
  {
    id: "marketing",
    en: "Marketing",
    ar: "التسويق",
    icon: Sparkles,
    sub: ["Email Marketing", "SEO", "Ads & Campaigns", "Loyalty"],
  },
  {
    id: "sell",
    en: "Sell Online",
    ar: "البيع عبر الإنترنت",
    icon: ShoppingBag,
    sub: ["Online Store", "Payments", "Shipping & Delivery", "Inventory"],
  },
  {
    id: "services",
    en: "Services & Events",
    ar: "الخدمات والفعاليات",
    icon: CalendarDays,
    sub: ["Bookings", "Events", "Tickets", "Memberships"],
  },
  {
    id: "media",
    en: "Media & Content",
    ar: "الوسائط والمحتوى",
    icon: Film,
    sub: ["Video", "Music & Audio", "Galleries", "Blogs"],
  },
  {
    id: "design",
    en: "Design Elements",
    ar: "عناصر التصميم",
    icon: Blocks,
    sub: ["Widgets", "Menus", "Forms", "Visual Effects"],
  },
  {
    id: "communication",
    en: "Communication",
    ar: "التواصل",
    icon: MessageSquare,
    sub: ["Live Chat", "Email", "Customer Support", "Notifications"],
  },
];

const marketExamples = [
  {
    id: "mailflow",
    title: "MailFlow Campaigns",
    description: "Build targeted email journeys for your audience.",
    price: "Free plan available",
    rating: "4.7",
    reviews: "218",
    icon: Mail,
    choice: true,
  },
  {
    id: "bookwise",
    title: "BookWise Calendar",
    description: "A discoverable scheduling example for service businesses.",
    price: "From $8/month",
    rating: "4.6",
    reviews: "94",
    icon: CalendarDays,
  },
  {
    id: "socialdesk",
    title: "Social Desk",
    description: "Plan and organize social content in one workspace.",
    price: "Free trial",
    rating: "4.8",
    reviews: "156",
    icon: Sparkles,
  },
  {
    id: "formcraft",
    title: "FormCraft",
    description: "Create polished customer forms and lead capture flows.",
    price: "Free",
    rating: "4.5",
    reviews: "71",
    icon: ClipboardList,
  },
];

function AppMarketPage({ language, labels, onUnsupported }) {
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState(null);
  const examples = marketExamples.filter((app) =>
    [app.title, app.description].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const openUnsupported = () => onUnsupported();
  return (
    <section className="app-market-shell" data-market-examples-not-installed>
      <aside className="app-market-sidebar">
        <label className="app-market-search">
          <Search size={16} />
          <input
            aria-label={labels.search}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.search}
            value={query}
          />
        </label>
        <nav aria-label={language === "ar" ? "تنقل سوق التطبيقات" : "App Market navigation"}>
          <button className="active" onClick={openUnsupported} type="button">
            <Store size={17} />
            {labels.home}
          </button>
          <button onClick={openUnsupported} type="button">
            <Tag size={17} />
            {labels.offers}
          </button>
          <button onClick={openUnsupported} type="button">
            <Sparkles size={17} />
            {language === "ar" ? "تطبيقات مخفّضة" : "Apps on Sale"}
          </button>
          <div className="app-market-nav-label">{labels.categories}</div>
          {marketCategories.map((category) => {
            const Icon = category.icon;
            return (
              <div
                className="app-market-category"
                key={category.id}
                onMouseEnter={() => setActiveCategory(category.id)}
                onMouseLeave={() => setActiveCategory(null)}
              >
                <button
                  aria-expanded={activeCategory === category.id}
                  onClick={() => {
                    setActiveCategory(category.id);
                    openUnsupported();
                  }}
                  onFocus={() => setActiveCategory(category.id)}
                  type="button"
                >
                  <Icon size={17} />
                  {language === "ar" ? category.ar : category.en}
                  <ChevronRight size={14} />
                </button>
                <div className="app-market-flyout" data-open={activeCategory === category.id}>
                  <strong>{language === "ar" ? category.ar : category.en}</strong>
                  <div>
                    {category.sub.map((item) => (
                      <button key={item} onClick={openUnsupported} type="button">
                        {item}
                        <ChevronRight size={13} />
                      </button>
                    ))}
                  </div>
                  <button className="app-market-view-all" onClick={openUnsupported} type="button">
                    {language === "ar" ? "عرض كل التطبيقات" : "View all apps"}
                  </button>
                </div>
              </div>
            );
          })}
          <div className="app-market-nav-label">{language === "ar" ? "استكشاف" : "Explore"}</div>
          <button onClick={openUnsupported} type="button">
            <Star size={17} />
            {language === "ar" ? "الأكثر شيوعاً" : "Most Popular"}
          </button>
          <button onClick={openUnsupported} type="button">
            <Sparkles size={17} />
            {language === "ar" ? "تطبيقات جديدة" : "New Apps"}
          </button>
          <div className="app-market-nav-label">
            {language === "ar" ? "تطبيقات لمساعدتك" : "Apps to Help You"}
          </div>
          <button onClick={openUnsupported} type="button">
            <BarChart3 size={17} />
            {language === "ar" ? "تنمية نشاطك" : "Grow Your Business"}
          </button>
          <button onClick={openUnsupported} type="button">
            <Globe2 size={17} />
            {language === "ar" ? "الوصول لعملاء أكثر" : "Reach More Customers"}
          </button>
        </nav>
      </aside>
      <div className="app-market-content">
        <div className="app-market-main-heading">
          <div>
            <h1>{language === "ar" ? "سوق التطبيقات" : "App Market"}</h1>
            <p>
              {language === "ar"
                ? "اكتشف أدوات تساعدك على توسيع أعمالك."
                : "Discover tools that can help extend your business."}
            </p>
          </div>
          <label className="app-market-main-search">
            <Search size={19} />
            <input
              aria-label={labels.search}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={language === "ar" ? "ابحث في التطبيقات" : "Search apps"}
              value={query}
            />
          </label>
        </div>
        <section className="app-market-hero">
          <div>
            <span className="video-apps-eyebrow">iGroup App Market</span>
            <h2>
              {language === "ar"
                ? "أضف الأدوات المناسبة لعملك"
                : "Find the right tools for your business"}
            </h2>
            <p>
              {language === "ar"
                ? "تصفح أمثلة قابلة للاكتشاف. لا يظهر أي تطبيق كمثبت أو متصل."
                : "Browse discoverable examples. No app is shown as installed or connected."}
            </p>
            <button className="admin-primary-button" onClick={openUnsupported} type="button">
              {labels.explore}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <VideoAppsIllustration type="apps" />
        </section>
        <div className="app-market-section-head">
          <div>
            <h2>{language === "ar" ? "تطبيقات موصى بها" : "Recommended apps"}</h2>
            <p>
              {language === "ar"
                ? "أمثلة لاكتشاف إمكانات إضافية"
                : "Examples for discovering additional capabilities"}
            </p>
          </div>
          <button className="video-apps-tool-button" onClick={openUnsupported} type="button">
            {language === "ar" ? "تصفية" : "Filter"}
          </button>
        </div>
        <div className="app-market-grid">
          {examples.map((app) => {
            const Icon = app.icon;
            return (
              <article
                className="app-market-card"
                key={app.id}
                onClick={openUnsupported}
                onKeyDown={(event) => event.key === "Enter" && openUnsupported()}
                role="button"
                tabIndex={0}
              >
                <span className="app-market-card-icon">
                  <Icon size={27} />
                </span>
                {app.choice && <span className="app-market-choice">iGroup Choice</span>}
                <div>
                  <h3>{app.title}</h3>
                  <p>{app.description}</p>
                </div>
                <div className="app-market-card-meta">
                  <strong>{app.price}</strong>
                  <span>
                    <Star fill="currentColor" size={13} />
                    {app.rating} ({app.reviews})
                  </span>
                </div>
                <span className="app-market-discoverable">
                  {language === "ar" ? "مثال قابل للاكتشاف" : "Discoverable example"}
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function AdminVideoAppsPage({
  activePage,
  company,
  currentUser,
  language = "en",
  modules = [],
  onNavigate,
  onDeleteVlog,
  onSaveVlogHero,
  statusMessage,
  statusMessageType = "success",
  vlogHero,
  vlogs = [],
  t,
  ...layout
}) {
  const [showUnsupported, setShowUnsupported] = React.useState(false);
  const labels = labelsFor(language);
  const ar = language === "ar";
  const copy = pageCopy[activePage] || pageCopy["admin-vlogs"];
  const enabledApps = enabledCompanyApps(modules);
  const baseTitle = ar ? copy[2] : copy[0];
  const title =
    activePage === "admin-tenant-placeholder-video-channels"
      ? `${baseTitle} (0)`
      : activePage === "admin-tenant-placeholder-apps-manage"
        ? `${baseTitle} (${enabledApps.length})`
        : baseTitle;
  const subtitle = ar ? copy[3] : copy[1];
  const isVideosPage = activePage === "admin-vlogs";
  const canView = isVideosPage
    ? canViewVideoLibrary(currentUser, modules, company)
    : canViewTenantApps(currentUser, company);
  const canManage = canManageVideoLibrary(currentUser, company);
  const showPageHeader = ![
    "admin-tenant-placeholder-video-live-stream",
    "admin-tenant-placeholder-apps-market",
  ].includes(activePage);
  const unsupported = () => setShowUnsupported(true);

  function headerActions() {
    if (!canView || !canManage) return null;
    if (activePage === "admin-vlogs")
      return (
        <>
          <button
            className="secondary-action"
            onClick={() => onNavigate("admin-tenant-placeholder-video-live-stream")}
            type="button"
          >
            <Radio size={16} />
            {ar ? "البث المباشر" : "Live Stream"}
          </button>
          <button
            className="admin-primary-button"
            onClick={() => onNavigate("admin-vlogs-new")}
            type="button"
          >
            <Upload size={16} />
            {labels.upload}
          </button>
        </>
      );
    if (activePage === "admin-tenant-placeholder-video-channels")
      return (
        <button className="admin-primary-button" onClick={unsupported} type="button">
          <Plus size={16} />
          {labels.createChannel}
        </button>
      );
    if (activePage === "admin-tenant-placeholder-apps-manage")
      return (
        <button
          className="admin-primary-button"
          onClick={() => onNavigate("admin-tenant-placeholder-apps-market")}
          type="button"
        >
          <Plus size={16} />
          {labels.getMoreApps}
        </button>
      );
    return null;
  }

  function content() {
    if (!canView)
      return (
        <div className="video-apps-empty">
          <VideoAppsIllustration type={isVideosPage ? "video" : "apps"} />
          <h2>{ar ? "الوصول مرفوض" : "Access denied"}</h2>
          <p>
            {ar ? "ليست لديك صلاحية لعرض هذه الوحدة." : "You do not have access to this module."}
          </p>
        </div>
      );
    switch (activePage) {
      case "admin-vlogs":
        return (
          <VideosPage
            canManage={canManage}
            language={language}
            labels={labels}
            onNavigate={onNavigate}
            onUnsupported={unsupported}
            onDeleteVlog={onDeleteVlog}
            onSaveVlogHero={onSaveVlogHero}
            statusMessage={statusMessage}
            statusMessageType={statusMessageType}
            vlogHero={vlogHero}
            vlogs={vlogs}
          />
        );
      case "admin-tenant-placeholder-video-live-stream":
        return <LiveStreamPage language={language} labels={labels} onUnsupported={unsupported} />;
      case "admin-tenant-placeholder-video-channels":
        return <ChannelsPage language={language} labels={labels} onUnsupported={unsupported} />;
      case "admin-tenant-placeholder-apps-manage":
        return (
          <ManageAppsPage
            language={language}
            labels={labels}
            modules={modules}
            onNavigate={onNavigate}
            onUnsupported={unsupported}
          />
        );
      case "admin-tenant-placeholder-apps-market":
        return <AppMarketPage language={language} labels={labels} onUnsupported={unsupported} />;
      default:
        return null;
    }
  }

  return (
    <AdminLayout
      activePage={activePage}
      company={company}
      currentUser={currentUser}
      hideHeader
      language={language}
      modules={modules}
      onNavigate={onNavigate}
      subtitle={subtitle}
      t={t}
      title={title}
      {...layout}
    >
      <div
        className="tenant-video-apps-page"
        data-video-apps-direction={videoAppsDirection(language)}
        dir={videoAppsDirection(language)}
      >
        {showPageHeader && (
          <PageHeader actions={headerActions()} subtitle={subtitle} title={title} />
        )}
        {content()}
      </div>
      {showUnsupported && (
        <UnsupportedDialog labels={labels} onClose={() => setShowUnsupported(false)} t={t} />
      )}
    </AdminLayout>
  );
}
