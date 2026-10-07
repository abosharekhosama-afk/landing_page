import React from "react";
import { createTranslator } from "../data/translations.js";

const text = (definition, language, key) => definition[key]?.[language] || definition[key]?.en || "";
const label = (definition, language) => text(definition, language, "label") || definition.field_key;
const ordered = (items) => (Array.isArray(items) ? items : []).map((item, index) => ({ ...item, sort_order: index }));

export function moveStructuredItem(items, from, to) {
  const next = [...(Array.isArray(items) ? items : [])];
  if (from < 0 || to < 0 || from >= next.length || to >= next.length || from === to) return ordered(next);
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return ordered(next);
}

function RowActions({ index, count, onMove, onRemove, t }) {
  return <div className="structured-row-actions">
    <button aria-label={t("productForm.moveUp")} title={t("productForm.moveUp")} disabled={index === 0} onClick={() => onMove(index, index - 1)} type="button">↑</button>
    <button aria-label={t("productForm.moveDown")} title={t("productForm.moveDown")} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} type="button">↓</button>
    <button className="text-action danger" onClick={() => onRemove(index)} type="button">{t("productForm.remove")}</button>
  </div>;
}

function BilingualInput({ labelText, multiline = false, value, onChange, t }) {
  const Input = multiline ? "textarea" : "input";
  return <div className="tenant-translations">
    <label>{labelText} — {t("productForm.english")}<Input dir="ltr" value={value?.en || ""} onChange={(event) => onChange({ ...(value || {}), en: event.target.value })} /></label>
    <label>{labelText} — {t("productForm.arabic")}<Input dir="rtl" value={value?.ar || ""} onChange={(event) => onChange({ ...(value || {}), ar: event.target.value })} /></label>
  </div>;
}

function StructuredRows({ definition, value, onChange, t }) {
  const items = ordered(value);
  const isFaq = definition.field_key === "product_faqs";
  const isShowcase = definition.field_key === "showcase_units";
  const update = (index, patch) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const remove = (index) => onChange(ordered(items.filter((_, itemIndex) => itemIndex !== index)));
  const move = (from, to) => onChange(moveStructuredItem(items, from, to));
  const add = () => onChange([...items, isFaq
    ? { question: { en: "", ar: "" }, answer: { en: "", ar: "" }, is_active: true, sort_order: items.length }
    : isShowcase
      ? { title: { en: "", ar: "" }, body: { en: "", ar: "" }, image: "", is_active: true, sort_order: items.length }
      : { key: { en: "", ar: "" }, value: { en: "", ar: "" }, is_active: true, sort_order: items.length }]);

  return <div className="structured-editor">
    {items.map((item, index) => <div className="structured-editor-row" key={`${definition.field_key}-${index}`}>
      {isFaq && <>
        <BilingualInput labelText={t("productForm.question")} t={t} value={item.question} onChange={(question) => update(index, { question })} />
        <BilingualInput labelText={t("productForm.answer")} t={t} multiline value={item.answer} onChange={(answer) => update(index, { answer })} />
      </>}
      {isShowcase && <>
        <BilingualInput labelText={t("productForm.heading")} t={t} value={item.title} onChange={(title) => update(index, { title })} />
        <BilingualInput labelText={t("productForm.content")} t={t} multiline value={item.body} onChange={(body) => update(index, { body })} />
        <label>Image URL<input value={item.image || ""} onChange={(event) => update(index, { image: event.target.value })} /></label>
      </>}
      {!isFaq && !isShowcase && <>
        <BilingualInput labelText={t("productForm.attribute")} t={t} value={item.key} onChange={(key) => update(index, { key })} />
        <BilingualInput labelText={t("productForm.value")} t={t} value={item.value} onChange={(entryValue) => update(index, { value: entryValue })} />
      </>}
      <label className="checkbox-line"><input checked={item.is_active !== false} type="checkbox" onChange={(event) => update(index, { is_active: event.target.checked })} />{t("productForm.active")}</label>
      <RowActions count={items.length} index={index} onMove={move} onRemove={remove} t={t} />
    </div>)}
    <button className="secondary-action compact-action" onClick={add} type="button">+ {isFaq ? t("productForm.addFaq") : isShowcase ? t("productForm.addSection") : t("productForm.addAttribute")}</button>
  </div>;
}

function LocalizedList({ value, onChange, t }) {
  const normalize = (entry) => Array.isArray(entry) ? entry : entry == null || entry === "" ? [] : [String(entry)];
  const legacy = Array.isArray(value) || typeof value === "string" ? normalize(value) : [];
  const en = value && !Array.isArray(value) && typeof value === "object" ? normalize(value.en) : legacy;
  const ar = value && !Array.isArray(value) && typeof value === "object" ? normalize(value.ar) : [];
  const count = Math.max(en.length, ar.length);
  const rows = Array.from({ length: count }, (_, index) => ({ en: en[index] || "", ar: ar[index] || "" }));
  const commit = (next) => onChange({ en: next.map((row) => row.en), ar: next.map((row) => row.ar) });
  return <div className="structured-editor">
    {rows.map((row, index) => <div className="structured-editor-row" key={index}>
      <BilingualInput labelText={`${t("productForm.item")} ${index + 1}`} t={t} value={row} onChange={(nextRow) => commit(rows.map((item, itemIndex) => itemIndex === index ? nextRow : item))} />
      <RowActions count={rows.length} index={index} onMove={(from, to) => commit(moveStructuredItem(rows, from, to))} onRemove={(removeIndex) => commit(rows.filter((_, itemIndex) => itemIndex !== removeIndex))} t={t} />
    </div>)}
    <button className="secondary-action compact-action" onClick={() => commit([...rows, { en: "", ar: "" }])} type="button">+ {t("productForm.addItem")}</button>
  </div>;
}

function SimpleList({ value, onChange, itemLabel = "Item", t }) {
  const items = Array.isArray(value) ? value : [];
  const commit = (next) => onChange(next.map((item) => String(item || "").trim()).filter(Boolean));
  return <div className="structured-editor">
    {items.map((item, index) => <div className="structured-editor-row" key={index}>
      <label>{itemLabel} {index + 1}<input value={item} onChange={(event) => commit(items.map((current, itemIndex) => itemIndex === index ? event.target.value : current))} /></label>
      <RowActions count={items.length} index={index} onMove={(from, to) => commit(moveStructuredItem(items.map((entry) => ({ value: entry })), from, to).map((entry) => entry.value))} onRemove={(removeIndex) => commit(items.filter((_, itemIndex) => itemIndex !== removeIndex))} t={t} />
    </div>)}
    <button className="secondary-action compact-action" onClick={() => onChange([...items, ""])} type="button">+ {t("productForm.addItem")}</button>
  </div>;
}

export default function TenantProductFields({ definitions, section, language = "en", value, onChange }) {
  const t = createTranslator(language);
  const fields = definitions.filter((item) => item.section === section && item.is_active !== false);
  if (!fields.length) return null;
  return <div className="full-field tenant-product-fields" dir={language === "ar" ? "rtl" : "ltr"}>
    {fields.map((definition) => {
      const current = value[definition.field_key];
      const updateLocale = (locale, next) => onChange(definition.field_key, { ...(current || {}), [locale]: next });
      const isLocalizedList = definition.translatable && ["repeatable_list", "multi_select"].includes(definition.field_type);
      const isStructured = !definition.translatable && (definition.field_type === "key_value" || definition.field_key === "showcase_units");
      const isSimpleList = !definition.translatable && !isStructured && ["repeatable_list", "multi_select", "multiple_images"].includes(definition.field_type);
      return <div className="tenant-product-field" key={definition.id}>
        <strong>{label(definition, language)}</strong>
        {isLocalizedList && <LocalizedList t={t} value={current} onChange={(next) => onChange(definition.field_key, next)} />}
        {isStructured && <StructuredRows definition={definition} t={t} value={current} onChange={(next) => onChange(definition.field_key, next)} />}
        {isSimpleList && <SimpleList itemLabel={definition.field_type === "multiple_images" ? t("productForm.imageUrl") : t("productForm.item")} t={t} value={current} onChange={(next) => onChange(definition.field_key, next)} />}
        {!isLocalizedList && !isStructured && !isSimpleList && definition.translatable && <div className="tenant-translations">
          <label>{t("productForm.english")}{["textarea", "rich_text"].includes(definition.field_type) ? <textarea dir="ltr" required={definition.is_required} value={current?.en || ""} onChange={(event) => updateLocale("en", event.target.value)} /> : <input dir="ltr" required={definition.is_required} value={current?.en || ""} onChange={(event) => updateLocale("en", event.target.value)} />}</label>
          <label>{t("productForm.arabic")}{["textarea", "rich_text"].includes(definition.field_type) ? <textarea dir="rtl" required={definition.is_required} value={current?.ar || ""} onChange={(event) => updateLocale("ar", event.target.value)} /> : <input dir="rtl" required={definition.is_required} value={current?.ar || ""} onChange={(event) => updateLocale("ar", event.target.value)} />}</label>
        </div>}
        {!isLocalizedList && !isStructured && !isSimpleList && !definition.translatable && definition.field_type === "boolean" && <label className="checkbox-line"><input checked={Boolean(current)} type="checkbox" onChange={(event) => onChange(definition.field_key, event.target.checked)} />Enabled</label>}
        {!isLocalizedList && !isStructured && !isSimpleList && !definition.translatable && definition.field_type !== "boolean" && ["textarea", "rich_text"].includes(definition.field_type) && <textarea required={definition.is_required} value={current || ""} onChange={(event) => onChange(definition.field_key, event.target.value)} />}
        {!isLocalizedList && !isStructured && !isSimpleList && !definition.translatable && !["boolean", "textarea", "rich_text"].includes(definition.field_type) && <input required={definition.is_required} type={definition.field_type === "number" ? "number" : "text"} value={current || ""} onChange={(event) => onChange(definition.field_key, event.target.value)} />}
        {text(definition, language, "help_text") && <small>{text(definition, language, "help_text")}</small>}
      </div>;
    })}
  </div>;
}
