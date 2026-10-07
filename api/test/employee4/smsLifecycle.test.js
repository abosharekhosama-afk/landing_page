import test from "node:test";
import assert from "node:assert/strict";
import { smsAutomationRepository, smsLogRepository, userRepository } from "../../src/data/store.js";
import { smsRegistry } from "../../src/sms/providers/providerRegistry.js";
import { triggerSmsAutomation } from "../../src/sms/smsAutomationService.js";

const provider = smsRegistry.resolve("mock");
const companyId = `sms-lifecycle-${Date.now()}`;

function automation(trigger, template = "Hi {{customer_name}} {{order_number}}", targetCompanyId = companyId) {
  const item = { id: `${targetCompanyId}-${trigger}-${Date.now()}`, company_id: targetCompanyId, trigger, is_enabled: true, message_template: template, sender: "NOTIFY", recipient: "0599999999", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  smsAutomationRepository.createForCompany(targetCompanyId, item);
  return item;
}

test("SMS lifecycle: enabled automation sends through the provider and logs the event", async () => {
  automation("ORDER_CONFIRMATION");
  const result = await triggerSmsAutomation({ companyId, trigger: "ORDER_CONFIRMATION", eventId: "order-1:confirmed", context: { customer_name: "Customer", order_number: "order-1" } });
  assert.equal(result.sent, true);
  assert.equal(result.logs.length, 1);
  assert.equal(result.logs[0].status, "SENT");
  assert.equal(result.logs[0].related_entity_type, "SMS_AUTOMATION_EVENT");
});

test("SMS lifecycle: duplicate event is suppressed", async () => {
  const result = await triggerSmsAutomation({ companyId, trigger: "ORDER_CONFIRMATION", eventId: "order-1:confirmed", context: { customer_name: "Customer", order_number: "order-1" } });
  assert.equal(result.sent, false);
  assert.equal(result.reason, "DUPLICATE_EVENT");
});

test("SMS lifecycle: disabled automation does not send", async () => {
  const item = automation("ORDER_SHIPPED");
  item.is_enabled = false;
  const result = await triggerSmsAutomation({ companyId, trigger: "ORDER_SHIPPED", eventId: "order-2:shipped", context: { customer_name: "Customer", order_number: "order-2" } });
  assert.equal(result.sent, false);
  assert.equal(result.reason, "DISABLED_OR_MISSING");
});

test("SMS lifecycle: invalid template is rejected before provider send", async () => {
  automation("DELIVERED", "Hello {{unsupported}}");
  const result = await triggerSmsAutomation({ companyId, trigger: "DELIVERED", eventId: "order-3:delivered", context: { customer_name: "Customer", order_number: "order-3" } });
  assert.equal(result.sent, false);
  assert.equal(result.reason, "INVALID_TEMPLATE");
});

test("SMS lifecycle: manager automation resolves active manager recipients", async () => {
  const manager = userRepository.createForCompany(companyId, { id: `${companyId}-manager`, name: "Manager", email: `${companyId}@example.test`, phone: "0598888888", role: "manager", permissions: [], isActive: true });
  assert.equal(manager.globalRole || manager.role, "manager");
  const item = automation("NEW_ORDER_TO_MANAGER", "New {{order_number}} for {{customer_name}} at {{store_name}}");
  item.recipient = "";
  const result = await triggerSmsAutomation({ companyId, trigger: "NEW_ORDER_TO_MANAGER", eventId: "order-4", context: { customer_name: "Customer", order_number: "order-4", store_name: "Store" } });
  assert.equal(result.sent, true);
  assert.equal(result.logs.some((log) => log.recipient === "598888888"), true);
});

test("SMS lifecycle: missing recipient does not call the provider", async () => {
  const item = automation("POS_PURCHASE_CONFIRMATION", "Purchase {{order_number}}");
  item.recipient = "";
  const result = await triggerSmsAutomation({ companyId, trigger: "POS_PURCHASE_CONFIRMATION", eventId: "pos-1", context: { order_number: "pos-1" } });
  assert.equal(result.sent, false);
  assert.equal(result.reason, "NO_RECIPIENT");
  assert.equal(smsLogRepository.findByCompany(companyId, (log) => log.related_entity_id?.endsWith(":pos-1")), null);
});

test("SMS lifecycle: all six trigger contracts can execute", async () => {
  const lifecycleCompanyId = `${companyId}-all-six`;
  const cases = [
    ["ORDER_SHIPPED", "order-5:shipped"],
    ["OUT_FOR_DELIVERY", "order-6:out-for-delivery"],
    ["DELIVERED", "order-7:delivered"],
    ["POS_PURCHASE_CONFIRMATION", "pos-2"],
  ];
  for (const [trigger, eventId] of cases) {
    automation(trigger, "{{customer_name}} {{order_number}} {{store_name}} {{order_status}}", lifecycleCompanyId);
    const result = await triggerSmsAutomation({ companyId: lifecycleCompanyId, trigger, eventId, context: { customer_name: "Customer", order_number: eventId, store_name: "Store", order_status: "Delivered" } });
    assert.equal(result.sent, true, trigger);
  }
});

test("SMS lifecycle: provider failure is recorded without throwing", async () => {
  const failingKey = `employee4-failing-${Date.now()}`;
  smsRegistry.register(failingKey, { async send() { return { success: false, error: "provider rejected request" }; } });
  const previous = process.env.SMS_PROVIDER;
  process.env.SMS_PROVIDER = failingKey;
  try {
    const failingCompanyId = `${companyId}-failure`;
    const item = { id: `${failingCompanyId}-confirmation`, company_id: failingCompanyId, trigger: "ORDER_CONFIRMATION", is_enabled: true, message_template: "Hello {{customer_name}}", sender: "NOTIFY", recipient: "0597777777", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    smsAutomationRepository.createForCompany(failingCompanyId, item);
    const result = await triggerSmsAutomation({ companyId: failingCompanyId, trigger: "ORDER_CONFIRMATION", eventId: "order-failure", context: { customer_name: "Customer" } });
    assert.equal(result.sent, false);
    assert.equal(result.logs[0].status, "FAILED");
  } finally {
    process.env.SMS_PROVIDER = previous;
  }
});
