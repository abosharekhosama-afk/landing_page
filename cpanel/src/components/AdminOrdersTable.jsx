import React from "react";
import StatusBadge from "./StatusBadge.jsx";
import { ORDER_STATUSES, canonicalOrderStatus, formatCompanyCurrency, showEbPointsColumn } from "../utils/sales.js";

function storedDeliveryFeeLabel(order, formatAmount, t) {
  const raw = order.delivery_price ?? order.deliveryPrice;
  if (raw == null || raw === "") return "—";
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return "—";
  return amount === 0 ? t("sales.deliveryFree") : formatAmount(amount);
}

function AdminOrdersTable({
  canAssign = true,
  canDelete = false,
  canUpdateStatus = true,
  company,
  currency,
  employees = [],
  language,
  locale,
  onAssignEmployee,
  onDeleteOrder,
  onViewOrder,
  onStatusChange,
  orders,
  products,
  t,
}) {
  if (orders.length === 0) {
    return <div className="empty-panel compact-empty">{t("admin.noOrders")}</div>;
  }

  const showEbPoints = showEbPointsColumn(company);

  function formatAmount(value) {
    if (!currency) return `${value} ${t("common.ils")}`;
    return formatCompanyCurrency(value, { settings: { currency, locale } }, language);
  }

  function getItemSummary(order) {
    return (Array.isArray(order.items) ? order.items : [])
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return `${product?.name[language] || item.slug} ${item.size} x${item.quantity}`;
      })
      .join(", ");
  }

  return (
    <div className="admin-data-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>{t("admin.orderId")}</th>
            <th>{t("checkout.name")}</th>
            <th>{language === "ar" ? "نوع العميل" : "Customer type"}</th>
            <th>{t("checkout.phone")}</th>
            <th>{t("checkout.city")}</th>
            <th>{t("common.total")}</th>
            {showEbPoints && <th>{language === "ar" ? "نقاط EB" : "EB Points"}</th>}
            <th>{t("admin.orderStatus")}</th>
            <th>{t("admin.createdBy")}</th>
            {canAssign && <th>{t("admin.assignedEmployee")}</th>}
            <th>{t("admin.lastUpdatedBy")}</th>
            <th>{t("admin.date")}</th>
            <th>{t("admin.items")}</th>
            {canDelete && <th className="admin-data-table-actions">{t("admin.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{onViewOrder ? <button className="sales-order-link" onClick={() => onViewOrder(order)} type="button">{order.id}</button> : order.id}</td>
              <td>{order.customer?.name || "-"}</td>
              <td>{order.customerUserId ? (language === "ar" ? "عميل" : "Customer") : (language === "ar" ? "زائر" : "Guest")}</td>
              <td>{order.customer?.phone || "-"}</td>
              <td>
                {order.delivery_city_name || order.deliveryZone?.city_name || order.customer?.city || "-"}
                {(order.delivery_region || order.deliveryZone?.region) ? <span className="table-muted">{order.delivery_region || order.deliveryZone?.region}</span> : null}
                <span className="table-muted">{storedDeliveryFeeLabel(order, formatAmount, t)}</span>
              </td>
              <td><bdi dir="ltr">{formatAmount(order.total)}</bdi></td>
              {showEbPoints && <td>{Math.max(0, Number(order.pointsEarned || 0))}</td>}
              <td>
                <StatusBadge status={order.status} t={t} />
                {canUpdateStatus && (
                  <select
                    className="status-inline-select"
                    onChange={(event) => onStatusChange(order.id, event.target.value)}
                    value={canonicalOrderStatus(order.status)}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {t(`status.${status}`)}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td>
                {order.createdByEmployeeName || order.createdBy?.name || order.createdBy?.role || "-"}
                {order.createdBy?.role && (
                  <span className="table-muted">{order.createdBy.role}</span>
                )}
              </td>
              {canAssign && (
                <td>
                  <select
                    className="status-inline-select"
                    onChange={(event) => onAssignEmployee(order.id, event.target.value)}
                    value={order.handledByEmployeeId || ""}
                  >
                    <option value="">{t("admin.unassigned")}</option>
                    {employees
                      .filter((employee) => employee.isActive)
                      .map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                  </select>
                </td>
              )}
              <td>{order.lastUpdatedBy?.name || "-"}</td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td><span className="admin-data-table-cell-clip" title={getItemSummary(order)}>{getItemSummary(order)}</span></td>
              {canDelete && (
                <td className="admin-data-table-actions">
                  <button
                    aria-label={t("admin.delete")}
                    className="text-action danger"
                    onClick={() => onDeleteOrder(order.id)}
                  >
                    {t("admin.delete")}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminOrdersTable;
