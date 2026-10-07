import React from "react";
import { ImageOff, LoaderCircle, X } from "lucide-react";
import { resolveApiAssetUrl } from "../../utils/api.js";
import { fetchWebsiteMedia } from "../../utils/websiteMediaApi.js";

export default function MediaPickerDialog({ company, language, onClose, onSelect }) {
  const ar = language === "ar";
  const [state, setState] = React.useState({ status: "loading", items: [], error: "" });
  React.useEffect(() => {
    let cancelled = false;
    fetchWebsiteMedia().then((items) => {
      if (cancelled) return;
      const scoped = items.filter((item) => String(item.company_id || item.companyId || "") === company.id && item.isActive !== false && item.is_active !== false && !item.deletedAt && !item.deleted_at && (item.imageUrl || item.image_url || item.fallbackImageUrl));
      setState({ status: "ready", items: scoped, error: "" });
    }).catch((error) => { if (!cancelled) setState({ status: "error", items: [], error: error.message }); });
    return () => { cancelled = true; };
  }, [company.id]);
  return <div className="site-editor-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation"><section aria-label={ar ? "اختيار وسائط الموقع" : "Choose site media"} aria-modal="true" className="site-editor-media-dialog" role="dialog"><header><div><strong>{ar ? "اختيار صورة" : "Choose an image"}</strong><small>{company.name}</small></div><button aria-label={ar ? "إغلاق" : "Close"} onClick={onClose} type="button"><X /></button></header>{state.status === "loading" ? <div className="site-editor-media-state"><LoaderCircle className="spin" />{ar ? "جارٍ تحميل الوسائط…" : "Loading tenant media…"}</div> : state.status === "error" ? <div className="site-editor-media-state error"><ImageOff /><strong>{ar ? "تعذر تحميل الوسائط" : "Media could not be loaded"}</strong><p>{state.error}</p></div> : state.items.length ? <div className="site-editor-media-grid">{state.items.map((item) => { const src = resolveApiAssetUrl(item.imageUrl || item.image_url || item.fallbackImageUrl); return <button key={item.id} onClick={() => onSelect(item)} type="button"><img alt={item.title || item.sectionLabel || ""} src={src} /><span>{item.title || item.sectionLabel || item.sectionKey}</span></button>; })}</div> : <div className="site-editor-media-state"><ImageOff /><strong>{ar ? "لا توجد صور نشطة لهذا المستأجر" : "No active tenant images"}</strong></div>}</section></div>;
}
