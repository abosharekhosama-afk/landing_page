import { storePolicyRepository } from "../data/store.js";
import { createCrudRouter } from "./employee4Crud.js";

const policyTypes = new Set(["SHIPPING", "RETURNS", "REFUNDS", "REFUND", "EXCHANGE", "CANCELLATION", "PRIVACY", "TERMS", "WARRANTY", "CUSTOM"]);
const placements = new Set(["FOOTER", "CART", "CHECKOUT", "STANDALONE_PAGE"]);

function validatePolicy(value = {}) {
  if (!policyTypes.has(String(value.type || ""))) return "Invalid policy type.";
  if (!String(value.title_ar || "").trim() && !String(value.title_en || "").trim()) return "Arabic or English title is required.";
  if (!String(value.content_ar || "").trim() && !String(value.content_en || "").trim()) return "Arabic or English content is required.";
  if (!Array.isArray(value.placements || [])) return "Placements must be an array.";
  if ((value.placements || []).some((placement) => !placements.has(String(placement)))) return "Invalid policy placement.";
  if (!Number.isInteger(Number(value.display_order ?? 0))) return "Display order must be an integer.";
  return null;
}

export default createCrudRouter({
  repository: storePolicyRepository,
  viewPermission: "policies.view",
  managePermission: "policies.manage",
  entityType: "POLICY",
  actionPrefix: "POLICY",
  validate: validatePolicy,
});
