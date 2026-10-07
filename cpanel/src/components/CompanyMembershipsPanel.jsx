import React from "react";
import { Pencil, UserPlus, Users } from "lucide-react";
import {
  createPlatformMembership,
  disablePlatformMembership,
  fetchPlatformMemberships,
  updatePlatformMembership,
} from "../utils/platformMembershipsApi.js";

const allowedRoles = ["company_admin", "employee", "customer"];
const allowedStatuses = ["active", "inactive"];
const emptyMemberForm = {
  email: "",
  name: "",
  role: "company_admin",
  status: "active",
  password: "",
};

function validateMembership(form, { requireEmail = false } = {}) {
  if (requireEmail && !form.email.trim()) return "Email is required.";
  if (!allowedRoles.includes(form.role)) return "Select a valid company role.";
  if (!allowedStatuses.includes(form.status)) return "Select a valid membership status.";
  return "";
}

function roleLabel(role) {
  return String(role || "").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function CompanyMembershipsPanel({
  companies,
  onForbidden,
  onSelectCompany,
  onUnauthorized,
  selectedCompanyId,
}) {
  const company = companies.find((item) => item.id === selectedCompanyId) || null;
  const [memberships, setMemberships] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [createForm, setCreateForm] = React.useState(emptyMemberForm);
  const [editingUserId, setEditingUserId] = React.useState("");
  const [editForm, setEditForm] = React.useState({ role: "employee", status: "active" });

  function handleRequestError(requestError, fallbackMessage) {
    if (requestError?.status === 401) {
      onUnauthorized();
      return;
    }
    if (requestError?.status === 403) {
      onForbidden();
      return;
    }
    setError(requestError?.message || fallbackMessage);
  }

  React.useEffect(() => {
    let active = true;
    setMemberships([]);
    setError("");
    setSuccess("");
    setEditingUserId("");

    if (!company?.id) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    fetchPlatformMemberships(company.id)
      .then((result) => {
        if (active) setMemberships(result);
      })
      .catch((requestError) => {
        if (active) handleRequestError(requestError, "Unable to load company members.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [company?.id]);

  function changeCreateForm(event) {
    const { name, value } = event.target;
    setCreateForm((current) => ({ ...current, [name]: value }));
  }

  function beginEdit(membership) {
    if (!allowedRoles.includes(membership.role)) return;
    setEditingUserId(membership.userId);
    setEditForm({
      role: membership.role,
      status: allowedStatuses.includes(membership.status) ? membership.status : "active",
    });
    setError("");
    setSuccess("");
  }

  async function submitMember(event) {
    event.preventDefault();
    if (!company) return;

    const validationError = validateMembership(createForm, { requireEmail: true });
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await createPlatformMembership(company.id, {
        email: createForm.email.trim().toLowerCase(),
        name: createForm.name.trim(),
        role: createForm.role,
        status: createForm.status,
        ...(createForm.password.trim() ? { password: createForm.password.trim() } : {}),
      });
      setMemberships((current) => {
        const exists = current.some((membership) => membership.userId === saved.userId);
        return exists
          ? current.map((membership) =>
              membership.userId === saved.userId ? saved : membership,
            )
          : [saved, ...current];
      });
      setCreateForm(emptyMemberForm);
      setSuccess(`${saved.email || "Member"} added to ${company.name}.`);
    } catch (requestError) {
      handleRequestError(requestError, "Unable to add this member.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitEdit(event) {
    event.preventDefault();
    if (!company || !editingUserId) return;

    const validationError = validateMembership(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await updatePlatformMembership(company.id, editingUserId, editForm);
      setMemberships((current) =>
        current.map((membership) =>
          membership.userId === saved.userId ? saved : membership,
        ),
      );
      setEditingUserId("");
      setSuccess(`${saved.email || "Member"} updated.`);
    } catch (requestError) {
      handleRequestError(requestError, "Unable to update this member.");
    } finally {
      setIsSaving(false);
    }
  }

  async function disableMember(membership) {
    if (!company || membership.role === "super_admin" || membership.status === "inactive") return;
    const label = membership.email || membership.name || "this member";
    if (!window.confirm(`Disable ${label} for ${company.name}?`)) return;

    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await disablePlatformMembership(company.id, membership.userId);
      setMemberships((current) =>
        current.map((item) => (item.userId === saved.userId ? saved : item)),
      );
      if (editingUserId === saved.userId) setEditingUserId("");
      setSuccess(`${saved.email || label} disabled.`);
    } catch (requestError) {
      handleRequestError(requestError, "Unable to disable this member.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-panel-card company-memberships-panel" id="company-memberships">
      <div className="admin-section-head company-memberships-head">
        <div>
          <h2>Company members</h2>
          <p>Assign company-level access without creating or promoting a Super Admin.</p>
        </div>
        <label className="company-memberships-selector">
          Company
          <select
            disabled={!companies.length || isSaving}
            onChange={(event) => onSelectCompany(event.target.value)}
            value={selectedCompanyId}
          >
            {!companies.length && <option value="">No companies available</option>}
            {companies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.slug || item.id})
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="message-panel error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="message-panel success" role="status">
          {success}
        </div>
      )}

      {!company ? (
        <div className="admin-empty-state">
          <Users size={24} />
          <strong>Select a company</strong>
          <span>Create or select a company before managing members.</span>
        </div>
      ) : (
        <>
          <form className="admin-form company-member-create-form" onSubmit={submitMember}>
            <label>
              Email
              <input
                autoCapitalize="none"
                autoComplete="email"
                name="email"
                onChange={changeCreateForm}
                required
                type="email"
                value={createForm.email}
              />
            </label>
            <label>
              Name
              <input
                autoComplete="name"
                name="name"
                onChange={changeCreateForm}
                value={createForm.name}
              />
            </label>
            <label>
              Temporary password
              <input
                autoComplete="new-password"
                name="password"
                onChange={changeCreateForm}
                placeholder="Required for new users. Ignored for existing."
                type="password"
                value={createForm.password}
              />
            </label>
            <label>
              Role
              <select name="role" onChange={changeCreateForm} required value={createForm.role}>
                <option value="company_admin">Company admin</option>
                <option value="employee">Employee</option>
                <option value="customer">Customer</option>
              </select>
            </label>
            <label>
              Status
              <select name="status" onChange={changeCreateForm} value={createForm.status}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <button className="admin-primary-button" disabled={isSaving} type="submit">
              <UserPlus size={15} />
              {isSaving ? "Saving..." : "Add member"}
            </button>
          </form>

          {editingUserId && (
            <form className="company-member-edit-form" onSubmit={submitEdit}>
              <strong>Edit membership</strong>
              <label>
                Role
                <select
                  disabled={isSaving}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, role: event.target.value }))
                  }
                  value={editForm.role}
                >
                  <option value="company_admin">Company admin</option>
                  <option value="employee">Employee</option>
                  <option value="customer">Customer</option>
                </select>
              </label>
              <label>
                Status
                <select
                  disabled={isSaving}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, status: event.target.value }))
                  }
                  value={editForm.status}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className="form-actions">
                <button
                  className="secondary-action"
                  disabled={isSaving}
                  onClick={() => setEditingUserId("")}
                  type="button"
                >
                  Cancel
                </button>
                <button className="admin-primary-button" disabled={isSaving} type="submit">
                  {isSaving ? "Saving..." : "Save membership"}
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="company-memberships-loading" aria-busy="true">
              Loading company members...
            </div>
          ) : memberships.length ? (
            <div className="admin-data-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Company</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th className="admin-data-table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((membership) => {
                    const protectedIdentity = membership.role === "super_admin";
                    return (
                      <tr key={membership.userId}>
                        <td>
                          <strong>{membership.name || "Unnamed member"}</strong>
                          <span className="company-member-email">{membership.email}</span>
                        </td>
                        <td>{roleLabel(membership.role)}</td>
                        <td>
                          <span
                            className={`admin-status-pill ${membership.status === "active" ? "active" : "neutral"}`}
                          >
                            {membership.status || "inactive"}
                          </span>
                        </td>
                        <td>{membership.companySlug || membership.companyId || company.slug || company.id}</td>
                        <td>{formatDate(membership.createdAt)}</td>
                        <td>{formatDate(membership.updatedAt)}</td>
                        <td className="admin-data-table-actions">
                          {protectedIdentity ? (
                            <span className="admin-status-pill neutral">Protected</span>
                          ) : (
                            <div className="company-row-actions">
                              <button
                                className="text-action"
                                disabled={isSaving}
                                onClick={() => beginEdit(membership)}
                                type="button"
                                aria-label={`Edit ${membership.email || membership.name || "member"}`}
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              {membership.status !== "inactive" && (
                                <button
                                  className="text-action company-disable-button"
                                  disabled={isSaving}
                                  onClick={() => disableMember(membership)}
                                  type="button"
                                  aria-label={`Disable ${membership.email || membership.name || "member"}`}
                                >
                                  Disable
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <Users size={24} />
              <strong>No company members</strong>
              <span>Add the first member using the form above.</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default CompanyMembershipsPanel;
