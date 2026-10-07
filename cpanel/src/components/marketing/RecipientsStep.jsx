// T-003 — Recipients selection step (Contacts / Segments / Labels / All + CSV & Gmail spots).
import React from "react";
import { Check, ChevronRight, Mail, Upload } from "lucide-react";
import { iconFor } from "./MarketingShared.jsx";
import { MarketingNotice } from "./MarketingShared.jsx";

function toggleId(list, id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export default function RecipientsStep({
  recipients,
  sources,
  segments,
  labels,
  onSelectRecipients,
  onBack,
  onContinue,
  onOpenCsv,
  onOpenGmail,
  notice,
  tr,
}) {
  const updateType = (type) => onSelectRecipients({ ...recipients, type });
  const toggleChip = (key, id) => onSelectRecipients({ ...recipients, [key]: toggleId(recipients[key], id) });

  return (
    <div className="marketing-campaign-form">
      <header className="marketing-campaign-section-header">
        <div>
          <h2>{tr("Choose recipients", "اختر المستلمين")}</h2>
          <p>{tr("Pick who should receive this campaign.", "اختر من يجب أن يستلم هذه الحملة.")}</p>
        </div>
      </header>
      <div className="marketing-recipient-grid">
        {sources.map(({ id, icon, en, ar, descEn, descAr }) => {
          const Icon = iconFor(icon);
          const selected = recipients.type === id;
          return (
            <button
              aria-pressed={selected}
              className={selected ? "is-selected" : ""}
              key={id}
              onClick={() => updateType(id)}
              type="button"
            >
              <span><Icon size={22} /></span>
              <strong>{tr(en, ar)}</strong>
              <small>{tr(descEn, descAr)}</small>
              {selected ? <span className="marketing-recipient-check"><Check size={14} /></span> : null}
            </button>
          );
        })}
      </div>

      {recipients.type === "segments" ? (
        <div className="marketing-chip-row">
          {segments.map((segment) => (
            <button
              aria-pressed={recipients.segmentIds.includes(segment.id)}
              className={`marketing-chip ${recipients.segmentIds.includes(segment.id) ? "is-selected" : ""}`}
              key={segment.id}
              onClick={() => toggleChip("segmentIds", segment.id)}
              type="button"
            >
              <i style={{ background: segment.color }} />
              {tr(segment.en, segment.ar)}
            </button>
          ))}
        </div>
      ) : null}

      {recipients.type === "labels" ? (
        <div className="marketing-chip-row">
          {labels.map((label) => (
            <button
              aria-pressed={recipients.labelIds.includes(label.id)}
              className={`marketing-chip ${recipients.labelIds.includes(label.id) ? "is-selected" : ""}`}
              key={label.id}
              onClick={() => toggleChip("labelIds", label.id)}
              type="button"
            >
              <i style={{ background: label.color }} />
              {tr(label.en, label.ar)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="marketing-import-row">
        <button className="secondary-action" onClick={onOpenCsv} type="button">
          <Upload size={15} />
          {tr("Import CSV", "استيراد CSV")}
        </button>
        <button className="secondary-action" onClick={onOpenGmail} type="button">
          <Mail size={15} />
          {tr("Import from Gmail", "استيراد من Gmail")}
        </button>
        <small>{tr("Import actions are UI spots for a later integration.", "إجراءات الاستيراد مواقع واجهة لربط لاحق.")}</small>
      </div>

      {notice ? <MarketingNotice>{notice}</MarketingNotice> : null}

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