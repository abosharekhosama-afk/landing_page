// T-003 — Review & Schedule step (Send Now vs Schedule + Save Draft).
import React from "react";

function recipientSummary(recipients, segments, labels, tr) {
  if (recipients.type === "segments") {
    const names = recipients.segmentIds.map((id) => segments.find((item) => item.id === id)).filter(Boolean).map((item) => tr(item.en, item.ar));
    return names.length ? names.join(" · ") : tr("No segments selected yet", "لم يتم اختيار مجموعات بعد");
  }
  if (recipients.type === "labels") {
    const names = recipients.labelIds.map((id) => labels.find((item) => item.id === id)).filter(Boolean).map((item) => tr(item.en, item.ar));
    return names.length ? names.join(" · ") : tr("No labels selected yet", "لم يتم اختيار تصنيفات بعد");
  }
  if (recipients.type === "contacts") return tr("Manual contacts", "جهات اتصال مختارة يدويًا");
  return tr("All contacts", "كل جهات الاتصال");
}

export default function ReviewStep({
  campaign,
  segments,
  labels,
  onScheduleModeChange,
  onScheduleFieldChange,
  onSaveDraft,
  onSchedule,
  onSendNow,
  onBack,
  scheduleError,
  tr,
}) {
  const isScheduled = campaign.schedule.mode === "scheduled";
  const rows = [
    ["Name", "الاسم", campaign.name],
    ["Subject", "الموضوع", campaign.subject],
    ["Sender", "المرسل", [campaign.senderName, campaign.senderEmail].filter(Boolean).join(" · ")],
    ["Reply-To", "الرد إلى", campaign.replyTo],
    ["Recipients", "المستلمون", recipientSummary(campaign.recipients, segments, labels, tr)],
  ];

  return (
    <div className="marketing-campaign-form">
      <header className="marketing-campaign-section-header">
        <div>
          <h2>{tr("Review & schedule", "المراجعة والجدولة")}</h2>
          <p>{tr("Confirm the details, then save a draft or schedule the send.", "أكّد التفاصيل، ثم احفظ مسودة أو جدول الإرسال.")}</p>
        </div>
      </header>
      <div className="marketing-review-grid">
        {rows.map(([en, ar, value]) => (
          <article key={en}>
            <div>
              <strong>{tr(en, ar)}</strong>
              <span>{value || tr("—", "—")}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="marketing-schedule-panel">
        <div>
          <strong>{tr("When should this campaign go out?", "متى تُرسل هذه الحملة؟")}</strong>
          <p>{tr("Email sending is still under development.", "إرسال البريد الإلكتروني ما زال قيد التطوير.")}</p>
        </div>
        <div className="marketing-schedule-options">
          <button
            aria-pressed={!isScheduled}
            className={!isScheduled ? "is-selected" : ""}
            onClick={() => onScheduleModeChange("now")}
            type="button"
          >
            {tr("Send now", "إرسال الآن")}
          </button>
          <button
            aria-pressed={isScheduled}
            className={isScheduled ? "is-selected" : ""}
            onClick={() => onScheduleModeChange("scheduled")}
            type="button"
          >
            {tr("Schedule", "جدولة")}
          </button>
        </div>
        {isScheduled ? (
          <div className="marketing-schedule-fields">
            <label className="marketing-field">
              <span>{tr("Date", "التاريخ")}</span>
              <input onChange={(event) => onScheduleFieldChange("date", event.target.value)} type="date" value={campaign.schedule.date} />
            </label>
            <label className="marketing-field">
              <span>{tr("Time", "الوقت")}</span>
              <input onChange={(event) => onScheduleFieldChange("time", event.target.value)} type="time" value={campaign.schedule.time} />
            </label>
          </div>
        ) : null}
        {scheduleError ? <div className="marketing-form-error">{scheduleError}</div> : null}
      </div>
      <div className="marketing-campaign-actions marketing-final-actions">
        <button className="secondary-action" onClick={onBack} type="button">{tr("Back", "رجوع")}</button>
        <button className="secondary-action" onClick={onSaveDraft} type="button">{tr("Save Draft", "حفظ المسودة")}</button>
        {isScheduled ? (
          <button className="admin-primary-button" onClick={onSchedule} type="button">{tr("Schedule Campaign", "جدولة الحملة")}</button>
        ) : (
          <button className="admin-primary-button" onClick={onSendNow} type="button">{tr("Send Now", "إرسال الآن")}</button>
        )}
      </div>
    </div>
  );
}