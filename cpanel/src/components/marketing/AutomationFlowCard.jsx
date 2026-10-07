// T-003 — Visual automation flow: [Trigger] -> [Condition] -> [Delay] -> [Action].
import React from "react";
import { ChevronRight } from "lucide-react";
import { iconFor } from "./MarketingShared.jsx";

const kindLabels = {
  trigger: ["Trigger", "المشغّل"],
  condition: ["Condition", "الشرط"],
  delay: ["Delay", "تأخير"],
  action: ["Action", "الإجراء"],
};

export default function AutomationFlowCard({ automation, language }) {
  const tr = (en, ar) => (language === "ar" ? ar : en);
  if (!automation) {
    return (
      <div className="marketing-flow">
        <p className="marketing-flow-empty">{tr("Select an automation to preview its visual flow.", "اختر أتمتة لعرض مسارها المرئي.")}</p>
      </div>
    );
  }
  return (
    <div className="marketing-flow" data-automation-id={automation.id}>
      {automation.steps.map((node, index) => {
        const Icon = iconFor(node.icon);
        return (
          <React.Fragment key={`${automation.id}-${index}`}>
            {index > 0 ? <span className="marketing-flow-arrow"><ChevronRight size={20} /></span> : null}
            <article className={`marketing-flow-node is-${node.kind}`}>
              <span><Icon size={18} /></span>
              <strong>{tr(node.titleEn, node.titleAr)}</strong>
              <small>{tr(node.descEn, node.descAr)}</small>
            </article>
          </React.Fragment>
        );
      })}
    </div>
  );
}