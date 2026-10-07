import React from "react";
import { canonicalOrderStatus } from "../utils/sales.js";

function StatusBadge({ status, t }) {
  const canonical = canonicalOrderStatus(status);
  const className = `status-badge status-${canonical.trim().toLowerCase().replace(/\s+/g, "-")}`;
  const label = typeof t === "function" ? t(`status.${canonical}`) : "";
  return (
    <span className={className}>
      {label && label !== `status.${canonical}` ? label : canonical}
    </span>
  );
}

export default StatusBadge;
