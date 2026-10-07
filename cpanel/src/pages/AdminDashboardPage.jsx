import React from "react";
import {
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  HandCoins,
  Mail,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  ClipboardList,
  Upload,
  UserCircle,
  Users,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminTable from "../components/AdminTable.jsx";
import Toolbar from "../components/Toolbar.jsx";
import DashboardInsightsPanel from "../components/DashboardInsightsPanel.jsx";
import AdminOrdersTable from "../components/AdminOrdersTable.jsx";
import CategoriesHierarchy from "../components/CategoriesHierarchy.jsx";
import BrandsCatalogTable from "../components/BrandsCatalogTable.jsx";
import DeferredAdminThumb from "../components/DeferredAdminThumb.jsx";
import MediaSlotsManager from "../components/MediaSlotsManager.jsx";
import AdminMediaField from "../components/AdminMediaField.jsx";
import TenantProductFields from "../components/TenantProductFields.jsx";
import ProductPicker from "../components/ProductPicker.jsx";
import HomeContentManager from "../components/HomeContentManager.jsx";
import ProductDisplayPriorityPanel from "../components/ProductDisplayPriorityPanel.jsx";
import { deleteProductMedia, uploadImage, uploadImages, uploadProductMedia, uploadWebsiteVideo, validateProductMediaFile } from "../utils/api.js";
import {
  DEFAULT_PRODUCTS_PAGE_SIZE,
  fetchProductSortIds,
  fetchProducts,
  replaceProductRelations,
  fetchProductRelations,
} from "../utils/productsApi.js";
import { fieldStateToValues, productFieldApi, valuesToFieldState } from "../utils/productFields.js";
import { fetchCompanyProductSchema } from "../utils/productSchemaApi.js";
import {
  getMainCategoriesForBrand,
  getSubcategoriesForMain,
  isCompleteProductHierarchy,
  resolveMainCategoryFor,
  validateProductHierarchySelection,
} from "../utils/adminCategories.js";
import { tenantStorageKey } from "../utils/companyContext.js";
import {
  PRODUCT_FILTER_FORM_GROUPS,
  PRODUCT_FILTER_FORM_LABELS,
  PRODUCT_MERCHANDISING_FLAGS,
  createCommerceVariant,
  createLocalizedCopy,
  createProductFromForm,
  makeSlug,
  normalizeFormVariant,
  normalizeProductVariantsForForm,
} from "../utils/productVariantsForm.js";
import { resolveLowStockThreshold } from "../utils/lowStockThreshold.js";
import { INVENTORY_PRODUCT_QUERY_KEY } from "../utils/inventoryProductQuery.js";
import {
  canMoveProductDown,
  canMoveProductUp,
  moveProductInFilteredOrder,
  productIdsInSortOrder,
  sortProductsBySortOrder,
} from "../utils/productOrdering.js";
import {
  getLocalizedFilterAttributeOptions,
  getLocalizedFilterAttributeOptionsForSelect,
  requiresCanonicalAgeSelection,
  resolveProductFilterAttributeForForm,
} from "../utils/productFilterAttributes.js";
import { moduleAllowsPage, pageKeyForModule } from "../utils/moduleRegistry.js";
import { canAccessAdminPage, canManageProductMedia, canUpdateProducts, isAdminPortalRole, isCompanyAdmin, isStaffRole, isTenantOperator, tenantAccessNotice } from "../utils/roles.js";
import { hasPermission } from "../data/permissions.js";
import { createTranslator } from "../data/translations.js";
import { resolveProductImageUrl, useProductImagePlaceholder } from "../utils/productImages.js";
import {
  buildDashboardActivity,
  buildDashboardAnalytics,
  buildDashboardChecklist,
  dashboardDirection,
  isDashboardActionAuthorized,
  resolveDashboardDestination,
  sortDashboardActivity,
} from "../utils/dashboardHome.js";

const storageKeys = {
  inventory: "inventory",
  movements: "stockMovements",
  settings: "settings",
  stores: "stores",
};

const pageMeta = {
  admin: ["Dashboard", "Overview of your store performance"],
  "admin-products": ["Products", "Manage your product catalog"],
  "admin-products-trash": ["Product Trash", "Restore products or permanently delete them"],
  "admin-products-new": ["New Product", "Create or update product catalog details"],
  "admin-categories": ["Categories", "Organize your product hierarchy"],
  "admin-categories-new": ["New Category", "Create a storefront category"],
  "admin-brands": ["Brands", "Manage brand manufacturers and lines"],
  "admin-brands-new": ["New Brand", "Create a brand profile"],
  "admin-vlogs-new": ["New Vlog", "Create a storefront vlog entry"],
  "admin-store-locator": ["Store Locator", "Manage physical store locations"],
  "admin-store-locator-new": ["New Store", "Create a retail location"],
  "admin-website-media": ["Website Media", "Manage images used across storefront sections"],
  "admin-orders": ["Orders", "Manage and track customer orders"],
  "admin-reviews": ["Reviews", "Moderate customer reviews and ratings"],
  "admin-inventory": ["Inventory Management", "Monitor stock levels, adjust quantities, and review movement history"],
  "admin-customers": ["Customers", "Manage customer accounts and view order history"],
  "admin-settings": ["Settings", "Manage site identity, metadata, social links, and shipping rules from one page."],
};

function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local admin drafts are optional; failing storage should not break the panel.
  }
}

function getText(value, language = "en") {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value[language] || value.en || value.ar || "";
  }
  return "";
}

function getProductSku(product) {
  return product.sku || product.id || product.slug || "-";
}

function getPrimaryVariant(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  return variants.find((variant) => variant.isActive !== false && variant.is_active !== false) || variants[0];
}

function positivePriceOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function getProductPrice(product) {
  const primary = positivePriceOrNull(getPrimaryVariant(product)?.price);
  if (primary !== null) return primary;
  const sizePrices = (product.sizes || [])
    .map((size) => positivePriceOrNull(size.price))
    .filter((price) => price !== null);
  if (sizePrices.length) return Math.min(...sizePrices);
  return positivePriceOrNull(product.price) ?? 0;
}

function getProductSalePrice(product) {
  const primary = getPrimaryVariant(product);
  const sale = primary?.sale_price ?? primary?.salePrice ?? product.sale_price ?? product.salePrice;
  if (sale === "" || sale == null) return null;
  const value = Number(sale);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getStockQty(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length) {
    return variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock ?? variant.stockQty ?? 0) || 0), 0);
  }
  if (Number.isFinite(Number(product.stockQty))) return Number(product.stockQty);
  if ((product.stockStatus || "").toLowerCase().includes("out")) return 0;
  return 0;
}

function stockFilterBucket(stock, threshold = 5) {
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "in";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function uniqueCustomersFromOrders(orders) {
  const customers = new Map();
  orders.forEach((order) => {
    const key = order.customer?.email || order.customer?.phone || order.customer?.name || order.id;
    const current = customers.get(key) || {
      createdAt: order.createdAt,
      email: order.customer?.email || "-",
      name: order.customer?.name || "-",
      orders: 0,
      phone: order.customer?.phone || "-",
      status: "Active",
      updatedAt: order.updatedAt || order.createdAt,
    };
    current.orders += 1;
    current.updatedAt = order.updatedAt || current.updatedAt;
    customers.set(key, current);
  });
  return Array.from(customers.values());
}

function normalizeGalleryImagesForForm(product = {}) {
  product = product || {};
  const source = product.gallery_images || product.galleryImages || [];
  return source
    .map((entry, index) => ({
      id: typeof entry === "object" && entry?.id ? entry.id : `gallery-${index}`,
      image_url: typeof entry === "string" ? entry : entry?.image_url || entry?.image || entry?.url || "",
      sort_order: Number(typeof entry === "object" ? entry?.sort_order ?? entry?.sortOrder ?? index : index),
    }))
    .filter((entry) => entry.image_url);
}

function createGalleryImageEntry(index = 0, imageUrl = "") {
  return {
    id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    image_url: imageUrl,
    sort_order: index,
  };
}

function parseVariantGeneratorColors(value = "") {
  const seen = new Set();
  const result = [];

  value
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [name = "", colorValue = "", imageUrl = ""] = line.split("|").map((part) => part.trim());
      const colorName = name || "Default";
      const hex = (colorValue || "#1db7d8").toLowerCase();
      const key = `${colorName.toLowerCase()}|${hex}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({ name: colorName, value: hex, imageUrl });
    });

  return result;
}

function parseVariantGeneratorSizes(value = "") {
  return value
    .split(/\n|,|;/)
    .map((size) => size.trim())
    .filter(Boolean);
}

function SearchField({ placeholder, value, onChange }) {
  return (
    <label className="admin-search-field">
      <Search size={15} />
      <input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Badge({ tone = "active", children }) {
  return <span className={`admin-status-pill ${tone}`}>{children}</span>;
}

function CardImageUpload({ label, helperText, buttonLabel, language = "en", name, value, onChange, onUploadingChange, productId, tenantSpecific = false, variant = "primary" }) {
  const t = React.useMemo(() => createTranslator(language), [language]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");
  const inputRef = React.useRef(null);
  const uploadingRef = React.useRef(false);
  const uploadBlocked = tenantSpecific && !productId;

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (uploadBlocked) {
      setUploadError("Save the product before uploading card images.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setIsUploading(true);
    onUploadingChange?.(true);
    setUploadError("");
    try {
      validateProductMediaFile(file, { allowVideo: false });
      const uploaded = productId ? await uploadProductMedia(file, productId) : await uploadImage(file);
      if (!uploaded?.url && !uploaded?.path) {
        throw new Error("Upload succeeded but no URL was returned. Storage may not be configured.");
      }
      onChange({ target: { name, value: uploaded.url || uploaded.path } });
      setUploadError("");
    } catch (error) {
      const message = error?.message || t("productForm.errors.imageUpload");
      setUploadError(message);
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
      uploadingRef.current = false;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    onChange({ target: { name, value: "", removeImage: true } });
    setUploadError("");
  }

  const borderClass = variant === "hover" ? "admin-card-image-upload-hover" : "admin-card-image-upload-primary";

  return (
    <div className={`admin-media-field ${borderClass}`}>
      <div className="admin-card-image-header">
        <span className="admin-card-image-label">{label}</span>
        {helperText && <span className="admin-card-image-helper">{helperText}</span>}
      </div>
      <div className="admin-card-image-input-row">
        <input
          name={name}
          placeholder="https://..."
          value={value || ""}
          onChange={onChange}
        />
        <label className="admin-upload-button">
          <Upload size={14} />
          {isUploading ? t("productForm.uploading") : uploadBlocked ? t("productForm.saveFirst") : buttonLabel}
          <input
            ref={inputRef}
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            disabled={isUploading || uploadBlocked}
            hidden
            type="file"
            onChange={handleUpload}
          />
        </label>
        {value && (
          <button
            className="text-action danger"
            onClick={handleRemove}
            type="button"
            disabled={isUploading}
          >
            {t("productForm.removeImage")}
          </button>
        )}
      </div>
      {uploadError && <div className="message-panel error compact">{uploadError}</div>}
      {isUploading && <div className="admin-upload-progress"><span>{t("productForm.uploadingImage")}</span></div>}
      {value && (
        <div className="admin-media-preview">
          <img alt="" src={resolveProductImageUrl(value)} onError={useProductImagePlaceholder} />
        </div>
      )}
    </div>
  );
}

function MediaField(props) {
  return <AdminMediaField {...props} />;
}

function PermissionNotice({ currentUser, role }) {
  const notice = tenantAccessNotice(currentUser || role);
  if (!notice) return null;
  return (
    <div className="message-panel warning">
      {notice}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="admin-empty-state">
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}

function LegacyDashboardHome({ company, currentUser, employees, language, modules, onNavigate, orders, products, t }) {
  const customers = React.useMemo(() => uniqueCustomersFromOrders(orders), [orders]);
  const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const activeProducts = products.filter((p) => p.isActive !== false && p.status !== "Inactive").length;
  const pendingOrders = orders.filter((o) => /pending/i.test(o.status || "")).length;
  const role = currentUser?.role;
  const canCreate = isCompanyAdmin(role) || hasPermission(currentUser, "products.create") || hasPermission(currentUser, "products.manage");
  const canManage = isCompanyAdmin(role);
  const l = language;

  const setupItems = [];
  if (!products.length) setupItems.push({ icon: Package, message: t("admin.noProductsCreated") });
  if (products.length > 0 && activeProducts === 0) setupItems.push({ icon: AlertCircle, message: t("admin.enableProductNotice") });
  if (pendingOrders > 0) setupItems.push({ icon: Clock, message: `${pendingOrders} ${t("admin.pendingAttention")}` });
  if (!company?.storefrontUrl) setupItems.push({ icon: Globe, message: t("admin.storefrontNotSet") });

  const quickActions = [];
  if (moduleAllowsPage(modules, "admin-products-new") && canCreate)
    quickActions.push({ page: "admin-products-new", icon: Plus, label: t("admin.addProduct") });
  if (moduleAllowsPage(modules, "admin-products") && canAccessAdminPage(currentUser, "admin-products"))
    quickActions.push({ page: "admin-products", icon: Package, label: t("admin.totalProducts") });
  if (moduleAllowsPage(modules, "admin-orders") && canAccessAdminPage(currentUser, "admin-orders"))
    quickActions.push({ page: "admin-orders", icon: ClipboardList, label: t("admin.ordersManagement") });
  if (moduleAllowsPage(modules, "admin-categories") && canAccessAdminPage(currentUser, "admin-categories"))
    quickActions.push({ page: "admin-categories", icon: FileText, label: l === "ar" ? "الأقسام" : "Categories" });
  if (moduleAllowsPage(modules, "admin-staff") && canAccessAdminPage(currentUser, "admin-staff"))
    quickActions.push({ page: "admin-staff", icon: Users, label: t("admin.employees") });
  if (moduleAllowsPage(modules, "admin-settings") && canManage)
    quickActions.push({ page: "admin-settings", icon: Settings, label: t("admin.settingsLabel") });

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <span className="dashboard-greeting">
            {t("admin.welcomeBack")}{currentUser?.name ? `, ${currentUser.name}` : ""}
          </span>
          <h1>{company?.name || t("admin.dashboard")}</h1>
        </div>
        <div className="dashboard-header-actions">
          {company?.storefrontUrl && (
            <a className="admin-outline-button" href={company.storefrontUrl} rel="noreferrer" target="_blank">
              <ExternalLink size={14} /> {t("admin.viewStorefront")}
            </a>
          )}
          {canCreate && moduleAllowsPage(modules, "admin-products-new") && (
            <button className="admin-primary-button" onClick={() => onNavigate("admin-products-new")} type="button">
              <Plus size={15} /> {t("admin.addProduct")}
            </button>
          )}
          {canManage && moduleAllowsPage(modules, "admin-settings") && (
            <button className="admin-secondary-button" onClick={() => onNavigate("admin-settings")} type="button">
              <Settings size={14} /> {t("admin.settingsLabel")}
            </button>
          )}
        </div>
      </div>

      {(company?.storefrontUrl || company?.settings?.language || company?.settings?.currency) && (
        <div className="dashboard-info-bar">
          {company?.storefrontUrl && (
            <>
              <div className="dashboard-info-item">
                <Globe size={14} />
                <span>{company.storefrontUrl}</span>
              </div>
              <span className="dashboard-info-sep" />
            </>
          )}
          {company?.settings?.language && (
            <>
              <div className="dashboard-info-item">
                {company.settings.language === "ar" ? "العربية" : "English"}
              </div>
              <span className="dashboard-info-sep" />
            </>
          )}
          {company?.settings?.currency && (
            <div className="dashboard-info-item">{company.settings.currency}</div>
          )}
        </div>
      )}

      <div className="dashboard-section-card">
        <div className="dashboard-section-card-head">
          <h2>{t("admin.analytics")}</h2>
        </div>
        <div className="dashboard-metrics-row">
          <div className="dashboard-metric-cell">
            <div className="dashboard-metric-cell-icon" data-color="green">
              <Package size={16} />
            </div>
            <div className="dashboard-metric-cell-body">
              <span className="dashboard-metric-cell-label">{t("admin.totalProducts")}</span>
              <strong className="dashboard-metric-cell-value">{products.length}</strong>
              {activeProducts > 0 && (
                <span className="dashboard-metric-cell-sub">{activeProducts} {t("admin.activeLabel")}</span>
              )}
            </div>
          </div>
          <div className="dashboard-metric-sep" />
          <div className="dashboard-metric-cell">
            <div className="dashboard-metric-cell-icon" data-color="blue">
              <ClipboardList size={16} />
            </div>
            <div className="dashboard-metric-cell-body">
              <span className="dashboard-metric-cell-label">{t("admin.totalOrders")}</span>
              <strong className="dashboard-metric-cell-value">{orders.length}</strong>
              {pendingOrders > 0 && (
                <span className="dashboard-metric-cell-sub">{pendingOrders} {t("admin.pendingOrders")}</span>
              )}
            </div>
          </div>
          <div className="dashboard-metric-sep" />
          <div className="dashboard-metric-cell">
            <div className="dashboard-metric-cell-icon" data-color="red">
              <Users size={16} />
            </div>
            <div className="dashboard-metric-cell-body">
              <span className="dashboard-metric-cell-label">{t("admin.customersLabel")}</span>
              <strong className="dashboard-metric-cell-value">{customers.length}</strong>
            </div>
          </div>
          <div className="dashboard-metric-sep" />
          <div className="dashboard-metric-cell">
            <div className="dashboard-metric-cell-icon" data-color="purple">
              <UserCircle size={16} />
            </div>
            <div className="dashboard-metric-cell-body">
              <span className="dashboard-metric-cell-label">{t("admin.totalEmployees")}</span>
              <strong className="dashboard-metric-cell-value">{employees?.length || 0}</strong>
            </div>
          </div>
          {revenue > 0 && (
            <>
              <div className="dashboard-metric-sep" />
              <div className="dashboard-metric-cell">
                <div className="dashboard-metric-cell-icon" data-color="orange">
                  <HandCoins size={16} />
                </div>
                <div className="dashboard-metric-cell-body">
                  <span className="dashboard-metric-cell-label">{t("admin.revenue")}</span>
                  <strong className="dashboard-metric-cell-value">{revenue}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {setupItems.length > 0 && (
        <div className="dashboard-section-card dashboard-setup-card">
          <div className="dashboard-section-card-head">
            <h2>{t("admin.attentionNeeded")}</h2>
          </div>
          <div className="dashboard-setup-list">
            {setupItems.map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div className="dashboard-setup-row" key={i}>
                  <ItemIcon size={15} />
                  <span>{item.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="dashboard-lower">
        {quickActions.length > 0 && (
          <div className="dashboard-section-card dashboard-quick-card">
            <div className="dashboard-section-card-head">
              <h2>{t("admin.quickActions")}</h2>
            </div>
            <div className="dashboard-quick-list">
              {quickActions.map((action, i) => {
                const ActionIcon = action.icon;
                return (
                  <button className="dashboard-quick-btn" key={i} onClick={() => onNavigate(action.page)} type="button">
                    <ActionIcon size={14} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="dashboard-section-card dashboard-activity-card">
          <div className="dashboard-section-card-head">
            <h2>{l === "ar" ? "الطلبات الأخيرة" : "Recent Orders"}</h2>
          </div>
          {recentOrders.length > 0 ? (
            <AdminOrdersTable
              canAssign={false}
              canDelete={false}
              canUpdateStatus={false}
              company={company}
              language={language}
              orders={recentOrders}
              products={products}
              t={t}
            />
          ) : (
            <div className="dashboard-empty-card">
              <Package size={20} />
              <strong>{t("admin.noOrders")}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardHome({
  brands = [],
  categories = [],
  company,
  currentUser,
  employees = [],
  language,
  modules,
  onNavigate,
  orders = [],
  products = [],
}) {
  const [activitySort, setActivitySort] = React.useState("priority");
  const [expandedChecklist, setExpandedChecklist] = React.useState(() => new Set());
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  const [showAllChecklist, setShowAllChecklist] = React.useState(false);
  const headerMenuRef = React.useRef(null);
  const direction = dashboardDirection(language);
  const ar = direction === "rtl";
  const authorizationContext = { company, currentUser, modules };
  const analytics = React.useMemo(
    () => buildDashboardAnalytics({ employees, orders, products }),
    [employees, orders, products],
  );
  const checklist = React.useMemo(
    () => buildDashboardChecklist({
      brands,
      categories,
      company,
      currentUser,
      employees,
      modules,
      orders,
      products,
    }),
    [brands, categories, company, currentUser, employees, modules, orders, products],
  );
  const activity = React.useMemo(
    () => sortDashboardActivity(
      buildDashboardActivity({ company, employees, orders, products }),
      activitySort,
    ).slice(0, 8),
    [activitySort, company, employees, orders, products],
  );

  React.useEffect(() => {
    if (!headerMenuOpen) return undefined;
    function closeOutside(event) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target)) {
        setHeaderMenuOpen(false);
      }
    }
    function closeEscape(event) {
      if (event.key === "Escape") setHeaderMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [headerMenuOpen]);

  const labels = ar ? {
    active: "نشط",
    activity: "موجز النشاط",
    actionRequired: "إجراء مطلوب",
    addProduct: "إضافة منتج",
    analytics: "التحليلات",
    analyticsDescription: "نظرة عامة مباشرة من بيانات شركتك الحالية",
    businessEmail: "البريد الإلكتروني للنشاط",
    businessInfo: "معلومات النشاط التجاري",
    checklist: "تنمية نشاطك",
    checklistDescription: "أكمل الخطوات الأساسية لتجهيز شركتك ومتجرك",
    company: "الشركة الحالية",
    connectDomain: "ربط النطاق",
    customers: "العملاء",
    date: "التاريخ",
    editBusiness: "تعديل معلومات النشاط",
    editSite: "تحرير الموقع",
    employees: "الموظفون",
    emptyActivity: "لا يوجد نشاط لعرضه بعد",
    emptyActivityDescription: "ستظهر هنا تحديثات المنتجات والطلبات والموظفين.",
    noDate: "بدون تاريخ",
    orders: "الطلبات",
    priority: "الأولوية",
    products: "المنتجات",
    settings: "الإعدادات",
    showLess: "عرض أقل",
    showMore: "عرض المزيد",
    storefront: "المتجر والنطاق",
    viewAll: "عرض الكل",
    viewStorefront: "عرض المتجر",
    welcome: "مرحباً بعودتك",
    attentionRequired: "يحتاج إلى انتباه",
    recentActivity: "نشاط حديث",
  } : {
    active: "active",
    activity: "Activity Feed",
    actionRequired: "Action Required",
    addProduct: "Add Product",
    analytics: "Analytics",
    analyticsDescription: "A live overview from your current company data",
    businessEmail: "Business email",
    businessInfo: "Business information",
    checklist: "Grow your business",
    checklistDescription: "Complete the essentials for your company and storefront",
    company: "Current company",
    connectDomain: "Connect Domain",
    customers: "Customers",
    date: "Date",
    editBusiness: "Edit Business Info",
    editSite: "Edit Site",
    employees: "Employees",
    emptyActivity: "No activity to show yet",
    emptyActivityDescription: "Product, order, and employee updates will appear here.",
    noDate: "No date",
    orders: "Orders",
    priority: "Priority",
    products: "Products",
    settings: "Settings",
    showLess: "Show Less",
    showMore: "Show More",
    storefront: "Storefront & domain",
    viewAll: "View all",
    viewStorefront: "View Storefront",
    welcome: "Welcome back",
    attentionRequired: "Attention Required",
    recentActivity: "Recent Activity",
  };

  const checklistCopy = ar ? {
    "first-product": ["أضف منتجك الأول", "أنشئ أول منتج متاح في كتالوج الشركة.", "إضافة منتج"],
    "storefront-domain": ["اربط المتجر أو النطاق", "أكمل عنوان المتجر العام وإعدادات النطاق المتاحة.", "إعداد المتجر"],
    "first-employee": ["أضف موظفاً", "أضف أول عضو فريق ضمن صلاحيات الشركة.", "الموظفون"],
    "company-settings": ["اضبط إعدادات الشركة", "راجع اللغة والعملة ومعلومات النشاط.", "الإعدادات"],
    "review-orders": ["راجع الطلبات", "تابع الطلبات الحالية وحالاتها من صفحة الطلبات.", "عرض الطلبات"],
    "catalog-organization": ["أضف تصنيفاً أو علامة تجارية", "نظّم الكتالوج باستخدام البيانات الحالية.", "تنظيم الكتالوج"],
    "storefront-setup": ["أكمل إعداد المتجر", "راجع هوية المتجر ومحتواه المرئي.", "تحرير الموقع"],
  } : {
    "first-product": ["Add your first product", "Create the first available product in this company catalog.", "Add product"],
    "storefront-domain": ["Connect storefront or domain", "Complete the public storefront address and available domain settings.", "Set up storefront"],
    "first-employee": ["Add an employee", "Add the first team member within this company scope.", "Employees"],
    "company-settings": ["Configure company settings", "Review language, currency, and available business information.", "Settings"],
    "review-orders": ["Review orders", "Follow current orders and their real statuses.", "View orders"],
    "catalog-organization": ["Add a category or brand", "Organize the catalog with existing category and brand tools.", "Organize catalog"],
    "storefront-setup": ["Complete storefront setup", "Review storefront identity and website content.", "Edit site"],
  };

  function authorized(action) {
    return isDashboardActionAuthorized(action, authorizationContext);
  }

  function go(action) {
    const destination = resolveDashboardDestination(action);
    if (!destination || !authorized(action)) return;
    if (destination === "admin-site-editor") {
      const editorWindow = window.open("/admin/site-editor", "_blank", "noopener,noreferrer");
      if (editorWindow) editorWindow.opener = null;
      return;
    }
    onNavigate(destination);
  }

  function toggleChecklist(id) {
    setExpandedChecklist((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatMoney(value) {
    const currency = company?.settings?.currency;
    if (!currency || !value) return "";
    try {
      return new Intl.NumberFormat(ar ? "ar" : "en", {
        currency,
        maximumFractionDigits: 2,
        style: "currency",
      }).format(value);
    } catch {
      return `${value} ${currency}`;
    }
  }

  function formatShortDate(value) {
    return new Intl.DateTimeFormat(ar ? "ar" : "en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }

  const businessItems = [
    (() => {
      const value = getText(company?.settings?.plan, language)
        || getText(company?.settings?.subscription, language);
      return value ? { id: "plan", label: ar ? "الخطة" : "Plan", value } : null;
    })(),
    (() => {
      const value = getText(company?.domain, language) || getText(company?.storefrontUrl, language);
      return value ? { id: "storefront", icon: Globe, label: labels.storefront, value } : null;
    })(),
    (() => {
      const value = getText(company?.settings?.businessEmail, language)
        || getText(company?.settings?.supportEmail, language);
      return value ? { id: "email", icon: Mail, label: labels.businessEmail, value } : null;
    })(),
  ].filter(Boolean);

  const metricCards = [
    { action: "products", color: "green", icon: Package, label: labels.products, sub: analytics.activeProducts ? `${analytics.activeProducts} ${labels.active}` : "", value: analytics.products },
    { action: "orders", color: "blue", icon: ClipboardList, label: labels.orders, sub: formatMoney(analytics.revenue), value: analytics.orders },
    { action: "customers", color: "orange", icon: Users, label: labels.customers, sub: "", value: analytics.customers },
    { action: "employees", color: "purple", icon: UserCircle, label: labels.employees, sub: "", value: analytics.employees },
  ];
  const analyticsDates = [...orders, ...products, ...employees]
    .map((record) => record?.updatedAt || record?.createdAt || null)
    .filter((value) => value && !Number.isNaN(new Date(value).getTime()))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const analyticsRange = analyticsDates.length
    ? analyticsDates[0] === analyticsDates.at(-1)
      ? formatShortDate(analyticsDates[0])
      : `${formatShortDate(analyticsDates[0])} – ${formatShortDate(analyticsDates.at(-1))}`
    : ar ? "كل السجلات الحالية" : "All current records";
  const visibleChecklist = showAllChecklist ? checklist : checklist.slice(0, 4);

  function activityCopy(item) {
    if (item.type === "order") {
      const orderName = item.record?.number || item.record?.orderNumber || item.record?.id;
      const customerName = getText(item.record?.customer?.name, language);
      const meta = getText(item.meta, language);
      return {
        description: customerName || meta,
        title: ar ? `طلب ${orderName}` : `Order ${orderName}`,
      };
    }
    if (item.type === "product") {
      return {
        description: getText(item.meta, language),
        title: getText(item.record?.name, language) || item.record?.sku || item.record?.id,
      };
    }
    if (item.type === "employee") {
      return {
        description: getText(item.meta, language),
        title: getText(item.record?.name, language) || item.record?.email || item.record?.id,
      };
    }
    if (item.type === "storefront-warning") {
      return {
        description: ar ? "لم يتم تعيين رابط متجر عام للشركة." : "No public storefront URL is configured for this company.",
        title: ar ? "إعداد المتجر غير مكتمل" : "Storefront setup is incomplete",
      };
    }
    if (item.type === "settings-warning") {
      return {
        description: ar ? "أكمل اللغة والعملة ومعلومات النشاط المتاحة." : "Complete the available language, currency, and business settings.",
        title: ar ? "معلومات الشركة غير مكتملة" : "Company setup is incomplete",
      };
    }
    return {
      description: "",
      title: "",
    };
  }

  function activityPresentation(item) {
    if (item.type === "order") return { icon: ClipboardList, label: item.priority === 3 ? labels.actionRequired : labels.recentActivity };
    if (item.type === "product") return { icon: Package, label: labels.recentActivity };
    if (item.type === "employee") return { icon: UserCircle, label: labels.recentActivity };
    return { icon: AlertCircle, label: item.priority === 3 ? labels.actionRequired : labels.attentionRequired };
  }

  function activityActionLabel(item) {
    if (item.action === "orders") return ar ? "عرض الطلب" : "View order";
    if (item.action === "products") return ar ? "عرض المنتجات" : "View products";
    if (item.action === "employees") return ar ? "عرض الموظفين" : "View employees";
    return labels.settings;
  }

  return (
    <div className="dashboard tenant-dashboard-home" dir={direction} data-dashboard-direction={direction}>
      <section className="tenant-dashboard-hero">
        <div className="tenant-dashboard-welcome">
          <div className="tenant-dashboard-title-row">
            <h1>{labels.welcome}{currentUser?.name ? `, ${currentUser.name}` : ""}</h1>
            <div className="tenant-dashboard-more" ref={headerMenuRef}>
              <button aria-expanded={headerMenuOpen} aria-haspopup="menu" aria-label="Dashboard actions" onClick={() => setHeaderMenuOpen((value) => !value)} type="button">
                <MoreHorizontal size={20} />
              </button>
              {headerMenuOpen && (
                <div className="tenant-dashboard-more-menu" role="menu">
                  {authorized("analytics") && <button onClick={() => go("analytics")} role="menuitem" type="button"><BarChart3 size={15} />{labels.analytics}</button>}
                  {authorized("editSite") && <button onClick={() => go("editSite")} role="menuitem" type="button"><ExternalLink size={15} />{labels.editSite}</button>}
                  {authorized("settings") && <button onClick={() => go("settings")} role="menuitem" type="button"><Settings size={15} />{labels.settings}</button>}
                </div>
              )}
            </div>
          </div>
          <p><span>{labels.company}</span><strong>{company?.name}</strong></p>
        </div>
        <div className="tenant-dashboard-primary-actions" data-dashboard-authorized-actions>
          {authorized("viewStorefront") && (
            <a href={company.storefrontUrl} rel="noreferrer" target="_blank"><ExternalLink size={15} />{labels.viewStorefront}</a>
          )}
          {authorized("addProduct") && (
            <button className="primary" onClick={() => go("addProduct")} type="button"><Plus size={16} />{labels.addProduct}</button>
          )}
          {authorized("settings") && (
            <button onClick={() => go("settings")} type="button"><Settings size={15} />{labels.settings}</button>
          )}
        </div>
      </section>

      <section className="tenant-dashboard-business-strip">
        <div className="tenant-dashboard-strip-title"><strong>{labels.businessInfo}</strong></div>
        <div className="tenant-dashboard-business-items">
          {businessItems.map((item) => {
            const ItemIcon = item.icon;
            return <div className="tenant-dashboard-business-item" key={item.id}>{ItemIcon && <ItemIcon size={16} />}<span><small>{item.label}</small><b title={String(item.value)}>{item.value}</b></span></div>;
          })}
          {!businessItems.length && <span className="tenant-dashboard-business-empty">{ar ? "لا تتوفر معلومات إضافية بعد." : "No additional business information is available yet."}</span>}
        </div>
        <div className="tenant-dashboard-business-actions">
          {authorized("connectDomain") && <button onClick={() => go("connectDomain")} type="button">{labels.connectDomain}</button>}
          {authorized("settings") && <button onClick={() => go("settings")} type="button">{labels.editBusiness}</button>}
        </div>
      </section>

      <section className="tenant-dashboard-card tenant-dashboard-analytics" data-dashboard-analytics>
        <header className="tenant-dashboard-section-head">
          <div><h2>{labels.analytics}</h2><p>{labels.analyticsDescription}</p></div>
          <div className="tenant-dashboard-section-actions">
            <span data-dashboard-date-range>{analyticsRange}</span>
            {authorized("analytics") && <button onClick={() => go("analytics")} type="button">{labels.viewAll}<ChevronRight size={15} /></button>}
          </div>
        </header>
        <div className="tenant-dashboard-stat-grid">
          {metricCards.map((metric) => {
            const MetricIcon = metric.icon;
            const canOpen = authorized(metric.action);
            return (
              <button className="tenant-dashboard-stat" data-color={metric.color} disabled={!canOpen} key={metric.action} onClick={() => go(metric.action)} type="button">
                <span className="tenant-dashboard-stat-icon"><MetricIcon size={18} /></span>
                <span className="tenant-dashboard-stat-copy"><small>{metric.label}</small><strong>{metric.value}</strong>{metric.sub && <em>{metric.sub}</em>}</span>
                <span className="tenant-dashboard-stat-indicator" aria-hidden="true"><i /></span>
              </button>
            );
          })}
        </div>
      </section>

      <DashboardInsightsPanel
        company={company}
        currentUser={currentUser}
        language={language}
        modules={modules}
        onNavigate={onNavigate}
      />

      <section className="tenant-dashboard-card tenant-dashboard-checklist" data-dashboard-checklist>
        <header className="tenant-dashboard-section-head">
          <div><h2>{labels.checklist}</h2><p>{labels.checklistDescription}</p></div>
          <span className="tenant-dashboard-progress">{checklist.filter((item) => item.completed).length}/{checklist.length}</span>
        </header>
        <div className="tenant-dashboard-checklist-list">
          {visibleChecklist.map((item) => {
            const copy = checklistCopy[item.id];
            const expanded = expandedChecklist.has(item.id);
            return (
              <div className={`tenant-dashboard-check-row ${item.completed ? "completed" : "attention"}`} key={item.id}>
                <button aria-expanded={expanded} className="tenant-dashboard-check-main" onClick={() => toggleChecklist(item.id)} type="button">
                  <span className="tenant-dashboard-check-state">{item.completed ? <Check size={15} /> : <span />}</span>
                  <span><strong>{copy[0]}</strong>{expanded && <small>{copy[1]}</small>}</span>
                  <span className="tenant-dashboard-check-chevron">{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
                </button>
                {item.action && !item.completed && (
                  <button className="tenant-dashboard-check-action" onClick={() => go(item.action)} type="button">{copy[2]}</button>
                )}
              </div>
            );
          })}
        </div>
        {checklist.length > 4 && (
          <button className="tenant-dashboard-show-more" onClick={() => setShowAllChecklist((value) => !value)} type="button">
            {showAllChecklist ? labels.showLess : labels.showMore}
            {showAllChecklist ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        )}
      </section>

      <section className="tenant-dashboard-card tenant-dashboard-activity" data-dashboard-activity>
        <header className="tenant-dashboard-section-head">
          <div><h2>{labels.activity}</h2><p>{ar ? "آخر التغييرات الفعلية في شركتك" : "Recent changes from your current company data"}</p></div>
          <label className="tenant-dashboard-sort"><ArrowUpDown size={14} /><select aria-label={labels.activity} onChange={(event) => setActivitySort(event.target.value)} value={activitySort}><option value="priority">{labels.priority}</option><option value="date">{labels.date}</option></select></label>
        </header>
        {activity.length ? (
          <div className="tenant-dashboard-activity-list">
            {activity.map((item) => {
              const copy = activityCopy(item);
              const presentation = activityPresentation(item);
              const ActivityIcon = presentation.icon;
              const canAct = item.action && authorized(item.action);
              return (
                <article className="tenant-dashboard-activity-row" data-priority={item.priority} key={item.id}>
                  <span className="tenant-dashboard-activity-icon"><ActivityIcon size={17} /></span>
                  <span className="tenant-dashboard-activity-copy"><em>{presentation.label}</em><strong>{copy.title}</strong>{copy.description && <small>{copy.description}</small>}</span>
                  <span className="tenant-dashboard-activity-tail">
                    <time dateTime={item.date || undefined}>{item.date ? formatDate(item.date) : labels.noDate}</time>
                    {canAct && <button onClick={() => go(item.action)} type="button">{activityActionLabel(item)}</button>}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="tenant-dashboard-activity-empty" data-dashboard-empty-activity><Clock size={22} /><strong>{labels.emptyActivity}</strong><span>{labels.emptyActivityDescription}</span></div>
        )}
      </section>
    </div>
  );
}

function ProductsListPage({
  brands,
  canCreate = true,
  canDelete = true,
  canUpdate = true,
  categories,
  filters,
  language = "en",
  lowStockThreshold = 5,
  onAdd,
  onDeactivateProduct,
  onDeleteProduct,
  onDuplicateProduct,
  onEdit,
  onReorderProducts,
  onStock,
  reorderSaving = false,
  setFilters,
  t,
}) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PRODUCTS_PAGE_SIZE);
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [searchInput, setSearchInput] = React.useState(filters.search || "");
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        if (current.search === searchInput) return current;
        return { ...current, search: searchInput };
      });
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, setFilters]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchProducts({
      page,
      limit: pageSize,
      q: filters.search || "",
      brand: filters.brand,
      category: filters.category,
      status: filters.status,
      stock: filters.stock,
      merchandising: filters.merchandising,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(Array.isArray(result.items) ? result.items : []);
        setTotal(Number(result.total) || 0);
        if (Number(result.page) > 0 && Number(result.page) !== page) {
          setPage(Number(result.page));
        }
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setTotal(0);
        setError(requestError?.message || t("admin.loadFailed") || "Unable to load products.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, pageSize, filters.search, filters.brand, filters.category, filters.status, filters.stock, filters.merchandising, reloadToken, t]);

  const showActions = canUpdate || canCreate || canDelete;
  const showOrderControls = canUpdate && typeof onReorderProducts === "function";
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  function updateFilter(patch) {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  }

  async function persistOrder(nextFullIds) {
    if (!showOrderControls || reorderSaving) return;
    await onReorderProducts(nextFullIds);
    setReloadToken((value) => value + 1);
  }

  async function runAndReload(action) {
    await action();
    setReloadToken((value) => value + 1);
  }

  async function moveFilteredRow(fromIndex, toIndex) {
    const fullIds = await fetchProductSortIds();
    const filteredIds = rows.map((product) => product.id);
    const nextFullIds = moveProductInFilteredOrder(fullIds, filteredIds, fromIndex, toIndex);
    await persistOrder(nextFullIds);
  }

  function onDragStart(event, index) {
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  async function onDropRow(event, toIndex) {
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isInteger(fromIndex)) return;
    await moveFilteredRow(fromIndex, toIndex);
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <section className="admin-panel-card catalog-data-card products-list-card">
      <ProductDisplayPriorityPanel
        brands={brands}
        canUpdate={canUpdate}
        categories={categories}
        language={language}
        pageRows={rows}
        t={t}
      />
      <header className="catalog-page-header products-list-header" data-products-page-header>
        <div>
          <div className="catalog-title-line">
            <h1>{t("admin.products")}</h1>
            {Number.isFinite(total) ? <span>{total}</span> : null}
          </div>
          <p>{t("admin.productsSubtitle")}</p>
        </div>
      </header>
      <Toolbar addLabel={t("productForm.addProduct")} className="admin-data-toolbar" onAdd={canCreate ? onAdd : null}>
        <SearchField
          placeholder={t("admin.productSearchPlaceholder") || "Search name, SKU, ID, slug..."}
          value={searchInput}
          onChange={setSearchInput}
        />
        <select value={filters.category} onChange={(event) => updateFilter({ category: event.target.value })}>
          <option value="all">{t("admin.allCategories")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{getText(category.name)}</option>
          ))}
        </select>
        <select value={filters.brand} onChange={(event) => updateFilter({ brand: event.target.value })}>
          <option value="all">{t("admin.allBrands")}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>{getText(brand.name)}</option>
          ))}
        </select>
        <select value={filters.stock || "all"} onChange={(event) => updateFilter({ stock: event.target.value })}>
          <option value="all">{t("admin.allStock")}</option>
          <option value="in">{t("admin.inStock")}</option>
          <option value="low">{t("admin.lowStock")}</option>
          <option value="out">{t("admin.outOfStock")}</option>
        </select>
        <select value={filters.merchandising || "all"} onChange={(event) => updateFilter({ merchandising: event.target.value })}>
          <option value="all">{t("admin.allMerchandising")}</option>
          <option value="featured">{t("admin.flagFeatured")}</option>
          <option value="newArrival">{t("admin.newArrivals")}</option>
          <option value="bestseller">{t("admin.flagBestseller")}</option>
          <option value="promotions">{t("admin.promotionsDiscounts")}</option>
        </select>
        <div className="admin-segmented">
          {[
            ["all", "admin.statusAll"],
            ["active", "admin.active"],
            ["inactive", "admin.inactive"],
          ].map(([status, labelKey]) => (
            <button className={filters.status === status ? "active" : ""} key={status} onClick={() => updateFilter({ status })} type="button">
              {t(labelKey)}
            </button>
          ))}
        </div>
        <select
          aria-label={t("admin.pageSize")}
          value={pageSize}
          onChange={(event) => {
            setPage(1);
            setPageSize(Number(event.target.value) || DEFAULT_PRODUCTS_PAGE_SIZE);
          }}
        >
          {[25, 50, 100].map((size) => (
            <option key={size} value={size}>{size} {t("admin.perPage")}</option>
          ))}
        </select>
      </Toolbar>
      {reorderSaving && (
        <div className="message-panel" role="status">{t("admin.productReordering") || "Saving product order..."}</div>
      )}
      {error ? (
        <div className="admin-data-error" role="alert">{error}</div>
      ) : loading ? (
        <div className="admin-data-loading" role="status">{t("admin.loading")}</div>
      ) : rows.length === 0 ? (
        <EmptyState title={t("admin.noProducts") || "No products found"} description={t("admin.noProductsMatch") || "No products match these filters."} />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              {showOrderControls && <th>{t("admin.productOrderColumn")}</th>}
              <th>{t("admin.columnImage")}</th>
              <th>{t("admin.nameOrder")}</th>
              <th>{t("productForm.sku")}</th>
              <th>{t("productForm.category")}</th>
              <th>{t("productForm.brand")}</th>
              <th>{t("admin.columnVariants")}</th>
              <th>{t("productForm.price")}</th>
              <th>{t("productForm.salePrice")}</th>
              <th>{t("productForm.stock")}</th>
              <th>{t("admin.columnSalesCount")}</th>
              <th>{t("admin.columnStatus")}</th>
              <th>{t("admin.columnCreated")}</th>
              <th>{t("admin.columnUpdated")}</th>
              {showActions && <th className="admin-data-table-actions">{t("admin.actions")}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((product, index) => {
              const category = categories.find((entry) => entry.id === product.categoryId);
              const stock = getStockQty(product);
              const salePrice = getProductSalePrice(product);
              const salesCount = Number.isFinite(Number(product.salesCount)) ? Number(product.salesCount) : 0;
              const variantCount = Array.isArray(product.variants) && product.variants.length
                ? product.variants.length
                : (product.sizes?.length || 1);
              return (
                <tr
                  draggable={showOrderControls && !reorderSaving}
                  key={product.id}
                  onDragOver={showOrderControls ? onDragOver : undefined}
                  onDragStart={showOrderControls ? (event) => onDragStart(event, index) : undefined}
                  onDrop={showOrderControls ? (event) => onDropRow(event, index) : undefined}
                >
                  {showOrderControls && (
                    <td>
                      <div className="row-actions product-order-controls">
                        <button aria-label={t("admin.dragToReorder")} className="text-action" disabled={reorderSaving} type="button">⋮⋮</button>
                        <button aria-label={t("admin.moveUp") || t("productForm.moveUp") || "Move up"} className="text-action" disabled={reorderSaving || !canMoveProductUp(index)} onClick={() => moveFilteredRow(index, index - 1)} type="button"><ChevronUp size={14} /></button>
                        <button aria-label={t("admin.moveDown") || t("productForm.moveDown") || "Move down"} className="text-action" disabled={reorderSaving || !canMoveProductDown(index, rows.length)} onClick={() => moveFilteredRow(index, index + 1)} type="button"><ChevronDown size={14} /></button>
                      </div>
                    </td>
                  )}
                  <td><DeferredAdminThumb alt="" placeholder="P" src={product.image || product.primaryImage} /></td>
                  <td><code className="admin-data-table-cell-clip" title={getText(product.name)}><strong>{getText(product.name)}</strong></code></td>
                  <td><span className="table-muted">{getProductSku(product)}</span></td>
                  <td>{getText(category?.name) || "-"}</td>
                  <td>{getText(brands.find((brand) => brand.id === product.brandId)?.name) || product.brand || "-"}</td>
                  <td>{variantCount}</td>
                  <td><strong>{getProductPrice(product)} ILS</strong></td>
                  <td>{salePrice != null ? <strong>{salePrice} ILS</strong> : "—"}</td>
                  <td>{stock}</td>
                  <td>{salesCount}</td>
                  <td>
                    <div className="admin-badge-stack">
                      <Badge tone={product.isActive === false ? "neutral" : "active"}>{product.isActive === false ? t("admin.inactive") : t("admin.active")}</Badge>
                      {(product.isFeatured || product.featured) && <Badge>{t("admin.flagFeatured")}</Badge>}
                      {(product.isNewArrival || product.newArrival) && <Badge>{t("admin.flagNewArrival")}</Badge>}
                      {(product.isBestseller || product.bestseller) && <Badge>{t("admin.flagBestseller")}</Badge>}
                      {stock <= 0 && <Badge tone="danger">{t("admin.outOfStockBadge")}</Badge>}
                      {stock > 0 && stock <= lowStockThreshold && <Badge tone="warning">{t("admin.lowStockBadge")}</Badge>}
                    </div>
                  </td>
                  <td>{formatDate(product.createdAt)}</td>
                  <td>{formatDate(product.updatedAt)}</td>
                  {showActions && (
                    <td className="admin-data-table-actions">
                      <div className="row-actions">
                        {canUpdate && <button className="text-action" onClick={() => onEdit(product)} type="button">{t("productForm.edit")}</button>}
                        {canUpdate && onStock && (
                          <button className="text-action" onClick={() => onStock(product)} type="button">{t("admin.stockAction") || "Stock"}</button>
                        )}
                        {canUpdate && product.isActive !== false && onDeactivateProduct && (
                          <button className="text-action" onClick={() => runAndReload(() => onDeactivateProduct(product))} type="button">{t("admin.deactivateAction") || "Deactivate"}</button>
                        )}
                        {canCreate && onDuplicateProduct && (
                          <button className="text-action" onClick={() => runAndReload(() => onDuplicateProduct(product))} type="button">{t("admin.duplicateAction") || "Duplicate"}</button>
                        )}
                        {canDelete && (
                          <button className="text-action danger" onClick={() => runAndReload(() => onDeleteProduct(product.id))} type="button">{t("productForm.delete")}</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      )}
      {!error && (
        <footer className="admin-table-pagination products-list-pagination" data-products-pagination>
          <span>
            {total === 0
              ? t("admin.noProducts")
              : `${from}\u2013${to} / ${total}`}
          </span>
          <div className="row-actions">
            <button aria-label={t("admin.previous")} className="secondary-action" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
              {t("admin.previous")}
            </button>
            <span>{t("admin.page")} {page} / {totalPages}</span>
            <button aria-label={t("admin.next")} className="secondary-action" disabled={loading || page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} type="button">
              {t("admin.next")}
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}


function ProductsTrashPage({
  canPermanentDelete = false,
  canRestore = false,
  onPermanentlyDeleteProduct,
  onRestoreProduct,
  products = [],
  t,
}) {
  const [search, setSearch] = React.useState("");
  const filtered = React.useMemo(() => {
    const needle = String(search || "").toLowerCase().trim();
    return products.filter((product) => {
      if (!needle) return true;
      const name = getText(product.name).toLowerCase();
      const sku = getProductSku(product).toLowerCase();
      const id = String(product.id || "").toLowerCase();
      const slug = String(product.slug || "").toLowerCase();
      return name.includes(needle) || sku.includes(needle) || id.includes(needle) || slug.includes(needle);
    });
  }, [products, search]);

  const showActions = canRestore || canPermanentDelete;

  return (
    <section className="admin-panel-card">
      <Toolbar>
        <SearchField
          onChange={setSearch}
          placeholder={t("admin.trashSearchPlaceholder")}
          value={search}
        />
      </Toolbar>
      {!products.length ? (
        <EmptyState title={t("admin.trashEmpty")} description={t("admin.trashEmptyDescription")} />
      ) : !filtered.length ? (
        <EmptyState title={t("admin.noTrashMatch")} description={t("admin.trashEmptyDescription")} />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Deleted</th>
              {showActions ? <th className="admin-data-table-actions">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id}>
                <td>
                  <DeferredAdminThumb alt="" placeholder="P" src={product.image} />
                </td>
                <td>
                  <code className="admin-data-table-cell-clip" title={getText(product.name)}>
                    <strong>{getText(product.name)}</strong>
                  </code>
                  <div className="muted">{product.slug || product.id}</div>
                </td>
                <td>{getProductSku(product)}</td>
                <td>{formatDate(product.deletedAt || product.deleted_at)}</td>
                {showActions ? (
                  <td className="admin-data-table-actions">
                    <div className="row-actions">
                      {canRestore ? (
                        <button
                          className="text-action"
                          onClick={() => onRestoreProduct?.(product.id)}
                          type="button"
                        >
                          {t("admin.restoreAction")}
                        </button>
                      ) : null}
                      {canPermanentDelete ? (
                        <button
                          className="text-action danger"
                          onClick={() => onPermanentlyDeleteProduct?.(product.id)}
                          type="button"
                        >
                          {t("admin.permanentDeleteAction")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </section>
  );
}

const PRODUCT_CONDITION_OPTIONS = [
  { value: "new", labelKey: "productForm.conditionNew" },
  { value: "refurbished", labelKey: "productForm.conditionRefurbished" },
  { value: "used", labelKey: "productForm.conditionUsed" },
];

function formConditionValue(value) {
  const key = String(value || "").trim().toLowerCase();
  return PRODUCT_CONDITION_OPTIONS.some((option) => option.value === key) ? key : "";
}

export function ProductWizard({ brands = [], categories = [], catalogProducts = [], editingProduct, onCancel, onPersisted, onSave, canManageContent = true, canManageCostPrice = false, canManageMedia = true, conditionEnabled = false, language = "en", readOnly = false }) {
  const t = React.useMemo(() => createTranslator(language), [language]);
  const ar = language === "ar";
  const [step, setStep] = React.useState("basic");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [uploadError, setUploadError] = React.useState("");
  const [uploadingField, setUploadingField] = React.useState("");
  const [uploadingVariantIndex, setUploadingVariantIndex] = React.useState(-1);
  const [uploadingGalleryIndex, setUploadingGalleryIndex] = React.useState(-1);
  const [videoProgress, setVideoProgress] = React.useState(0);
  const [tenantDefinitions, setTenantDefinitions] = React.useState([]);
  const [tenantValues, setTenantValues] = React.useState({});
  const [productSchema, setProductSchema] = React.useState(null);
  const [contentRetryId, setContentRetryId] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [activeChildUploads, setActiveChildUploads] = React.useState(0);
  const [relatedIds, setRelatedIds] = React.useState([]);
  const [fbtIds, setFbtIds] = React.useState([]);
  const [relationsLoading, setRelationsLoading] = React.useState(false);
  const [relationsError, setRelationsError] = React.useState("");
  const [relationsSaving, setRelationsSaving] = React.useState(false);
  const [relationsMessage, setRelationsMessage] = React.useState("");
  const [variantGenerator, setVariantGenerator] = React.useState({
    colorsText: "Default|#1db7d8",
    sizesText: "",
    defaultPrice: "",
    defaultStock: "24",
  });
  const [form, setForm] = React.useState(() => ({
    id: editingProduct?.id || "",
    nameEn: getText(editingProduct?.name) || "",
    nameAr: editingProduct?.name?.ar || "",
    slug: editingProduct?.slug || "",
    sku: editingProduct?.sku || "",
    barcode: editingProduct?.barcode || "",
    condition: formConditionValue(editingProduct?.condition),
    minPurchaseQuantity: editingProduct?.minPurchaseQuantity ?? "",
    maxPurchaseQuantity: editingProduct?.maxPurchaseQuantity ?? "",
    categoryId: editingProduct?.subcategoryId || editingProduct?.categoryId || "",
    brandId: editingProduct?.brandId || "",
    subcategoryId: editingProduct?.subcategoryId || "",
    mainCategoryId: editingProduct?.mainCategoryId || resolveMainCategoryFor(categories, editingProduct?.mainCategoryId, editingProduct?.subcategoryId || ""),
    manufacturer: editingProduct?.manufacturer || "",
    ...Object.fromEntries(PRODUCT_FILTER_FORM_GROUPS.map((group) => [
      group,
      resolveProductFilterAttributeForForm(group, editingProduct?.[group]),
    ])),
    quickShop: Boolean(editingProduct?.quickShop),

    size: editingProduct?.sizes?.[0]?.size || "",
    price: editingProduct?.sizes?.[0]?.price || "",
    stockQty: getStockQty(editingProduct || {}),
    shortDescription: getText(editingProduct?.shortDescription),
    shortDescriptionAr: editingProduct?.shortDescription?.ar || "",
    fullDescription: getText(editingProduct?.longDescription),
    fullDescriptionAr: editingProduct?.longDescription?.ar || "",
    howToUse: editingProduct?.howToUse || "",
    ingredients: editingProduct?.ingredients || "",
    benefits: editingProduct?.benefits || "",
    skinTypes: editingProduct?.skinTypes || "",
    concerns: editingProduct?.concerns || "",
    image: editingProduct?.image || editingProduct?.primaryImage || "",
    hoverImage: editingProduct?.hoverImage || editingProduct?.secondaryImage || "",
    productsPageImage: editingProduct?.productsPageImage || "",
    productsPageHoverImage: editingProduct?.productsPageHoverImage || "",
    galleryImages: normalizeGalleryImagesForForm(editingProduct),
    variants: normalizeProductVariantsForForm(editingProduct),
    videoUrl: editingProduct?.videoUrl || "",
    usageVideo: editingProduct?.usageVideo || "",
    usageVideoPoster: editingProduct?.usageVideoPoster || "",
    metaTitle: editingProduct?.metaTitle || "",
    metaDescription: editingProduct?.metaDescription || "",
    dsiHowItWorks: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).howItWorks || "",
    dsiHowItWorks1: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).howItWorks1 || "",
    dsiHowItWorks2: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).howItWorks2 || "",
    dsiHowItWorks3: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).howItWorks3 || "",
    dsiImpact: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).impact || "",
    dsiImpact1: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).impact1 || "",
    dsiImpact2: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).impact2 || "",
    dsiSafeToUse: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).safeToUse || "",
    dsiPracticalBanner: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).practicalBanner || "",
    dsiIngredients: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).ingredients || "",
    dsiFaq: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).faq || "",
    dsiMainImage: (editingProduct?.detailSectionImages || editingProduct?.detail_section_images || {}).mainImage || "",
    label: editingProduct?.badge?.en || "",
    labelAr: editingProduct?.badge?.ar || "",
    active: editingProduct?.isActive !== false,
    visible: editingProduct?.visible !== false && editingProduct?.isVisible !== false,
    featured: Boolean(editingProduct?.isFeatured),
    newArrival: Boolean(editingProduct?.isNewArrival),
    bestseller: Boolean(editingProduct?.isBestseller),
    detailStatements: editingProduct?.detailStatements || editingProduct?.detail_statements || [],
    removedImageFields: [],
    clearGalleryImages: false,
  }));

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      productFieldApi.definitions(),
      editingProduct?.id ? productFieldApi.values(editingProduct.id) : Promise.resolve([]),
      fetchCompanyProductSchema().catch(() => null),
    ]).then(([definitions, values, schema]) => {
      if (cancelled) return;
      setTenantDefinitions(Array.isArray(definitions) ? definitions : []);
      setProductSchema(schema && typeof schema === "object" ? schema : null);
      const fieldState = valuesToFieldState(values, definitions);
      setTenantValues(fieldState);
      if (fieldState.product_video) setForm((current) => ({ ...current, videoUrl: fieldState.product_video }));
      if (Array.isArray(definitions) && definitions.length) {
        setVariantGenerator({ colorsText: "", sizesText: "", defaultPrice: "", defaultStock: "" });
        if (!editingProduct?.id || !(editingProduct?.variants?.length || editingProduct?.sizes?.length)) setForm((current) => ({ ...current, size: "", price: "", variants: [] }));
      }
    }).catch((error) => setUploadError(error.message || "Unable to load product fields."));
    return () => { cancelled = true; };
  }, [editingProduct?.id]);

  React.useEffect(() => {
    const productId = editingProduct?.id || form.id;
    if (!productId) {
      setRelatedIds([]);
      setFbtIds([]);
      setRelationsError("");
      setRelationsMessage("");
      return undefined;
    }
    let cancelled = false;
    setRelationsLoading(true);
    setRelationsError("");
    Promise.all([
      fetchProductRelations(productId, "related"),
      fetchProductRelations(productId, "fbt"),
    ]).then(([related, fbt]) => {
      if (cancelled) return;
      setRelatedIds(Array.isArray(related?.targetProductIds) ? related.targetProductIds.map(String) : []);
      setFbtIds(Array.isArray(fbt?.targetProductIds) ? fbt.targetProductIds.map(String) : []);
    }).catch((error) => {
      if (cancelled) return;
      setRelationsError(error.message || (ar ? "تعذر تحميل العلاقات" : "Unable to load product relations."));
    }).finally(() => {
      if (!cancelled) setRelationsLoading(false);
    });
    return () => { cancelled = true; };
  }, [editingProduct?.id, form.id, ar]);

  async function saveRelations(type, ids) {
    const productId = editingProduct?.id || form.id;
    if (!productId) {
      setRelationsError(ar
        ? "احفظ المنتج أولاً قبل تعيين المنتجات ذات الصلة."
        : "Save the product first before setting related products.");
      return;
    }
    setRelationsSaving(true);
    setRelationsError("");
    setRelationsMessage("");
    try {
      const result = await replaceProductRelations(productId, type, ids);
      const nextIds = Array.isArray(result?.targetProductIds) ? result.targetProductIds.map(String) : ids.map(String);
      if (type === "related") setRelatedIds(nextIds);
      else setFbtIds(nextIds);
      setRelationsMessage(ar ? "تم حفظ العلاقات." : "Relations saved.");
    } catch (error) {
      setRelationsError(error.message || (ar ? "تعذر حفظ العلاقات" : "Unable to save relations."));
    } finally {
      setRelationsSaving(false);
    }
  }

  const usesTenantDefinitions = tenantDefinitions.length > 0;
  const schemaFieldEnabled = React.useCallback((key) => {
    if (!productSchema) return false;
    const buckets = [
      ...(Array.isArray(productSchema.fields) ? productSchema.fields : []),
      ...(Array.isArray(productSchema.mediaFields) ? productSchema.mediaFields : []),
    ];
    const found = buckets.find((entry) => entry?.key === key);
    return Boolean(found && found.enabled !== false);
  }, [productSchema]);
  const showSchemaDetailFields = !usesTenantDefinitions && [
    "howToUse", "ingredients", "benefits", "skinTypes", "concerns",
  ].some(schemaFieldEnabled);
  const showSchemaDetailMedia = !usesTenantDefinitions && [
    "dsiHowItWorks1", "dsiHowItWorks2", "dsiHowItWorks3",
    "dsiImpact1", "dsiImpact2", "dsiSafeToUse", "dsiPracticalBanner",
    "dsiIngredients", "dsiFaq", "detailStatements",
  ].some(schemaFieldEnabled);
  const schemaDetailMediaFields = [
    { key: "dsiHowItWorks1", label: "How it Works image 1" },
    { key: "dsiHowItWorks2", label: "How it Works image 2" },
    { key: "dsiHowItWorks3", label: "How it Works image 3" },
    { key: "dsiImpact1", label: "Impact section image 1" },
    { key: "dsiImpact2", label: "Impact section image 2" },
    { key: "dsiSafeToUse", label: "Safe to use image" },
    { key: "dsiPracticalBanner", label: "Practical banner image" },
    { key: "dsiIngredients", label: "Ingredients section image" },
    { key: "dsiFaq", label: "FAQ side image" },
  ].filter((entry) => schemaFieldEnabled(entry.key));
  const showDetailStatements = !usesTenantDefinitions && schemaFieldEnabled("detailStatements");
  const additionalMediaDefinitions = tenantDefinitions.filter((definition) => !["gallery_images", "product_video"].includes(definition.field_key));
  const updateTenantValue = (key, value) => setTenantValues((current) => ({ ...current, [key]: value }));

  const allTabs = ["basic", "pricing", "variants", "media", "details", "marketing", "preview"];
  const tabName = { basic: t("productForm.tabs.basic"), pricing: t("productForm.tabs.pricing"), variants: t("productForm.tabs.variants"), media: t("productForm.tabs.media"), details: t("productForm.tabs.details"), marketing: t("productForm.tabs.marketing"), preview: t("productForm.tabs.preview") };
  const tabs = allTabs.filter((tab) => (tab !== "media" || canManageMedia) && (!["details", "marketing"].includes(tab) || canManageContent));
  const brandOptions = brands.filter((brand) => brand && brand.id && (brand.isActive !== false || brand.id === form.brandId));
  const mainCategoryOptions = getMainCategoriesForBrand(categories, form.brandId)
    .filter((category) => category.isActive !== false && category.active !== false || category.id === form.mainCategoryId);
  const subcategoryOptions = getSubcategoriesForMain(categories, form.mainCategoryId)
    .filter((category) => category.isActive !== false && category.active !== false || category.id === form.subcategoryId);
  const hierarchyIncomplete = Boolean(editingProduct) && !isCompleteProductHierarchy({
    brandId: form.brandId,
    mainCategoryId: form.mainCategoryId,
    subcategoryId: form.subcategoryId,
  });
  const hierarchyLabels = ar
    ? {
      basic: "المعلومات الأساسية",
      classification: "التصنيف (مطلوب)",
      pricing: "التسعير",
      media: "الوسائط",
      status: "الحالة",
      attributes: "السمات",
      advanced: "إعدادات متقدمة",
      brand: "العلامة التجارية *",
      main: "الفئة الرئيسية *",
      sub: "الفئة الفرعية *",
      selectBrand: "اختر علامة تجارية أولاً",
      selectMain: "اختر فئة رئيسية أولاً",
      noMains: "لا توجد فئات رئيسية لهذه العلامة التجارية",
      noSubs: "لا توجد فئات فرعية لهذه الفئة الرئيسية",
      helper: "اختر العلامة التجارية ثم الفئة الرئيسية ثم الفئة الفرعية.",
      incomplete: "التصنيف غير مكتمل. يجب اختيار علامة تجارية وفئة رئيسية وفئة فرعية قبل الحفظ.",
      viewOnly: "وضع العرض فقط — ليست لديك صلاحية حفظ التغييرات.",
      nameEnHelp: "الاسم الظاهر في الواجهة الإنجليزية.",
      nameArHelp: "الاسم الظاهر في الواجهة العربية.",
      shortHelp: "وصف مختصر يظهر في بطاقة المنتج.",
    }
    : {
      basic: "Basic information",
      classification: "Classification (required)",
      pricing: "Pricing",
      media: "Media",
      status: "Status",
      attributes: "Attributes",
      advanced: "Advanced Settings",
      brand: "Brand *",
      main: "Main Category *",
      sub: "Subcategory *",
      selectBrand: "Select a Brand first",
      selectMain: "Select a Main Category first",
      noMains: "No Main Categories available for this Brand",
      noSubs: "No Subcategories available for this Main Category",
      helper: "Choose Brand, then Main Category, then Subcategory.",
      incomplete: "Classification is incomplete. Choose Brand, Main Category, and Subcategory before saving.",
      viewOnly: "View only — you do not have permission to save changes.",
      nameEnHelp: "Name shown on the English storefront.",
      nameArHelp: "Name shown on the Arabic storefront.",
      shortHelp: "Short summary shown on product cards.",
    };
  const primaryVariantIndex = 0;
  const primaryVariant = (form.variants || [])[primaryVariantIndex] || null;
  const hasPrimaryVariant = Boolean(primaryVariant);
  const totalVariantStock = (form.variants || []).reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const basicImagePreview = form.image || primaryVariant?.image_url || "";

  const trackChildUpload = React.useCallback((active) => {
    setActiveChildUploads((count) => Math.max(0, count + (active ? 1 : -1)));
  }, []);

  function change(event) {
    const { checked, name, removeImage, type, value } = event.target;
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setForm((current) => {
      const removed = new Set(current.removedImageFields || []);
      if (removeImage) removed.add(name);
      else if (value) removed.delete(name);
      return { ...current, [name]: type === "checkbox" ? checked : value, removedImageFields: [...removed] };
    });
  }

  function toggleFilterAttribute(group, valueId, checked) {
    setFieldErrors((current) => {
      if (!current[group]) return current;
      const next = { ...current };
      delete next[group];
      return next;
    });
    setForm((current) => {
      const selected = Array.isArray(current[group])
        ? current[group]
        : (current[group] ? [current[group]] : []);
      const nextValues = checked
        ? [...new Set([...selected.filter((entry) => entry !== valueId), valueId])]
        : selected.filter((entry) => entry !== valueId);
      return { ...current, [group]: nextValues };
    });
  }

  function toggleAge(ageId, checked) {
    toggleFilterAttribute("age", ageId, checked);
  }
  function changeBrand(event) {
    const brandId = event.target.value;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.brandId;
      delete next.mainCategoryId;
      delete next.subcategoryId;
      return next;
    });
    setForm((current) => {
      const mainStillValid = getMainCategoriesForBrand(categories, brandId).some((category) => category.id === current.mainCategoryId);
      const mainCategoryId = mainStillValid ? current.mainCategoryId : "";
      const subcategoryId = mainCategoryId
        && getSubcategoriesForMain(categories, mainCategoryId).some((category) => category.id === current.subcategoryId)
        ? current.subcategoryId
        : "";
      return { ...current, brandId, mainCategoryId, subcategoryId, categoryId: subcategoryId || "" };
    });
  }
  function changeMainCategory(event) {
    const mainCategoryId = event.target.value;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.mainCategoryId;
      delete next.subcategoryId;
      return next;
    });
    setForm((current) => {
      const subcategoryId = getSubcategoriesForMain(categories, mainCategoryId)
        .some((category) => category.id === current.subcategoryId)
        ? current.subcategoryId
        : "";
      return { ...current, mainCategoryId, subcategoryId, categoryId: subcategoryId || "" };
    });
  }

  function changeSubcategory(event) {
    const subcategoryId = event.target.value;
    setFieldErrors((current) => {
      if (!current.subcategoryId) return current;
      const next = { ...current };
      delete next.subcategoryId;
      return next;
    });
    setForm((current) => ({ ...current, subcategoryId, categoryId: subcategoryId }));
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [
        ...(current.variants || []),
        createCommerceVariant(current, current.variants?.length || 0),
      ],
    }));
  }

  function updateVariant(index, field, value) {
    setForm((current) => ({
      ...current,
      variants: (current.variants || []).map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    }));
  }

  function removeVariant(index) {
    setForm((current) => ({
      ...current,
      variants: (current.variants || []).filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  function updateVariantGenerator(field, value) {
    setVariantGenerator((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function generateVariants() {
    const colors = parseVariantGeneratorColors(variantGenerator.colorsText);
    const sizes = parseVariantGeneratorSizes(variantGenerator.sizesText);

    if (!colors.length || !sizes.length) {
      setUploadError("Add at least one color and one size.");
      return;
    }

    setUploadError("");
    setForm((current) => {
      const currentVariants = current.variants || [];
      const existingKeys = new Set(
        currentVariants.map(
          (variant) => `${(variant.color_name || "").toLowerCase()}|${(variant.color_value || "").toLowerCase()}|${(variant.size || "").toLowerCase()}`,
        ),
      );
      const generated = [];
      const batchKeys = new Set();

      colors.forEach((color) => {
        sizes.forEach((size) => {
          const key = `${color.name.toLowerCase()}|${color.value.toLowerCase()}|${size.toLowerCase()}`;
          if (existingKeys.has(key) || batchKeys.has(key)) return;
          batchKeys.add(key);

          generated.push(
            normalizeFormVariant(
              {
                color_name: color.name,
                color_value: color.value,
                size,
                price: variantGenerator.defaultPrice,
                stock: variantGenerator.defaultStock,
                image_url: color.imageUrl || current.image || "",
              },
              currentVariants.length + generated.length,
              current,
            ),
          );
        });
      });

      return {
        ...current,
        variants: [...currentVariants, ...generated],
      };
    });
  }

  async function uploadVariantImage(index, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError("");
    setUploadingVariantIndex(index);
    try {
      const uploaded = usesTenantDefinitions && editingProduct?.id
        ? await uploadProductMedia(file, editingProduct.id)
        : await uploadImage(file);
      updateVariant(index, "image_url", uploaded.url || uploaded.path || "");
      updateVariant(index, "clearImage", false);
    } catch (error) {
      setUploadError(error.message || "Variant image upload failed.");
    } finally {
      setUploadingVariantIndex(-1);
    }
  }

  async function uploadGallery(event) {
    const files = event.target.files;
    event.target.value = "";
    if (!files?.length) return;

    setUploadError("");
    setUploadingField("galleryImages");
    try {
      if (usesTenantDefinitions && !editingProduct?.id) throw new Error("Save the product before uploading gallery media.");
      const uploaded = usesTenantDefinitions
        ? await Promise.all(Array.from(files).map((file) => uploadProductMedia(file, editingProduct.id)))
        : await uploadImages(files);
      setForm((current) => {
        const currentImages = current.galleryImages || [];
        return {
          ...current,
          clearGalleryImages: false,
          galleryImages: [
            ...currentImages,
            ...uploaded
              .map((item, index) => ({
                id: `gallery-${Date.now()}-${index}`,
                image_url: item.url || item.path,
                sort_order: currentImages.length + index,
              }))
              .filter((item) => item.image_url),
          ],
        };
      });
    } catch (error) {
      setUploadError(error.message || "Gallery images upload failed.");
    } finally {
      setUploadingField("");
    }
  }

  async function removeGalleryImage(index) {
    const removed = form.galleryImages?.[index];
    if (usesTenantDefinitions && editingProduct?.id && removed?.image_url?.includes(`/products/${editingProduct.id}/`)) {
      try { await deleteProductMedia(editingProduct.id, removed.image_url); }
      catch (error) { setUploadError(error.message || "Gallery image could not be deleted."); return; }
    }
    setForm((current) => ({
      ...current,
      galleryImages: (current.galleryImages || [])
        .filter((_, imageIndex) => imageIndex !== index)
        .map((image, sortIndex) => ({ ...image, sort_order: sortIndex })),
      clearGalleryImages: (current.galleryImages || []).filter((_, imageIndex) => imageIndex !== index).length === 0,
    }));
  }

  function addGalleryImageField() {
    setForm((current) => {
      const currentImages = current.galleryImages || [];
      return {
        ...current,
        clearGalleryImages: false,
        galleryImages: [...currentImages, createGalleryImageEntry(currentImages.length)],
      };
    });
  }

  function updateGalleryImage(index, value) {
    setForm((current) => ({
      ...current,
      clearGalleryImages: value ? false : current.clearGalleryImages,
      galleryImages: (current.galleryImages || []).map((image, imageIndex) =>
        imageIndex === index ? { ...image, image_url: value } : image,
      ),
    }));
  }

  async function uploadGalleryItem(index, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError("");
    setUploadingGalleryIndex(index);
    try {
      const uploaded = usesTenantDefinitions && editingProduct?.id
        ? await uploadProductMedia(file, editingProduct.id)
        : await uploadImage(file);
      updateGalleryImage(index, uploaded.url || uploaded.path || "");
    } catch (error) {
      setUploadError(error.message || "Gallery image upload failed.");
    } finally {
      setUploadingGalleryIndex(-1);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (readOnly || isSaving) return;
    if (activeChildUploads > 0 || uploadingField || uploadingVariantIndex >= 0 || uploadingGalleryIndex >= 0) {
      setUploadError(t("productForm.errors.waitForUploads"));
      return;
    }
    const hierarchy = validateProductHierarchySelection({
      brands,
      categories,
      brandId: form.brandId,
      mainCategoryId: form.mainCategoryId,
      subcategoryId: form.subcategoryId,
    });
    if (!hierarchy.ok) {
      setFieldErrors({ [hierarchy.field]: ar ? hierarchy.messageAr : hierarchy.messageEn });
      setUploadError(ar ? hierarchy.messageAr : hierarchy.messageEn);
      setStep("basic");
      return;
    }
    setIsSaving(true);
    setUploadError("");
    setFieldErrors({});
    let productPayload;
    try {
      const minRaw = form.minPurchaseQuantity;
      const maxRaw = form.maxPurchaseQuantity;
      const minQty = minRaw === "" || minRaw == null ? null : Number(minRaw);
      const maxQty = maxRaw === "" || maxRaw == null ? null : Number(maxRaw);
      if (minQty != null && (!Number.isInteger(minQty) || minQty < 1)) {
        throw new Error(ar ? "الحد الأدنى للكمية يجب أن يكون عدداً صحيحاً موجباً." : "Minimum purchase quantity must be a positive integer.");
      }
      if (maxQty != null && (!Number.isInteger(maxQty) || maxQty < 1)) {
        throw new Error(ar ? "الحد الأقصى للكمية يجب أن يكون عدداً صحيحاً موجباً." : "Maximum purchase quantity must be a positive integer.");
      }
      if (minQty != null && maxQty != null && minQty > maxQty) {
        throw new Error(ar ? "الحد الأدنى لا يمكن أن يكون أكبر من الحد الأقصى." : "Minimum purchase quantity cannot be greater than maximum.");
      }
      productPayload = createProductFromForm(form);
      if (conditionEnabled) {
        productPayload.condition = form.condition || null;
      }
      if (!canManageCostPrice) {
        productPayload = {
          ...productPayload,
          variants: (productPayload.variants || []).map((variant) => {
            const { costPrice, cost_price, ...rest } = variant;
            return rest;
          }),
        };
      }
    } catch (error) {
      setUploadError(error.message || "Product stock is invalid.");
      setIsSaving(false);
      return;
    }
    let result;
    try {
      result = await onSave(productPayload);
    } catch (error) {
      setUploadError(error?.message || t("productForm.errors.save"));
      setIsSaving(false);
      return;
    }
    if (!result?.ok) {
      setUploadError(result?.message || t("productForm.errors.save"));
      setIsSaving(false);
      return;
    }
    setForm((current) => ({ ...current, id: result.product.id }));
    onPersisted?.(result.product);
    setContentRetryId("");
    if (result?.ok && usesTenantDefinitions && canManageContent) {
      try {
        await productFieldApi.saveValues(result.product.id, fieldStateToValues(tenantDefinitions, tenantValues));
      } catch (error) {
        setContentRetryId(result.product.id);
        setUploadError(`Product saved, but its content fields were not saved: ${error.message || "Unknown error."}`);
        setIsSaving(false);
        return;
      }
    }
    if (result?.ok) onCancel({ preserveStatusMessage: true });
    setIsSaving(false);
  }

  async function retryContentSave() {
    if (!contentRetryId) return;
    setUploadError("");
    try {
      await productFieldApi.saveValues(contentRetryId, fieldStateToValues(tenantDefinitions, tenantValues));
      setContentRetryId("");
      onCancel({ preserveStatusMessage: true });
    } catch (error) {
      setUploadError(`Content fields still could not be saved: ${error.message || "Unknown error."}`);
    }
  }

  async function uploadVideo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!editingProduct?.id) { setUploadError("Save the product before uploading a video."); return; }
    setUploadError("");
    setUploadingField("videoUrl");
    setVideoProgress(0);
    try {
      const uploaded = await uploadProductMedia(file, editingProduct.id, setVideoProgress);
      const url = uploaded.url || uploaded.path || "";
      setForm((current) => ({ ...current, videoUrl: url }));
      setTenantValues((current) => ({ ...current, product_video: url }));
    } catch (error) { setUploadError(error.message || "Video upload failed."); }
    finally { setUploadingField(""); }
  }

  async function removeVideo() {
    try {
      if (editingProduct?.id && form.videoUrl?.includes(`/products/${editingProduct.id}/`)) await deleteProductMedia(editingProduct.id, form.videoUrl);
      setForm((current) => ({ ...current, videoUrl: "" }));
      setTenantValues((current) => ({ ...current, product_video: "" }));
      setVideoProgress(0);
    } catch (error) { setUploadError(error.message || "Video could not be removed."); }
  }

  function moveGalleryImage(from, to) {
    setForm((current) => {
      const images = [...(current.galleryImages || [])];
      if (from < 0 || to < 0 || from >= images.length || to >= images.length || from === to) return current;
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      return { ...current, galleryImages: images.map((image, sortIndex) => ({ ...image, sort_order: sortIndex })) };
    });
  }

  return (
    <section className="admin-panel-card product-wizard-shell" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="admin-tabs">
        {tabs.map((tab, index) => (
          <button className={step === tab ? "active" : ""} key={tab} onClick={() => setStep(tab)} type="button">
            {index + 1}. {tabName[tab]}
          </button>
        ))}
      </div>
      <form className={`admin-form admin-wizard-form product-wizard-form ${readOnly ? "is-readonly" : ""}`} onSubmit={submit}>
        {readOnly && <div className="message-panel full-field product-form-banner" role="status">{hierarchyLabels.viewOnly}</div>}
        {hierarchyIncomplete && <div className="message-panel error full-field product-form-banner" role="alert">{hierarchyLabels.incomplete}</div>}
        {uploadError && <div className="message-panel error full-field" role="alert">{uploadError}{contentRetryId && <button className="secondary-action" onClick={retryContentSave} type="button">{language === "ar" ? "إعادة محاولة حفظ المحتوى" : "Retry content save"}</button>}</div>}
        {step === "basic" && (
          <>
            <section className="product-form-section">
              <header className="product-form-section-head"><h3>{hierarchyLabels.basic}</h3></header>
              <label className={fieldErrors.nameEn ? "has-error" : ""}>
                {t("productForm.productNameEn")} *
                <input dir="ltr" disabled={readOnly} name="nameEn" required value={form.nameEn} onChange={change} />
                <small className="product-field-help">{hierarchyLabels.nameEnHelp}</small>
              </label>
              <label>
                {t("productForm.productNameAr")} *
                <input dir="rtl" disabled={readOnly} name="nameAr" required value={form.nameAr} onChange={change} />
                <small className="product-field-help">{hierarchyLabels.nameArHelp}</small>
              </label>
              <label>
                {t("productForm.shortDescriptionEn")}
                <textarea dir="ltr" disabled={readOnly} name="shortDescription" value={form.shortDescription} onChange={change} />
                <small className="product-field-help">{hierarchyLabels.shortHelp}</small>
              </label>
              <label>
                {t("productForm.shortDescriptionAr")}
                <textarea dir="rtl" disabled={readOnly} name="shortDescriptionAr" value={form.shortDescriptionAr} onChange={change} />
              </label>
            </section>

            <section className="product-form-section">
              <header className="product-form-section-head">
                <h3>{hierarchyLabels.pricing}</h3>
                <p className="admin-note">{t("productForm.primaryPricingHelp")}</p>
              </header>
              <label>
                {t("productForm.price")}
                <input
                  disabled={readOnly || !hasPrimaryVariant}
                  min="0"
                  type="number"
                  value={hasPrimaryVariant ? (primaryVariant.price ?? "") : ""}
                  onChange={(event) => updateVariant(primaryVariantIndex, "price", event.target.value)}
                />
              </label>
              <label>
                {t("productForm.salePrice")}
                <input
                  disabled={readOnly || !hasPrimaryVariant}
                  min="0"
                  type="number"
                  value={hasPrimaryVariant ? (primaryVariant.sale_price ?? "") : ""}
                  onChange={(event) => updateVariant(primaryVariantIndex, "sale_price", event.target.value)}
                />
              </label>
              <label>
                {t("productForm.stock")}
                <input disabled readOnly type="number" value={totalVariantStock} />
                <small className="product-field-help">{t("productForm.totalStockHelp")}</small>
              </label>
              {!hasPrimaryVariant && (
                <p className="admin-note">{t("productForm.addVariantToSetPrice")}</p>
              )}
              <p>
                <strong>{form.variants?.length || 0}</strong> {ar ? "متغيرات" : "variants"}
                {" آ· "}
                <strong>{totalVariantStock}</strong> {ar ? "وحدة في المخزون" : "units in stock"}
              </p>
              <button className="secondary-action" onClick={() => setStep("variants")} type="button">{t("productForm.manageVariants")}</button>
            </section>

            {canManageMedia && (
              <section className="product-form-section">
                <header className="product-form-section-head"><h3>{hierarchyLabels.media}</h3></header>
                {basicImagePreview ? (
                  <img
                    alt=""
                    className="admin-image-preview small-preview"
                    src={resolveProductImageUrl(basicImagePreview)}
                    onError={useProductImagePlaceholder}
                  />
                ) : (
                  <p className="admin-note">{t("productForm.noPrimaryImageYet")}</p>
                )}
                <p className="admin-note">{t("productForm.mediaTabHelp")}</p>
                <button className="secondary-action" onClick={() => setStep("media")} type="button">{t("productForm.openMedia")}</button>
              </section>
            )}

            <section className="product-form-section product-form-classification">
              <header className="product-form-section-head">
                <h3>{hierarchyLabels.classification}</h3>
                <p>{hierarchyLabels.helper}</p>
              </header>
              <label className={fieldErrors.brandId ? "has-error" : ""}>
                {hierarchyLabels.brand}
                <select disabled={readOnly} name="brandId" required value={form.brandId} onChange={changeBrand}>
                  <option value="">{ar ? "اختر علامة تجارية" : "Select a Brand"}</option>
                  {brandOptions.map((brand) => (
                    <option key={brand.id} value={brand.id}>{getText(brand.name, language)}</option>
                  ))}
                </select>
                {fieldErrors.brandId && <span className="product-field-error">{fieldErrors.brandId}</span>}
              </label>
              <label className={fieldErrors.mainCategoryId ? "has-error" : ""}>
                {hierarchyLabels.main}
                <select disabled={readOnly || !form.brandId} name="mainCategoryId" required value={form.mainCategoryId || ""} onChange={changeMainCategory}>
                  <option value="">{!form.brandId ? hierarchyLabels.selectBrand : (ar ? "اختر فئة رئيسية" : "Select a Main Category")}</option>
                  {mainCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>{getText(category.name, language)}</option>
                  ))}
                </select>
                {!form.brandId && <small className="product-field-help">{hierarchyLabels.selectBrand}</small>}
                {form.brandId && !mainCategoryOptions.length && <small className="product-field-help">{hierarchyLabels.noMains}</small>}
                {fieldErrors.mainCategoryId && <span className="product-field-error">{fieldErrors.mainCategoryId}</span>}
              </label>
              <label className={fieldErrors.subcategoryId ? "has-error" : ""}>
                {hierarchyLabels.sub}
                <select disabled={readOnly || !form.mainCategoryId} name="subcategoryId" required value={form.subcategoryId || ""} onChange={changeSubcategory}>
                  <option value="">{!form.mainCategoryId ? hierarchyLabels.selectMain : (ar ? "اختر فئة فرعية" : "Select a Subcategory")}</option>
                  {subcategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>{getText(category.name, language)}</option>
                  ))}
                </select>
                {!form.mainCategoryId && <small className="product-field-help">{hierarchyLabels.selectMain}</small>}
                {form.mainCategoryId && !subcategoryOptions.length && <small className="product-field-help">{hierarchyLabels.noSubs}</small>}
                {fieldErrors.subcategoryId && <span className="product-field-error">{fieldErrors.subcategoryId}</span>}
              </label>
            </section>

            <section className="product-form-section product-form-attributes">
              <header className="product-form-section-head">
                <h3>{hierarchyLabels.attributes}</h3>
                <p className="admin-note">{t("productForm.attributesHelp")}</p>
              </header>
              {PRODUCT_FILTER_FORM_GROUPS.map((group) => (
                <div className="full-field" key={group}>
                  <span>{ar ? PRODUCT_FILTER_FORM_LABELS[group].ar : PRODUCT_FILTER_FORM_LABELS[group].en}</span>
                  <div className="admin-checkbox-grid">
                    {getLocalizedFilterAttributeOptions(group, language).map((option) => (
                      <label className="checkbox-line" key={option.id}>
                        <input
                          disabled={readOnly}
                          name={group}
                          type="checkbox"
                          checked={Array.isArray(form[group]) ? form[group].includes(option.id) : false}
                          onChange={(event) => toggleFilterAttribute(group, option.id, event.target.checked)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  {group === "age" && Array.isArray(form.age) && form.age.filter((entry) => !getLocalizedFilterAttributeOptions("age", language).some((option) => option.id === entry)).map((legacyValue) => (
                    <span className="admin-note" key={legacyValue}>
                      {t("productForm.legacyAgeValue").replace("{value}", legacyValue)}
                    </span>
                  ))}
                  {group === "age" && requiresCanonicalAgeSelection(form.age) && (
                    <span className="admin-note">{t("productForm.ambiguousAgeValue")}</span>
                  )}
                </div>
              ))}
              <p className="admin-note">{t("productForm.variantAttributesNote")}</p>
            </section>

            <section className="product-form-section">
              <header className="product-form-section-head"><h3>{hierarchyLabels.status}</h3></header>
              <div className="admin-checkbox-grid full-field">
                <label className="checkbox-line"><input disabled={readOnly} name="active" type="checkbox" checked={Boolean(form.active)} onChange={change} />{t("productForm.active")}</label>
                <label className="checkbox-line"><input disabled={readOnly} name="visible" type="checkbox" checked={Boolean(form.visible)} onChange={change} />{t("productForm.visible")}</label>
              </div>
            </section>

            <section className="product-form-section product-form-advanced">
              <button className="product-advanced-toggle" onClick={() => setAdvancedOpen((open) => !open)} type="button" aria-expanded={advancedOpen}>
                <span>{hierarchyLabels.advanced}</span>
                <ChevronDown className={advancedOpen ? "open" : ""} size={16} />
              </button>
              {advancedOpen && (
                <div className="product-advanced-body">
                  <label>{t("productForm.slug")}<input dir="ltr" disabled={readOnly} name="slug" value={form.slug} onChange={change} /></label>
                  <label>{t("productForm.sku")}<input dir="ltr" disabled={readOnly} name="sku" value={form.sku} onChange={change} /></label>
                  <label>{t("productForm.barcode") || "Barcode"}<input dir="ltr" disabled={readOnly} name="barcode" value={form.barcode || ""} onChange={change} /></label>
                  {conditionEnabled ? (
                    <label>
                      {t("productForm.condition") || "Condition"}
                      <select disabled={readOnly} name="condition" value={form.condition || ""} onChange={change}>
                        <option value="">{t("productForm.conditionUnset") || "Not set"}</option>
                        {PRODUCT_CONDITION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label>{t("productForm.minPurchaseQuantity") || "Min purchase quantity"}<input dir="ltr" disabled={readOnly} min="1" name="minPurchaseQuantity" type="number" value={form.minPurchaseQuantity ?? ""} onChange={change} /></label>
                  <label>{t("productForm.maxPurchaseQuantity") || "Max purchase quantity"}<input dir="ltr" disabled={readOnly} min="1" name="maxPurchaseQuantity" type="number" value={form.maxPurchaseQuantity ?? ""} onChange={change} /></label>
                  <label>{t("productForm.longDescriptionEn")}<textarea dir="ltr" disabled={readOnly} name="fullDescription" value={form.fullDescription} onChange={change} /></label>
                  <label>{t("productForm.longDescriptionAr")}<textarea dir="rtl" disabled={readOnly} name="fullDescriptionAr" value={form.fullDescriptionAr} onChange={change} /></label>
                  <label>{t("productForm.manufacturer")}<input disabled={readOnly} name="manufacturer" value={form.manufacturer || ""} onChange={change} /></label>
                  <div className="admin-checkbox-grid full-field">
                    <label className="checkbox-line"><input disabled={readOnly} name="quickShop" type="checkbox" checked={Boolean(form.quickShop)} onChange={change} />{t("productForm.quickShop")}</label>
                    {PRODUCT_MERCHANDISING_FLAGS.map((field) => (
                      <label className="checkbox-line" key={field}><input disabled={readOnly} name={field} type="checkbox" checked={Boolean(form[field])} onChange={change} />{t(`productForm.${field}`)}</label>
                    ))}
                  </div>
                  <label>{t("productForm.labelEn")}<input dir="ltr" disabled={readOnly} name="label" value={form.label} onChange={change} /></label>
                  <label>{t("productForm.labelAr")}<input dir="rtl" disabled={readOnly} name="labelAr" value={form.labelAr} onChange={change} /></label>
                  <p className="admin-note">{t("productForm.advancedMediaNote")}</p>
                </div>
              )}
            </section>
          </>
        )}
        {step === "pricing" && <div className="full-field">
          <h3>{t("productForm.tabs.pricing")}</h3>
          <p className="admin-note">{t("productForm.pricingHelp")}</p>
          <p><strong>{form.variants?.length || 0}</strong> variants آ· <strong>{(form.variants || []).reduce((sum, variant) => sum + Number(variant.stock || 0), 0)}</strong> units in stock</p>
          <button className="secondary-action" onClick={() => setStep("variants")} type="button">{t("productForm.manageVariants")}</button>
        </div>}
        {step === "variants" && (
          <div className="full-field admin-variants-editor">
            <div className="admin-inline-heading">
              <strong>{usesTenantDefinitions ? "Shade / color, size or volume, price and stock" : "Color, size, price, and stock combinations"}</strong>
              <button className="secondary-action compact-action" onClick={addVariant} type="button">
                {t("productForm.addVariant")}
              </button>
            </div>
            {!usesTenantDefinitions && <div className="variant-generator-panel">
              <div>
                <strong>Variant Generator</strong>
                <p>Enter each color on a new line: name|hex|optional image URL. Separate sizes with commas.</p>
              </div>
              <label>
                Colors
                <textarea
                  value={variantGenerator.colorsText}
                  onChange={(event) => updateVariantGenerator("colorsText", event.target.value)}
                />
              </label>
              <label>
                Sizes
                <input
                  value={variantGenerator.sizesText}
                  onChange={(event) => updateVariantGenerator("sizesText", event.target.value)}
                />
              </label>
              <label>
                Default price
                <input
                  min="0"
                  type="number"
                  value={variantGenerator.defaultPrice}
                  onChange={(event) => updateVariantGenerator("defaultPrice", event.target.value)}
                />
              </label>
              <label>
                Default stock
                <input
                  min="0"
                  type="number"
                  value={variantGenerator.defaultStock}
                  onChange={(event) => updateVariantGenerator("defaultStock", event.target.value)}
                />
              </label>
              <button className="admin-primary-button compact-action" onClick={generateVariants} type="button">
                Generate Variants
              </button>
            </div>}
            <div className="admin-variant-grid">
              {(form.variants || []).map((variant, index) => (
                <div className="admin-variant-row" key={variant.id || index}>
                  <label>{usesTenantDefinitions ? "Variant / shade name" : "Color name"}<input required value={variant.color_name} onChange={(event) => updateVariant(index, "color_name", event.target.value)} /></label>
                  <label>{usesTenantDefinitions ? "Swatch / color value" : "Color value"}<input value={variant.color_value} onChange={(event) => updateVariant(index, "color_value", event.target.value)} /></label>
                  <label>{usesTenantDefinitions ? "Size or volume" : "Size"}<input required value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} /></label>
                  <label>{t("productForm.price")}<input min="0" required type="number" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} /></label>
                  <label>{t("productForm.salePrice")}<input min="0" type="number" value={variant.sale_price ?? ""} onChange={(event) => updateVariant(index, "sale_price", event.target.value)} /></label>
                  {canManageCostPrice && (
                    <label>{t("productForm.costPrice") || "Cost price"}<input min="0" step="0.01" type="number" value={variant.costPrice ?? ""} onChange={(event) => updateVariant(index, "costPrice", event.target.value)} /></label>
                  )}
                  <label>{t("productForm.stock")}<input min="0" required type="number" value={variant.stock} onChange={(event) => updateVariant(index, "stock", event.target.value)} /></label>
                  <label className="checkbox-line"><input checked={variant.isActive !== false} type="checkbox" onChange={(event) => updateVariant(index, "isActive", event.target.checked)} />{t("productForm.active")}</label>
                  <label className="checkbox-line"><input checked={variant.isVisible !== false} type="checkbox" onChange={(event) => updateVariant(index, "isVisible", event.target.checked)} />{t("productForm.visible")}</label>
                  <label>
                    Variant image
                    <span className="image-upload-row">
                      <input value={variant.image_url} onChange={(event) => { updateVariant(index, "image_url", event.target.value); if (event.target.value) updateVariant(index, "clearImage", false); }} />
                      <span className="upload-button-shell">
                        <input accept="image/*" type="file" onChange={(event) => uploadVariantImage(index, event)} />
                        <span>{uploadingVariantIndex === index ? "Uploading..." : "Upload"}</span>
                      </span>
                    </span>
                    {variant.image_url && <><img className="admin-image-preview small-preview" alt="" src={resolveProductImageUrl(variant.image_url)} onError={useProductImagePlaceholder} /><button className="text-action danger" onClick={() => setForm((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, image_url: "", clearImage: true } : item) }))} type="button">{t("productForm.removeImage")}</button></>}
                  </label>
                  <button className="text-action danger" onClick={() => removeVariant(index)} type="button">{t("productForm.remove")}</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {step === "media" && (
          <>
            <CardImageUpload
              label={t("productForm.mainImage")}
              helperText={t("productForm.mainImageHelp")}
              buttonLabel={t("productForm.uploadImage")}
              language={language}
              name="image"
              productId={usesTenantDefinitions ? editingProduct?.id : undefined}
              tenantSpecific={usesTenantDefinitions}
              value={form.image}
              onChange={change}
              onUploadingChange={trackChildUpload}
              variant="primary"
            />
            <CardImageUpload
              label={t("productForm.hoverImage")}
              helperText={t("productForm.hoverImageHelp")}
              buttonLabel={t("productForm.uploadImage")}
              language={language}
              name="hoverImage"
              productId={usesTenantDefinitions ? editingProduct?.id : undefined}
              tenantSpecific={usesTenantDefinitions}
              value={form.hoverImage}
              onChange={change}
              onUploadingChange={trackChildUpload}
              variant="hover"
            />
            <CardImageUpload label={t("productForm.productsPageImage")} buttonLabel={t("productForm.uploadImage")} language={language} name="productsPageImage" onChange={change} onUploadingChange={trackChildUpload} productId={usesTenantDefinitions ? editingProduct?.id : undefined} tenantSpecific={usesTenantDefinitions} value={form.productsPageImage} />
            <CardImageUpload label={t("productForm.productsPageHoverImage")} buttonLabel={t("productForm.uploadImage")} language={language} name="productsPageHoverImage" onChange={change} onUploadingChange={trackChildUpload} productId={usesTenantDefinitions ? editingProduct?.id : undefined} tenantSpecific={usesTenantDefinitions} value={form.productsPageHoverImage} variant="hover" />
            <MediaField label={t("productForm.productDetailMainImage")} language={language} name="dsiMainImage" onChange={change} onUploadingChange={trackChildUpload} productId={usesTenantDefinitions ? editingProduct?.id : undefined} tenantSpecific={usesTenantDefinitions} value={form.dsiMainImage} />
            <div className="admin-media-field">
              <label>Product video URL<input name="videoUrl" value={form.videoUrl} onChange={change} /></label>
              {usesTenantDefinitions && <label className="admin-upload-button"><Upload size={14} />{uploadingField === "videoUrl" ? `Uploading ${videoProgress}%` : editingProduct?.id ? "Upload MP4/WebM" : "Save product first"}<input accept="video/mp4,video/webm" disabled={!editingProduct?.id} hidden type="file" onChange={uploadVideo} /></label>}
              {form.videoUrl && <div className="admin-media-preview"><video controls preload="metadata" src={form.videoUrl} /><button className="text-action danger" onClick={removeVideo} type="button">Remove video</button></div>}
            </div>
            <MediaField label="Usage video URL (how to use)" language={language} name="usageVideo" onChange={change} onUploadingChange={trackChildUpload} productId={usesTenantDefinitions ? editingProduct?.id : undefined} tenantSpecific={usesTenantDefinitions} value={form.usageVideo} />
            <MediaField label="Usage video poster" language={language} name="usageVideoPoster" onChange={change} onUploadingChange={trackChildUpload} productId={usesTenantDefinitions ? editingProduct?.id : undefined} tenantSpecific={usesTenantDefinitions} value={form.usageVideoPoster} />
            <div className="full-field admin-gallery-editor">
              <div className="admin-inline-heading">
                <strong>Vertical Gallery Images</strong>
                <label className="admin-upload-button">
                  <Upload size={14} />
                  {uploadingField === "galleryImages" ? "Uploading..." : "Upload Gallery Images"}
                  <input accept="image/*" hidden multiple type="file" onChange={uploadGallery} />
                </label>
                <button className="secondary-action compact-action" onClick={addGalleryImageField} type="button">
                  + Add image field
                </button>
              </div>
              <div className="admin-gallery-preview-grid">
                {(form.galleryImages || []).map((image, index) => (
                  <figure className="admin-gallery-preview" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); moveGalleryImage(Number(event.dataTransfer.getData("text/plain")), index); }} key={image.id || `${image.image_url}-${index}`}>
                    <label>
                      Image URL
                      <span className="image-upload-row">
                        <input
                          value={image.image_url}
                          onChange={(event) => updateGalleryImage(index, event.target.value)}
                        />
                        <span className="upload-button-shell">
                          <input
                            accept="image/*"
                            aria-label="Upload gallery image"
                            onChange={(event) => uploadGalleryItem(index, event)}
                            type="file"
                          />
                          <span>{uploadingGalleryIndex === index ? "Uploading..." : "Upload"}</span>
                        </span>
                      </span>
                    </label>
                    {image.image_url && <img alt="" src={resolveProductImageUrl(image.image_url)} onError={useProductImagePlaceholder} />}
                    <div className="structured-row-actions"><button disabled={index === 0} onClick={() => moveGalleryImage(index, index - 1)} type="button">â†‘</button><button disabled={index === form.galleryImages.length - 1} onClick={() => moveGalleryImage(index, index + 1)} type="button">â†“</button><button onClick={() => removeGalleryImage(index)} type="button">Remove</button></div>
                  </figure>
                ))}
              </div>
            </div>
            {usesTenantDefinitions && <TenantProductFields definitions={additionalMediaDefinitions} language={language} section="media" value={tenantValues} onChange={updateTenantValue} />}
            {showSchemaDetailMedia && <>
            <div className="full-field">
              <strong>Product Details Section Images</strong>
              <div className="admin-dsi-grid">
                {schemaDetailMediaFields.map(({ key, label }) => (
                  <MediaField key={key} label={label} language={language} name={key} onUploadingChange={trackChildUpload} value={form[key] || ""} onChange={change} />
                ))}
              </div>
            </div>
            {showDetailStatements && <div className="full-field">
              <strong>Product Details Banner Statements</strong>
              <div className="admin-dsi-grid">
                {(form.detailStatements || []).map((statement, index) => (
                  <div className="admin-media-field" key={index}>
                    <label>
                      Statement {index + 1} - English
                      <input
                        value={statement.en || ""}
                        onChange={(event) =>
                          setForm((current) => {
                            const updated = [...(current.detailStatements || [])];
                            updated[index] = { ...updated[index], en: event.target.value, ar: updated[index]?.ar || "" };
                            return { ...current, detailStatements: updated };
                          })
                        }
                      />
                    </label>
                    <label>
                      Statement {index + 1} - Arabic
                      <input
                        value={statement.ar || ""}
                        onChange={(event) =>
                          setForm((current) => {
                            const updated = [...(current.detailStatements || [])];
                            updated[index] = { ...updated[index], ar: event.target.value, en: updated[index]?.en || "" };
                            return { ...current, detailStatements: updated };
                          })
                        }
                      />
                    </label>
                    <button
                      className="text-action danger"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          detailStatements: (current.detailStatements || []).filter((_, i) => i !== index),
                        }))
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  className="secondary-action compact-action"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      detailStatements: [...(current.detailStatements || []), { en: "", ar: "" }],
                    }))
                  }
                  type="button"
                >
                  + Add statement
                </button>
              </div>
            </div>}
            </>}
          </>
        )}
        {step === "details" && <>
          {showSchemaDetailFields && <>
            {schemaFieldEnabled("howToUse") && <label>{t("productForm.howToUse")}<textarea name="howToUse" value={form.howToUse} onChange={change} /></label>}
            {schemaFieldEnabled("ingredients") && <label>{t("productForm.ingredients")}<textarea name="ingredients" value={form.ingredients} onChange={change} /></label>}
            {schemaFieldEnabled("benefits") && <label>{t("productForm.benefits")}<textarea name="benefits" value={form.benefits} onChange={change} /></label>}
            {schemaFieldEnabled("skinTypes") && <label>{t("productForm.skinTypes")}<input name="skinTypes" value={form.skinTypes} onChange={change} /></label>}
            {schemaFieldEnabled("concerns") && <label>{t("productForm.concerns")}<input name="concerns" value={form.concerns} onChange={change} /></label>}
          </>}
          {usesTenantDefinitions && <><TenantProductFields definitions={tenantDefinitions} language={language} section="details" value={tenantValues} onChange={updateTenantValue} /><TenantProductFields definitions={tenantDefinitions} language={language} section="showcase" value={tenantValues} onChange={updateTenantValue} /></>}
        </>}
        {step === "marketing" && (
          <>
            {!usesTenantDefinitions && <><label>{t("productForm.metaTitle")}<input name="metaTitle" value={form.metaTitle} onChange={change} /></label><label>{t("productForm.metaDescription")}<textarea name="metaDescription" value={form.metaDescription} onChange={change} /></label></>}
            {usesTenantDefinitions && <><TenantProductFields definitions={tenantDefinitions} language={language} section="marketing" value={tenantValues} onChange={updateTenantValue} /><TenantProductFields definitions={tenantDefinitions} language={language} section="seo" value={tenantValues} onChange={updateTenantValue} /></>}
            <div className="full-field product-relations-panel">
              <h3>{t("productForm.relatedProducts")}</h3>
              <p className="admin-muted">{t("productForm.relatedProductsHelp")}</p>
              {!(editingProduct?.id || form.id) ? (
                <p className="admin-muted">{t("productForm.relationsSaveFirst")}</p>
              ) : (
                <>
                  <ProductPicker
                    disabled={readOnly || relationsSaving}
                    error={relationsError}
                    excludeIds={[editingProduct?.id || form.id].filter(Boolean)}
                    language={language}
                    loading={relationsLoading}
                    products={catalogProducts}
                    selectedIds={relatedIds}
                    onChange={setRelatedIds}
                  />
                  {!readOnly && (
                    <button
                      className="admin-primary-button"
                      disabled={relationsSaving || relationsLoading}
                      type="button"
                      onClick={() => saveRelations("related", relatedIds)}
                    >
                      {relationsSaving ? t("productForm.saving") : t("productForm.saveRelatedProducts")}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="full-field product-relations-panel">
              <h3>{t("productForm.frequentlyBoughtTogether")}</h3>
              <p className="admin-muted">{t("productForm.frequentlyBoughtTogetherHelp")}</p>
              {!(editingProduct?.id || form.id) ? (
                <p className="admin-muted">{t("productForm.relationsSaveFirst")}</p>
              ) : (
                <>
                  <ProductPicker
                    disabled={readOnly || relationsSaving}
                    excludeIds={[editingProduct?.id || form.id].filter(Boolean)}
                    language={language}
                    loading={relationsLoading}
                    products={catalogProducts}
                    selectedIds={fbtIds}
                    onChange={setFbtIds}
                  />
                  {!readOnly && (
                    <button
                      className="admin-primary-button"
                      disabled={relationsSaving || relationsLoading}
                      type="button"
                      onClick={() => saveRelations("fbt", fbtIds)}
                    >
                      {relationsSaving ? t("productForm.saving") : t("productForm.saveFrequentlyBoughtTogether")}
                    </button>
                  )}
                </>
              )}
              {relationsMessage ? <p className="admin-success-text">{relationsMessage}</p> : null}
            </div>
          </>
        )}
        {step === "preview" && <article className="full-field admin-product-preview">
          {form.image && <img className="admin-image-preview" alt="" src={resolveProductImageUrl(form.image)} onError={useProductImagePlaceholder} />}
          <h2>{form.nameEn || "Untitled product"}</h2>
          {form.nameAr && <h3 dir="rtl">{form.nameAr}</h3>}
          <p>{form.shortDescription}</p>
          <p><strong>{form.variants?.length || 0}</strong> variants آ· <strong>{(form.variants || []).reduce((sum, variant) => sum + Number(variant.stock || 0), 0)}</strong> in stock</p>
          {form.videoUrl && <video controls preload="metadata" src={form.videoUrl} />}
          {(tenantValues.product_faqs || []).filter((item) => item.is_active !== false).length > 0 && <p>{tenantValues.product_faqs.filter((item) => item.is_active !== false).length} active FAQ items</p>}
        </article>}
        <div className="form-actions full-field product-form-actions">
          <button className="secondary-action" disabled={isSaving || tabs.indexOf(step) === 0} onClick={() => setStep(tabs[tabs.indexOf(step) - 1])} type="button">{t("productForm.previous")}</button>
          <button className="secondary-action" disabled={isSaving || tabs.indexOf(step) === tabs.length - 1} onClick={() => setStep(tabs[tabs.indexOf(step) + 1])} type="button">{t("productForm.next")}</button>
          <button className="secondary-action" disabled={isSaving} onClick={() => onCancel()} type="button">{t("productForm.cancel")}</button>
          {!readOnly && <button className="admin-primary-button" disabled={isSaving || activeChildUploads > 0 || Boolean(uploadingField) || uploadingVariantIndex >= 0 || uploadingGalleryIndex >= 0} type="submit">{isSaving ? t("productForm.saving") : (editingProduct || form.id) ? t("productForm.saveChanges") : t("productForm.create")}</button>}
        </div>
      </form>
    </section>
  );
}

function GenericEntityForm({ fields, initial, isEditing = false, language = "en", onCancel, onSave, title }) {
  const [form, setForm] = React.useState(initial);
  function change(event) {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }
  const visibleFields = fields.filter((field) => (typeof field.visibleWhen === "function" ? field.visibleWhen(form) : true));
  return (
    <section className="admin-panel-card">
      <h2>{title}</h2>
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        {visibleFields.map((field) => {
          if (field.type === "textarea") return <label key={field.name}>{field.label}<textarea dir={field.dir} name={field.name} value={form[field.name] || ""} onChange={change} /></label>;
          if (field.type === "checkbox") return <label className="checkbox-line" key={field.name}><input name={field.name} type="checkbox" checked={Boolean(form[field.name])} onChange={change} />{field.label}</label>;
          if (field.type === "media") return <MediaField key={field.name} allowVideo={Boolean(field.allowVideo)} label={field.label} language={language} name={field.name} value={form[field.name]} onChange={change} />;
          if (field.type === "select") return <label key={field.name}>{field.label}<select name={field.name} value={form[field.name] || ""} onChange={change}>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
          return <label key={field.name}>{field.label}<input dir={field.dir} name={field.name} required={field.required} value={form[field.name] || ""} onChange={change} /></label>;
        })}
        <div className="form-actions full-field">
          <button className="secondary-action" onClick={onCancel} type="button">{language === "ar" ? "إلغاء" : "Cancel"}</button>
          <button className="admin-primary-button" type="submit">{language === "ar" ? (isEditing ? "حفظ التغييرات" : "إنشاء") : (isEditing ? "Save changes" : "Create")}</button>
        </div>
      </form>
    </section>
  );
}

function InventoryPage({ inventoryRows, lowStockThreshold = 5, movements, onAdjust, onOpenModal, products }) {
  return (
    <>
      <section className="admin-panel-card">
        <Toolbar addLabel="Stock Update" onAdd={onOpenModal}>
          <SearchField placeholder="Search by product name, SKU..." value="" onChange={() => {}} />
        </Toolbar>
        <AdminTable>
          <thead><tr><th>Product Name</th><th>Variant</th><th>SKU</th><th>Stock Qty</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map((product) => {
              const stock = inventoryRows[product.id] ?? getStockQty(product);
              return (
                <tr key={product.id}>
                  <td>{getText(product.name)}</td>
                  <td>{product.sizes?.[0]?.size || "Default"}</td>
                  <td>{getProductSku(product)}</td>
                  <td>{stock}</td>
                  <td><Badge tone={stock <= 0 ? "danger" : stock < lowStockThreshold ? "warning" : "active"}>{stock <= 0 ? "Out of Stock" : stock < lowStockThreshold ? "Low Stock" : "In Stock"}</Badge></td>
                  <td><button className="icon-action" onClick={() => onAdjust(product.id, 1)} type="button"><Plus size={14} /></button><button className="icon-action" onClick={() => onAdjust(product.id, -1)} type="button"><Minus size={14} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      </section>
      <section className="admin-panel-card">
        <h2>Stock Movement History</h2>
        <p>Last 50 stock movements across all products</p>
        <AdminTable>
          <thead><tr><th>Date</th><th>Product</th><th>Variant</th><th>Delta</th><th>Reason</th><th>Operator / Order</th></tr></thead>
          <tbody>
            {movements.length ? movements.slice(0, 50).map((move) => <tr key={move.id}><td>{formatDate(move.date)}</td><td>{move.product}</td><td>{move.variant}</td><td>{move.delta}</td><td>{move.reason}</td><td>{move.operator}</td></tr>) : <tr><td colSpan="6">No stock movements yet.</td></tr>}
          </tbody>
        </AdminTable>
      </section>
    </>
  );
}

function StockUpdateModal({ inventoryRows, onApply, onClose, products }) {
  const [reason, setReason] = React.useState("Adjustment");
  const [note, setNote] = React.useState("");
  const [deltas, setDeltas] = React.useState({});
  const pending = Object.values(deltas).filter((value) => Number(value) !== 0).length;
  return (
    <div className="admin-modal-backdrop">
      <section className="admin-modal">
        <div className="admin-section-head"><div><h2>Stock Update</h2><p>Sync database stock with physical counts.</p></div><button className="text-action" onClick={onClose} type="button">Close</button></div>
        <div className="admin-toolbar">
          <SearchField placeholder="Search inventory" value="" onChange={() => {}} />
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            {["Adjustment", "Restock", "Correction", "Damaged", "Return"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="admin-inventory-list">
          {products.map((product) => (
            <label className="admin-inventory-row" key={product.id}>
              <input type="checkbox" checked={Number(deltas[product.id] || 0) !== 0} readOnly />
              <span><strong>{getText(product.name)}</strong><small>{getProductSku(product)} آ· current {inventoryRows[product.id] ?? getStockQty(product)}</small></span>
              <input type="number" value={deltas[product.id] || ""} onChange={(event) => setDeltas((current) => ({ ...current, [product.id]: event.target.value }))} />
            </label>
          ))}
        </div>
        <label>Note optional<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="form-actions">
          <span>{pending} pending non-zero updates</span>
          <button className="admin-primary-button" onClick={() => onApply(deltas, reason, note)} type="button">Apply Stock Updates</button>
        </div>
      </section>
    </div>
  );
}

function AdminDashboardPage({
  activePage = "admin",
  brands = [],
  categories = [],
  company,
  currentUser,
  employees,
  homepageCategoryCards,
  language,
  modules,
  homepageOffers,
  onDeleteProduct,
  onRestoreProduct,
  onPermanentlyDeleteProduct,
  onDeactivateProduct,
  onDuplicateProduct,
  onReorderProducts,
  onDeleteBrand,
  onDeleteCategory,
  onDeleteOffer,
  onAssignEmployee,
  onDeleteOrder,
  onLogout,
  onLanguageChange,
  onNavigate,
  onReturnToPlatform,
  onSwitchCompany,
  onSaveCategoryCard,
  onSaveOffer,
  onSaveProduct,
  onSaveBrand,
  onSaveCategory,
  onSaveVlog,
  vlogs: managedVlogs = [],
  onSaveWebsiteMedia,
  onDeleteWebsiteMedia,
  onModerateReview,
  onDeleteReview,
  onStatusChange,
  isDarkMode,
  onToggleDarkMode,
  orders,
  products,
  trashedProducts = [],
  reviews,
  reorderSaving = false,
  statusMessage,
  statusMessageType = "success",
  t,
  websiteMedia = [],
  websiteMediaError = "",
}) {
  const [editingProduct, setEditingProduct] = React.useState(null);
  const [editingCategory, setEditingCategory] = React.useState(null);
  const [newCategoryDefaults, setNewCategoryDefaults] = React.useState({ brandId: "", parentId: "" });
  const [editingBrand, setEditingBrand] = React.useState(null);
  const [editingVlog, setEditingVlog] = React.useState(null);
  const [filters, setFilters] = React.useState({ brand: "all", category: "all", search: "", status: "all", stock: "all", merchandising: "all" });
  const adminCategories = categories;
  const companyId = company?.id || "";
  const vlogs = managedVlogs;
  const [stores, setStores] = React.useState([]);
  const [inventoryRows, setInventoryRows] = React.useState({});
  const [movements, setMovements] = React.useState([]);
  const [stockModalOpen, setStockModalOpen] = React.useState(false);
  const storageKey = React.useCallback(
    (key) => tenantStorageKey(companyId, key),
    [companyId],
  );

  React.useEffect(() => {
    if (activePage !== "admin-vlogs-new") return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId) return;
    const entry = vlogs.find((item) => String(item.id) === editId || String(item.slug) === editId);
    if (entry) setEditingVlog(entry);
  }, [activePage, vlogs]);

  React.useEffect(() => {
    if (activePage !== "admin-products-new") return;
    const match = window.location.pathname.match(/^\/admin\/products\/([^/]+)\/edit$/);
    if (!match) return;
    const id = decodeURIComponent(match[1]);
    const product = products.find((item) => String(item.id) === id);
    if (product) setEditingProduct(product);
  }, [activePage, products]);

  React.useEffect(() => {
    if (!companyId) {
      setStores([]);
      setInventoryRows({});
      setMovements([]);
      return;
    }
    setStores(readStorage(storageKey("stores"), []));
    setInventoryRows(readStorage(storageKey("inventory"), {}));
    setMovements(readStorage(storageKey("movements"), []));
  }, [companyId, storageKey]);

  const role = currentUser?.role;
  const canEdit = isTenantOperator(role);
  const canManageSensitive = isCompanyAdmin(role);
  const lowStockThreshold = resolveLowStockThreshold(company);
  const costPriceEnabled = company?.settings?.costPriceEnabled === true;
  const conditionEnabled = company?.settings?.productConditionEnabled === true;
  const canManageCostPrice = costPriceEnabled && (
    isCompanyAdmin(role)
    || role === "manager"
    || hasPermission(currentUser, "products.cost_price.manage")
  );
  const canManageProductContent = isCompanyAdmin(role) || ["product_content.manage", "products.manage", "products.update"].some((permission) => hasPermission(currentUser, permission));
  const productMediaAllowed = canManageProductMedia(currentUser);
  const canCreateProducts = isCompanyAdmin(role) || ["products.create", "products.manage"].some((permission) => hasPermission(currentUser, permission));
  const productsUpdateAllowed = canUpdateProducts(currentUser);
  const canDeleteProducts = isCompanyAdmin(role) || ["products.delete", "products.manage"].some((permission) => hasPermission(currentUser, permission));
  const canRestoreProducts = isCompanyAdmin(role) || ["products.update", "products.manage"].some((permission) => hasPermission(currentUser, permission));
  const canPermanentlyDeleteProducts = isCompanyAdmin(role) || hasPermission(currentUser, "products.permanent_delete");
  const canCreateCategories = isCompanyAdmin(role) || ["categories.create", "categories.manage"].some((permission) => hasPermission(currentUser, permission));
  const canUpdateCategories = isCompanyAdmin(role) || ["categories.update", "categories.manage"].some((permission) => hasPermission(currentUser, permission));
  const canDeleteCategories = isCompanyAdmin(role) || ["categories.delete", "categories.manage"].some((permission) => hasPermission(currentUser, permission));
  const canCreateBrands = isCompanyAdmin(role) || ["brands.create", "brands.manage"].some((permission) => hasPermission(currentUser, permission));
  const canUpdateBrands = isCompanyAdmin(role) || ["brands.update", "brands.manage"].some((permission) => hasPermission(currentUser, permission));
  const canDeleteBrands = isCompanyAdmin(role) || ["brands.delete", "brands.manage"].some((permission) => hasPermission(currentUser, permission));
  const readOnly = !canEdit;
  const customers = uniqueCustomersFromOrders(orders);
  const [title, subtitle] = pageMeta[activePage] || pageMeta.admin;

  if (!isAdminPortalRole(role)) {
    return (
      <AdminLayout
        activePage={activePage}
        company={company}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        language={language}
        modules={modules}
        onLanguageChange={onLanguageChange}
        onLogout={onLogout}
        onNavigate={onNavigate}
        onReturnToPlatform={onReturnToPlatform}
        onSwitchCompany={onSwitchCompany}
        onToggleDarkMode={onToggleDarkMode}
        subtitle="Admin access is required"
        title="Access denied"
      >
        <EmptyState title="Access denied" description="This portal is for admin and staff only." />
      </AdminLayout>
    );
  }

  if (isStaffRole(role) && !canAccessAdminPage(currentUser, activePage)) {
    return (
      <AdminLayout
        activePage={activePage}
        company={company}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        language={language}
        modules={modules}
        onLanguageChange={onLanguageChange}
        onLogout={onLogout}
        onNavigate={onNavigate}
        onReturnToPlatform={onReturnToPlatform}
        onSwitchCompany={onSwitchCompany}
        onToggleDarkMode={onToggleDarkMode}
        subtitle={subtitle}
        title={title}
      >
        <EmptyState title="Access denied" description="You do not have permission to access this page." />
      </AdminLayout>
    );
  }

  function saveStores(next) { setStores(next); writeStorage(storageKey("stores"), next); }
  function saveInventory(next) { setInventoryRows(next); writeStorage(storageKey("inventory"), next); }
  function saveMovements(next) { setMovements(next); writeStorage(storageKey("movements"), next); }

  function renderSimpleTable(kind) {
    const config = {
      categories: { rows: adminCategories, add: "admin-categories-new", search: "Search by name...", title: "Add Category" },
      brands: { rows: brands, add: "admin-brands-new", search: "Search by name...", title: "Add Brand" },
      stores: { rows: stores, add: "admin-store-locator-new", search: "Search by name, city...", title: "Add Store" },
    }[kind];
    if (kind === "categories" && companyId === "kids-velvet") {
      const openNewCategory = (defaults = {}) => {
        setEditingCategory(null);
        setNewCategoryDefaults({ brandId: defaults.brandId || "", parentId: defaults.parentId || "" });
        onNavigate("admin-categories-new");
      };
      return <CategoriesHierarchy brands={brands} canCreate={canCreateCategories} canDelete={canDeleteCategories} canUpdate={canUpdateCategories} categories={adminCategories} language={language} onAddGeneric={() => openNewCategory()} onAddMain={(brandId) => openNewCategory({ brandId })} onAddSubcategory={(parentId) => openNewCategory({ parentId })} onDelete={onDeleteCategory} onEdit={(category) => { setEditingCategory(category); setNewCategoryDefaults({ brandId: "", parentId: "" }); onNavigate("admin-categories-new"); }} />;
    }
    if (kind === "brands") {
      return (
        <BrandsCatalogTable
          brands={brands}
          canCreate={canCreateBrands}
          canDelete={canDeleteBrands}
          canUpdate={canUpdateBrands}
          language={language}
          onAdd={() => {
            setEditingBrand(null);
            onNavigate("admin-brands-new");
          }}
          onDelete={onDeleteBrand}
          onEdit={(brand) => {
            setEditingBrand(brand);
            onNavigate("admin-brands-new");
          }}
          readOnly={readOnly}
        />
      );
    }
    return (
      <section className="admin-panel-card">
        <Toolbar addLabel={config.title} onAdd={readOnly && kind !== "categories" && kind !== "brands" ? null : () => {
          if (kind === "categories" && !canCreateCategories) return;
          if (kind === "brands" && !canCreateBrands) return;
          if (kind === "categories") { setEditingCategory(null); setNewCategoryDefaults({ brandId: "", parentId: "" }); }
          if (kind === "brands") setEditingBrand(null);
          onNavigate(config.add);
        }}>
          <SearchField placeholder={config.search} value="" onChange={() => {}} />
          <div className="admin-segmented"><button className="active" type="button">All</button><button type="button">Active</button><button type="button">Inactive</button></div>
        </Toolbar>
        <AdminTable>
          <thead>
            {kind === "stores" ? <tr><th>Name</th><th>City</th><th>Country</th><th>Phone</th><th>Status</th><th>Sort</th><th className="admin-data-table-actions">Actions</th></tr> :
                  <tr><th>Icon</th><th>Name</th><th>Parent</th><th>Status</th><th>Created</th><th>Updated</th><th className="admin-data-table-actions">Actions</th></tr>}
          </thead>
          <tbody>
            {config.rows.length ? config.rows.map((row, index) => (
              <tr key={row.id || index}>
                {kind === "stores" ? (
                  <><td>{row.name}</td><td>{row.city}</td><td>{row.country}</td><td>{row.phone || "-"}</td><td><Badge>{row.active === false ? "Inactive" : "Active"}</Badge></td><td>{row.sort || index + 1}</td><td>-</td></>
                ) : (
                  <><td>{row.imageUrl ? <DeferredAdminThumb placeholder="C" src={row.imageUrl} /> : <span className="admin-logo-mini">C</span>}</td><td>{getText(row.name, language)}</td><td>{row.parentId ? getText(adminCategories.find((category) => String(category.id) === String(row.parentId))?.name, language) || (language === "ar" ? "غير متاح" : "Not available") : "—"}</td><td><Badge>{row.isActive === false ? "Inactive" : "Active"}</Badge></td><td>{formatDate(row.createdAt)}</td><td>{formatDate(row.updatedAt)}</td><td className="admin-data-table-actions">{(canUpdateCategories || canDeleteCategories) && <div className="row-actions">{canUpdateCategories && <button className="text-action" onClick={() => { setEditingCategory(row); onNavigate("admin-categories-new"); }} type="button">Edit</button>}{canDeleteCategories && <button className="text-action danger" onClick={() => onDeleteCategory(row.id)} type="button">Delete</button>}</div>}</td></>
                )}
              </tr>
            )) : <tr><td colSpan="7"><EmptyState title="No records yet" description="" /></td></tr>}
          </tbody>
        </AdminTable>
      </section>
    );
  }

  function renderEntityForm(kind) {
    if (kind === "category") {
      const current = editingCategory;
      if (current && !canUpdateCategories) return <EmptyState title="Access denied" description="You do not have permission to edit categories." />;
      if (!current && !canCreateCategories) return <EmptyState title="Access denied" description="You do not have permission to create categories." />;
      const ar = language === "ar";
      const parentIdField = { name: "parentId", label: ar ? "الفئة الرئيسية" : "Parent Category", type: "select", options: [{ value: "", label: ar ? "بدون (فئة رئيسية)" : "None (top-level)" }, ...adminCategories.map((category) => ({ value: category.id, label: getText(category.name, language) }))] };
      return <GenericEntityForm isEditing={Boolean(current)} language={language} title={current ? (ar ? "تعديل الفئة" : "Edit Category") : (ar ? "فئة جديدة" : "New Category")} initial={{ active: current?.isActive !== false, brandId: current?.brandId || newCategoryDefaults.brandId || "", descriptionAr: current?.description?.ar || "", descriptionEn: current?.description?.en || "", heroVideo: current?.heroVideo || "", image: current?.imageUrl || "", nameAr: current?.name?.ar || "", nameEn: current?.name?.en || "", parentId: current?.parentId || newCategoryDefaults.parentId || "", slug: current?.slug || "" }} fields={[
        { name: "nameEn", label: ar ? "اسم الفئة بالإنجليزية *" : "Category name — English *", required: true, dir: "ltr" },
        { name: "nameAr", label: ar ? "اسم الفئة بالعربية *" : "Category name — Arabic *", required: true, dir: "rtl" },
        { name: "slug", label: ar ? "الرابط المختصر" : "Slug", dir: "ltr" },
        { name: "descriptionEn", label: ar ? "الوصف بالإنجليزية" : "Description — English", type: "textarea", dir: "ltr" },
        { name: "descriptionAr", label: ar ? "الوصف بالعربية" : "Description — Arabic", type: "textarea", dir: "rtl" },
        parentIdField,
        { name: "brandId", label: ar ? "العلامة التجارية *" : "Brand *", type: "select", visibleWhen: (form) => !form?.parentId, options: [{ value: "", label: ar ? "اختر علامة" : "Select a brand" }, ...brands.map((brand) => ({ value: brand.id, label: getText(brand.name, language) || brand.slug }))] },
        { name: "image", label: ar ? "صورة الفئة" : "Category Image", type: "media" },
        { name: "heroVideo", label: ar ? "فيديو الواجهة" : "Category hero video", type: "media", allowVideo: true },
        { name: "active", label: ar ? "نشطة" : "Active", type: "checkbox" },
      ]} onCancel={() => { setEditingCategory(null); setNewCategoryDefaults({ brandId: "", parentId: "" }); onNavigate("admin-categories"); }} onSave={async (form) => { await onSaveCategory({ ...(current?.id ? { id: current.id } : {}), slug: form.slug || makeSlug(form.nameEn || form.nameAr), name: createLocalizedCopy(form.nameEn, form.nameAr), description: form.descriptionEn || form.descriptionAr ? createLocalizedCopy(form.descriptionEn, form.descriptionAr) : null, imageUrl: form.image || null, brandId: form.parentId ? null : form.brandId || null, heroVideo: form.heroVideo || null, parentId: form.parentId || null, isActive: form.active }); setEditingCategory(null); setNewCategoryDefaults({ brandId: "", parentId: "" }); onNavigate("admin-categories", { preserveStatusMessage: true }); }} />;
    }
    if (kind === "brand") {
      const current = editingBrand;
      if (current && !canUpdateBrands) return <EmptyState title="Access denied" description="You do not have permission to edit brands." />;
      if (!current && !canCreateBrands) return <EmptyState title="Access denied" description="You do not have permission to create brands." />;
      const ar = language === "ar";
      return <GenericEntityForm isEditing={Boolean(current)} language={language} title={current ? (ar ? "تعديل العلامة" : "Edit Brand") : (ar ? "علامة جديدة" : "New Brand")} initial={{ active: current?.isActive !== false, country: current?.country || "", headerImage: current?.headerImage || "", heroPoster: current?.heroPoster || "", heroVideo: current?.heroVideo || "", logo: current?.logoUrl || "", menuImage: current?.menuImage || "", nameAr: getText(current?.name, "ar"), nameEn: getText(current?.name, "en"), slug: current?.slug || "" }} fields={[
        { name: "nameEn", label: ar ? "اسم العلامة بالإنجليزية *" : "Brand name — English *", required: true, dir: "ltr" },
        { name: "nameAr", label: ar ? "اسم العلامة بالعربية *" : "Brand name — Arabic *", required: true, dir: "rtl" },
        { name: "slug", label: ar ? "الرابط المختصر" : "Slug", dir: "ltr" },
        { name: "country", label: ar ? "البلد" : "Country" },
        { name: "logo", label: ar ? "شعار العلامة" : "Brand Logo", type: "media" },
        { name: "menuImage", label: ar ? "صورة القائمة الكبيرة" : "Mega Menu Image", type: "media" },
        { name: "heroVideo", label: ar ? "فيديو الواجهة" : "Brand Hero Video", type: "media", allowVideo: true },
        { name: "heroPoster", label: ar ? "صورة الواجهة" : "Brand Hero Poster", type: "media" },
        { name: "headerImage", label: ar ? "صورة هيدر صفحة البراند" : "Brand Page Header Image", type: "media" },
        { name: "active", label: ar ? "نشطة" : "Active", type: "checkbox" },
      ]} onCancel={() => { setEditingBrand(null); onNavigate("admin-brands"); }} onSave={async (form) => { await onSaveBrand({ ...(current?.id ? { id: current.id } : {}), slug: form.slug || makeSlug(form.nameEn || form.nameAr), name: createLocalizedCopy(form.nameEn, form.nameAr), country: form.country || null, logoUrl: form.logo || null, menuImage: form.menuImage || null, heroVideo: form.heroVideo || null, heroPoster: form.heroPoster || null, headerImage: form.headerImage || null, isActive: form.active }); setEditingBrand(null); onNavigate("admin-brands", { preserveStatusMessage: true }); }} />;
    }
    if (kind === "vlog" && !canEdit) {
      return <EmptyState title="View-only access" description="You do not have permission to create records." />;
    }
    if (kind === "vlog") {
      const current = editingVlog;
      const ar = language === "ar";
      return <GenericEntityForm isEditing={Boolean(current)} language={language} title={current ? (ar ? "تعديل الفيديو" : "Edit Vlog") : (ar ? "فيديو جديد" : "New Vlog")} initial={{
        active: current?.isActive !== false,
        featured: current?.featured === true,
        mediaType: current?.mediaType === "image" ? "image" : "video",
        slug: current?.slug || "",
        titleEn: getText(current?.title, "en"),
        titleAr: getText(current?.title, "ar"),
        descriptionEn: getText(current?.description, "en"),
        descriptionAr: getText(current?.description, "ar"),
        videoUrl: current?.videoUrl || "",
        posterUrl: current?.posterUrl || "",
        imageUrl: current?.imageUrl || "",
        linkUrl: current?.linkUrl || "",
        sortOrder: current?.sortOrder ?? 0,
      }} fields={[
        { name: "titleEn", label: ar ? "العنوان بالإنجليزية *" : "Title — English *", required: true, dir: "ltr" },
        { name: "titleAr", label: ar ? "العنوان بالعربية *" : "Title — Arabic *", required: true, dir: "rtl" },
        { name: "slug", label: ar ? "الرابط المختصر" : "Slug", dir: "ltr" },
        { name: "descriptionEn", label: ar ? "الوصف بالإنجليزية" : "Description — English", type: "textarea", dir: "ltr" },
        { name: "descriptionAr", label: ar ? "الوصف بالعربية" : "Description — Arabic", type: "textarea", dir: "rtl" },
        { name: "mediaType", label: ar ? "نوع المحتوى" : "Media type", type: "select", options: [{ value: "video", label: ar ? "فيديو" : "Video" }, { value: "image", label: ar ? "صورة" : "Image" }] },
        { name: "videoUrl", label: ar ? "رابط الفيديو" : "Video URL", type: "media", allowVideo: true, visibleWhen: (form) => form?.mediaType !== "image" },
        { name: "posterUrl", label: ar ? "ملصق الفيديو" : "Video poster", type: "media", visibleWhen: (form) => form?.mediaType !== "image" },
        { name: "imageUrl", label: ar ? "صورة المنشور" : "Post image", type: "media", visibleWhen: (form) => form?.mediaType === "image" },
        { name: "linkUrl", label: ar ? "رابط اختياري" : "Optional link", dir: "ltr" },
        { name: "sortOrder", label: ar ? "الترتيب" : "Sort order", type: "number" },
        { name: "active", label: ar ? "نشط" : "Active", type: "checkbox" },
        { name: "featured", label: ar ? "مميز" : "Featured", type: "checkbox" },
      ]} onCancel={() => { setEditingVlog(null); onNavigate("admin-vlogs"); }} onSave={async (form) => {
        await onSaveVlog?.({
          ...(current?.id ? { id: current.id } : {}),
          slug: form.slug || makeSlug(form.titleEn || form.titleAr),
          title: createLocalizedCopy(form.titleEn, form.titleAr),
          description: form.descriptionEn || form.descriptionAr ? createLocalizedCopy(form.descriptionEn, form.descriptionAr) : { en: "", ar: "" },
          mediaType: form.mediaType === "image" ? "image" : "video",
          videoUrl: form.mediaType === "image" ? "" : form.videoUrl || "",
          posterUrl: form.posterUrl || "",
          imageUrl: form.imageUrl || "",
          linkUrl: form.linkUrl || "",
          sortOrder: Number(form.sortOrder || 0),
          isActive: form.active,
          featured: form.featured,
        });
        setEditingVlog(null);
        onNavigate("admin-vlogs", { preserveStatusMessage: true });
      }} />;
    }
    return <GenericEntityForm title="New Store" initial={{ active: true, country: "Palestine" }} fields={[
      { name: "name", label: "Name *", required: true }, { name: "address", label: "Address *", required: true }, { name: "city", label: "City *", required: true }, { name: "country", label: "Country *", required: true }, { name: "phone", label: "Phone" }, { name: "hours", label: "Hours" }, { name: "latitude", label: "Latitude" }, { name: "longitude", label: "Longitude" }, { name: "active", label: "Active", type: "checkbox" },
    ]} onCancel={() => onNavigate("admin-store-locator")} onSave={(form) => { saveStores([{ id: makeSlug(form.name) || `store-${Date.now()}`, ...form, sort: stores.length + 1 }, ...stores]); onNavigate("admin-store-locator"); }} />;
  }

  function renderReviews() {
    return (
      <section className="admin-panel-card">
        <Toolbar><select><option>Status</option><option>Pending</option><option>Approved</option><option>Rejected</option></select><select><option>Rating</option><option>5 Stars</option><option>4 Stars</option></select></Toolbar>
        <AdminTable>
          <thead><tr><th><input type="checkbox" /></th><th>Rating</th><th>Review</th><th>Product</th><th>Reviewer</th><th>Status</th><th>Created</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>
            {reviews.length ? reviews.map((review) => <tr key={review.id}><td><input type="checkbox" /></td><td>{"★".repeat(Number(review.rating || 0))}</td><td>{getText(review.comment, language)}</td><td>{review.productName || "-"}</td><td>{review.customerName || "-"}</td><td><Badge tone={review.status === "rejected" ? "danger" : review.status === "approved" ? "active" : "warning"}>{review.status || "Pending"}</Badge></td><td>{formatDate(review.createdAt)}</td><td>{formatDate(review.updatedAt)}</td><td><div className="row-actions"><button className="text-action" onClick={() => onModerateReview(review.id, "approved", true)} type="button">Approve</button><button className="text-action danger" onClick={() => onDeleteReview?.(review.id)} type="button">Delete</button></div></td></tr>) : <tr><td colSpan="9">No reviews yet.</td></tr>}
          </tbody>
        </AdminTable>
      </section>
    );
  }

  function adjustStock(productId, delta, reason = "Adjustment", note = "") {
    const product = products.find((item) => item.id === productId);
    const next = { ...inventoryRows, [productId]: Math.max(0, (inventoryRows[productId] ?? getStockQty(product)) + Number(delta || 0)) };
    const move = { id: `move-${Date.now()}-${productId}`, date: new Date().toISOString(), product: getText(product?.name), variant: product?.sizes?.[0]?.size || "Default", delta: Number(delta || 0), reason, operator: currentUser?.name || currentUser?.role || "Admin", note };
    saveInventory(next);
    saveMovements([move, ...movements]);
  }

  function applyStockUpdates(deltas, reason, note) {
    Object.entries(deltas).forEach(([productId, delta]) => {
      if (Number(delta) !== 0) adjustStock(productId, Number(delta), reason, note);
    });
    setStockModalOpen(false);
  }

  function renderCustomers() {
    return (
      <section className="admin-panel-card">
        <Toolbar><SearchField placeholder="Search name, email, or phone..." value="" onChange={() => {}} /><select><option>Status</option></select><select><option>10 / page</option><option>25 / page</option><option>50 / page</option><option>100 / page</option></select></Toolbar>
        <AdminTable>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Orders</th><th>Created</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>{customers.length ? customers.map((customer) => <tr key={`${customer.email}-${customer.phone}`}><td>{customer.name}</td><td>{customer.email}</td><td>{customer.phone}</td><td><Badge>{customer.status}</Badge></td><td>{customer.orders}</td><td>{formatDate(customer.createdAt)}</td><td>{formatDate(customer.updatedAt)}</td><td>-</td></tr>) : <tr><td colSpan="8">No customers yet.</td></tr>}</tbody>
        </AdminTable>
      </section>
    );
  }

  function renderActivePage() {
    switch (activePage) {
      case "admin-products":
        return <ProductsListPage
          brands={brands}
          canCreate={canCreateProducts}
          canDelete={canDeleteProducts}
          canUpdate={productsUpdateAllowed}
          categories={adminCategories}
          filters={filters}
          language={language}
          lowStockThreshold={lowStockThreshold}
          onAdd={() => { setEditingProduct(null); onNavigate("admin-products-new"); }}
          onDeactivateProduct={onDeactivateProduct}
          onDeleteProduct={onDeleteProduct}
          onDuplicateProduct={onDuplicateProduct}
          onReorderProducts={onReorderProducts}
          onEdit={(product) => { setEditingProduct(product); onNavigate("admin-products-new", { path: `/admin/products/${encodeURIComponent(product.id)}/edit` }); }}
          onStock={(product) => {
            const query = getProductSku(product);
            try { sessionStorage.setItem(INVENTORY_PRODUCT_QUERY_KEY, query === "-" ? getText(product.name) : query); } catch { /* ignore */ }
            onNavigate("admin-inventory");
          }}
          products={products}
          reorderSaving={reorderSaving}
          setFilters={setFilters}
          t={t}
        />;
      case "admin-products-trash":
        return <ProductsTrashPage
          canPermanentDelete={canPermanentlyDeleteProducts}
          canRestore={canRestoreProducts}
          onPermanentlyDeleteProduct={onPermanentlyDeleteProduct}
          onRestoreProduct={onRestoreProduct}
          products={trashedProducts}
          t={t}
        />;
      case "admin-products-new":
      case "admin-products-edit": {
        const match = window.location.pathname.match(/^\/admin\/products\/([^/]+)\/edit$/);
        const routeProductId = match ? decodeURIComponent(match[1]) : "";
        const productToEdit = routeProductId
          ? products.find((item) => String(item.id) === routeProductId)
          : editingProduct;
        if (routeProductId && !productToEdit) return <section className="admin-panel-card">Loading product...</section>;
        if (!productToEdit && !canCreateProducts) return <EmptyState title="View-only access" description="You do not have permission to create products." />;
        const formReadOnly = Boolean(productToEdit) && !productsUpdateAllowed;
        return <ProductWizard brands={brands} catalogProducts={products} categories={adminCategories} canManageContent={canManageProductContent} canManageCostPrice={canManageCostPrice} canManageMedia={productMediaAllowed && !formReadOnly} conditionEnabled={conditionEnabled} editingProduct={productToEdit} language={language} readOnly={formReadOnly} onCancel={(options) => onNavigate("admin-products", options)} onPersisted={(product) => { setEditingProduct(product); onNavigate("admin-products-edit", { path: `/admin/products/${encodeURIComponent(product.id)}/edit`, preserveStatusMessage: true, replace: true }); }} onSave={onSaveProduct} />;
      }
      case "admin-categories":
        return renderSimpleTable("categories");
      case "admin-categories-new":
        return renderEntityForm("category");
      case "admin-brands":
        return renderSimpleTable("brands");
      case "admin-brands-new":
        return renderEntityForm("brand");
      case "admin-vlogs-new":
        return renderEntityForm("vlog");
      case "admin-store-locator":
        return renderSimpleTable("stores");
      case "admin-store-locator-new":
        return renderEntityForm("store");
      case "admin-website-media":
        return (
          <MediaSlotsManager
            company={company}
            currentUser={currentUser}
            error={websiteMediaError}
            items={websiteMedia}
            language={language}
            onDelete={onDeleteWebsiteMedia}
            onSave={onSaveWebsiteMedia}
          />
        );
      case "admin-homepage-offers":
        return (
          <HomeContentManager
            canDelete={canManageSensitive}
            categoryCards={homepageCategoryCards}
            language={language}
            offers={homepageOffers}
            onDeleteOffer={onDeleteOffer}
            onDeleteReview={onDeleteReview}
            onModerateReview={onModerateReview}
            onSaveCategoryCard={onSaveCategoryCard}
            onSaveOffer={onSaveOffer}
            products={products}
            reviews={reviews}
            t={t}
          />
        );
      case "admin-orders":
        return <section className="admin-panel-card"><Toolbar><SearchField placeholder="Search order #, customer..." value="" onChange={() => {}} /><select><option>Status</option></select><select><option>Payment</option></select></Toolbar>{orders.length ? <AdminOrdersTable company={company} employees={employees} canDelete={canManageSensitive} language={language} onAssignEmployee={onAssignEmployee} onDeleteOrder={onDeleteOrder} onStatusChange={onStatusChange} orders={orders} products={products} t={t} /> : <EmptyState title="No orders found" description="No orders have been placed yet. Orders will appear here once customers complete their purchases." />}</section>;
      case "admin-reviews":
        return renderReviews();
      case "admin-inventory":
        return <><InventoryPage inventoryRows={inventoryRows} lowStockThreshold={lowStockThreshold} movements={movements} onAdjust={adjustStock} onOpenModal={() => setStockModalOpen(true)} products={products} />{stockModalOpen && <StockUpdateModal inventoryRows={inventoryRows} onApply={applyStockUpdates} onClose={() => setStockModalOpen(false)} products={products} />}</>;
      case "admin-customers":
        return renderCustomers();
      case "admin":
      default:
        return <DashboardHome
          brands={brands}
          categories={categories}
          company={company}
          currentUser={currentUser}
          employees={employees}
          language={language}
          modules={modules}
          onNavigate={onNavigate}
          orders={orders}
          products={products}
          t={t}
        />;
    }
  }

  return (
    <AdminLayout
      activePage={activePage}
      company={company}
      currentUser={currentUser}
      hideHeader={activePage === "admin" || activePage === "admin-products"}
      isDarkMode={isDarkMode}
      language={language}
      modules={modules}
      onLanguageChange={onLanguageChange}
      onLogout={onLogout}
      onNavigate={onNavigate}
      onReturnToPlatform={onReturnToPlatform}
      onSwitchCompany={onSwitchCompany}
      onToggleDarkMode={onToggleDarkMode}
      subtitle={subtitle}
      title={title}
    >
      <PermissionNotice currentUser={currentUser} role={role} />
      {statusMessage && <div className={`message-panel ${statusMessageType}`} role={statusMessageType === "error" ? "alert" : "status"}>{statusMessage}</div>}
      {renderActivePage()}
    </AdminLayout>
  );
}

export default AdminDashboardPage;
