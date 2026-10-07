export const SMS_TEMPLATE_VARIABLES = Object.freeze({
  ORDER_CONFIRMATION: ["customer_name", "order_number", "order_total", "store_name", "order_status"],
  ORDER_SHIPPED: ["customer_name", "order_number", "tracking_link", "store_name", "order_status"],
  OUT_FOR_DELIVERY: ["customer_name", "order_number", "tracking_link", "store_name", "order_status"],
  DELIVERED: ["customer_name", "order_number", "store_name", "order_status"],
  NEW_ORDER_TO_MANAGER: ["order_number", "order_total", "customer_name", "store_name", "order_status"],
  POS_PURCHASE_CONFIRMATION: ["customer_name", "order_number", "order_total", "store_name", "order_status"],
});

const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function extractTemplateVariables(template = "") {
  return [...String(template).matchAll(VARIABLE_PATTERN)].map((match) => match[1]);
}

export function validateTemplate(trigger, template) {
  const source = String(template ?? "");
  const allowed = new Set(SMS_TEMPLATE_VARIABLES[trigger] || []);
  const variables = extractTemplateVariables(source);
  const unsupported = variables.filter((variable) => !allowed.has(variable));

  // A template containing a brace sequence that is not a valid {{name}}
  // expression is malformed and must not silently render as plain text.
  const withoutValidVariables = source.replace(VARIABLE_PATTERN, "");
  const malformed = withoutValidVariables.match(/{{|}}/g) || [];

  return {
    valid: Boolean(SMS_TEMPLATE_VARIABLES[trigger]) && unsupported.length === 0 && malformed.length === 0,
    variables: [...new Set(variables)],
    unsupported: [...new Set(unsupported)],
    malformed: malformed.length > 0,
    error: malformed.length ? "Malformed template variable syntax." : null,
  };
}

export function renderTemplate(template, context = {}) {
  return String(template).replace(VARIABLE_PATTERN, (_match, key) =>
    context[key] == null ? "" : String(context[key]),
  );
}
