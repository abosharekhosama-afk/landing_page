import { apiBaseUrl, apiRequest, getToken } from "./api.js";
import {
  dropshippingProductUpdatePath,
  normalizeDropshippingProducts,
} from "./dropshippingProducts.js";
const base = "/admin/dropshipping";
export const dropshippingApi = {
  overview: () => apiRequest(`${base}/overview`),
  marketers: () => apiRequest(`${base}/marketers`),
  products: async () =>
    normalizeDropshippingProducts(await apiRequest(`${base}/products`)),
  orders: () => apiRequest(`${base}/orders`),
  earnings: () => apiRequest(`${base}/earnings`),
  withdrawals: () => apiRequest(`${base}/withdrawals`),
  reports: () => apiRequest(`${base}/reports`),
  settings: () => apiRequest(`${base}/settings`),
  action: (path, body = {}) => apiRequest(`${base}${path}`, { method: "POST", body: JSON.stringify(body) }),
  update: (path, body) => apiRequest(`${base}${path}`, { method: "PATCH", body: JSON.stringify(body) }),
  updateProduct: (product, body) =>
    apiRequest(`${base}${dropshippingProductUpdatePath(product)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export async function downloadDropshippingReport() {
  const response = await fetch(`${apiBaseUrl}${base}/reports/export`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error("Report export failed.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "dropshipping-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}
