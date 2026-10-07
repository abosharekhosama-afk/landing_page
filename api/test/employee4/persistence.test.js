import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";

const COMPANY_A = `persist-a-${Date.now()}`;
const COMPANY_B = `persist-b-${Date.now()}`;

function createFakeDb(tableNames) {
  const tables = Object.fromEntries(tableNames.map((t) => [t, []]));
  return {
    upsertRows: async (table, rows, conflictColumn = "id") => {
      const data = tables[table] || [];
      for (const row of rows) {
        const idx = data.findIndex((r) => r[conflictColumn] === row[conflictColumn]);
        if (idx >= 0) data[idx] = row; else data.push(row);
      }
    },
    deleteCompanyRows: async (table, ids) => {
      const col = tables[table] || [];
      const idSet = new Set(ids.map(String));
      tables[table] = col.filter((r) => !idSet.has(String(r.id)));
    },
    selectAllRows: async (table) =>
      tables[table] ? tables[table].map((r) => ({ ...r })) : [],
    _tables: tables,
  };
}

const ALL_TABLES = [
  "companies", "company_domains", "company_settings", "company_memberships",
  "users", "products", "product_variants", "product_gallery_images",
  "orders", "order_items", "carts", "homepage_offers", "homepage_category_cards",
  "company_categories", "company_brands", "reviews", "work_sessions",
  "website_media", "company_website_media_hidden_keys", "company_website_texts",
  "custom_admin_modules", "custom_admin_module_entries", "company_product_schemas",
  "company_invoices", "company_delivery_zones", "company_activity_logs",
  "company_search_events", "company_search_redirects", "company_visitor_sessions",
  "company_visitor_events", "company_inbox_conversations", "company_inbox_messages",
  "company_inbox_reads",
  "company_sms_logs", "company_sms_automations", "company_announcements",
  "company_splash_ads", "company_splash_ad_events", "company_store_policies",
  "company_legal_information", "company_login_history", "company_login_security",
  "company_ip_blocks",
];

const {
  setCompanyPersistenceDependenciesForTest,
  setPlatformLoadDependenciesForTest,
} = await import("../../src/data/postgresStore.js");

async function freshStoreInstance(flushParam) {
  return import(`../../src/data/store.js?fresh=${flushParam}`);
}

const NOW = "2026-09-02T10:00:00.000Z";

await test("Employee 4 collections survive persistence + module re-import", async () => {
  const db = createFakeDb(ALL_TABLES);
  db._tables.companies.push({
    id: COMPANY_A, slug: COMPANY_A, name: "Test A Co",
    status: "active", is_default: true,
  });
  db._tables.companies.push({
    id: COMPANY_B, slug: COMPANY_B, name: "Test B Co",
    status: "active", is_default: false,
  });

  const previousDb = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://fake@fake-host.test/employee4-persist";

    setCompanyPersistenceDependenciesForTest({
    saveTenantRows: async (table, rows) =>
      db.upsertRows(table, rows),
    pruneTenantRows: async (table, ids) =>
      db.deleteCompanyRows(table, ids),
  });
  setPlatformLoadDependenciesForTest({
    selectAllRows: async (table) => db.selectAllRows(table),
  });

  try {
    const store = await freshStoreInstance(Date.now());

    // 1. SMS log
    const smsLogId = crypto.randomUUID();
    store.smsLogRepository.createForCompany(COMPANY_A, {
      id: smsLogId, recipient: "+15551234567", sender: "NOTIFY",
      message: "Order confirmed #12345", status: "SENT", provider: "mock",
      provider_reference: "ref-001", cost: 0.05, currency: "USD",
      related_entity_type: "order", related_entity_id: "order-12345",
      error_message: null, created_at: NOW, sent_at: NOW,
    });

    // 2. SMS automation
    const smsAutoId = crypto.randomUUID();
    store.smsAutomationRepository.createForCompany(COMPANY_A, {
      id: smsAutoId, trigger: "ORDER_CONFIRMATION", is_enabled: true,
      message_template: "Your order {{order_number}} is confirmed.",
      sender: "NOTIFY", recipient: "+15550000000", created_at: NOW, updated_at: NOW,
    });

    // 3. Announcement
    const announcementId = crypto.randomUUID();
    store.announcementRepository.createForCompany(COMPANY_A, {
      id: announcementId, title: "New Store Hours", text: "We are now open 24/7.",
      link: "https://example.com", text_color: "#ffffff", background_color: "#007bff",
      alignment: "CENTER", is_active: true, priority: 5, placement: "ALL_PAGES",
      selected_pages: [], start_date: NOW, end_date: null,
      created_at: NOW, updated_at: NOW,
    });

    // 4. Splash ad
    const splashAdId = crypto.randomUUID();
    store.splashAdRepository.createForCompany(COMPANY_A, {
      id: splashAdId, title: "Summer Sale",
      desktop_image_id: "img-desktop-1", mobile_image_id: "img-mobile-1",
      link: "https://example.com/summer", is_active: true, start_date: NOW,
      end_date: null, close_delay_seconds: 2, display_duration_seconds: 5,
      frequency: "ONCE_PER_SESSION", excluded_pages: [],
      created_at: NOW, updated_at: NOW,
    });

    // 5. Splash ad event
    const eventId = crypto.randomUUID();
    store.splashAdEventRepository.createForCompany(COMPANY_A, {
      id: eventId, splash_ad_id: splashAdId,
      event_type: "VIEW", created_at: NOW,
    });

    // 6. Store policy
    const policyId = crypto.randomUUID();
    store.storePolicyRepository.createForCompany(COMPANY_A, {
      id: policyId, type: "SHIPPING", title_ar: "شحن", title_en: "Shipping",
      content_ar: "محتوى الشحن", content_en: "Shipping content",
      is_active: true, display_order: 1, placements: ["STORE"],
      created_at: NOW, updated_at: NOW,
    });

    // 7. Legal information
    store.legalInformationRepository.createForCompany(COMPANY_A, {
      id: "legal-" + COMPANY_A, registration_number: "REG-123",
      authority_name: "Ministry of Commerce", authority_logo_media_id: "logo-1",
      business_information: { name: "Test A Co", country: "US" },
            placements: ["FOOTER"], created_at: NOW, updated_at: NOW,
    });

    // 8. Login history
    const loginEventId = crypto.randomUUID();
    store.loginHistoryRepository.createForCompany(COMPANY_A, {
      id: loginEventId, user_id: "user-123", email: "admin@testa.com",
      status: "SUCCESS", ip_address: "192.168.1.1", user_agent: "Mozilla/5.0",
      browser: "Chrome", device: "Desktop", authentication_method: "PASSWORD",
      failure_reason: "", created_at: NOW,
    });

    // 9. Login security
    store.loginSecurityRepository.createForCompany(COMPANY_A, {
      id: "sec-" + COMPANY_A, email: "admin@testa.com",
      failed_attempts: 3, last_failed_at: NOW, locked_until: null,
    });

    // 10. IP block
    const ipBlockId = crypto.randomUUID();
    store.ipBlockRepository.createForCompany(COMPANY_A, {
      id: ipBlockId, ip_address: "10.0.0.1", block_type: "MANUAL",
      reason: "Malicious activity", is_active: true,
      created_at: NOW, expires_at: null, unblocked_at: null, unblocked_by: null,
    });

    // 11. Announcement update (test update path)
    store.announcementRepository.updateForCompany(
      COMPANY_A, announcementId,
      { text: "Updated text", updated_at: NOW },
    );

        // Persist company A
    await store.persistCompanyStore(COMPANY_A);

    // Company B (tenant isolation)
    store.smsLogRepository.createForCompany(COMPANY_B, {
      id: crypto.randomUUID(), recipient: "+15559999999", sender: "NOTIFY",
      message: "Company B order confirmed", status: "SENT", provider: "mock",
      provider_reference: "ref-b-001", cost: 0.03, currency: "USD",
      related_entity_type: "", related_entity_id: "", error_message: null,
      created_at: NOW, sent_at: NOW,
    });
            await store.persistCompanyStore(COMPANY_B);

    // Phase 3: Simulate restart — re-import store, reload from fake DB
    setCompanyPersistenceDependenciesForTest(null);
    const restartedStore = await freshStoreInstance("restart-" + Date.now());

    // Phase 4: Verify company A data survived restart
    assert.equal(restartedStore.smsLogRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.smsLogRepository.getByCompany(COMPANY_A)[0].recipient, "+15551234567");
    assert.equal(restartedStore.smsLogRepository.getByCompany(COMPANY_A)[0].cost, 0.05);

    assert.equal(restartedStore.smsAutomationRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.smsAutomationRepository.getByCompany(COMPANY_A)[0].trigger, "ORDER_CONFIRMATION");

    assert.equal(restartedStore.announcementRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.announcementRepository.getByCompany(COMPANY_A)[0].title, "New Store Hours");
    assert.equal(restartedStore.announcementRepository.getByCompany(COMPANY_A)[0].text, "Updated text");

    assert.equal(restartedStore.splashAdRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.splashAdRepository.getByCompany(COMPANY_A)[0].title, "Summer Sale");

    assert.equal(restartedStore.splashAdEventRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.splashAdEventRepository.getByCompany(COMPANY_A)[0].splash_ad_id, splashAdId);
    assert.equal(restartedStore.splashAdEventRepository.getByCompany(COMPANY_A)[0].event_type, "VIEW");

    assert.equal(restartedStore.storePolicyRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.storePolicyRepository.getByCompany(COMPANY_A)[0].title_en, "Shipping");

    assert.equal(restartedStore.legalInformationRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.legalInformationRepository.getByCompany(COMPANY_A)[0].registration_number, "REG-123");

    assert.equal(restartedStore.loginHistoryRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.loginHistoryRepository.getByCompany(COMPANY_A)[0].ip_address, "192.168.1.1");
    assert.equal(restartedStore.loginHistoryRepository.getByCompany(COMPANY_A)[0].browser, "Chrome");
    assert.equal(restartedStore.loginHistoryRepository.getByCompany(COMPANY_A)[0].device, "Desktop");

    assert.equal(restartedStore.loginSecurityRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.loginSecurityRepository.getByCompany(COMPANY_A)[0].failed_attempts, 3);

    assert.equal(restartedStore.ipBlockRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.ipBlockRepository.getByCompany(COMPANY_A)[0].ip_address, "10.0.0.1");
    assert.equal(restartedStore.ipBlockRepository.getByCompany(COMPANY_A)[0].block_type, "MANUAL");

    // Phase 5: Tenant isolation
    assert.equal(restartedStore.smsLogRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.smsLogRepository.getByCompany(COMPANY_B).length, 1);
    assert.equal(restartedStore.smsLogRepository.getByCompany(COMPANY_A)[0].recipient, "+15551234567");
    assert.equal(restartedStore.smsLogRepository.getByCompany(COMPANY_B)[0].recipient, "+15559999999");

    // Phase 6: IDs stable, timestamps preserved
    assert.equal(restartedStore.splashAdRepository.getByCompany(COMPANY_A)[0].id, splashAdId);
    assert.equal(restartedStore.ipBlockRepository.getByCompany(COMPANY_A)[0].id, ipBlockId);
    assert.equal(restartedStore.storePolicyRepository.getByCompany(COMPANY_A)[0].id, policyId);
    assert.equal(restartedStore.storePolicyRepository.getByCompany(COMPANY_A)[0].created_at, NOW);
    assert.equal(restartedStore.storePolicyRepository.getByCompany(COMPANY_A)[0].updated_at, NOW);

    // Cross-company access rejection
    assert.equal(restartedStore.ipBlockRepository.getByCompany(COMPANY_B).length, 0);
    assert.equal(restartedStore.legalInformationRepository.getByCompany(COMPANY_B).length, 0);

    // Cross-company UPDATE is rejected: Company B cannot modify Company A's splash ad
    const crossUpdate = restartedStore.splashAdRepository.updateForCompany(
      COMPANY_B, splashAdId, { title: "Hijacked by B" },
    );
    assert.equal(crossUpdate, null, "cross-company update must be rejected");
    assert.equal(restartedStore.splashAdRepository.getByCompany(COMPANY_A)[0].title, "Summer Sale");

    // Cross-company DELETE is rejected: Company B cannot remove Company A's IP block
    const crossDelete = restartedStore.ipBlockRepository.deleteForCompany(COMPANY_B, ipBlockId);
    assert.equal(crossDelete, null, "cross-company delete must be rejected");
    assert.equal(restartedStore.ipBlockRepository.getByCompany(COMPANY_A).length, 1);
    assert.equal(restartedStore.ipBlockRepository.getByCompany(COMPANY_A)[0].id, ipBlockId);

    // Cross-company read by id lookup is rejected
    assert.equal(
      restartedStore.storePolicyRepository.findByCompany(COMPANY_B, policyId),
      null,
      "cross-company findByCompany must return null",
    );
  } finally {
    setCompanyPersistenceDependenciesForTest(null);
    setPlatformLoadDependenciesForTest(null);
    process.env.DATABASE_URL = previousDb;
  }
});

await test("Employee 4 collections load as empty arrays when table has no records", async () => {
  const db = createFakeDb(ALL_TABLES);
  db._tables.companies.push({
    id: "empty-co", slug: "empty-co", name: "Empty Co",
    status: "active", is_default: true,
  });

  const previousDb = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://fake@fake-host.test/empty-company";

  setPlatformLoadDependenciesForTest({
    selectAllRows: async (table) => db.selectAllRows(table),
  });

  try {
    const store = await freshStoreInstance("empty-" + Date.now());

    assert.equal(store.smsLogRepository.getByCompany("empty-co").length, 0);
    assert.equal(store.smsAutomationRepository.getByCompany("empty-co").length, 0);
    assert.equal(store.announcementRepository.getByCompany("empty-co").length, 0);
    assert.equal(store.splashAdRepository.getByCompany("empty-co").length, 0);
    assert.equal(store.splashAdEventRepository.getByCompany("empty-co").length, 0);
    assert.equal(store.storePolicyRepository.getByCompany("empty-co").length, 0);
    assert.equal(store.legalInformationRepository.getByCompany("empty-co").length, 0);
    assert.equal(store.loginHistoryRepository.getByCompany("empty-co").length, 0);
    assert.equal(store.loginSecurityRepository.getByCompany("empty-co").length, 0);
    assert.equal(store.ipBlockRepository.getByCompany("empty-co").length, 0);
  } finally {
    setPlatformLoadDependenciesForTest(null);
    process.env.DATABASE_URL = previousDb;
  }
});
