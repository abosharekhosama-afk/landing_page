import React from "react";
import AdminLayout from "../../components/AdminLayout.jsx";
import { velvetDropshipSection } from "../../data/adminNavigation.js";
import { velvetApi } from "../../utils/velvetDropshippingApi.js";

const copy = {
  en: {
    title: "Dropshipping",
    subtitle: "Merchants, prices, orders, and Thursday settlements",
    sales: "Total sales",
    profit: "Merchant profit",
    merchants: "Merchants",
    catalog: "Catalog",
    orders: "Orders",
    fulfillment: "Fulfillment",
    settlements: "Settlements",
    price: "Save prices",
    fulfill: "Advance fulfillment",
    close: "Close Thursday",
    activateMerchant: "Activate merchant",
    deactivateMerchant: "Deactivate merchant",
    activateStore: "Activate store",
    deactivateStore: "Deactivate store",
    missing: "Missing",
    pay: "Pay",
    paid: "paid",
    unpaid: "unpaid",
    store: "Store",
    slug: "Slug",
    merchantStatus: "Merchant",
    storeStatus: "Store status",
    product: "Product",
    selling: "Selling price",
    merchantPrice: "Merchant price",
    profitCol: "Profit",
    stock: "Stock",
    cleanImage: "Clean image",
    customer: "Customer",
    status: "Status",
    line: "Line",
    date: "Thursday",
    empty: "No records yet.",
  },
  ar: {
    title: "الدروبشيبينغ",
    subtitle: "التجار والأسعار والطلبات وتسويات الخميس",
    sales: "إجمالي المبيعات",
    profit: "ربح التجار",
    merchants: "التجار",
    catalog: "الكتالوج",
    orders: "الطلبات",
    fulfillment: "التجهيز",
    settlements: "التسويات",
    price: "حفظ الأسعار",
    fulfill: "تقديم التجهيز",
    close: "إغلاق الخميس",
    activateMerchant: "تفعيل التاجر",
    deactivateMerchant: "إيقاف التاجر",
    activateStore: "تفعيل المتجر",
    deactivateStore: "إيقاف المتجر",
    missing: "مفقود",
    pay: "دفع",
    paid: "مدفوع",
    unpaid: "غير مدفوع",
    store: "المتجر",
    slug: "المعرّف",
    merchantStatus: "التاجر",
    storeStatus: "حالة المتجر",
    product: "المنتج",
    selling: "سعر البيع",
    merchantPrice: "سعر التاجر",
    profitCol: "الربح",
    stock: "المخزون",
    cleanImage: "صورة نظيفة",
    customer: "العميل",
    status: "الحالة",
    line: "السطر",
    date: "الخميس",
    empty: "لا توجد سجلات بعد.",
  },
};

const pageForSection = {
  merchants: "admin-velvet-dropshipping-merchants",
  catalog: "admin-velvet-dropshipping-catalog",
  orders: "admin-velvet-dropshipping-orders",
  fulfillment: "admin-velvet-dropshipping-fulfillment",
  settlements: "admin-velvet-dropshipping-settlements",
};

const nextStatus = {
  CONFIRMED: "PROCESSING",
  PROCESSING: "PACKED",
  PACKED: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED_COLLECTED",
};

function hebronDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hebron", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function Table({ headers, rows }) {
  if (!rows.length) return <div className="dropshipping-empty"> </div>;
  return (
    <div className="admin-data-table-wrap dropshipping-table-wrap">
      <table className="admin-data-table dropshipping-table">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export default function AdminVelvetDropshippingPage({ language = "en", activePage = "admin-velvet-dropshipping", ...layout }) {
  const text = copy[language] || copy.en;
  const [section, setSection] = React.useState(() => velvetDropshipSection(activePage));
  const [data, setData] = React.useState({ orders: [], totals: { totalSales: "0.00", totalMerchantProfit: "0.00" } });
  const [offersList, setOffersList] = React.useState([]);
  const [merchantFilter, setMerchantFilter] = React.useState("");
  const [storeFilter, setStoreFilter] = React.useState("");
  const [merchants, setMerchants] = React.useState([]);
  const [settlements, setSettlements] = React.useState([]);
  const [lineId, setLineId] = React.useState("");
  const [offer, setOffer] = React.useState({ productId: "", sellingUnitPrice: "", merchantUnitPrice: "", cleanImageUrl: "" });
  const [thursday, setThursday] = React.useState("");
  const [error, setError] = React.useState("");

  async function load(filters = { merchantId: merchantFilter, storeId: storeFilter }) {
    const [orders, merchantList, settlementList, offerList] = await Promise.all([
      velvetApi.adminOrders(filters),
      velvetApi.adminMerchants(),
      velvetApi.adminSettlements(),
      velvetApi.adminOffers(),
    ]);
    setData(orders);
    setMerchants(merchantList.merchants || []);
    setSettlements(settlementList.settlements || []);
    setOffersList(offerList.offers || []);
  }

  React.useEffect(() => {
    load().catch((loadError) => setError(loadError.message));
  }, []);

  React.useEffect(() => {
    setSection(velvetDropshipSection(activePage));
  }, [activePage]);

  function openSection(key) {
    setSection(key);
    const pageKey = pageForSection[key];
    if (pageKey && pageKey !== activePage && typeof layout.onNavigate === "function") {
      layout.onNavigate(pageKey);
    }
  }

  return (
    <AdminLayout activePage={activePage} title={text.title} subtitle={text.subtitle} {...layout}>
      {error && <div className="admin-status-message error">{error}</div>}
      <div className="dropshipping-overview">
        <div className="dropshipping-metrics dropshipping-metrics-primary">
          <article><span>{text.merchants}</span><strong>{merchants.length}</strong></article>
          <article><span>{text.sales}</span><strong>{data.totals?.totalSales || "0.00"}</strong></article>
          <article><span>{text.profit}</span><strong>{data.totals?.totalMerchantProfit || "0.00"}</strong></article>
        </div>
        <div className="admin-panel-tabs" role="tablist">
          {["merchants", "catalog", "orders", "fulfillment", "settlements"].map((key) => (
            <button className={section === key ? "active" : ""} key={key} onClick={() => openSection(key)} type="button">{text[key]}</button>
          ))}
        </div>

        {section === "merchants" && (
          merchants.length ? (
            <Table headers={[text.store, text.slug, text.merchantStatus, text.storeStatus, ""]} rows={merchants.map((merchant) => (
              <tr key={merchant.id}>
                <td>{merchant.store_name}</td>
                <td>{merchant.slug}</td>
                <td>{merchant.status}</td>
                <td>{merchant.store_status}</td>
                <td className="admin-data-table-actions">
                  <button type="button" onClick={() => velvetApi.setActivation(merchant.id, { merchantStatus: merchant.status === "active" ? "inactive" : "active" }).then(() => load()).catch((activationError) => setError(activationError.message))}>{merchant.status === "active" ? text.deactivateMerchant : text.activateMerchant}</button>
                  <button type="button" onClick={() => velvetApi.setActivation(merchant.id, { storeStatus: merchant.store_status === "active" ? "inactive" : "active" }).then(() => load()).catch((activationError) => setError(activationError.message))}>{merchant.store_status === "active" ? text.deactivateStore : text.activateStore}</button>
                </td>
              </tr>
            ))} />
          ) : <div className="dropshipping-empty">{text.empty}</div>
        )}

        {section === "catalog" && (
          <>
            <form className="dropshipping-settings" onSubmit={async (event) => {
              event.preventDefault();
              await velvetApi.saveOffer(offer);
              setOffer({ productId: "", sellingUnitPrice: "", merchantUnitPrice: "", cleanImageUrl: "" });
            }}>
              <label>{text.product}<input aria-label="product" value={offer.productId} onChange={(event) => setOffer({ ...offer, productId: event.target.value })} required /></label>
              <label>{text.selling}<input aria-label="selling" value={offer.sellingUnitPrice} onChange={(event) => setOffer({ ...offer, sellingUnitPrice: event.target.value })} required /></label>
              <label>{text.merchantPrice}<input aria-label="merchant" value={offer.merchantUnitPrice} onChange={(event) => setOffer({ ...offer, merchantUnitPrice: event.target.value })} required /></label>
              <label>{text.cleanImage}<input aria-label="clean image" value={offer.cleanImageUrl} onChange={(event) => setOffer({ ...offer, cleanImageUrl: event.target.value })} /></label>
              <button className="primary-action" type="submit">{text.price}</button>
            </form>
            {offersList.length ? (
              <Table headers={[text.product, text.selling, text.merchantPrice, text.profitCol, text.stock]} rows={offersList.map((listed) => (
                <tr key={listed.id}>
                  <td>{listed.product_name}</td>
                  <td>{listed.selling_unit_price}</td>
                  <td>{listed.merchant_unit_price}</td>
                  <td>{listed.profit}</td>
                  <td>{listed.stock_qty}</td>
                </tr>
              ))} />
            ) : <div className="dropshipping-empty">{text.empty}</div>}
          </>
        )}

        {(section === "orders" || section === "fulfillment") && (
          <>
            <form className="dropshipping-settings">
              <label>{text.merchants}
                <select aria-label="merchant" value={merchantFilter} onChange={(event) => { setMerchantFilter(event.target.value); load({ merchantId: event.target.value, storeId: storeFilter }); }}>
                  <option value="" />
                  {merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.store_name}</option>)}
                </select>
              </label>
              <label>{text.store}
                <select aria-label="store" value={storeFilter} onChange={(event) => { setStoreFilter(event.target.value); load({ merchantId: merchantFilter, storeId: event.target.value }); }}>
                  <option value="" />
                  {merchants.map((merchant) => <option key={merchant.store_id} value={merchant.store_id}>{merchant.slug}</option>)}
                </select>
              </label>
            </form>
            {(data.orders || []).length ? (
              <Table headers={["", text.status, text.customer, text.line, ""]} rows={(data.orders || []).map((order) => (
                <tr key={order.id}>
                  <td><span className="admin-data-table-cell-clip" title={order.id}>{order.id}</span></td>
                  <td>{order.status}</td>
                  <td>{order.customer_name}</td>
                  <td><input aria-label="line" value={lineId} onChange={(event) => setLineId(event.target.value)} /></td>
                  <td className="admin-data-table-actions">
                    <button type="button" onClick={() => velvetApi.warehouseMiss(order.id, lineId).then(() => load())}>{text.missing}</button>
                    {nextStatus[order.status] && (
                      <button type="button" onClick={() => velvetApi.fulfill(order.id, nextStatus[order.status]).then(() => load())}>{text.fulfill}</button>
                    )}
                  </td>
                </tr>
              ))} />
            ) : <div className="dropshipping-empty">{text.empty}</div>}
          </>
        )}

        {section === "settlements" && (
          <>
            <form className="dropshipping-settings" onSubmit={async (event) => {
              event.preventDefault();
              try {
                await velvetApi.closeSettlement(thursday);
                await load();
              } catch (closeError) {
                setError(closeError.message);
              }
            }}>
              <label>{text.date}<input aria-label="thursday" value={thursday} onChange={(event) => setThursday(event.target.value)} placeholder="YYYY-MM-DD" /></label>
              <button className="primary-action" type="submit">{text.close}</button>
            </form>
            {(settlements || []).length ? (
              <Table headers={[text.date, text.profit, text.status, ""]} rows={(settlements || []).map((settlement) => (
                <tr key={settlement.id}>
                  <td>{hebronDate(settlement.thursday)}</td>
                  <td>{settlement.total_profit}</td>
                  <td>{settlement.paid_at ? text.paid : text.unpaid}</td>
                  <td className="admin-data-table-actions">
                    {!settlement.paid_at && (
                      <button type="button" onClick={() => velvetApi.paySettlement(settlement.id, "browser-qa").then(() => load()).catch((payError) => setError(payError.message))}>{text.pay}</button>
                    )}
                  </td>
                </tr>
              ))} />
            ) : <div className="dropshipping-empty">{text.empty}</div>}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
