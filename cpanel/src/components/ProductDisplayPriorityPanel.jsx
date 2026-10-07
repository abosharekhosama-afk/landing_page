import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  deleteProductDisplayPriority,
  fetchProductDisplayPriority,
  saveProductDisplayPriority,
} from "../utils/productsApi.js";
import { getMainCategories, getSubcategoriesForMain } from "../utils/adminCategories.js";
import {
  PRODUCT_FILTER_ATTRIBUTE_OPTIONS,
  getLocalizedFilterAttributeOptions,
} from "../utils/productFilterAttributes.js";
import {
  PRODUCT_FILTER_FORM_GROUPS,
  PRODUCT_FILTER_FORM_LABELS,
  PRODUCT_MERCHANDISING_FLAGS,
} from "../utils/productVariantsForm.js";

const ORDERING_KEYS = [
  ["catalog", "admin.catalogOrder"],
  ["featured", "admin.flagFeatured"],
  ["newArrival", "admin.flagNewArrival"],
  ["bestseller", "admin.flagBestseller"],
  ["verifiedSales", "admin.verifiedSales"],
  ["manual", "admin.manualProductOrder"],
  ["newest", "admin.newestFirst"],
  ["oldest", "admin.oldestFirst"],
  ["priceAsc", "admin.priceLowHigh"],
  ["priceDesc", "admin.priceHighLow"],
  ["name", "admin.nameOrder"],
];

const FILTER_GROUPS = PRODUCT_FILTER_FORM_GROUPS.filter((group) => group !== "collection");

function groupLabel(group, language) {
  const labels = PRODUCT_FILTER_FORM_LABELS[group];
  return labels?.[language] || labels?.en || group;
}

function dimensionOf(rule) {
  if (rule?.source === "filter") return `filter:${rule.group || FILTER_GROUPS[0] || ""}`;
  return rule?.source || "collection";
}

function localizedName(value, language) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language] || value.en || value.ar || "";
}

function blankRule(dimension = "collection") {
  if (dimension === "flag") return { source: "flag", id: PRODUCT_MERCHANDISING_FLAGS[0] };
  if (dimension === "category") return { source: "category", id: "" };
  if (String(dimension).startsWith("filter:")) {
    const group = dimension.slice("filter:".length) || FILTER_GROUPS[0] || "";
    const id = PRODUCT_FILTER_ATTRIBUTE_OPTIONS[group]?.[0]?.id || "";
    return { source: "filter", group, id };
  }
  const id = PRODUCT_FILTER_ATTRIBUTE_OPTIONS.collection?.[0]?.id || "";
  return { source: "collection", id };
}

function categoryOptionGroups(categories) {
  const source = Array.isArray(categories) ? categories : [];
  const listed = new Set();
  const groups = getMainCategories(source).map((main) => {
    listed.add(main.id);
    const subcategories = getSubcategoriesForMain(source, main.id);
    subcategories.forEach((subcategory) => listed.add(subcategory.id));
    return { main, subcategories };
  });
  const rest = source.filter((category) => category?.id && !listed.has(category.id));
  return { groups, rest };
}

export default function ProductDisplayPriorityPanel({
  brands = [],
  canUpdate = false,
  categories = [],
  language = "en",
  pageRows = [],
  t,
}) {
  const [surface, setSurface] = React.useState("shop");
  const [brandId, setBrandId] = React.useState("");
  const [inheritSelection, setInheritSelection] = React.useState(false);
  const [inheritOrdering, setInheritOrdering] = React.useState(false);
  const [match, setMatch] = React.useState("and");
  const [rules, setRules] = React.useState([]);
  const [orderingKey, setOrderingKey] = React.useState("catalog");
  const [productIds, setProductIds] = React.useState([]);
  const [resolvedOrderingKey, setResolvedOrderingKey] = React.useState("catalog");
  const [status, setStatus] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const isBrand = Boolean(brandId);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("");
    fetchProductDisplayPriority({ surface, brandId: brandId || undefined })
      .then((data) => {
        if (cancelled || !data) return;
        const selectionIsStored = Array.isArray(data.selection);
        const orderingIsStored = Boolean(data.orderingKey);
        setInheritSelection(isBrand && !selectionIsStored);
        setInheritOrdering(isBrand && !orderingIsStored);
        setMatch(data.selectionMatch === "or" ? "or" : "and");
        setRules(selectionIsStored ? data.selection : []);
        setOrderingKey(data.orderingKey || data.resolvedOrderingKey || "catalog");
        setResolvedOrderingKey(data.resolvedOrderingKey || data.orderingKey || "catalog");
        setProductIds(Array.isArray(data.productIds) ? data.productIds : []);
      })
      .catch((error) => {
        if (!cancelled) setStatus({ kind: "error", text: error?.message || t("admin.loadFailed") || "Unable to load." });
      });
    return () => {
      cancelled = true;
    };
  }, [surface, brandId, isBrand, t]);

  function updateRule(index, patch) {
    setRules((current) => current.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)));
  }

  function moveManual(index, direction) {
    setProductIds((current) => {
      const next = current.slice();
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    setStatus("");
    const selection = isBrand && inheritSelection ? null : { match, rules };
    const nextOrderingKey = isBrand && inheritOrdering ? null : orderingKey;
    try {
      const saved = await saveProductDisplayPriority({
        surface,
        brandId: brandId || null,
        selection,
        orderingKey: nextOrderingKey,
        productIds: nextOrderingKey === "manual" ? productIds : [],
      });
      setInheritSelection(isBrand && saved?.selection == null);
      setInheritOrdering(isBrand && !saved?.orderingKey);
      if (Array.isArray(saved?.selection)) setRules(saved.selection);
      if (saved?.orderingKey) setOrderingKey(saved.orderingKey);
      if (saved?.resolvedOrderingKey) setResolvedOrderingKey(saved.resolvedOrderingKey);
      if (Array.isArray(saved?.productIds)) setProductIds(saved.productIds);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", text: error?.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function onRemove() {
    setSaving(true);
    setStatus("");
    try {
      await deleteProductDisplayPriority({ surface, brandId: brandId || undefined });
      setInheritSelection(isBrand);
      setInheritOrdering(isBrand);
      setRules([]);
      setOrderingKey("catalog");
      setProductIds([]);
      setStatus({ kind: "removed" });
    } catch (error) {
      setStatus(error?.message ? { kind: "error", text: error.message } : { kind: "error", text: "Remove failed" });
    } finally {
      setSaving(false);
    }
  }

  const showRules = !isBrand || !inheritSelection;
  const showOrdering = !isBrand || !inheritOrdering;
  const categoryGroups = categoryOptionGroups(categories);

  return (
    <section className="products-display-priority">
      <h2>{t("admin.displayPriority")}</h2>
      <div className="products-display-priority-controls">
        <label>
          {t("admin.displaySurface")}
          <select value={surface} onChange={(event) => setSurface(event.target.value)}>
            <option value="home">{t("admin.surfaceHome")}</option>
            <option value="shop">{t("admin.surfaceShop")}</option>
          </select>
        </label>
        <label>
          {t("admin.displayScope")}
          <select value={brandId} onChange={(event) => setBrandId(event.target.value)}>
            <option value="">{t("admin.scopeGlobal")}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{localizedName(brand.name, language) || brand.id}</option>
            ))}
          </select>
        </label>
        {isBrand && (
          <>
            <label className="products-display-priority-check">
              <input type="checkbox" checked={inheritSelection} onChange={(event) => setInheritSelection(event.target.checked)} />
              {t("admin.inheritSelection")}
            </label>
            <label className="products-display-priority-check">
              <input type="checkbox" checked={inheritOrdering} onChange={(event) => setInheritOrdering(event.target.checked)} />
              {t("admin.inheritOrdering")}
            </label>
          </>
        )}
      </div>
      {showRules && (
        <div className="products-display-priority-rules">
          <div className="products-display-priority-controls">
            <label>
              {t("admin.selectionRules")}
              <select value={match} onChange={(event) => setMatch(event.target.value)}>
                <option value="and">{t("admin.matchAll")}</option>
                <option value="or">{t("admin.matchAny")}</option>
              </select>
            </label>
            <button className="secondary-action" type="button" onClick={() => setRules((current) => [...current, blankRule()])}>{t("admin.addRule")}</button>
          </div>
          {rules.map((rule, index) => (
            <div className="products-display-priority-rule" key={`${rule.source}-${index}`}>
              <select
                value={dimensionOf(rule)}
                onChange={(event) => {
                  const next = blankRule(event.target.value);
                  setRules((current) => current.map((rule, ruleIndex) => (ruleIndex === index ? next : rule)));
                }}
              >
                <option value="collection">{groupLabel("collection", language)}</option>
                <option value="category">{t("productForm.category")}</option>
                {FILTER_GROUPS.map((group) => (
                  <option key={group} value={`filter:${group}`}>{groupLabel(group, language)}</option>
                ))}
                <option value="flag">{t("admin.sourceFlag")}</option>
              </select>
              {rule.source === "flag" && (
                <select value={rule.id || PRODUCT_MERCHANDISING_FLAGS[0]} onChange={(event) => updateRule(index, { source: "flag", id: event.target.value })}>
                  {PRODUCT_MERCHANDISING_FLAGS.map((id) => (
                    <option key={id} value={id}>{t(`productForm.${id}`)}</option>
                  ))}
                </select>
              )}
              {rule.source === "filter" && (
                <select value={rule.id || ""} onChange={(event) => updateRule(index, { source: "filter", group: rule.group, id: event.target.value })}>
                  {getLocalizedFilterAttributeOptions(rule.group, language).map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.label}</option>
                  ))}
                </select>
              )}
              {rule.source === "collection" && (
                <select value={rule.id || ""} onChange={(event) => updateRule(index, { source: "collection", id: event.target.value })}>
                  {getLocalizedFilterAttributeOptions("collection", language).map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.label}</option>
                  ))}
                </select>
              )}
              {rule.source === "category" && (
                <select value={rule.id || ""} onChange={(event) => updateRule(index, { source: "category", id: event.target.value })}>
                  <option value="" />
                  {categoryGroups.groups.map(({ main, subcategories }) => (
                    <optgroup key={main.id} label={localizedName(main.name, language) || main.id}>
                      <option value={main.id}>{localizedName(main.name, language) || main.id}</option>
                      {subcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>{localizedName(subcategory.name, language) || subcategory.id}</option>
                      ))}
                    </optgroup>
                  ))}
                  {categoryGroups.rest.map((category) => (
                    <option key={category.id} value={category.id}>{localizedName(category.name, language) || category.id}</option>
                  ))}
                </select>
              )}
              <button type="button" onClick={() => setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index))}>{t("admin.delete")}</button>
            </div>
          ))}
        </div>
      )}
      {showOrdering && (
        <div className="products-display-priority-controls">
          <label>
            {t("admin.ordering")}
            <select value={orderingKey} onChange={(event) => setOrderingKey(event.target.value)}>
              {ORDERING_KEYS.map(([key, labelKey]) => (
                <option key={key} value={key}>{t(labelKey)}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {isBrand && inheritOrdering && (
        <p className="products-display-priority-note">{t("admin.inheritOrdering")}: {t(ORDERING_KEYS.find(([key]) => key === resolvedOrderingKey)?.[1] || "admin.catalogOrder")}</p>
      )}
      {showOrdering && orderingKey === "manual" && (
        <div className="products-display-priority-manual">
          <h3>{t("admin.manualProductOrder")}</h3>
          <select
            defaultValue=""
            onChange={(event) => {
              const id = event.target.value;
              if (!id) return;
              setProductIds((current) => (current.includes(id) ? current : [...current, id]));
              event.target.value = "";
            }}
          >
            <option value="">{t("admin.addRule")}</option>
            {pageRows.map((product) => (
              <option key={product.id} value={product.id}>{product.sku || product.id}</option>
            ))}
          </select>
          <ol>
            {productIds.map((id, index) => (
              <li key={id}>
                {pageRows.find((product) => product.id === id)?.sku || id}
                <button type="button" onClick={() => moveManual(index, -1)} disabled={index === 0} aria-label={t("productForm.moveUp")}>
                  <ChevronUp size={16} />
                </button>
                <button type="button" onClick={() => moveManual(index, 1)} disabled={index === productIds.length - 1} aria-label={t("productForm.moveDown")}>
                  <ChevronDown size={16} />
                </button>
                <button type="button" onClick={() => setProductIds((current) => current.filter((entry) => entry !== id))}>{t("admin.delete")}</button>
              </li>
            ))}
          </ol>
        </div>
      )}
      {canUpdate && (
        <div className="products-display-priority-actions">
          <button className="admin-primary-button" type="button" disabled={saving} onClick={onSave}>{t("admin.saveDisplayPriority")}</button>
          <button className="secondary-action" type="button" disabled={saving} onClick={onRemove}>{t("admin.removeDisplayOverride")}</button>
        </div>
      )}
      {status && <p className="products-display-priority-note" role="status">{status.kind === "saved" ? t("admin.save") : status.kind === "removed" ? t("admin.removeDisplayOverride") : status.text}</p>}
    </section>
  );
}
