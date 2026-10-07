// T-003 — Campaign wizard
import React from "react";
import { Check, Eye, Send, X } from "lucide-react";
import TemplatePicker from "./TemplatePicker.jsx";
import DetailsStep from "./DetailsStep.jsx";
import RecipientsStep from "./RecipientsStep.jsx";
import ReviewStep from "./ReviewStep.jsx";
import { CampaignPreview, TestEmailDialog } from "./CampaignPreview.jsx";
import { MarketingNotice } from "./MarketingShared.jsx";
import { TemplateBuilderCanvas } from "./builder/index.js";

const stepIds = ["templates", "details", "content", "recipients", "review"];

export default function CampaignWizard({
  campaign, errors, step, onStepChange, templates, selectedTemplateId,
  recipientOptions, notice, previewOpen, previewMode, onPreview, onPreviewModeChange,
  onClosePreview, testOpen, onOpenTest, onCloseTest, onSelectTemplate, onStartScratch,
  onCreateCampaign, onUpdateCampaign, onSelectRecipients, onScheduleModeChange,
  onScheduleFieldChange, onSaveDraft, onSchedule, onSendNow, onSendTest, onOpenCsv,
  onOpenGmail, language, onExit, builderBlocks, builderSelectedBlockId, builderPreviewMode,
  onBuilderBlocksChange, onBuilderSelectBlock, onBuilderSave, onBuilderSendTest,
}) {
  const tr = (en, ar) => (language === "ar" ? ar : en);
  const steps = [["templates", tr("Templates","قوالب")],["details", tr("Details","تفاصيل")],["content", tr("Content","محتوى")],["recipients", tr("Recipients","مستلمون")],["review", tr("Review","مراجعة")]];
  const currentIndex = Math.max(0, stepIds.indexOf(step));
  const isContent = step === "content";
  const isRtl = language === "ar";

  return (
    <div className="marketing-email-page">
      <section className="marketing-campaign-workspace">
        <div className={`marketing-campaign-stepper ${isRtl ? "is-rtl" : "is-ltr"}`}>
          {steps.map(([id, label], index) => (
            <button className={step === id ? "is-active" : index < currentIndex ? "is-complete" : ""} key={id} onClick={() => index <= currentIndex && onStepChange(id)} type="button">
              <span>{index < currentIndex ? <Check size={14} /> : index + 1}</span>{label}
            </button>
          ))}
        </div>
        {step === "templates" && <TemplatePicker language={language} onBack={onExit} onContinue={() => onStepChange("details")} onSelectTemplate={onSelectTemplate} onStartScratch={onStartScratch} selectedId={selectedTemplateId} templates={templates} tr={tr} />}
        {step === "details" && <DetailsStep campaign={campaign} errors={errors} onBack={() => onStepChange("templates")} onContinue={onCreateCampaign} onUpdate={onUpdateCampaign} tr={tr} />}
        {isContent && builderBlocks ? <TemplateBuilderCanvas campaign={campaign} blocks={builderBlocks} selectedBlockId={builderSelectedBlockId} previewMode={builderPreviewMode || "desktop"} onBlocksChange={onBuilderBlocksChange} onSelectBlock={onBuilderSelectBlock} onSave={onBuilderSave} onSendTest={onBuilderSendTest} onPreviewModeChange={onPreviewModeChange} onBack={() => onStepChange("details")} onContinue={() => onStepChange("recipients")} onClose={() => onStepChange("details")} language={language} tr={tr} /> : isContent && <div className="marketing-campaign-form"><header className="marketing-campaign-section-header"><div><h2>{tr("Customize email","تخصيص البريد")}</h2><p>{tr("Prepare content.","جهّز المحتوى.")}</p></div><button className="secondary-action" onClick={onOpenTest} type="button"><Send size={15} />{tr("Send Test","إرسال تجريبي")}</button></header><label className="marketing-field"><span>{tr("Content EN","محتوى إنجليزي")}</span><textarea onChange={(e) => onUpdateCampaign("content", e.target.value)} rows="8" value={campaign.content} /></label><label className="marketing-field"><span>{tr("Content AR","محتوى عربي")}</span><textarea onChange={(e) => onUpdateCampaign("contentAr", e.target.value)} rows="8" value={campaign.contentAr} /></label><CampaignPreview campaign={campaign} language={language} mode={previewMode} onModeChange={onPreviewModeChange} tr={tr} />{notice && <MarketingNotice>{notice}</MarketingNotice>}<div className="marketing-campaign-actions"><button className="secondary-action" onClick={() => onStepChange("details")} type="button">{tr("Back","رجوع")}</button><button className="secondary-action" onClick={onPreview} type="button"><Eye size={15} />{tr("Preview","معاينة")}</button><button className="admin-primary-button" onClick={() => onStepChange("recipients")} type="button">{tr("Continue","متابعة")}</button></div></div>}
        {step === "recipients" && <RecipientsStep labels={recipientOptions.labels} notice={notice} onBack={() => onStepChange("content")} onContinue={() => onStepChange("review")} onOpenCsv={onOpenCsv} onOpenGmail={onOpenGmail} onSelectRecipients={onSelectRecipients} recipients={campaign.recipients} segments={recipientOptions.segments} sources={recipientOptions.sources} tr={tr} />}
        {step === "review" && (
          <>
            <ReviewStep campaign={campaign} labels={recipientOptions.labels} onBack={() => onStepChange("recipients")} onSchedule={onSchedule} onScheduleFieldChange={onScheduleFieldChange} onScheduleModeChange={onScheduleModeChange} onSaveDraft={onSaveDraft} onSendNow={onSendNow} scheduleError={errors.schedule} segments={recipientOptions.segments} tr={tr} />
            {notice ? <MarketingNotice>{notice}</MarketingNotice> : null}
          </>
        )}
      </section>
      {previewOpen && <div className="marketing-modal-backdrop" onMouseDown={onClosePreview} role="presentation"><div aria-modal="true" className="marketing-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog"><button aria-label={tr("Close","إغلاق")} onClick={onClosePreview} type="button"><X size={18} /></button><h2>{tr("Preview","معاينة")}</h2><CampaignPreview campaign={campaign} language={language} mode={previewMode} onModeChange={onPreviewModeChange} tr={tr} /></div></div>}
      {testOpen && <TestEmailDialog onClose={onCloseTest} onSendTest={onSendTest} tr={tr} />}
    </div>
  );
}
