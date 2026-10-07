// T-003 — Shared marketing UI primitives (icons, pills, notices, bilingual helper).
import React from "react";
import {
  CalendarDays,
  Clock,
  Gift,
  GitBranch,
  Heart,
  Mail,
  Megaphone,
  Send,
  ShoppingCart,
  Sparkles,
  Tag,
  Upload,
  UserCheck,
  Users,
  WandSparkles,
  Workflow,
  Zap,
} from "lucide-react";

export const iconMap = {
  megaphone: Megaphone,
  gift: Gift,
  mail: Mail,
  sparkles: Sparkles,
  users: Users,
  "user-check": UserCheck,
  tag: Tag,
  upload: Upload,
  zap: Zap,
  clock: Clock,
  send: Send,
  branch: GitBranch,
  wand: WandSparkles,
  workflow: Workflow,
  calendar: CalendarDays,
  cart: ShoppingCart,
  heart: Heart,
};

export const iconFor = (key) => iconMap[key] || Mail;

export const trFor = (language) => (en, ar) => (language === "ar" ? ar : en);

export function StatusPill({ children, tone }) {
  return <span className={`marketing-status-pill${tone ? ` is-${tone}` : ""}`}>{children}</span>;
}

export function MarketingNotice({ children }) {
  return (
    <div className="marketing-inline-notice" role="status">
      {children}
    </div>
  );
}