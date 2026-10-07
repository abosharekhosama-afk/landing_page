import {
  DEFAULT_COMPANY_ID,
  companyStoragePath,
  normalizeCompanyId,
} from "../tenancy/company.js";

const SUPABASE_REST_TIMEOUT_MS = 15000;

function supabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "") || "";
}

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && serviceRoleKey());
}

export function isSupabaseStorageConfigured() {
  return Boolean(isSupabaseConfigured() && process.env.SUPABASE_BUCKET);
}

function encodeStoragePath(storagePath) {
  return storagePath.split("/").map(encodeURIComponent).join("/");
}

async function supabaseFetch(pathname, options = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_REST_TIMEOUT_MS);
  const headers = {
    apikey: serviceRoleKey(),
    Authorization: `Bearer ${serviceRoleKey()}`,
    ...options.headers,
  };

  try {
    const response = await fetch(`${supabaseUrl()}${pathname}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const detail = body?.message || body?.error || text || response.statusText;
      throw new Error(`Supabase request failed (${response.status}): ${detail}`);
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function selectAll(table, query = "select=*") {
  return supabaseFetch(`/rest/v1/${table}?${query}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
}

async function upsertRows(table, rows, conflictColumn = "id") {
  if (!rows.length) return;
  await supabaseFetch(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictColumn)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
}

async function insertRowsIfMissing(table, rows, conflictColumn = "id") {
  if (!rows.length) return;
  await supabaseFetch(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictColumn)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
}

function companyQuery(companyId, select = "*") {
  const company = normalizeCompanyId(companyId);
  const normalized = encodeURIComponent(company);
  return company === DEFAULT_COMPANY_ID
    ? `select=${select}&or=(company_id.eq.${normalized},company_id.is.null)`
    : `select=${select}&company_id=eq.${normalized}`;
}

function companyMutationFilter(companyId) {
  const company = normalizeCompanyId(companyId);
  const normalized = encodeURIComponent(company);
  return company === DEFAULT_COMPANY_ID
    ? `or=(company_id.eq.${normalized},company_id.is.null)`
    : `company_id=eq.${normalized}`;
}

async function selectCompanyRows(table, companyId, select = "*") {
  return selectAll(table, companyQuery(companyId, select));
}

async function deleteCompanyRow(table, id, companyId) {
  await supabaseFetch(
    `/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&${companyMutationFilter(companyId)}`,
    {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
    },
  );
}

async function deleteMissingCompanyRows(table, currentIds, companyId) {
  const existing = await selectCompanyRows(table, companyId, "id,company_id");
  const keep = new Set(currentIds);
  const staleIds = existing.map((row) => row.id).filter((id) => !keep.has(id));
  for (const id of staleIds) {
    await deleteCompanyRow(table, id, companyId);
  }
}

async function assertNoCrossCompanyConflicts(table, rows, companyId) {
  if (!rows.length) return;
  const normalized = normalizeCompanyId(companyId);
  const incomingIds = new Set(rows.map((row) => row.id));
  const existing = await selectAll(table, "select=id,company_id");
  const conflict = existing.find(
    (row) => incomingIds.has(row.id) && normalizeCompanyId(row.company_id) !== normalized,
  );
  if (conflict) {
    throw new Error(
      `Tenant isolation prevented ${table} row ${conflict.id} from being overwritten by ${normalized}.`,
    );
  }
}

async function upsertCompanyRows(table, rows, companyId) {
  await assertNoCrossCompanyConflicts(table, rows, companyId);
  await upsertRows(table, rows);
}

function rowDate(value) {
  return value || new Date().toISOString();
}

function uniqueRowId(baseId, usedIds) {
  let candidate = baseId;
  let suffix = 1;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function ensureUniqueRowIds(rows, fallbackIdForRow) {
  const usedIds = new Set();

  return rows.map((row, index) => {
    const preferredId = row.id ? String(row.id) : "";
    const fallbackId = fallbackIdForRow(row, index);
    const needsFallback = !preferredId || usedIds.has(preferredId);
    const id = uniqueRowId(needsFallback ? fallbackId : preferredId, usedIds);

    return {
      ...row,
      id,
      data: row.data
        ? {
            ...row.data,
            id,
          }
        : row.data,
    };
  });
}

function productRow(product, companyId) {
  const firstVariant = Array.isArray(product.variants) ? product.variants[0] : null;
  return {
    id: product.id,
    company_id: normalizeCompanyId(companyId),
    slug: product.slug || product.id,
    name: typeof product.name === "object" ? product.name?.en || product.id : product.name || product.id,
    name_ar: typeof product.name === "object" ? product.name?.ar || "" : product.nameAr || product.name_ar || "",
    category: typeof product.category === "object" ? product.category?.en || "" : product.category || "",
    category_ar: typeof product.category === "object" ? product.category?.ar || "" : product.categoryAr || product.category_ar || "",
    brand: product.brand || "EB Chemical",
    image_url: product.image || "",
    hover_image_url: product.hoverImage || product.secondaryImage || "",
    price: Number(firstVariant?.price || product.price || product.sizes?.[0]?.price || 0),
    stock_qty: Number(firstVariant?.stock ?? product.stockQty ?? 0),
    is_active: product.isActive !== false,
    is_featured: Boolean(product.isFeatured || product.featured),
    data: product,
    created_at: rowDate(product.createdAt),
    updated_at: rowDate(product.updatedAt),
  };
}

function variantRows(product, companyId) {
  const rows = (product.variants || []).map((variant, index) => ({
    id: variant.id || `${product.id}-variant-${index}`,
    company_id: normalizeCompanyId(companyId),
    product_id: product.id,
    color_name: variant.color_name || variant.colorName || "Default",
    color_value: variant.color_value || variant.colorValue || variant.colorHex || "",
    size: variant.size || "",
    price: Number(variant.price || 0),
    stock: Number(variant.stock ?? 0),
    image_url: variant.image_url || variant.imageUrl || variant.image || "",
    sort_order: Number(variant.sort_order ?? variant.sortOrder ?? index),
    data: variant,
    created_at: rowDate(variant.createdAt),
    updated_at: rowDate(variant.updatedAt),
  }));

  return ensureUniqueRowIds(rows, (row, index) => `${row.product_id}-variant-${index}`);
}

function galleryRows(product, companyId) {
  const source = product.gallery_images || product.galleryImages || [];
  const rows = source
    .map((entry, index) => {
      const imageUrl = typeof entry === "string" ? entry : entry?.image_url || entry?.image || entry?.url;
      if (!imageUrl) return null;
      return {
        id: typeof entry === "object" && entry?.id ? entry.id : `${product.id}-gallery-${index}`,
        company_id: normalizeCompanyId(companyId),
        product_id: product.id,
        image_url: imageUrl,
        sort_order: Number(typeof entry === "object" ? entry?.sort_order ?? entry?.sortOrder ?? index : index),
        data: typeof entry === "object" ? entry : { image_url: imageUrl },
        created_at: rowDate(typeof entry === "object" ? entry.createdAt : null),
        updated_at: rowDate(typeof entry === "object" ? entry.updatedAt : null),
      };
    })
    .filter(Boolean);

  return ensureUniqueRowIds(rows, (row, index) => `${row.product_id}-gallery-${index}`);
}

function userRow(user) {
  return {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    password: user.password || "",
    role: user.role || "customer",
    department: user.department || "",
    permissions: user.permissions || [],
    eb_points: Number(user.ebPoints || 0),
    total_points_earned: Number(user.totalPointsEarned || 0),
    total_points_redeemed: Number(user.totalPointsRedeemed || 0),
    is_active: user.isActive !== false,
    data: user,
    created_at: rowDate(user.createdAt),
    updated_at: rowDate(user.updatedAt),
  };
}

function membershipRow(user, companyId) {
  const normalized = normalizeCompanyId(companyId);
  const role =
    user.role === "super_admin"
      ? "super_admin"
      : user.role === "admin"
      ? "company_admin"
      : ["employee", "staff", "manager"].includes(user.role)
        ? "employee"
        : "customer";
  return {
    id: `${normalized}:${user.id}`,
    company_id: normalized,
    user_id: user.id,
    role,
    permissions: user.permissions || [],
    is_active: user.isActive !== false,
    updated_at: rowDate(user.updatedAt),
  };
}

function explicitMembershipRow(membership) {
  return {
    id: membership.id,
    company_id: normalizeCompanyId(membership.companyId),
    user_id: membership.userId,
    role: membership.role,
    permissions: membership._permissions || [],
    is_active: membership.status === "active",
    created_at: rowDate(membership.createdAt),
    updated_at: rowDate(membership.updatedAt),
  };
}

function orderRow(order, companyId) {
  return {
    id: order.id,
    company_id: normalizeCompanyId(companyId),
    customer_user_id: order.customerUserId || null,
    customer: order.customer || {},
    subtotal: Number(order.subtotal || 0),
    total: Number(order.total || 0),
    points_earned: Number(order.pointsEarned || 0),
    points_redeemed: Number(order.pointsRedeemed || 0),
    discount_from_points: Number(order.discountFromPoints || 0),
    payment_method: order.paymentMethod || "",
    status: order.status || "Awaiting Employee Review",
    handled_by_employee_id: order.handledByEmployeeId || "",
    assigned_to_employee_id: order.assignedToEmployeeId || "",
    created_by_employee_id: order.createdByEmployeeId || "",
    created_by_employee_name: order.createdByEmployeeName || "",
    data: order,
    created_at: rowDate(order.createdAt),
    updated_at: rowDate(order.updatedAt),
  };
}

function orderItemRows(order, companyId) {
  return (order.items || []).map((item, index) => ({
    id: item.id || `${order.id}-item-${index}`,
    company_id: normalizeCompanyId(companyId),
    order_id: order.id,
    product_id: item.productId || item.id || "",
    product_name: item.productName || item.name || "",
    variant_id: item.variantId || "",
    color_name: item.colorName || item.selectedColor || "",
    color_value: item.colorValue || "",
    size: item.selectedSize || item.size || "",
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    line_total: Number(item.lineTotal || Number(item.price || 0) * Number(item.quantity || 1)),
    data: item,
    created_at: rowDate(item.createdAt),
    updated_at: rowDate(item.updatedAt),
  }));
}

function websiteMediaRow(item, index = 0, companyId = DEFAULT_COMPANY_ID) {
  const imageUrl = item.imageUrl ?? item.image_url ?? "";
  const { fallbackImageUrl, fallback_image_url, ...data } = item;
  return {
    id: item.id || `website-media-${index}`,
    company_id: normalizeCompanyId(companyId),
    section_key: item.sectionKey || item.section_key || "",
    section_label: item.sectionLabel || item.section_label || "",
    group_key: item.groupKey || item.group_key || "sections",
    image_url: imageUrl,
    title: item.title || "",
    subtitle: item.subtitle || "",
    link_url: item.linkUrl || item.link_url || "",
    sort_order: Number(item.sortOrder ?? item.sort_order ?? index),
    is_active: item.isActive !== false,
    data: {
      ...data,
      imageUrl,
    },
    created_at: rowDate(item.createdAt),
    updated_at: rowDate(item.updatedAt),
  };
}

function mergeWebsiteMedia(row) {
  return {
    ...(row.data || {}),
    id: row.id,
    sectionKey: row.section_key,
    sectionLabel: row.section_label,
    groupKey: row.group_key,
    imageUrl: row.image_url,
    title: row.title || "",
    subtitle: row.subtitle || "",
    linkUrl: row.link_url || "",
    sortOrder: Number(row.sort_order || 0),
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function websiteTextRow(item, index = 0, companyId = DEFAULT_COMPANY_ID) {
  return {
    id: item.id || `website-text-${index}`,
    company_id: normalizeCompanyId(companyId),
    text_key: item.key || "",
    group_key: item.group || "general",
    label: item.label || "",
    value_json: { ar: item.valueAr || "", en: item.valueEn || "", he: item.valueHe || "" },
    sort_order: Number(item.sortOrder ?? index),
    is_active: item.isActive !== false,
    created_at: rowDate(item.createdAt),
    updated_at: rowDate(item.updatedAt),
    deleted_at: item.deletedAt || null,
  };
}

function mergeWebsiteText(row) {
  let values = { ar: "", en: "", he: "" };
  try { values = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : (row.value_json || values); } catch {}
  return {
    id: row.id,
    key: row.text_key,
    group: row.group_key,
    label: row.label || "",
    valueAr: values.ar || "",
    valueEn: values.en || "",
    valueHe: values.he || "",
    sortOrder: Number(row.sort_order || 0),
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
  };
}

function websiteMediaHiddenKeyRow(item, index = 0, companyId = DEFAULT_COMPANY_ID) {
  return {
    id: item.id || `hidden-media-${index}`,
    company_id: normalizeCompanyId(companyId),
    section_key: item.sectionKey || "",
    created_at: rowDate(item.createdAt),
    updated_at: rowDate(item.updatedAt),
  };
}

function mergeWebsiteMediaHiddenKey(row) {
  return {
    id: row.id,
    sectionKey: row.section_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeUser(row) {
  return {
    ...(row.data || {}),
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    password: row.password,
    role: row.role,
    department: row.department,
    permissions: row.permissions || [],
    ebPoints: Number(row.eb_points || 0),
    totalPointsEarned: Number(row.total_points_earned || 0),
    totalPointsRedeemed: Number(row.total_points_redeemed || 0),
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeProduct(row, variants, galleryImages) {
  const productVariants = variants
    .filter((variant) => variant.product_id === row.id)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((variant) => ({
      ...(variant.data || {}),
      id: variant.id,
      color_name: variant.color_name,
      color_value: variant.color_value,
      size: variant.size,
      price: Number(variant.price || 0),
      stock: Number(variant.stock || 0),
      image_url: variant.image_url || "",
      sort_order: Number(variant.sort_order || 0),
    }));
  const productGallery = galleryImages
    .filter((entry) => entry.product_id === row.id)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((entry) => ({
      ...(entry.data || {}),
      id: entry.id,
      image_url: entry.image_url,
      sort_order: Number(entry.sort_order || 0),
    }));

  return {
    ...(row.data || {}),
    id: row.id,
    slug: row.slug,
    image: row.image_url || row.data?.image || "",
    hoverImage: row.hover_image_url || row.data?.hoverImage || "",
    variants: productVariants,
    gallery_images: productGallery,
    galleryImages: productGallery.map((entry) => entry.image_url),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeOrder(row, orderItems) {
  const items = orderItems
    .filter((item) => item.order_id === row.id)
    .map((item) => ({
      ...(item.data || {}),
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id,
      colorName: item.color_name,
      colorValue: item.color_value,
      selectedSize: item.size,
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      lineTotal: Number(item.line_total || 0),
    }));

  return {
    ...(row.data || {}),
    id: row.id,
    customerUserId: row.customer_user_id,
    customer: row.customer || {},
    items,
    subtotal: Number(row.subtotal || 0),
    total: Number(row.total || 0),
    pointsEarned: Number(row.points_earned || 0),
    pointsRedeemed: Number(row.points_redeemed || 0),
    discountFromPoints: Number(row.discount_from_points || 0),
    paymentMethod: row.payment_method,
    status: row.status,
    handledByEmployeeId: row.handled_by_employee_id,
    assignedToEmployeeId: row.assigned_to_employee_id,
    createdByEmployeeId: row.created_by_employee_id,
    createdByEmployeeName: row.created_by_employee_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUsersByEmailFromSupabase(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  // Bootstrap runs rarely and must match login's case-insensitive semantics.
  // Reading then filtering avoids ilike wildcard behavior for valid-but-special
  // email characters until normalized_email is available as a database column.
  const rows = await selectAll("users", "select=*");
  return rows
    .filter((row) => String(row.email || "").trim().toLowerCase() === normalizedEmail)
    .map(mergeUser);
}

export async function listCompanyMembershipsFromSupabase(companyId) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const [memberships, allUsers] = await Promise.all([
    selectAll(
      "company_memberships",
      `select=*&company_id=eq.${encodeURIComponent(normalizedCompanyId)}`,
    ),
    selectAll("users", "select=*"),
  ]);
  const usersById = new Map(allUsers.map((row) => [row.id, mergeUser(row)]));
  return memberships.map((membership) => ({
    id: membership.id,
    companyId: membership.company_id,
    userId: membership.user_id,
    role: membership.role,
    status: membership.is_active === false ? "inactive" : "active",
    _permissions: membership.permissions || [],
    createdAt: membership.created_at,
    updatedAt: membership.updated_at,
    user: usersById.get(membership.user_id) || null,
  }));
}

export async function saveCompanyMembershipToSupabase({ membership, user, createUser = false }) {
  let userCreated = false;
  try {
    if (createUser) {
      await upsertRows("users", [userRow(user)]);
      userCreated = true;
    }
    await upsertRows("company_memberships", [explicitMembershipRow(membership)]);
    return membership;
  } catch (error) {
    if (userCreated) {
      try {
        await supabaseFetch(
          `/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`
            + `&email=eq.${encodeURIComponent(user.email)}`
            + "&role=eq.customer&is_active=eq.false&password=eq.",
          { method: "DELETE", headers: { Prefer: "return=minimal" } },
        );
      } catch (compensationError) {
        error.compensationFailed = true;
      }
    }
    throw error;
  }
}

function mergeCompany(row, domains, settingsRows) {
  const companyDomains = domains.filter((entry) => entry.company_id === row.id);
  const domain = companyDomains.find((entry) => entry.is_primary) || companyDomains[0];
  const settings = settingsRows.find((entry) => entry.company_id === row.id);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    isDefault: row.is_default === true,
    domain: domain?.domain || "",
    settings: settings?.settings || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _domainId: domain?.id || "",
  };
}

export async function loadStoreFromSupabase(companyId = DEFAULT_COMPANY_ID) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const [
    allUsers,
    memberships,
    products,
    variants,
    galleryImages,
    orders,
    orderItems,
    carts,
    offers,
    categoryCards,
    reviews,
    workSessions,
    websiteMedia,
    websiteMediaHiddenKeys,
    websiteTexts,
    companies,
    companyDomains,
    companySettings,
  ] = await Promise.all([
    selectAll("users", "select=*"),
    selectAll(
      "company_memberships",
      `select=*&company_id=eq.${encodeURIComponent(normalizedCompanyId)}`,
    ),
    selectCompanyRows("products", normalizedCompanyId),
    selectCompanyRows("product_variants", normalizedCompanyId),
    selectCompanyRows("product_gallery_images", normalizedCompanyId),
    selectCompanyRows("orders", normalizedCompanyId),
    selectCompanyRows("order_items", normalizedCompanyId),
    selectCompanyRows("carts", normalizedCompanyId),
    selectCompanyRows("homepage_offers", normalizedCompanyId),
    selectCompanyRows("homepage_category_cards", normalizedCompanyId),
    selectCompanyRows("reviews", normalizedCompanyId),
    selectCompanyRows("work_sessions", normalizedCompanyId),
    selectCompanyRows("website_media", normalizedCompanyId),
    selectCompanyRows("company_website_media_hidden_keys", normalizedCompanyId),
    selectCompanyRows("company_website_texts", normalizedCompanyId),
    selectAll("companies", "select=*"),
    selectAll("company_domains", "select=*"),
    selectAll("company_settings", "select=*"),
  ]);

  const memberUserIds = new Set(memberships.map((membership) => membership.user_id));
  const users = memberships.length
    ? allUsers.filter((user) => memberUserIds.has(user.id))
    : normalizedCompanyId === DEFAULT_COMPANY_ID
      ? allUsers
      : [];

  const hasRows = [
    users,
    products,
    variants,
    galleryImages,
    orders,
    orderItems,
    carts,
    offers,
    categoryCards,
    reviews,
    workSessions,
    websiteMedia,
    websiteMediaHiddenKeys,
    websiteTexts,
  ].some((rows) => rows.length);

  return {
    isEmpty: !hasRows,
    store: {
      version: 1,
      savedAt: new Date().toISOString(),
      users: users.map(mergeUser),
      memberships: memberships.map((membership) => ({
        id: membership.id,
        companyId: membership.company_id,
        userId: membership.user_id,
        role: membership.role,
        status: membership.is_active === false ? "inactive" : "active",
        createdAt: membership.created_at,
        updatedAt: membership.updated_at,
      })),
      products: products.map((product) => mergeProduct(product, variants, galleryImages)),
      orders: orders.map((order) => mergeOrder(order, orderItems)),
      carts: Object.fromEntries(carts.map((cart) => [cart.user_id, cart.items || []])),
      offers: offers.map((offer) => offer.data || offer),
      categoryCards: categoryCards.map((card) => card.data || card),
      reviews: reviews.map((review) => review.data || review),
      websiteMedia: websiteMedia.map(mergeWebsiteMedia),
      websiteMediaHiddenKeys: websiteMediaHiddenKeys.map(mergeWebsiteMediaHiddenKey),
      websiteTexts: websiteTexts.map(mergeWebsiteText),
      workSessions: workSessions.map((session) => session.data || session),
      companies: companies.map((company) =>
        mergeCompany(company, companyDomains, companySettings),
      ),
    },
  };
}

export async function saveStoreToSupabase(store, options = {}) {
  const companyId = normalizeCompanyId(options.companyId);
  const pruneMissing = options.pruneMissing === true;
  const products = store.products || [];
  const orders = store.orders || [];
  const users = store.users || [];
  const offers = store.offers || [];
  const categoryCards = store.categoryCards || [];
  const reviews = store.reviews || [];
  const workSessions = store.workSessions || [];
  const websiteMedia = store.websiteMedia || [];
  const websiteMediaHiddenKeys = store.websiteMediaHiddenKeys || [];
  const websiteTexts = store.websiteTexts || [];
  const carts = Object.entries(store.carts || {});

  const productRows = products.map((product) => productRow(product, companyId));
  const productVariantRows = ensureUniqueRowIds(
    products.flatMap((product) => variantRows(product, companyId)),
    (row, index) => `${row.product_id}-variant-${index}`
  );
  const productGalleryRows = ensureUniqueRowIds(
    products.flatMap((product) => galleryRows(product, companyId)),
    (row, index) => `${row.product_id}-gallery-${index}`
  );
  const orderRows = orders.map((order) => orderRow(order, companyId));
  const itemRows = orders.flatMap((order) => orderItemRows(order, companyId));
  const userRows = users.map(userRow);
  const membershipRows = users.map((user) => membershipRow(user, companyId));
  const offerRows = offers.map((offer, index) => ({
    id: offer.id,
    company_id: companyId,
    display_order: Number(offer.displayOrder || index + 1),
    is_active: offer.isActive !== false,
    data: offer,
    created_at: rowDate(offer.createdAt),
    updated_at: rowDate(offer.updatedAt),
  }));
  const cardRows = categoryCards.map((card, index) => ({
    id: card.key || card.id || `card-${index}`,
    company_id: companyId,
    card_key: card.key || card.id || `card-${index}`,
    display_order: Number(card.displayOrder || index + 1),
    is_active: card.isActive !== false,
    data: card,
    created_at: rowDate(card.createdAt),
    updated_at: rowDate(card.updatedAt),
  }));
  const reviewRows = reviews.map((review) => ({
    id: review.id,
    company_id: companyId,
    type: review.type || "store",
    rating: Number(review.rating || 5),
    status: review.status || "approved",
    is_active: review.isActive !== false,
    data: review,
    created_at: rowDate(review.createdAt),
    updated_at: rowDate(review.updatedAt),
  }));
  const workSessionRows = workSessions.map((session) => ({
    id: session.id,
    company_id: companyId,
    employee_id: session.employeeId,
    date: session.date,
    login_time: session.loginTime,
    logout_time: session.logoutTime,
    data: session,
    created_at: rowDate(session.createdAt),
    updated_at: rowDate(session.updatedAt),
  }));
  const cartRows = carts.map(([userId, items]) => ({
    id: userId,
    company_id: companyId,
    user_id: userId,
    items,
    updated_at: new Date().toISOString(),
  }));
  const websiteMediaRows = websiteMedia.map((item, index) =>
    websiteMediaRow(item, index, companyId),
  );
  const websiteMediaHiddenKeyRows = websiteMediaHiddenKeys.map((item, index) =>
    websiteMediaHiddenKeyRow(item, index, companyId),
  );
  const websiteTextRows = websiteTexts.map((item, index) =>
    websiteTextRow(item, index, companyId),
  );

  await upsertRows("users", userRows);
  // Runtime store saves may seed missing memberships, but must never overwrite
  // explicit cPanel membership roles/statuses managed by the platform API.
  await insertRowsIfMissing("company_memberships", membershipRows);
  await upsertCompanyRows("products", productRows, companyId);
  // Delete orphaned variant rows before re-inserting current set
  const productVariantProductIds = [...new Set(productVariantRows.map((row) => row.product_id))];
  for (const pid of productVariantProductIds) {
    await supabaseFetch(
      `/rest/v1/product_variants?product_id=eq.${encodeURIComponent(pid)}&${companyMutationFilter(companyId)}`,
      {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      },
    );
  }
  await upsertCompanyRows("product_variants", productVariantRows, companyId);
  // Delete orphaned gallery rows before re-inserting current set
  const productGalleryProductIds = [...new Set(productGalleryRows.map((row) => row.product_id))];
  for (const pid of productGalleryProductIds) {
    await supabaseFetch(
      `/rest/v1/product_gallery_images?product_id=eq.${encodeURIComponent(pid)}&${companyMutationFilter(companyId)}`,
      {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      },
    );
  }
  await upsertCompanyRows("product_gallery_images", productGalleryRows, companyId);
  await upsertCompanyRows("orders", orderRows, companyId);
  await upsertCompanyRows("order_items", itemRows, companyId);
  await upsertCompanyRows("carts", cartRows, companyId);
  await upsertCompanyRows("homepage_offers", offerRows, companyId);
  await upsertCompanyRows("homepage_category_cards", cardRows, companyId);
  await upsertCompanyRows("reviews", reviewRows, companyId);
  await upsertCompanyRows("work_sessions", workSessionRows, companyId);
  await upsertCompanyRows("website_media", websiteMediaRows, companyId);
  await upsertCompanyRows("company_website_media_hidden_keys", websiteMediaHiddenKeyRows, companyId);
  await upsertCompanyRows("company_website_texts", websiteTextRows, companyId);

  if (pruneMissing) {
    await deleteMissingCompanyRows("products", productRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("product_variants", productVariantRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("product_gallery_images", productGalleryRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("orders", orderRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("order_items", itemRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("carts", cartRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("homepage_offers", offerRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("homepage_category_cards", cardRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("reviews", reviewRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("work_sessions", workSessionRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("website_media", websiteMediaRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("company_website_media_hidden_keys", websiteMediaHiddenKeyRows.map((row) => row.id), companyId);
    await deleteMissingCompanyRows("company_website_texts", websiteTextRows.map((row) => row.id), companyId);
  }
}

export async function saveCompanyToSupabase(company) {
  const now = new Date().toISOString();
  const companyId = normalizeCompanyId(company.id);
  const createdAt = company.createdAt || now;
  const updatedAt = company.updatedAt || now;

  await upsertRows("companies", [{
    id: companyId,
    slug: company.slug,
    name: company.name,
    status: company.status,
    is_default: companyId === DEFAULT_COMPANY_ID,
    created_at: createdAt,
    updated_at: updatedAt,
  }]);

  await upsertRows("company_settings", [{
    company_id: companyId,
    settings: company.settings || {},
    created_at: createdAt,
    updated_at: updatedAt,
  }], "company_id");

  if (!company.domain) {
    if (company._domainId) {
      await supabaseFetch(
        `/rest/v1/company_domains?id=eq.${encodeURIComponent(company._domainId)}`,
        { method: "DELETE", headers: { Prefer: "return=minimal" } },
      );
    }
    return { domainId: "" };
  }

  const domainId = company._domainId || `company-domain-${companyId}`;
  await upsertRows("company_domains", [{
    id: domainId,
    company_id: companyId,
    domain: company.domain,
    is_primary: true,
    // Non-default company domains remain inactive until domain resolution is enabled later.
    is_active: companyId === DEFAULT_COMPANY_ID,
    created_at: createdAt,
    updated_at: updatedAt,
  }]);

  return { domainId };
}

export async function saveSuperAdminUserToSupabase(
  user,
  companyId = DEFAULT_COMPANY_ID,
  options = {},
) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const previousUser = options.previousUser || null;
  const membershipId = `${normalizedCompanyId}:${user.id}`;
  const existingMemberships = await selectAll(
    "company_memberships",
    `select=*&company_id=eq.${encodeURIComponent(normalizedCompanyId)}&user_id=eq.${encodeURIComponent(user.id)}`,
  );
  if (existingMemberships.length > 1) {
    throw new Error("Ambiguous company memberships prevent Super Admin provisioning.");
  }

  const previousMembership = existingMemberships[0] || null;
  const pendingUser = previousUser || {
    ...user,
    role: "customer",
    isActive: false,
  };
  let pendingUserWritten = false;
  let membershipAttempted = false;
  let promotionAttempted = false;

  try {
    if (!previousUser) {
      await upsertRows("users", [userRow(pendingUser)]);
      pendingUserWritten = true;
    }

    membershipAttempted = true;
    await upsertRows("company_memberships", [membershipRow(user, normalizedCompanyId)]);

    // This is deliberately the final privileged write. Membership alone does
    // not satisfy requireSuperAdmin; users.role remains authoritative.
    promotionAttempted = true;
    await upsertRows("users", [userRow(user)]);
    return user;
  } catch (error) {
    const compensationErrors = [];

    // A failed response can be ambiguous, so first attempt to restore the
    // authoritative user role even when the promotion call reported failure.
    if (promotionAttempted) {
      try {
        await upsertRows("users", [userRow(pendingUser)]);
      } catch (compensationError) {
        compensationErrors.push(compensationError);
      }
    }

    if (membershipAttempted) {
      try {
        if (previousMembership) {
          await upsertRows("company_memberships", [previousMembership]);
        } else {
          await supabaseFetch(
            `/rest/v1/company_memberships?id=eq.${encodeURIComponent(membershipId)}`,
            { method: "DELETE", headers: { Prefer: "return=minimal" } },
          );
        }
      } catch (compensationError) {
        compensationErrors.push(compensationError);
      }
    }

    if (pendingUserWritten) {
      try {
        await supabaseFetch(
          `/rest/v1/users?id=eq.${encodeURIComponent(user.id)}&role=eq.customer&is_active=eq.false`,
          { method: "DELETE", headers: { Prefer: "return=minimal" } },
        );
      } catch (compensationError) {
        compensationErrors.push(compensationError);
      }
    }

    if (compensationErrors.length) error.compensationFailed = true;
    throw error;
  }
}

export async function uploadImageToSupabaseStorage({
  companyId = DEFAULT_COMPANY_ID,
  filename,
  contentType,
  data,
  pathParts,
}) {
  if (!isSupabaseStorageConfigured()) {
    throw new Error("Supabase Storage is not configured.");
  }

  const bucket = process.env.SUPABASE_BUCKET;
  const storagePath = companyStoragePath(companyId, ...(pathParts || ["uploads", new Date().toISOString().slice(0, 10)]), filename);
  const encodedPath = encodeStoragePath(storagePath);
  await supabaseFetch(`/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: data,
  });

  const publicUrl = `${supabaseUrl()}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
  return {
    path: publicUrl,
    url: publicUrl,
    storagePath,
  };
}

export async function deleteSupabaseStorageObject(storagePath) {
  if (!isSupabaseStorageConfigured()) throw new Error("Supabase Storage is not configured.");
  const bucket = process.env.SUPABASE_BUCKET;
  await supabaseFetch(`/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(storagePath)}`, { method: "DELETE" });
}
