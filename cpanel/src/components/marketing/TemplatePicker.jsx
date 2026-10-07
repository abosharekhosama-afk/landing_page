// T-003 — Template picker step (Choose Template / Start from Scratch).
import React from "react";
import { Plus } from "lucide-react";
import { iconFor } from "./MarketingShared.jsx";

// Unified preview for every template card (pure CSS bars, no images).
// Hierarchy: full-width accent bar -> thinner half-width accent bar -> thin gray line.
// All bars align to the card's start edge (respects RTL/LTR automatically).
function TemplatePreview({ accent }) {
  const A = accent || "#2671d5";
  return (
    <span aria-hidden="true" className="marketing-template-preview">
      <i className="is-banner" style={{ background: A }} />
      <i className="is-sub" style={{ background: A }} />
      <i className="is-line is-short" />
    </span>
  );
}

export default function TemplatePicker({ templates, selectedId, onSelectTemplate, onStartScratch, onBack, onContinue, language = "en", tr }) {
  return (
    <section className="marketing-campaign-workspace marketing-campaign-step">
      <header className="marketing-campaign-section-header">
        <div>
          <h2>{tr("Choose how to start", "اختر طريقة البدء")}</h2>
          <p>{tr("Pick a ready template or start from scratch.", "اختر قالبًا جاهزًا أو ابدأ من الصفر.")}</p>
        </div>
      </header>
      <div className="marketing-template-grid">
          <button
            aria-pressed={selectedId === "blank"}
            className={`marketing-template-card marketing-template-blank ${selectedId === "blank" ? "is-selected" : ""}`}
            onClick={onStartScratch}
            type="button"
          >
            <span><Plus size={28} /></span>
            <strong>{tr("Start from Scratch", "البدء من الصفر")}</strong>
            <small>{tr("Create a new campaign without a template.", "أنشئ حملة جديدة دون قالب.")}</small>
          </button>
          {templates.map(({ id, icon, en, ar, descEn, descAr, accent }) => {
            const Icon = iconFor(icon);
            const isSelected = selectedId === id;
            return (
              <button
                aria-pressed={isSelected}
                className={`marketing-template-card ${isSelected ? "is-selected" : ""}`}
                key={id}
                onClick={() => onSelectTemplate({ id, en, ar })}
                type="button"
              >
                <TemplatePreview accent={accent || "#2671d5"} />
                <span className="marketing-template-icon" style={accent ? { background: `${accent}14`, color: accent } : undefined}>
                  <Icon size={24} />
                </span>
                <strong>{tr(en, ar)}</strong>
                <small>{tr(descEn || "Ready-made email template.", descAr || "قالب بريد جاهز.")}</small>
                {isSelected && <em className="marketing-template-check">{tr("Selected", "محدد")}</em>}
              </button>
            );
          })}
      </div>
      <div className="marketing-template-note">{tr("These examples are not saved campaigns.", "هذه الأمثلة ليست حملات محفوظة.")}</div>
    </section>
  );
}