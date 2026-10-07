import React from "react";
import { ImageOff, ImagePlus, Save, Trash2, Upload, Video, VideoOff } from "lucide-react";
import { withWebsiteMediaVersion } from "../data/websiteMedia.js";
import { formatMediaGroupLabel } from "../data/mediaSlots.js";
import { uploadImage, uploadWebsiteVideo, websiteVideoUploadLimitMb } from "../utils/api.js";

const emptyItem = {
  id: "",
  sectionKey: "",
  sectionLabel: "",
  groupKey: "sections",
  imageUrl: "",
  videoUrl: "",
  mediaType: "image",
  title: "",
  subtitle: "",
  linkUrl: "",
  sortOrder: 0,
  isActive: true,
};

function groupItems(items) {
  return items.reduce((groups, item) => {
    const sectionKey = item.sectionKey || "";
    const key =
      sectionKey.startsWith("homepage_category_")
        ? "homepage_categories"
        : /promo|banner|homepage_split/.test(sectionKey)
          ? "ads"
          : item.groupKey || "sections";
    groups[key] = [...(groups[key] || []), item];
    return groups;
  }, {});
}

export function MediaEditor({ item, language, onDelete, onSave, lockSectionKey = false, readOnly = false, slotMeta = null }) {
  const [draft, setDraft] = React.useState(item);
  const [message, setMessage] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadingVideo, setUploadingVideo] = React.useState(false);
  const [videoProgress, setVideoProgress] = React.useState(0);
  const maxVideoMb = websiteVideoUploadLimitMb();
  const isArabic = language === "ar";
  const displayLabel = slotMeta?.label || draft.sectionLabel || draft.sectionKey;
  const allowsVideo = !slotMeta || slotMeta.kind === "video" || (slotMeta.acceptedTypes || []).includes("video");
  const allowsImage = !slotMeta || slotMeta.kind !== "video" || (slotMeta.acceptedTypes || []).includes("image");

  React.useEffect(() => setDraft(item), [item]);

  function update(name, value) {
    if (readOnly) return;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  async function handleUpload(event) {
    if (readOnly) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setUploading(true);
      setMessage("");
      const result = await uploadImage(file);
      update("imageUrl", result.url || result.path || "");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (readOnly || !onSave) return;
    if (!draft.sectionKey.trim()) {
      setMessage(isArabic ? "أدخل مفتاح القسم." : "Section key is required.");
      return;
    }

    try {
      setMessage("");
      const saved = await onSave({ ...draft, sortOrder: Number(draft.sortOrder || 0) });
      if (saved) {
        setDraft(saved);
      }
      setMessage(isArabic ? "تم حفظ الصورة." : "Image saved.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleClearImage() {
    if (readOnly || !onSave) return;
    const nextDraft = { ...draft, imageUrl: "", sortOrder: Number(draft.sortOrder || 0) };
    setDraft(nextDraft);

    try {
      setMessage("");
      const saved = await onSave(nextDraft);
      if (saved) {
        setDraft(saved);
      }
      setMessage(
        isArabic
          ? "تم مسح الصورة. سيظهر البديل فقط عند العرض."
          : "Image cleared. The fallback will display only when no uploaded image exists.",
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleVideoUpload(event) {
    if (readOnly) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadingVideo(true);
      setVideoProgress(0);
      setMessage("");
      const result = await uploadWebsiteVideo(file, setVideoProgress);
      const url = result.url || result.path || "";
      setDraft((current) => ({ ...current, videoUrl: url, mediaType: url ? "video" : current.mediaType }));
      setMessage(isArabic ? "تم رفع الفيديو. اضغط حفظ لتطبيق التغيير." : "Video uploaded. Press Save to apply.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploadingVideo(false);
      setVideoProgress(0);
    }
  }

  async function handleClearVideo() {
    if (readOnly || !onSave) return;
    setDraft((current) => ({ ...current, videoUrl: "", mediaType: "image" }));
    try {
      setMessage("");
      const saved = await onSave({ ...draft, videoUrl: "", mediaType: "image" });
      if (saved) setDraft(saved);
      setMessage(isArabic ? "تم مسح الفيديو." : "Video cleared.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <article className={`website-media-card${readOnly ? " is-readonly" : ""}`}>
      <div className="website-media-preview">
        {draft.videoUrl ? (
          <video
            controls
            muted={false}
            playsInline
            preload="metadata"
            poster={draft.imageUrl ? withWebsiteMediaVersion(draft.imageUrl, draft.updatedAt || draft.id) : undefined}
            src={withWebsiteMediaVersion(draft.videoUrl, draft.updatedAt || draft.id)}
          />
        ) : draft.imageUrl ? (
          <img
            alt={displayLabel}
            src={withWebsiteMediaVersion(draft.imageUrl, draft.updatedAt || draft.id)}
          />
        ) : (
          <ImagePlus aria-hidden="true" size={30} />
        )}
        <span>{draft.isActive ? (isArabic ? "نشطة" : "Active") : (isArabic ? "مخفية" : "Hidden")}</span>
      </div>

      <div className="website-media-fields">
        <label>
          {isArabic ? "اسم الحقل" : "Field label"}
          <input disabled={readOnly || lockSectionKey} value={draft.sectionLabel} onChange={(event) => update("sectionLabel", event.target.value)} />
        </label>
        <label>
          {isArabic ? "المفتاح التقني" : "Technical key"}
          <input readOnly={lockSectionKey || readOnly} value={draft.sectionKey} onChange={(event) => update("sectionKey", event.target.value)} />
        </label>
        {allowsImage && (
          <label className="full-field">
            {isArabic ? "رابط الصورة" : "Image URL"}
            <input disabled={readOnly} value={draft.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} />
          </label>
        )}
        <label className="full-field">
          {isArabic ? "نوع الوسائط" : "Media type"}
          <input readOnly value={draft.videoUrl ? "video" : (draft.mediaType || slotMeta?.kind || "image")} />
        </label>
        {allowsVideo && (
          <>
            <label className="full-field">
              {isArabic ? "رابط الفيديو" : "Video URL"}
              <input disabled={readOnly} value={draft.videoUrl} onChange={(event) => update("videoUrl", event.target.value)} />
            </label>
            <p className="website-media-video-hint">
              {isArabic ? `MP4 أو WebM - الحد الأقصى ${maxVideoMb} م.ب` : `MP4 or WEBM - max ${maxVideoMb} MB`}
            </p>
          </>
        )}
        <label>
          {isArabic ? "المجموعة" : "Group"}
          <input disabled={readOnly || lockSectionKey} value={draft.groupKey} onChange={(event) => update("groupKey", event.target.value)} />
        </label>
        <label>
          {isArabic ? "الترتيب" : "Sort order"}
          <input disabled={readOnly} type="number" value={draft.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
        </label>
        <label>
          {isArabic ? "العنوان الاختياري" : "Optional title"}
          <input disabled={readOnly} value={draft.title} onChange={(event) => update("title", event.target.value)} />
        </label>
        <label>
          {isArabic ? "الوصف الاختياري" : "Optional subtitle"}
          <input disabled={readOnly} value={draft.subtitle} onChange={(event) => update("subtitle", event.target.value)} />
        </label>
        <label>
          {isArabic ? "الرابط الاختياري" : "Optional link"}
          <input disabled={readOnly} value={draft.linkUrl} onChange={(event) => update("linkUrl", event.target.value)} />
        </label>
        <label className="website-media-toggle">
          <input
            checked={draft.isActive !== false}
            disabled={readOnly}
            onChange={(event) => update("isActive", event.target.checked)}
            type="checkbox"
          />
          {isArabic ? "إظهار الوسائط في الموقع" : "Show media on website"}
        </label>
      </div>

      {!readOnly && (
        <div className="website-media-actions">
          {allowsImage && (
            <label className="admin-upload-button">
              <Upload size={15} />
              {uploading ? (isArabic ? "جاري الرفع..." : "Uploading...") : (isArabic ? "رفع / استبدال" : "Upload / Replace")}
              <input accept="image/*" disabled={uploading} hidden onChange={handleUpload} type="file" />
            </label>
          )}
          {allowsVideo && (
            <label className="admin-upload-button website-media-video-upload">
              <Video size={15} />
              {uploadingVideo ? `${isArabic ? "جاري رفع الفيديو..." : "Uploading video..."} ${videoProgress}%` : (isArabic ? "رفع فيديو" : "Upload video")}
              <input accept="video/mp4,video/webm" disabled={uploadingVideo} hidden onChange={handleVideoUpload} type="file" />
            </label>
          )}
          {uploadingVideo && (
            <div className="website-media-upload-progress" role="progressbar" aria-valuenow={videoProgress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${videoProgress}%` }} />
            </div>
          )}
          {allowsVideo && draft.videoUrl && (
            <button className="website-media-clear" disabled={uploadingVideo} onClick={handleClearVideo} type="button">
              <VideoOff size={15} />
              {isArabic ? "إزالة الفيديو" : "Remove video"}
            </button>
          )}
          {allowsImage && (
            <button
              className="website-media-clear"
              disabled={!draft.imageUrl}
              onClick={handleClearImage}
              type="button"
            >
              <ImageOff size={15} />
              {isArabic ? "مسح الصورة" : "Clear image"}
            </button>
          )}
          <button className="admin-primary-button" onClick={handleSave} type="button">
            <Save size={15} />
            {isArabic ? "حفظ" : "Save"}
          </button>
          {draft.id && onDelete && (
            <button className="website-media-delete" onClick={() => onDelete(draft.id)} type="button">
              <Trash2 size={15} />
              {isArabic ? "حذف" : "Delete"}
            </button>
          )}
        </div>
      )}
      {message && <p className="website-media-message">{message}</p>}
    </article>
  );
}

function WebsiteMediaManager({ error = "", language = "en", items = [], onDelete, onSave }) {
  const [drafts, setDrafts] = React.useState([]);
  const isArabic = language === "ar";
  const registeredItems = React.useMemo(
    () => (Array.isArray(items) ? items : []),
    [items],
  );
  const grouped = groupItems([...registeredItems, ...drafts].sort(
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0),
  ));

  function addDraft() {
    setDrafts((current) => [
      ...current,
      {
        ...emptyItem,
        _draftKey: `draft-${Date.now()}`,
        sortOrder: registeredItems.length + current.length + 1,
      },
    ]);
  }

  async function saveItem(item) {
    const { _draftKey, ...payload } = item;
    const saved = await onSave(payload);
    if (item._draftKey) {
      setDrafts((current) => current.filter((draft) => draft._draftKey !== item._draftKey));
    }
    return saved;
  }

  return (
    <section className="website-media-manager">
      <header className="website-media-head">
        <div>
          <h2>{isArabic ? "صور الموقع" : "Website Media"}</h2>
          <p>
            {isArabic
              ? "غيّر صور أقسام الموقع الثابتة بدون تعديل صور المنتجات."
              : "Manage static section images without changing product media."}
          </p>
        </div>
        <button className="admin-primary-button" onClick={addDraft} type="button">
          <ImagePlus size={16} />
          {isArabic ? "إضافة صورة" : "Add image"}
        </button>
      </header>

      {error && (
        <p className="website-media-message" role="alert">
          {error}
        </p>
      )}

      {!error && registeredItems.length === 0 && drafts.length === 0 && (
        <p className="website-media-message">
          {isArabic ? "لا توجد صور موقع حتى الآن." : "No website media has been added yet."}
        </p>
      )}

      {Object.entries(grouped).map(([group, groupEntries]) => (
        <section className="website-media-group" key={group}>
          <h3>{formatMediaGroupLabel(group, language)}</h3>
          <div className="website-media-grid">
            {groupEntries.map((entry) => (
              <MediaEditor
                item={entry}
                key={entry.id || entry._draftKey}
                language={language}
                onDelete={onDelete}
                onSave={saveItem}
              />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

export default WebsiteMediaManager;
