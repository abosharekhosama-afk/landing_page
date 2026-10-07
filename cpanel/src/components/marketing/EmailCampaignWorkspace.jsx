// T-003 — Email Marketing workspace
import React from "react";
import { Mail, Pencil, Plus, Users, Send, BarChart3, Sparkles } from "lucide-react";
import CampaignWizard from "./CampaignWizard.jsx";
import { MarketingNotice, StatusPill, trFor } from "./MarketingShared.jsx";
import { campaignStatusLabels, campaignTemplates, createCampaignDraft, templateBodyFor } from "../../data/marketingCampaigns.js";
import { getTemplateBlocks } from "./builder/templateBlocks.js";
import {
  EMAIL_SENDING_UNDER_DEVELOPMENT,
  createCampaign,
  fetchCampaignWorkspace,
  fetchRecipientOptions,
  saveCampaignDraft,
  scheduleCampaign,
  sendCampaign,
  sendTestEmail,
} from "../../services/marketingService.js";

export default function EmailCampaignWorkspace({ language, l, unsupported }) {
  const tr = trFor(language);
  const deliveryNotice = () => tr(EMAIL_SENDING_UNDER_DEVELOPMENT, "إرسال البريد الإلكتروني ما زال قيد التطوير.");
  const [v, setV] = React.useState("dashboard");
  const [s, setS] = React.useState("templates");
  const [campaign, setCampaign] = React.useState(() => createCampaignDraft());
  const [campaigns, setCampaigns] = React.useState([]);
  const [e, setE] = React.useState({});
  const [n, setN] = React.useState("");
  const [ro, setRo] = React.useState({ sources: [], segments: [], labels: [] });
  const [po, setPo] = React.useState(false);
  const [pm, setPm] = React.useState("desktop");
  const [to, setTo] = React.useState(false);
  const [b, setB] = React.useState([]);
  const [bs, setBs] = React.useState(null);

  React.useEffect(() => { fetchCampaignWorkspace().then(d => setCampaigns(d.campaigns)); fetchRecipientOptions().then(d => setRo(d)); }, []);
  const sf = () => { setCampaign(createCampaignDraft(null)); setB(getTemplateBlocks('blank')); setE({}); setN(""); setS("details"); };
  const st = (template) => { setB(getTemplateBlocks(template.id)); setCampaign(c => ({ ...c, templateId: template.id, content: c.content || templateBodyFor(template.id, "en") })); setS("details"); };
  const cc = async () => { const next = {}; if (!campaign.name.trim()) next.name = tr("Required.", "مطلوب."); if (!campaign.subject.trim()) next.subject = tr("Required.", "مطلوب."); setE(next); if (Object.keys(next).length > 0) return; setCampaign(await createCampaign({ ...campaign, builderBlocks: b })); setS("content"); };
  const ow = () => { setCampaign(createCampaignDraft()); setB([]); setS("templates"); setV("wizard"); setE({}); setN(""); };
  const ec = (r) => { setCampaign(r); setB(r.builderBlocks || []); setS("details"); setV("wizard"); };
  const showDeliveryUnavailable = async (action) => {
    await action();
    setTo(false);
    setN(deliveryNotice());
  };

  if (v === "wizard") {
    return <CampaignWizard campaign={campaign} errors={e} step={s} onStepChange={setS} templates={campaignTemplates} selectedTemplateId={campaign.templateId} recipientOptions={ro} notice={n} previewOpen={po} previewMode={pm} onPreview={() => setPo(true)} onPreviewModeChange={setPm} onClosePreview={() => setPo(false)} testOpen={to} onOpenTest={() => setTo(true)} onCloseTest={() => setTo(false)} onSelectTemplate={st} onStartScratch={sf} onCreateCampaign={cc} onUpdateCampaign={(k, v) => { setCampaign(c => ({ ...c, [k]: v })); setE(e => ({ ...e, [k]: "" })); }} onSelectRecipients={(r) => setCampaign(c => ({ ...c, recipients: r }))} onScheduleModeChange={(m) => setCampaign(c => ({ ...c, schedule: { ...c.schedule, mode: m } }))} onScheduleFieldChange={(k, v) => setCampaign(c => ({ ...c, schedule: { ...c.schedule, [k]: v } }))} onSaveDraft={async () => { await saveCampaignDraft(campaign); setN(tr("Saved.", "تم.")); }} onSchedule={async () => { await showDeliveryUnavailable(() => scheduleCampaign(campaign.id, campaign.schedule)); }} onSendNow={async () => { await showDeliveryUnavailable(() => sendCampaign(campaign.id)); }} onSendTest={async (email) => { await showDeliveryUnavailable(() => sendTestEmail({ email })); }} onOpenCsv={unsupported} onOpenGmail={unsupported} language={language} onExit={() => { setV("dashboard"); setS("templates"); setB([]); }} builderBlocks={b} builderSelectedBlockId={bs} builderPreviewMode={pm} onBuilderBlocksChange={(bl) => { setB(bl); setCampaign(c => ({ ...c, builderBlocks: bl })); }} onBuilderSelectBlock={setBs} onBuilderSave={(bl) => { setB(bl); setN(tr("Saved!", "تم!")); setTimeout(() => setN(""), 3000); }} onBuilderSendTest={() => setTo(true)} />;
  }

  return (
    <div className="tenant-marketing-page marketing-email-refined" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="marketing-page-header marketing-email-header">
        <div>
          <h1>{tr("Email Marketing", "التسويق بالبريد")}</h1>
          <p>{tr("Create and manage campaigns. Metrics appear only when email delivery is connected.", "أنشئ وأدر الحملات. تظهر المقاييس فقط عند ربط إرسال البريد.")}</p>
        </div>
        <button className="admin-primary-button" onClick={ow} type="button"><Plus size={16} />{tr("Create Campaign", "إنشاء حملة")}</button>
      </header>
      <section className="marketing-email-status-strip" aria-label={tr("Status", "الحالة")}>
        {[[Users, tr("Subscribers", "مشتركون")], [Send, tr("Open rate", "معدل الفتح")], [BarChart3, tr("Click rate", "معدل النقر")], [Sparkles, tr("Revenue", "الإيرادات")]].map(([Icon, label]) => (
          <article key={label}><span className="marketing-stat-icon"><Icon size={16} /></span><small>{label}</small><StatusPill>{l.available}</StatusPill></article>
        ))}
      </section>
      <section className="marketing-email-campaigns">
        <header><div className="campaigns-header-title"><h2>{tr("Your campaigns", "حملاتك")}</h2></div></header>
        {campaigns.length === 0 ? (
          <div className="marketing-email-empty">
            <span className="marketing-email-empty-icon"><Mail size={38} /></span>
            <h3>{tr("No campaigns yet", "لا توجد حملات بعد")}</h3>
            <p>{tr("Launch your first email campaign when delivery is available for this company.", "أطلق أول حملة بريدية عندما يتوفر الإرسال لهذه الشركة.")}</p>
          </div>
        ) : (
          <div className="marketing-campaign-list">{campaigns.map(r => (<article className="marketing-campaign-row" key={r.id}><span className="marketing-campaign-row-icon"><Mail size={17} /></span><div><strong>{r.name || tr("Untitled", "بدون عنوان")}</strong><small>{r.subject || tr("No subject", "بدون موضوع")}</small></div><StatusPill tone={r.status}>{tr(campaignStatusLabels[r.status]?.[0], campaignStatusLabels[r.status]?.[1])}</StatusPill><div className="marketing-campaign-row-meta"><small>{tr("Recipients", "المستلمون")}: <b>{r.recipientsCount || "—"}</b></small><small>{r.updatedAt || tr("Draft", "مسودة")}</small></div><button className="secondary-action" onClick={() => ec(r)} type="button"><Pencil size={14} />{tr("Edit", "تعديل")}</button></article>))}</div>
        )}
      </section>
      <section className="marketing-email-setup-secondary">
        <h3>{tr("Setup & status", "الإعداد والحالة")}</h3>
        <div className="marketing-email-info-grid">{[[BarChart3, "Balance", "الرصيد"], [Users, "Sender", "المرسل"], [Send, "Automation", "الأتمتة"], [Sparkles, "AI", "ذكاء"]].map(([Icon, en, ar]) => (<article key={en}><span><Icon size={18} /></span><h4>{tr(en, ar)}</h4><StatusPill>{l.available}</StatusPill></article>))}</div>
      </section>
      {n && <MarketingNotice>{n}</MarketingNotice>}
    </div>
  );
}
