import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import EmployeeForm from "../components/EmployeeForm.jsx";
import EmployeeTable from "../components/EmployeeTable.jsx";
import { isCompanyAdmin } from "../utils/roles.js";

function AdminEmployeesPage({
  activePage = "admin-staff",
  company,
  currentUser,
  employees,
  isDarkMode,
  language = "en",
  modules,
  onLanguageChange,
  onDeleteEmployee,
  onLogout,
  onNavigate,
  onReturnToPlatform,
  onSwitchCompany,
  onSaveEmployee,
  onToggleDarkMode,
  onToggleEmployeeStatus,
  sessions,
  statusMessage,
  t,
}) {
  const [editingEmployee, setEditingEmployee] = React.useState(null);
  const [localMessage, setLocalMessage] = React.useState(null);
  const [formKey, setFormKey] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const isArabic = language === "ar";
  const title = activePage === "admin-staff-new"
    ? isArabic ? "موظف جديد" : "New Staff Member"
    : isArabic ? "الموظفون" : "Staff";
  const subtitle = activePage === "admin-staff-new"
    ? isArabic ? "إنشاء حساب موظف جديد" : "Create a staff account"
    : isArabic ? "إدارة حسابات الموظفين والأدوار والصلاحيات" : "Manage staff accounts, roles, and permissions";

  const layoutProps = {
    activePage,
    company,
    currentUser,
    isDarkMode,
    language,
    modules,
    onLanguageChange,
    onLogout,
    onNavigate,
    onReturnToPlatform,
    onSwitchCompany,
    onToggleDarkMode,
  };

  if (!isCompanyAdmin(currentUser?.role)) {
    return (
      <AdminLayout {...layoutProps} subtitle={t("admin.adminOnly")} title={t("admin.accessDenied")}>
        <div className="admin-empty-state">
          <strong>{t("admin.accessDenied")}</strong>
          <span>{t("admin.adminOnly")}</span>
        </div>
      </AdminLayout>
    );
  }

  async function handleSave(employee) {
    const result = await onSaveEmployee(employee);

    if (result?.ok) {
      setEditingEmployee(null);
      setFormKey((currentKey) => currentKey + 1);
      setLocalMessage({ type: "success", text: result.message });
      onNavigate("admin-staff");
    } else if (result?.message) {
      setLocalMessage({ type: "error", text: result.message });
    }
  }

  function handleEdit(employee) {
    setEditingEmployee(employee);
    onNavigate("admin-staff-new");
  }

  return (
    <AdminLayout {...layoutProps} subtitle={subtitle} title={title}>
      {(localMessage || statusMessage) && (
        <div className={localMessage?.type === "error" ? "message-panel error" : "message-panel success"}>
          {localMessage?.text || statusMessage}
        </div>
      )}

      {activePage === "admin-staff-new" ? (
        <section className="admin-panel-card">
          <div className="admin-role-info">
            <strong>Admin</strong>
            <span>Full access: manage staff, settings, all content, and all operations.</span>
            <strong>Manager</strong>
            <span>Manage products, orders, customers, reviews, and content. Cannot manage staff or settings.</span>
            <strong>Employee</strong>
            <span>View-only access for admin sections and regular employee workspace access.</span>
          </div>
          <EmployeeForm
            editingEmployee={editingEmployee}
            key={formKey}
            onCancel={() => {
              setEditingEmployee(null);
              onNavigate("admin-staff");
            }}
            onSave={handleSave}
            t={t}
          />
        </section>
      ) : (
        <section className="admin-panel-card admin-employees-page">
          <div className="admin-section-head">
            <div>
              <h2>{isArabic ? "الموظفون" : "Staff"}</h2>
              <p>{subtitle}</p>
            </div>
            <button className="admin-primary-button" onClick={() => onNavigate("admin-staff-new")} type="button">
              {isArabic ? "إضافة موظف" : "Add Staff"}
            </button>
          </div>
          <div className="admin-segmented">
            {[
              { key: "all", label: t("admin.filterAll") },
              { key: "active", label: t("admin.filterActive") },
              { key: "disabled", label: t("admin.filterDisabled") },
            ].map((tab) => (
              <button
                className={statusFilter === tab.key ? "active" : ""}
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <EmployeeTable
            employees={employees.filter((emp) => {
              if (statusFilter === "active") return emp.isActive;
              if (statusFilter === "disabled") return !emp.isActive;
              return true;
            })}
            onDelete={onDeleteEmployee}
            onEdit={handleEdit}
            onToggleStatus={onToggleEmployeeStatus}
            sessions={sessions}
            t={t}
          />
        </section>
      )}
    </AdminLayout>
  );
}

export default AdminEmployeesPage;
