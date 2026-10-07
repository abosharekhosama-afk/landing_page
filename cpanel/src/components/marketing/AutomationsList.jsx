// T-003 — Automations list with quick Active/Inactive toggles (local state only).
import React from "react";
import { Pencil } from "lucide-react";
import { StatusPill } from "./MarketingShared.jsx";

export default function AutomationsList({ automations, language, onEdit, onToggle }) {
  const tr = (en, ar) => (language === "ar" ? ar : en);
  if (!automations.length) {
    return (
      <div className="marketing-automation-empty">
        <p>{tr("No automations match this view yet.", "لا توجد أتمتة تطابق هذا العرض بعد.")}</p>
      </div>
    );
  }
  return (
    <div className="marketing-automation-list">
      {automations.map((automation) => {
        const active = automation.status === "active";
        return (
          <article className="marketing-automation-row" key={automation.id}>
            <div>
              <strong>{tr(automation.nameEn, automation.nameAr)}</strong>
              <small>{tr("Trigger", "المشغّل")}: {tr(automation.triggerEn, automation.triggerAr)}</small>
            </div>
            <StatusPill tone={automation.status}>{active ? tr("Active", "نشطة") : tr("Inactive", "غير نشطة")}</StatusPill>
            <button
              aria-checked={active}
              aria-label={active ? tr("Deactivate automation", "تعطيل الأتمتة") : tr("Activate automation", "تفعيل الأتمتة")}
              className={`marketing-toggle ${active ? "is-on" : ""}`}
              onClick={() => onToggle(automation)}
              role="switch"
              type="button"
            />
            <button className="secondary-action" onClick={() => onEdit(automation)} type="button"><Pencil size={14} />{tr("Edit", "تعديل")}</button>
          </article>
        );
      })}
    </div>
  );
}