// T-003 — Interactive email preview (Desktop / Mobile) and the Send-Test dialog.
import React from "react";
import { Monitor, Send, Smartphone, X } from "lucide-react";

export function CampaignPreview({ campaign, mode, onModeChange, language, tr }) {
  const content = language === "ar" ? campaign.contentAr || campaign.content : campaign.content;
  return (
    <div className="marketing-content-preview">
      <div className="marketing-preview-toolbar">
        <strong>{tr("Interactive preview", "معاينة تفاعلية")}</strong>
        <div className="marketing-device-toggle">
          <button
            aria-pressed={mode === "desktop"}
            className={mode === "desktop" ? "is-selected" : ""}
            onClick={() => onModeChange("desktop")}
            type="button"
          >
            <Monitor size={15} />
            {tr("Desktop", "سطح المكتب")}
          </button>
          <button
            aria-pressed={mode === "mobile"}
            className={mode === "mobile" ? "is-selected" : ""}
            onClick={() => onModeChange("mobile")}
            type="button"
          >
            <Smartphone size={15} />
            {tr("Mobile", "الجوال")}
          </button>
        </div>
      </div>
      <div className={`marketing-email-preview-shell`}>
        <div className={`marketing-email-preview ${mode === "mobile" ? "is-mobile" : "is-desktop"}`}>
          <small>{campaign.senderName || tr("Sender name", "اسم المرسل")}</small>
          <h3>{campaign.subject || tr("Your subject will appear here", "سيظهر الموضوع هنا")}</h3>
          <p>{campaign.previewText || tr("Preview text", "النص المعاين")}</p>
          <div>{content || tr("Email content preview", "معاينة محتوى البريد")}</div>
        </div>
      </div>
    </div>
  );
}

export function TestEmailDialog({ onClose, onSendTest, tr }) {
  const [testEmail, setTestEmail] = React.useState("");
  return (
    <div className="marketing-modal-backdrop" onMouseDown={onClose} role="presentation">
      <div aria-modal="true" className="marketing-modal marketing-test-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <button aria-label={tr("Close", "إغلاق")} onClick={onClose} type="button"><X size={18} /></button>
        <h2>{tr("Send a test email", "إرسال بريد تجريبي")}</h2>
        <p>{tr("Email sending is still under development.", "إرسال البريد الإلكتروني ما زال قيد التطوير.")}</p>
        <label className="marketing-field">
          <span>{tr("Test email address", "عنوان البريد التجريبي")}</span>
          <input
            onChange={(event) => setTestEmail(event.target.value)}
            placeholder="name@example.com"
            type="email"
            value={testEmail}
          />
        </label>
        <div className="marketing-campaign-actions">
          <button className="secondary-action" onClick={onClose} type="button">{tr("Cancel", "إلغاء")}</button>
          <button className="admin-primary-button" onClick={() => onSendTest(testEmail)} type="button">
            <Send size={15} />
            {tr("Send Test", "إرسال تجريبي")}
          </button>
        </div>
      </div>
    </div>
  );
}