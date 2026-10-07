import React from "react";
import AdminOrdersTable from "../components/AdminOrdersTable.jsx";
import { ProductWizard } from "./AdminDashboardPage.jsx";
import AdminProductTable from "../components/AdminProductTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import WorkTimer from "../components/WorkTimer.jsx";
import WebsiteMediaManager from "../components/WebsiteMediaManager.jsx";
import { hasPermission, permissionGroups } from "../data/permissions.js";
import { canonicalOrderStatus, isOpenOrderStatus } from "../utils/sales.js";

const emptyCustomer = {
  name: "",
  phone: "",
  city: "",
  address: "",
  notes: "",
};

function normalizeEmployeeVariants(product = {}) {
  if (Array.isArray(product.variants) && product.variants.length) {
    return product.variants.map((variant, index) => ({
      id: variant.id || `${product.id || "product"}-variant-${index}`,
      colorName: variant.color_name || variant.colorName || "Default",
      colorValue: variant.color_value || variant.colorValue || "",
      size: variant.size || product.sizes?.[0]?.size || "",
      price: Number(variant.price ?? product.sizes?.[0]?.price ?? 0),
      stock: Math.max(0, Number(variant.stock ?? variant.stockQty ?? product.stockQty ?? 0)),
      image: variant.image_url || variant.imageUrl || variant.image || product.image || "",
    }));
  }

  return (product.sizes || []).map((sizeOption, index) => ({
    id: `${product.id || "product"}-variant-${index}`,
    colorName: "Default",
    colorValue: "",
    size: sizeOption.size || "",
    price: Number(sizeOption.price || 0),
    stock: Math.max(0, Number(product.stockQty ?? 0)),
    image: product.image || "",
  }));
}

function formatVariantLabel(variant, t) {
  const color = variant.colorName && variant.colorName !== "Default" ? `${variant.colorName} - ` : "";
  return `${color}${variant.size} - ${variant.price} ${t("common.ils")}`;
}

function EmployeeDashboardPage({
  brands = [],
  categories = [],
  currentUser,
  language,
  onCreateOrder,
  onDeleteOrder,
  onDeleteProduct,
  onNavigate,
  onSaveProduct,
  onSaveWebsiteMedia,
  onDeleteWebsiteMedia,
  onStatusChange,
  orders,
  products,
  t,
  workSession,
  websiteMedia = [],
}) {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [editingProduct, setEditingProduct] = React.useState(null);
  const [customer, setCustomer] = React.useState(emptyCustomer);
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [selectedVariantId, setSelectedVariantId] = React.useState("");
  const [productQuery, setProductQuery] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [draftItems, setDraftItems] = React.useState([]);
  const [message, setMessage] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!["admin", "employee", "staff", "manager"].includes(currentUser?.role)) {
    return (
      <section className="page-shell">
        <div className="empty-panel">
          <h1>{t("admin.accessDenied")}</h1>
          <p>{t("admin.employeeOnly")}</p>
          <button className="primary-action" onClick={() => onNavigate("admin-login")}>
            {t("auth.login")}
          </button>
        </div>
      </section>
    );
  }

  const canViewProducts = hasPermission(currentUser, "products.view");
  const canCreateProducts = hasPermission(currentUser, "products.create");
  const canUpdateProducts = hasPermission(currentUser, "products.update");
  const canDeleteProducts = hasPermission(currentUser, "products.delete");
  const canViewOrders = hasPermission(currentUser, "orders.view");
  const canCreateOrders = hasPermission(currentUser, "orders.create");
  const canUpdateOrderStatus = hasPermission(currentUser, "orders.updateStatus");
  const canDeleteOrders = hasPermission(currentUser, "orders.delete");
  const canManageWebsiteMedia = hasPermission(currentUser, "website_media.manage");
  const hasProductPermission =
    canViewProducts || canCreateProducts || canUpdateProducts || canDeleteProducts;
  const hasOrderPermission =
    canViewOrders || canCreateOrders || canUpdateOrderStatus || canDeleteOrders;
  const hasAnyPermission = currentUser.permissions?.length > 0 || canManageWebsiteMedia;

  const assignedOrders = orders.filter((order) => {
    const assignedId = order.assignedToEmployeeId || order.handledByEmployeeId;
    return assignedId === currentUser.id || order.createdByEmployeeId === currentUser.id;
  });
  const pendingOrders = assignedOrders.filter((order) => isOpenOrderStatus(order.status));
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = assignedOrders.filter(
    (order) =>
      canonicalOrderStatus(order.status) === "Completed" && order.createdAt?.slice(0, 10) === today
  );
  const allowedPermissions = permissionGroups.flatMap((group) =>
    group.permissions.filter((permission) =>
      currentUser.permissions?.includes(permission.key)
    )
  );
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedProductVariants = React.useMemo(
    () => normalizeEmployeeVariants(selectedProduct),
    [selectedProduct],
  );
  const selectedVariant =
    selectedProductVariants.find((variant) => variant.id === selectedVariantId) ||
    selectedProductVariants[0];
  const productResults = React.useMemo(() => {
    const normalizedQuery = productQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return products.slice(0, 8);
    }

    return products
      .filter((product) => {
        const haystack = [
          product.name?.en,
          product.name?.ar,
          product.slug,
          product.categoryId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [productQuery, products]);
  const draftTotal = draftItems.reduce((sum, item) => sum + item.lineTotal, 0);

  React.useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
      const firstVariant = normalizeEmployeeVariants(products[0])[0];
      setSelectedVariantId(firstVariant?.id || "");
    }
  }, [products, selectedProductId]);

  React.useEffect(() => {
    if (selectedProduct && !selectedProductVariants.some((item) => item.id === selectedVariantId)) {
      setSelectedVariantId(selectedProductVariants[0]?.id || "");
    }
  }, [selectedProduct, selectedProductVariants, selectedVariantId]);

  React.useEffect(() => {
    if (activeTab === "website-media" && !canManageWebsiteMedia) {
      setActiveTab("overview");
    }
  }, [activeTab, canManageWebsiteMedia]);

  function showMessage(type, text) {
    setMessage({ type, text });
  }

  async function handleProductSave(product) {
    if (!onSaveProduct) {
      showMessage("error", t("employee.noPermissionAction"));
      return;
    }

    setIsSubmitting(true);
    const result = await onSaveProduct(product);
    setIsSubmitting(false);

    if (result?.ok) {
      setEditingProduct(null);
      showMessage("success", result.message);
    } else {
      showMessage("error", result?.message || t("employee.missingPermission"));
    }

    return result;
  }

  async function handleProductDelete(productId) {
    if (!onDeleteProduct) {
      showMessage("error", t("employee.noPermissionAction"));
      return;
    }

    const result = await onDeleteProduct(productId);
    showMessage(result?.ok ? "success" : "error", result?.message || "");
  }

  async function handleStatusChange(orderId, status) {
    if (!onStatusChange) {
      showMessage("error", t("employee.noPermissionAction"));
      return;
    }

    const result = await onStatusChange(orderId, status);
    showMessage(
      result?.ok ? "success" : "error",
      result?.message || t("employee.missingPermission")
    );
  }

  async function handleDeleteOrder(orderId) {
    if (!onDeleteOrder) {
      showMessage("error", t("employee.noPermissionAction"));
      return;
    }

    const result = await onDeleteOrder(orderId);
    showMessage(result?.ok ? "success" : "error", result?.message || "");
  }

  function handleCustomerChange(event) {
    const { name, value } = event.target;
    setCustomer((currentCustomer) => ({
      ...currentCustomer,
      [name]: value,
    }));
  }

  function handleAddDraftItem(event) {
    event.preventDefault();

    if (!selectedProduct || !selectedVariant) {
      showMessage("error", t("employee.missingPermission"));
      return;
    }

    const itemQuantity = Number(quantity || 1);
    setDraftItems((currentItems) => [
      ...currentItems,
      {
        productId: selectedProduct.id,
        productName: selectedProduct.name[language],
        slug: selectedProduct.slug,
        variantId: selectedVariant.id,
        colorName: selectedVariant.colorName,
        colorValue: selectedVariant.colorValue,
        selectedSize: selectedVariant.size,
        size: selectedVariant.size,
        quantity: itemQuantity,
        price: selectedVariant.price,
        lineTotal: selectedVariant.price * itemQuantity,
        image: selectedVariant.image || selectedProduct.image,
        label: selectedProduct.name[language],
      },
    ]);
    setQuantity(1);
  }

  function selectProduct(product) {
    setSelectedProductId(product.id);
    const firstVariant = normalizeEmployeeVariants(product)[0];
    setSelectedVariantId(firstVariant?.id || "");
    setProductQuery(product.name?.[language] || product.name?.en || "");
  }

  function getOrderSource(order) {
    const assignedId = order.assignedToEmployeeId || order.handledByEmployeeId;
    return order.createdByEmployeeId === currentUser.id && assignedId !== currentUser.id
      ? t("employee.createdByYou")
      : t("employee.assignedOrder");
  }

  async function handleSubmitOrder(event) {
    event.preventDefault();

    if (draftItems.length === 0) {
      showMessage("error", t("cart.emptyTitle"));
      return;
    }

    setIsSubmitting(true);
    if (!onCreateOrder) {
      showMessage("error", t("employee.noPermissionAction"));
      setIsSubmitting(false);
      return;
    }

    const result = await onCreateOrder({
      customer,
      items: draftItems,
      total: draftTotal,
    });
    setIsSubmitting(false);

    if (result?.ok) {
      setCustomer(emptyCustomer);
      setDraftItems([]);
      showMessage("success", result.message);
      setActiveTab("orders");
    } else {
      showMessage("error", result?.message || t("employee.missingPermission"));
    }
  }

  if (!hasAnyPermission) {
    return (
      <section className="page-shell employee-page">
        <div className="empty-panel">
          <h1>{t("admin.employeeDashboard")}</h1>
          <p>{t("employee.noPermissionsAssigned")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell employee-page">
      <div className="page-heading">
        <p className="eyebrow">{t("admin.employeeDashboard")}</p>
        <h1>
          {t("admin.welcome")}, {currentUser.name}
        </h1>
      </div>

      {message && (
        <div className={`message-panel ${message.type}`}>{message.text}</div>
      )}

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <WorkTimer session={workSession} t={t} />
        </article>
        <article className="dashboard-card">
          <span>{t("admin.assignedOrders")}</span>
          <strong>{assignedOrders.length}</strong>
        </article>
        <article className="dashboard-card">
          <span>{t("admin.pendingOrders")}</span>
          <strong>{pendingOrders.length}</strong>
        </article>
        <article className="dashboard-card">
          <span>{t("employee.completedToday")}</span>
          <strong>{completedToday.length}</strong>
        </article>
        {canViewProducts && (
          <article className="dashboard-card">
            <span>{t("admin.totalProducts")}</span>
            <strong>{products.length}</strong>
          </article>
        )}
      </div>

      <div className="dashboard-tabs">
        <button
          className={activeTab === "overview" ? "nav-link active" : "nav-link"}
          onClick={() => setActiveTab("overview")}
          type="button"
        >
          {t("employee.myTasks")}
        </button>
        {hasProductPermission && (
          <button
            className={activeTab === "products" ? "nav-link active" : "nav-link"}
            onClick={() => setActiveTab("products")}
            type="button"
          >
            {t("admin.productsManagement")}
          </button>
        )}
        {hasOrderPermission && (
          <button
            className={activeTab === "orders" ? "nav-link active" : "nav-link"}
            onClick={() => setActiveTab("orders")}
            type="button"
          >
            {t("admin.ordersManagement")}
          </button>
        )}
        {canCreateOrders && (
          <button
            className={activeTab === "create-order" ? "nav-link active" : "nav-link"}
            onClick={() => setActiveTab("create-order")}
            type="button"
          >
            {t("employee.createCustomerOrder")}
          </button>
        )}
        {canManageWebsiteMedia && (
        <button
          className={activeTab === "website-media" ? "nav-link active" : "nav-link"}
          onClick={() => setActiveTab("website-media")}
          type="button"
        >
          {language === "ar" ? "صور الموقع" : "Website Media"}
        </button>
        )}
      </div>

      {activeTab === "overview" && (
        <>
          <section className="admin-section">
            <div className="section-heading">
              <p className="eyebrow">{t("admin.permissions")}</p>
              <h2>{t("admin.allowedActions")}</h2>
            </div>
            <div className="permission-chip-list">
              {allowedPermissions.map((permission) => (
                <span className="permission-chip" key={permission.key}>
                  {t(permission.labelKey)}
                </span>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <div className="section-heading">
              <p className="eyebrow">{t("admin.ordersManagement")}</p>
              <h2>{t("admin.assignedOrders")}</h2>
            </div>
            {assignedOrders.length === 0 ? (
              <div className="empty-panel compact-empty">
                {t("employee.noAssignedOrdersYet")}
              </div>
            ) : (
              <div className="customer-order-list">
                {assignedOrders.map((order) => (
                  <article className="customer-order-card" key={order.id}>
                    <div>
                      <strong>{order.id}</strong>
                      <StatusBadge status={order.status} t={t} />
                      <span className="order-source-badge">{getOrderSource(order)}</span>
                    </div>
                    <p>{order.customer.name}</p>
                    <strong>
                      {order.total} {t("common.ils")}
                    </strong>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "products" && hasProductPermission && (
        <section className="admin-section">
          <div className="section-heading">
            <p className="eyebrow">{t("admin.productsManagement")}</p>
            <h2>{t("admin.productsManagement")}</h2>
          </div>
          {(canCreateProducts || (canUpdateProducts && editingProduct)) && (
            <ProductWizard
              brands={brands}
              catalogProducts={products}
              canManageContent={["product_content.manage", "products.manage", "products.update"].some((permission) => hasPermission(currentUser, permission))}
              canManageMedia={["product_media.manage", "products.manage", "products.update"].some((permission) => hasPermission(currentUser, permission))}
              categories={categories}
              editingProduct={editingProduct}
              language={language}
              onCancel={() => setEditingProduct(null)}
              onSave={handleProductSave}
            />
          )}
          {canViewProducts ? (
            <AdminProductTable
              canDelete={canDeleteProducts}
              canEdit={canUpdateProducts}
              language={language}
              onDelete={handleProductDelete}
              onEdit={setEditingProduct}
              products={products}
              t={t}
            />
          ) : (
            <div className="empty-panel compact-empty">
              {t("employee.noPermissionAction")}
            </div>
          )}
        </section>
      )}

      {activeTab === "orders" && hasOrderPermission && (
        <section className="admin-section">
          <div className="section-heading">
            <p className="eyebrow">{t("admin.ordersManagement")}</p>
            <h2>{t("admin.ordersManagement")}</h2>
          </div>
          {canViewOrders ? (
            <AdminOrdersTable
              canAssign={false}
              canDelete={canDeleteOrders}
              canUpdateStatus={canUpdateOrderStatus}
              language={language}
              onDeleteOrder={handleDeleteOrder}
              onStatusChange={handleStatusChange}
              orders={orders}
              products={products}
              t={t}
            />
          ) : (
            <div className="empty-panel compact-empty">
              {t("employee.noPermissionAction")}
            </div>
          )}
        </section>
      )}

      {activeTab === "create-order" && canCreateOrders && (
        <section className="admin-section">
          <div className="section-heading">
            <p className="eyebrow">{t("employee.createCustomerOrder")}</p>
            <h2>{t("employee.createCustomerOrder")}</h2>
          </div>
          <form className="admin-form" onSubmit={handleSubmitOrder}>
            <label>
              {t("checkout.name")}
              <input name="name" onChange={handleCustomerChange} required value={customer.name} />
            </label>
            <label>
              {t("checkout.phone")}
              <input name="phone" onChange={handleCustomerChange} required value={customer.phone} />
            </label>
            <label>
              {t("checkout.city")}
              <input name="city" onChange={handleCustomerChange} required value={customer.city} />
            </label>
            <label>
              {t("checkout.address")}
              <input name="address" onChange={handleCustomerChange} required value={customer.address} />
            </label>
            <label className="full-field">
              {t("checkout.notes")}
              <textarea name="notes" onChange={handleCustomerChange} value={customer.notes} />
            </label>
            <div className="draft-order-builder full-field">
              <label>
                {t("admin.product")}
                <input
                  autoComplete="off"
                  name="productSearch"
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder={t("employee.searchProduct")}
                  value={productQuery}
                />
              </label>
              <div className="product-search-results full-field" role="listbox">
                {productResults.map((product) => {
                  const firstVariant = normalizeEmployeeVariants(product)[0];
                  return (
                    <button
                      className={selectedProductId === product.id ? "product-search-option active" : "product-search-option"}
                      key={product.id}
                      onClick={() => selectProduct(product)}
                      type="button"
                    >
                      <img
                        alt={product.name?.[language] || product.name?.en}
                        src={product.image || "/images/products/product-placeholder.svg"}
                        onError={(event) => {
                          event.currentTarget.src = "/images/products/product-placeholder.svg";
                        }}
                      />
                      <span>
                        <strong>{product.name?.[language] || product.name?.en}</strong>
                        <small>
                          {firstVariant ? formatVariantLabel(firstVariant, t) : ""}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
              <label>
                {language === "ar" ? "اللون / الحجم" : "Color / size"}
                <select
                  onChange={(event) => setSelectedVariantId(event.target.value)}
                  value={selectedVariantId}
                >
                  {selectedProductVariants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {formatVariantLabel(variant, t)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("employee.quantity")}
                <input
                  min="1"
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  type="number"
                  value={quantity}
                />
              </label>
              <button className="secondary-action" onClick={handleAddDraftItem} type="button">
                {t("employee.addItem")}
              </button>
            </div>
            <div className="draft-order full-field">
              <h4>{t("employee.draftOrder")}</h4>
              {draftItems.length === 0 ? (
                <p>{t("cart.emptyTitle")}</p>
              ) : (
                draftItems.map((item, index) => (
                  <div className="summary-line" key={`${item.productId}-${item.variantId || item.size}-${index}`}>
                    <span>
                      {item.label} {item.colorName && item.colorName !== "Default" ? `${item.colorName} / ` : ""}{item.size} x{item.quantity}
                    </span>
                    <strong>
                      {item.lineTotal} {t("common.ils")}
                    </strong>
                  </div>
                ))
              )}
              <div className="summary-line total-row">
                <span>{t("common.total")}</span>
                <strong>
                  {draftTotal} {t("common.ils")}
                </strong>
              </div>
            </div>
            <div className="form-actions full-field">
              <button className="primary-action" disabled={isSubmitting} type="submit">
                {isSubmitting ? t("common.temporaryContent") : t("employee.submitOrder")}
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === "website-media" && canManageWebsiteMedia && (
        <WebsiteMediaManager
          items={websiteMedia}
          language={language}
          onDelete={onDeleteWebsiteMedia}
          onSave={onSaveWebsiteMedia}
        />
      )}

    </section>
  );
}

export default EmployeeDashboardPage;
