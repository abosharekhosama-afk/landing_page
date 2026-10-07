import React from "react";
import { velvetApi } from "../../utils/velvetDropshippingApi.js";

const copy = {
  en: { title: "Velvet merchant", register: "Open a store", catalog: "Add product", mine: "My products", remove: "Remove", retry: "Retry image", saveStore: "Save store", orders: "Orders", whatsapp: "WhatsApp buyer", confirm: "Confirm", earnings: "Earnings", statements: "Statements", newOrders: "New orders", confirmedOrders: "Confirmed orders", weekProfit: "Week profit", amountDue: "Amount due", logo: "Logo", replace: "Replace", notifications: "Notifications", markRead: "Mark read" },
  ar: { title: "تاجر فيلفت", register: "فتح متجر", catalog: "إضافة منتج", mine: "منتجاتي", remove: "إزالة", retry: "إعادة الصورة", saveStore: "حفظ المتجر", orders: "الطلبات", whatsapp: "واتساب للمشتري", confirm: "تأكيد", earnings: "الأرباح", statements: "الكشوف", newOrders: "طلبات جديدة", confirmedOrders: "طلبات مؤكدة", weekProfit: "ربح الأسبوع", amountDue: "المبلغ المستحق", logo: "الشعار", replace: "استبدال", notifications: "التنبيهات", markRead: "تمت القراءة" },
};

export default function MerchantVelvetDashboardPage({ language = "en" }) {
  const text = copy[language] || copy.en;
  const [token, setToken] = React.useState(() => localStorage.getItem("velvetMerchantToken") || "");
  const [profile, setProfile] = React.useState(null);
  const [offers, setOffers] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [storeForm, setStoreForm] = React.useState({ name: "", logoUrl: "" });
  const [orders, setOrders] = React.useState([]);
  const [notifications, setNotifications] = React.useState([]);
  const [replacements, setReplacements] = React.useState({});
  const [earnings, setEarnings] = React.useState([]);
  const [statements, setStatements] = React.useState([]);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", storeName: "", logoUrl: "" });
  const [payoutMethod, setPayoutMethod] = React.useState("bank");
  const [error, setError] = React.useState("");

  async function load(nextToken) {
    const [me, catalog, productList, orderList, earningList, statementList, notificationList] = await Promise.all([
      velvetApi.me(nextToken),
      velvetApi.catalog(nextToken),
      velvetApi.products(nextToken),
      velvetApi.orders(nextToken),
      velvetApi.earnings(nextToken),
      velvetApi.settlements(nextToken),
      velvetApi.notifications(nextToken),
    ]);
    setProfile(me);
    setStoreForm({ name: me.store?.name || "", logoUrl: me.store?.logoUrl || "" });
    setOffers(catalog.offers || []);
    setProducts(productList.products || []);
    setOrders(orderList.orders || []);
    setNotifications(notificationList.notifications || []);
    setEarnings(earningList.orders || []);
    setStatements(statementList.settlements || []);
  }

  React.useEffect(() => {
    if (token) load(token).catch((loadError) => setError(loadError.message));
  }, [token]);

  async function register(event) {
    event.preventDefault();
    const created = await velvetApi.register(form);
    localStorage.setItem("velvetMerchantToken", created.token);
    setToken(created.token);
  }

  return (
    <main dir={language === "ar" ? "rtl" : "ltr"}>
      <h1>{text.title}</h1>
      {!token && (
        <form onSubmit={register}>
          <input aria-label="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input aria-label="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <input aria-label="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <input aria-label="store" value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} required />
          <input aria-label={text.logo} value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} />
          <button type="submit">{text.register}</button>
        </form>
      )}
      {profile && <p>{profile.store?.name} / {profile.store?.slug}</p>}
      {profile?.overview && (
        <p>{text.newOrders} {profile.overview.newOrders} {text.confirmedOrders} {profile.overview.confirmedOrders} {text.weekProfit} {profile.overview.weekProfit} {text.amountDue} {profile.overview.amountDue}</p>
      )}
      {profile && (
        <form onSubmit={async (event) => {
          event.preventDefault();
          await velvetApi.updateStore(token, { name: storeForm.name, logoUrl: storeForm.logoUrl });
          await load(token);
        }}>
          <input aria-label="store name" value={storeForm.name} onChange={(event) => setStoreForm({ ...storeForm, name: event.target.value })} />
          <input aria-label={text.logo} value={storeForm.logoUrl} onChange={(event) => setStoreForm({ ...storeForm, logoUrl: event.target.value })} />
          <button type="submit">{text.saveStore}</button>
        </form>
      )}
      {profile && (
        <form onSubmit={async (event) => {
          event.preventDefault();
          await velvetApi.savePayout(token, { payoutMethod });
        }}>
          <select aria-label="payout" value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value)}>
            <option value="bank">bank</option>
            <option value="wallet">wallet</option>
            <option value="direct_handover">direct_handover</option>
          </select>
          <button type="submit">payout</button>
        </form>
      )}
      <section>
        <h2>{text.catalog}</h2>
        {offers.map((offer) => (
          <button key={offer.id} type="button" onClick={() => velvetApi.addProduct(token, offer.id).then(() => load(token))}>
            {offer.product_name} {offer.stock_qty} {offer.selling_unit_price} {offer.merchant_unit_price} {(Number(offer.selling_unit_price) - Number(offer.merchant_unit_price)).toFixed(2)}
          </button>
        ))}
      </section>
      <section>
        <h2>{text.mine}</h2>
        {products.map((product) => (
          <article key={product.id}>
            <p>{product.product_name} {product.image_status} {product.display_url}</p>
            <button type="button" onClick={() => velvetApi.removeProduct(token, product.id).then(() => load(token))}>{text.remove}</button>
            <button type="button" onClick={() => velvetApi.retryImage(token, product.id).then(() => load(token))}>{text.retry}</button>
          </article>
        ))}
      </section>
      <section>
        <h2>{text.orders}</h2>
        {orders.map((order) => (
          <article key={order.id}>
            <p>{order.customer_name} {order.customer_phone} {order.city} {order.address}</p>
            <p>{order.status} {order.merchandise_total}</p>
            {(order.lines || []).map((line) => (
              <p key={line.id}>{line.productName} {line.quantity} {line.lineStatus}</p>
            ))}
            {order.status === "NEEDS_ITEM_RESOLUTION" && (order.lines || []).filter((line) => line.lineStatus === "missing_in_warehouse").map((line) => (
              <div key={`${line.id}-resolve`}>
                <button type="button" onClick={() => velvetApi.resolve(token, order.id, { action: "remove", lineId: line.id }).then(() => load(token)).catch((resolveError) => setError(resolveError.message))}>{text.remove}</button>
                <select aria-label="replacement" value={replacements[line.id] || ""} onChange={(event) => setReplacements({ ...replacements, [line.id]: event.target.value })}>
                  <option value="" />
                  {offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.product_name}</option>)}
                </select>
                <button type="button" onClick={() => velvetApi.resolve(token, order.id, { action: "replace", lineId: line.id, replacementOfferId: replacements[line.id] }).then(() => load(token)).catch((resolveError) => setError(resolveError.message))}>{text.replace}</button>
              </div>
            ))}
            {order.status === "PENDING_MERCHANT_CONFIRMATION" && (
              <>
                <button type="button" onClick={async () => {
                  const link = await velvetApi.whatsapp(token, order.id);
                  window.open(link.url, "_blank", "noopener");
                }}>{text.whatsapp}</button>
                <button type="button" onClick={() => velvetApi.confirm(token, order.id).then(() => load(token)).catch((confirmError) => setError(confirmError.message))}>{text.confirm}</button>
                <button type="button" onClick={() => velvetApi.cancel(token, order.id).then(() => load(token)).catch((cancelError) => setError(cancelError.message))}>Cancel</button>
              </>
            )}
          </article>
        ))}
      </section>
      <section>
        <h2>{text.notifications}</h2>
        {notifications.map((notification) => (
          <article key={notification.id}>
            <p>{notification.message} {notification.read_at ? "" : text.markRead}</p>
            {!notification.read_at && (
              <button type="button" onClick={() => velvetApi.readNotification(token, notification.id).then(() => load(token)).catch((readError) => setError(readError.message))}>{text.markRead}</button>
            )}
          </article>
        ))}
      </section>
      <section>
        <h2>{text.earnings}</h2>
        {earnings.map((row) => (
          <p key={row.orderId}>{row.orderId} {row.sellingTotal} {row.merchantPrice} {row.merchantProfit} {row.paymentState} {row.thursday ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hebron", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(row.thursday)) : ""}</p>
        ))}
      </section>
      <section>
        <h2>{text.statements}</h2>
        {statements.map((statement) => (
          <article key={statement.id}>
            <p>{statement.thursday ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hebron", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(statement.thursday)) : ""} {statement.total} {statement.payoutMethod || ""} {statement.paymentStatus}</p>
            {statement.orders.map((order) => (
              <p key={order.orderId}>{order.orderId} {order.sellingTotal} {order.merchantPrice} {order.profit}</p>
            ))}
          </article>
        ))}
      </section>
      {error && <p>{error}</p>}
    </main>
  );
}
