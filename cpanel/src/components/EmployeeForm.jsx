import React from "react";
import PermissionsEditor from "./PermissionsEditor.jsx";

const emptyForm = {
  id: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  isActive: true,
  permissions: [],
  position: "",
  department: "",
  hireDate: new Date().toISOString().slice(0, 10),
  salary: "",
  notes: "",
};

function employeeToForm(employee) {
  if (!employee) {
    return emptyForm;
  }

  return {
    ...emptyForm,
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phone: employee.phone || "",
    isActive: Boolean(employee.isActive),
    permissions: employee.permissions || [],
    position: employee.position || "",
    department: employee.department || "",
    hireDate: employee.hireDate || emptyForm.hireDate,
    salary: String(employee.salary || 0),
    notes: employee.notes || "",
  };
}

function EmployeeForm({ editingEmployee, onCancel, onSave, t }) {
  const [form, setForm] = React.useState(() => employeeToForm(editingEmployee));

  React.useEffect(() => {
    setForm(employeeToForm(editingEmployee));
  }, [editingEmployee]);

  function handleChange(event) {
    const { checked, name, type, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      ...form,
      id: form.id || `employee-${Date.now()}`,
      is_active: form.isActive,
      salary: Number(form.salary || 0),
    });
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h3>
        {editingEmployee ? t("admin.editEmployee") : t("admin.addEmployee")}
      </h3>
      <label>
        {t("admin.employeeName")}
        <input name="name" onChange={handleChange} required value={form.name} />
      </label>
      <label>
        {t("auth.email")}
        <input
          name="email"
          onChange={handleChange}
          required
          type="email"
          value={form.email}
        />
      </label>
      <label>
        {t("auth.phone")}
        <input name="phone" onChange={handleChange} value={form.phone} />
      </label>
      <label>
        {t("auth.password")}
        <input
          name="password"
          onChange={handleChange}
          placeholder={editingEmployee ? t("admin.passwordOptional") : ""}
          required={!editingEmployee}
          type="password"
          value={form.password}
        />
      </label>
      <label>
        {t("admin.position")}
        <input name="position" onChange={handleChange} value={form.position} />
      </label>
      <label>
        {t("admin.department")}
        <input name="department" onChange={handleChange} value={form.department} />
      </label>
      <label>
        {t("admin.hireDate")}
        <input
          name="hireDate"
          onChange={handleChange}
          type="date"
          value={form.hireDate}
        />
      </label>
      <label>
        {t("admin.salary")}
        <input
          min="0"
          name="salary"
          onChange={handleChange}
          type="number"
          value={form.salary}
        />
      </label>
      <label className="checkbox-line employee-active-toggle">
        <input
          checked={form.isActive}
          name="isActive"
          onChange={handleChange}
          type="checkbox"
        />
        <span>{form.isActive ? t("admin.active") : t("admin.inactive")}</span>
      </label>
      <label className="full-field">
        {t("checkout.notes")}
        <textarea name="notes" onChange={handleChange} value={form.notes} />
      </label>
      <div className="full-field">
        <h4>{t("admin.permissions")}</h4>
        <PermissionsEditor
          onChange={(permissions) =>
            setForm((currentForm) => ({ ...currentForm, permissions }))
          }
          permissions={form.permissions}
          t={t}
        />
      </div>
      <div className="form-actions full-field">
        <button className="primary-action" type="submit">
          {t("admin.save")}
        </button>
        <button className="secondary-action" onClick={onCancel} type="button">
          {t("admin.cancel")}
        </button>
      </div>
    </form>
  );
}

export default EmployeeForm;
