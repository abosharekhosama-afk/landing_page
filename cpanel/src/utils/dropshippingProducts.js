const objectOrEmpty = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

export function normalizeDropshippingProduct(value) {
  const row = objectOrEmpty(value);
  const product = objectOrEmpty(row.product);
  const nestedConfigurationKey = [
    "dropshipping_product",
    "dropshippingProduct",
    "dropshipping",
    "configuration",
    "config",
  ].find((key) => Object.prototype.hasOwnProperty.call(row, key));
  const hasNestedConfiguration = nestedConfigurationKey !== undefined;
  const nestedConfiguration = hasNestedConfiguration
    ? row[nestedConfigurationKey]
    : undefined;
  const configuration = objectOrEmpty(nestedConfiguration);
  const flatConfiguration = hasNestedConfiguration ? {} : row;

  return {
    product_id: firstDefined(product.id, row.product_id, row.productId) ?? null,
    id:
      firstDefined(
        configuration.id,
        row.dropshipping_product_id,
        row.dropshippingProductId,
        row.configuration_id,
        row.configurationId,
        row.config_id,
        row.configId,
        flatConfiguration.id,
      ) ?? null,
    company_id:
      firstDefined(
        configuration.company_id,
        configuration.companyId,
        flatConfiguration.company_id,
        flatConfiguration.companyId,
      ) ?? null,
    enabled: Boolean(
      firstDefined(configuration.enabled, flatConfiguration.enabled, false),
    ),
    dropshipping_price:
      firstDefined(
        configuration.dropshipping_price,
        configuration.dropshippingPrice,
        flatConfiguration.dropshipping_price,
        flatConfiguration.dropshippingPrice,
      ) ?? null,
    suggested_selling_price:
      firstDefined(
        configuration.suggested_selling_price,
        configuration.suggestedSellingPrice,
        flatConfiguration.suggested_selling_price,
        flatConfiguration.suggestedSellingPrice,
      ) ?? null,
    minimum_selling_price:
      firstDefined(
        configuration.minimum_selling_price,
        configuration.minimumSellingPrice,
        flatConfiguration.minimum_selling_price,
        flatConfiguration.minimumSellingPrice,
      ) ?? null,
    maximum_selling_price:
      firstDefined(
        configuration.maximum_selling_price,
        configuration.maximumSellingPrice,
        flatConfiguration.maximum_selling_price,
        flatConfiguration.maximumSellingPrice,
      ) ?? null,
    marketer_fee:
      firstDefined(
        configuration.marketer_fee,
        configuration.marketerFee,
        flatConfiguration.marketer_fee,
        flatConfiguration.marketerFee,
      ) ?? null,
    fixed_fee:
      firstDefined(
        configuration.fixed_fee,
        configuration.fixedFee,
        flatConfiguration.fixed_fee,
        flatConfiguration.fixedFee,
      ) ?? null,
    percentage_fee:
      firstDefined(
        configuration.percentage_fee,
        configuration.percentageFee,
        flatConfiguration.percentage_fee,
        flatConfiguration.percentageFee,
      ) ?? null,
    available_stock:
      firstDefined(
        configuration.available_stock,
        configuration.availableStock,
        flatConfiguration.available_stock,
        flatConfiguration.availableStock,
      ) ?? null,
    name: firstDefined(product.name, row.name) ?? "",
    slug: firstDefined(product.slug, row.slug) ?? "",
    stock_qty:
      firstDefined(
        product.stock_qty,
        product.stockQty,
        product.stock_quantity,
        product.stockQuantity,
        row.stock_qty,
        row.stockQty,
        row.stock_quantity,
        row.stockQuantity,
      ) ?? null,
    is_active: Boolean(
      firstDefined(
        product.is_active,
        product.isActive,
        product.active,
        row.is_active,
        row.isActive,
        row.active,
        false,
      ),
    ),
  };
}

export function normalizeDropshippingProducts(response) {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.products)
      ? response.products
      : Array.isArray(response?.data)
        ? response.data
        : [];
  return rows.map(normalizeDropshippingProduct);
}

export function dropshippingProductUpdatePath(product) {
  const productId = normalizeDropshippingProduct(product).product_id;
  if (productId === null || productId === "") {
    throw new Error("Catalog product ID is required.");
  }
  return `/products/${encodeURIComponent(String(productId))}`;
}
