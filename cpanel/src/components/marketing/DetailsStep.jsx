// T-003 — Campaign details step with a split sender (Name / Email) form.
import React from "react";
import { ChevronRight } from "lucide-react";

const detailFields = [
  ["name", "Campaign Name", "اسم الحملة", "Internal campaign name"],
  ["subject", "Subject", "الموضوع", "Email subject"],
  ["previewText", "Preview Text", "النص المعاين", "Short summary shown after the subject"],
];

export default function DetailsStep({ campaign, errors, onUpdate, onBack, onContinue, tr }) {
  return (
    <div className="marketing-campaign-form">
      <header className="marketing-campaign-section-header">
        <div>
          <h2>{tr("Campaign details", "بيانات الحملة")}</h2>
          <p>{tr("Set the information recipients will see before sending.", "حدد المعلومات التي سيراها المستلمون قبل الإرسال.")}</p>
        </div>
      </header>
      {detailFields.map(([key, en, ar, placeholder]) => (
        <label className="marketing-field" key={key}>
          <span>{tr(en, ar)}</span>
          <input
            value={campaign[key]}
            onChange={(event) => onUpdate(key, event.target.value)}
            placeholder={tr(placeholder, placeholder)}
          />
          {errors[key] ? <small>{errors[key]}</small> : null}
        </label>
      ))}
      <div className="marketing-field-grid">
        <label className="marketing-field">
          <span>{tr("Sender Name", "اسم المرسل")}</span>
          <input
            value={campaign.senderName}
            onChange={(event) => onUpdate("senderName", event.target.value)}
            placeholder={tr("e.g. iCare Team", "مثال: فريق iCare")}
          />
          {errors.senderName ? <small>{errors.senderName}</small> : null}
        </label>
        <label className="marketing-field">
          <span>{tr("Sender Email", "بريد المرسل")}</span>
          <input
            type="email"
            value={campaign.senderEmail}
            onChange={(event) => onUpdate("senderEmail", event.target.value)}
            placeholder="sender@company.com"
          />
          {errors.senderEmail ? <small>{errors.senderEmail}</small> : null}
        </label>
        <label className="marketing-field">
          <span>{tr("Reply-To", "الرد إلى")}</span>
          <input
            type="email"
            value={campaign.replyTo}
            onChange={(event) => onUpdate("replyTo", event.target.value)}
            placeholder="support@company.com"
          />
          {errors.replyTo ? <small>{errors.replyTo}</small> : null}
        </label>
      </div>
      <div className="marketing-campaign-actions">
        <button className="secondary-action" onClick={onBack} type="button">{tr("Back", "رجوع")}</button>
        <button className="admin-primary-button" onClick={onContinue} type="button">
          {tr("Continue", "متابعة")}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}