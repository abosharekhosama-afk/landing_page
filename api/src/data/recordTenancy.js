import { DEFAULT_COMPANY_ID, normalizeCompanyId } from "../tenancy/company.js";

const recordCompanies = new WeakMap();

export function inputCompanyId(record) {
  return normalizeCompanyId(record?.company_id || record?.companyId);
}

export function withoutCompanyFields(record) {
  if (!record || typeof record !== "object") return record;
  const { company_id: _companyId, companyId: _camelCompanyId, ...data } = record;
  return data;
}

export function tagRecord(record, companyId = DEFAULT_COMPANY_ID) {
  if (record && typeof record === "object") {
    recordCompanies.set(record, normalizeCompanyId(companyId));
  }
  return record;
}

export function getRecordCompanyId(record) {
  return normalizeCompanyId(
    recordCompanies.get(record) || record?.company_id || record?.companyId,
  );
}