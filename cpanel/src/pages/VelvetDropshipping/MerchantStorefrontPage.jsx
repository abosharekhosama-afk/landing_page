import React from "react";
import { velvetApi } from "../../utils/velvetDropshippingApi.js";

const copy = {
  en: { missing: "This store is not available.", closed: "Checkout is closed.", add: "Add", unavailable: "Unavailable", checkout: "Place order", name: "Name", phone: "Phone", city: "City", address: "Address" },
  ar: { missing: "هذا المتجر غير متاح.", closed: "الطلب مغلق.", add: "إضافة", unavailable: "غير متاح", checkout: "إرسال الطلب", name: "الاسم", phone: "الهاتف", city: "المدينة", address: "العنوان" },
};

export default function MerchantStorefrontPage({ slug, language = "en" }) {
  const text = copy[language] || copy.en;
  const [store, setStore] = React.useState(null);
  const [error, setError] = React.useState("");
  const [cart, setCart] = React.useState([]);
  const [form, setForm] = React.useState({ customerName: "", customerPhone: "", city: "", address: "" });

  React.useEffect(() => {
    velvetApi.store(slug).then(setStore).catch(() => setError(text.missing));
  }, [slug, text.missing]);

  const grouped = React.useMemo(() => {
    const groups = new Map();
    for (const product of store?.products || []) {
      const category = product.category || "";
      groups.set(category, [...(groups.get(category) || []), product]);
    }
    return [...groups.entries()];
  }, [store]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await velvetApi.checkout(slug, { ...form, items: cart }, crypto.randomUUID());
      setCart([]);
    } catch (checkoutError) {
      setError(checkoutError.message);
    }
  }

  if (!store) return <main dir={language === "ar" ? "rtl" : "ltr"}><p>{error || "..."}</p></main>;
  return (
    <main dir={language === "ar" ? "rtl" : "ltr"}>
      <h1>{store.store.name}</h1>
      {store.store.logoUrl ? <img alt="" src={store.store.logoUrl} /> : null}
      {!store.checkoutEnabled && <p>{text.closed}</p>}
      {grouped.map(([category, products]) => (
        <section key={category || "products"}>
          {category ? <h2>{category}</h2> : null}
          {products.map((product) => (
            <article key={product.selection_id}>
              <img alt="" src={product.image_url} />
              <h3>{product.name}</h3>
              <p>{product.selling_unit_price} {product.stock_qty}</p>
              {store.checkoutEnabled && Number(product.stock_qty) > 0 && (
                <button type="button" onClick={() => setCart((current) => [...current, { offerId: product.offer_id, quantity: 1 }])}>{text.add}</button>
              )}
              {Number(product.stock_qty) <= 0 && <p>{text.unavailable}</p>}
            </article>
          ))}
        </section>
      ))}
      {store.checkoutEnabled && (
        <form onSubmit={submit}>
          <input aria-label={text.name} value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} required />
          <input aria-label={text.phone} value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} required />
          <input aria-label={text.city} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
          <input aria-label={text.address} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required />
          <button type="submit">{text.checkout}</button>
        </form>
      )}
      {error && <p>{error}</p>}
    </main>
  );
}
