import React from "react";
import { Upload } from "lucide-react";
import { uploadImage, uploadProductMedia, uploadWebsiteVideo, validateProductMediaFile } from "../utils/api.js";
import { createTranslator } from "../data/translations.js";
import { resolveProductImageUrl, useProductImagePlaceholder } from "../utils/productImages.js";
import { isAdminMediaVideoUrl } from "../utils/adminMediaUrl.js";

export { isAdminMediaVideoUrl };

export default function AdminMediaField({
  label,
  language = "en",
  name,
  value,
  onChange,
  onUploadingChange,
  productId,
  tenantSpecific = false,
  allowVideo = false,
}) {
  const t = React.useMemo(() => createTranslator(language), [language]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");
  const isVideoValue = isAdminMediaVideoUrl(value);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError("");
    onUploadingChange?.(true);
    try {
      validateProductMediaFile(file, { allowVideo });
      const isVideo = String(file.type || "").toLowerCase().startsWith("video/");
      const uploaded = productId
        ? await uploadProductMedia(file, productId)
        : isVideo
          ? await uploadWebsiteVideo(file)
          : await uploadImage(file);
      if (!uploaded?.url && !uploaded?.path) throw new Error(t("productForm.errors.missingUploadUrl"));
      onChange({ target: { name, value: uploaded.url || uploaded.path } });
    } catch (error) {
      setUploadError(error?.message || t("productForm.errors.imageUpload"));
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
      event.target.value = "";
    }
  }

  return (
    <div className="admin-media-field">
      <label>
        {label}
        <input name={name} placeholder="https://..." value={value || ""} onChange={onChange} />
      </label>
      <label className="admin-upload-button">
        <Upload size={14} />
        {isUploading ? t("productForm.uploading") : tenantSpecific && !productId ? t("productForm.saveFirst") : (allowVideo ? (language === "ar" ? "رفع وسائط" : "Upload media") : t("productForm.uploadImage"))}
        <input accept={allowVideo ? "image/*,video/mp4,video/webm" : "image/*"} disabled={tenantSpecific && !productId} hidden type="file" onChange={handleUpload} />
      </label>
      {uploadError && <div className="message-panel error compact">{uploadError}</div>}
      {value && (
        <div className="admin-media-preview">
          {isVideoValue ? (
            <video controls preload="metadata" src={resolveProductImageUrl(value)} />
          ) : (
            <img alt="" src={resolveProductImageUrl(value)} onError={useProductImagePlaceholder} />
          )}
          <button className="text-action danger" disabled={isUploading} onClick={() => onChange({ target: { name, value: "", removeImage: true } })} type="button">{t("productForm.removeImage")}</button>
        </div>
      )}
    </div>
  );
}
