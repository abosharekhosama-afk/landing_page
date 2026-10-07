import React from "react";
import { LoaderCircle, X } from "lucide-react";

const COPY = {
  en: {
    addTitle: "Add contact", editTitle: "Edit contact", firstName: "First name", lastName: "Last name",
    email: "Email", phone: "Phone", type: "Contact type", customer: "Customer", lead: "Lead",
    source: "Source", labels: "Labels", labelsHelp: "Separate labels with commas (maximum 20).", notes: "Notes",
    cancel: "Cancel", create: "Create contact", save: "Save changes", saving: "Saving…", close: "Close dialog",
    nameRequired: "Enter a first or last name.", emailRequired: "Email is required.", emailInvalid: "Enter a valid email address.",
  },
  ar: {
    addTitle: "إضافة جهة اتصال", editTitle: "تعديل جهة الاتصال", firstName: "الاسم الأول", lastName: "اسم العائلة",
    email: "البريد الإلكتروني", phone: "الهاتف", type: "نوع جهة الاتصال", customer: "عميل", lead: "عميل محتمل",
    source: "المصدر", labels: "التصنيفات", labelsHelp: "افصل التصنيفات بفواصل (20 كحد أقصى).", notes: "الملاحظات",
    cancel: "إلغاء", create: "إنشاء جهة الاتصال", save: "حفظ التغييرات", saving: "جارٍ الحفظ…", close: "إغلاق النافذة",
    nameRequired: "أدخل الاسم الأول أو اسم العائلة.", emailRequired: "البريد الإلكتروني مطلوب.", emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
  },
};

function valuesFromContact(contact) {
  return {
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    type: contact?.type || "customer",
    source: contact?.source || "",
    labels: Array.isArray(contact?.labels) ? contact.labels.join(", ") : "",
    notes: contact?.notes || "",
  };
}

function validate(values, copy) {
  const errors = {};
  if (!values.firstName.trim() && !values.lastName.trim()) errors.firstName = copy.nameRequired;
  if (!values.email.trim()) errors.email = copy.emailRequired;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = copy.emailInvalid;
  return errors;
}

function normalizeFieldErrors(serverErrors = {}) {
  const normalized = { ...serverErrors };
  const labelError = Object.entries(serverErrors).find(([field]) => field === "labels" || field.startsWith("labels["));
  if (labelError) normalized.labels = labelError[1];
  if (serverErrors.displayName && !serverErrors.firstName) normalized.firstName = serverErrors.displayName;
  return normalized;
}

export default function ContactFormDialog({ contact = null, language = "en", onClose, onSubmit }) {
  const copy = COPY[language] || COPY.en;
  const [values, setValues] = React.useState(() => valuesFromContact(contact));
  const [errors, setErrors] = React.useState({});
  const [formError, setFormError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const dialogRef = React.useRef(null);
  const firstFieldRef = React.useRef(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const previouslyFocused = document.activeElement;
    firstFieldRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape" && !saving) onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previouslyFocused?.focus?.(); };
  }, [onClose, saving]);

  function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const clientErrors = validate(values, copy);
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); return; }
    setSaving(true);
    setFormError("");
    try {
      await onSubmit(values);
    } catch (error) {
      setErrors(normalizeFieldErrors(error?.errors));
      setFormError(error?.message || "Request failed.");
      setSaving(false);
    }
  }

  const field = (name, label, type = "text") => (
    <label className="crm-contact-field">
      <span>{label}</span>
      <input aria-describedby={errors[name] ? `${name}-error` : undefined} aria-invalid={Boolean(errors[name])} disabled={saving} onChange={(event) => change(name, event.target.value)} ref={name === "firstName" ? firstFieldRef : undefined} type={type} value={values[name]} />
      {errors[name] && <small className="crm-contact-field-error" id={`${name}-error`}>{errors[name]}</small>}
    </label>
  );

  return (
    <div className="customers-modal-backdrop crm-contact-dialog-backdrop" onMouseDown={() => !saving && onClose()} role="presentation">
      <div aria-labelledby={titleId} aria-modal="true" className="customers-modal crm-contact-dialog" dir={language === "ar" ? "rtl" : "ltr"} onMouseDown={(event) => event.stopPropagation()} ref={dialogRef} role="dialog">
        <header><div><h2 id={titleId}>{contact ? copy.editTitle : copy.addTitle}</h2></div><button aria-label={copy.close} disabled={saving} onClick={onClose} type="button"><X size={18} /></button></header>
        <form onSubmit={submit}>
          <div className="crm-contact-form-grid">{field("firstName", copy.firstName)}{field("lastName", copy.lastName)}{field("email", copy.email, "email")}{field("phone", copy.phone, "tel")}
            <label className="crm-contact-field"><span>{copy.type}</span><select disabled={saving} onChange={(event) => change("type", event.target.value)} value={values.type}><option value="customer">{copy.customer}</option><option value="lead">{copy.lead}</option></select>{errors.type && <small className="crm-contact-field-error">{errors.type}</small>}</label>
            {field("source", copy.source)}
            <label className="crm-contact-field crm-contact-field-wide"><span>{copy.labels}</span><input disabled={saving} onChange={(event) => change("labels", event.target.value)} value={values.labels} /><small>{errors.labels || copy.labelsHelp}</small></label>
            <label className="crm-contact-field crm-contact-field-wide"><span>{copy.notes}</span><textarea disabled={saving} onChange={(event) => change("notes", event.target.value)} rows={4} value={values.notes} />{errors.notes && <small className="crm-contact-field-error">{errors.notes}</small>}</label>
          </div>
          {formError && <p className="crm-contact-form-error" role="alert">{formError}</p>}
          <footer><button className="customers-secondary-button" disabled={saving} onClick={onClose} type="button">{copy.cancel}</button><button className="customers-primary-button" disabled={saving} type="submit">{saving && <LoaderCircle className="crm-spin" size={16} />}{saving ? copy.saving : contact ? copy.save : copy.create}</button></footer>
        </form>
      </div>
    </div>
  );
}
