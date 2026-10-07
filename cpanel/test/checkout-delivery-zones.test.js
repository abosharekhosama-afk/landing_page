import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  availableDeliveryZones,
  deliveryZoneSelectionPayload,
} from "../src/utils/deliveryZonesUi.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("public delivery zones API client targets the storefront endpoint", () => {
  const api = read("src/utils/deliveryZonesApi.js");
  assert.match(api, /fetchPublicDeliveryZones/);
  assert.match(api, /apiRequest\("\/delivery-zones"\)/);
});

test("checkout loads real public zones, not fake or hardcoded ones", () => {
  const page = read("src/pages/CheckoutPage.jsx");
  assert.match(page, /fetchPublicDeliveryZones/);
  assert.match(page, /availableDeliveryZones\(zones\)/);
  assert.match(page, /setDeliveryZonesState\(available\.length \? "ready" : "empty"\)/);
  assert.doesNotMatch(page, /localStorage|fake zone|mock delivery|demo zone|zone-id-hardcoded/i);
});

test("checkout renders a zone select and keeps a free-text fallback", () => {
  const page = read("src/pages/CheckoutPage.jsx");
  assert.match(page, /useZoneSelect \? \(/);
  assert.match(page, /className="checkout-select"/);
  assert.match(page, /name="city"/);
  assert.match(page, /deliveryZones\.map\(\(zone\) =>/);
  assert.match(page, /value=\{zone\.id\}/);
  assert.match(page, /deliveryZonesState === "error"/);
  assert.match(page, /deliveryZonesState === "loading"/);
  assert.match(page, /deliveryZonesState === "error"/);
  assert.match(page, /deliveryZonesRetryToken/);
  assert.match(page, /deliveryZonesState === "empty"/);
  assert.match(page, /t\("checkout\.deliveryZoneHint"\)/);
});

test("checkout submit forwards the selected delivery zone id to the order", () => {
  const page = read("src/pages/CheckoutPage.jsx");
  assert.match(page, /deliveryZoneSelectionPayload\(submittedForm, useZoneSelect \? selectedZone : null\)/);
  assert.match(page, /delivery_zone_id: useZoneSelect \? zonePayload\.delivery_zone_id : undefined/);
  assert.match(page, /delivery_city_key: useZoneSelect \? zonePayload\.delivery_city_key : undefined/);
  assert.match(page, /submittedForm\.city = zonePayload\.city/);
  assert.match(page, /deliveryZonesState === "loading"/);
  assert.match(page, /deliveryZonesState === "error"/);
});

test("order client passes delivery zone fields into the POST body", () => {
  const orders = read("src/utils/orders.js");
  assert.match(orders, /delivery_zone_id,/);
  assert.match(orders, /delivery_city_key,/);
  assert.match(orders, /delivery_zone_id: delivery_zone_id \|\| undefined/);
  assert.match(orders, /delivery_city_key: delivery_city_key \|\| undefined/);
  assert.match(orders, /apiRequest\("\/orders"/);
});

test("App wires checkout delivery zone options through createOrder", () => {
  const app = read("src/App.jsx");
  assert.match(app, /delivery_zone_id: options\.delivery_zone_id/);
  assert.match(app, /delivery_city_key: options\.delivery_city_key/);
});

test("availableDeliveryZones keeps enabled zones ordered by display_order then name", () => {
  const zones = availableDeliveryZones([
    { id: "z1", city_name: "Hebron", enabled: false, display_order: 0 },
    { id: "z2", city_name: "Ramallah", enabled: true, display_order: 2 },
    { id: "z3", city_name: "Nablus", enabled: true, display_order: 1 },
  ]);
  assert.deepEqual(zones.map((zone) => zone.city_name), ["Nablus", "Ramallah"]);
  assert.deepEqual(availableDeliveryZones(null), []);
  assert.deepEqual(availableDeliveryZones("nope"), []);
});

test("deliveryZoneSelectionPayload maps a zone and keeps free-text city as fallback", () => {
  const zone = { id: "abc-123", city_key: "ramallah", city_name: "Ramallah", region: "West Bank" };
  assert.deepEqual(
    deliveryZoneSelectionPayload({ city: "Old City" }, zone),
    { city: "Ramallah", delivery_zone_id: "abc-123", delivery_city_key: "ramallah" },
  );
  assert.deepEqual(
    deliveryZoneSelectionPayload({ city: "Old City" }, null),
    { city: "Old City", delivery_zone_id: "", delivery_city_key: "" },
  );
  assert.deepEqual(
    deliveryZoneSelectionPayload({ city: "" }, { id: "z", city_key: "nablus", city_name: "Nablus" }),
    { city: "Nablus", delivery_zone_id: "z", delivery_city_key: "nablus" },
  );
});

test("checkout delivery zone copy is provided in both AR and EN", () => {
  const translations = read("src/data/translations.js");
  assert.match(translations, /citySelectPlaceholder: "Select your city \/ area"/);
  assert.match(translations, /deliveryZoneHint: "Delivery fees are confirmed when we process your order\."/);
  assert.match(translations, /deliveryZonesLoading: "Loading delivery areas…"/);
  assert.match(translations, /deliveryZonesError: "Unable to load delivery areas/);
  assert.match(translations, /deliveryZonesRetry: "Retry delivery areas"/);
  assert.match(translations, /deliveryZoneSelectionRequired: "Please select a delivery area\."/);
  assert.match(translations, /deliveryFee: "Delivery fee"/);
  assert.match(translations, /citySelectPlaceholder: "اختر مدينتك \/ منطقتك"/);
  assert.match(translations, /deliveryZonesError: "تعذر تحميل مناطق التوصيل/);
  assert.match(translations, /deliveryZonesRetry: "إعادة تحميل مناطق التوصيل"/);
  assert.match(translations, /deliveryZoneSelectionRequired: "يرجى اختيار منطقة التوصيل\."/);
  assert.match(translations, /deliveryFee: "رسوم التوصيل"/);
});

test("checkout delivery zone styles are present and minimal", () => {
  const css = read("src/styles/global.css");
  assert.ok(css.includes(".checkout-select {"));
  assert.ok(css.includes(".checkout-select:focus {"));
  assert.ok(css.includes(".field-hint"));
});