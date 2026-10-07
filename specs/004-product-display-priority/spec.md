# Feature Specification: Product Display Priority

**Feature Branch**: `not created (SPEC_ONLY; branching not requested)`

**Created**: 2026-10-06

**Status**: D1–D5 approved 2026-10-06. Awaiting task-plan approval. No implementation.

**Input**: User description: "Velvet Product Display Priority — Admin configures and persists product display priorities for Velvet Home brand product sections, Velvet General Shop, and each Velvet Brand Shop independently. Modes: Featured first, Best-selling first (only with verified sales data), Custom manual order. Reuse existing product fields, Admin screens, permissions, APIs, and persistence. Use GET storefront content. Do not duplicate product data or create a new admin system."

## Constitution Constraints *(mandatory)*

Reference: `.specify/memory/constitution.md`

- **Multi-tenancy**: Display priority is a company-scoped merchandising capability. Velvet (Kids Velvet / i-play) is the first store that needs it. The capability must work for any company. No Velvet-only admin, permission, or product copy.
- **Data integrity**: Best-selling order uses real completed purchases only. If a place has no verified sales, that mode cannot be turned on and shoppers are not shown an invented ranking. The existing manual "bestseller" marker stays a badge. It is not treated as sales.
- **Migrations**: A new ordering table is recommended and is **not approved**. Implementation must not add or apply a migration until the owner approves it. Production migration is a separate later approval.
- **Deployment**: Local or Staging validation only, after implementation is approved. No Production change in this phase.
- **CPanel**: Arabic and English labels, RTL/LTR, existing Products screens and design system. No new admin module.
- **Scope**: Choose which eligible products a home or shop surface shows, and which of those appear first, using classifications and order keys the catalog already has. Do not add categories, flags, or a second taxonomy. Do not replace customer filters or a sort the customer explicitly chose.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Global shop, with a brand override (Priority: P1)

An admin sets which products the shop shows and which of those appear first. That setting applies to every brand shop until a brand has its own shop override. A brand override does not change the global shop or other brands.

**Why this priority**: The shop is the main catalog. Brands must be able to inherit one company setting or replace it.

**Independent Test**: Save a global shop selection and order. One brand shop with no override matches it, limited to that brand's products. A second brand with an override shows a different selection or order. Another company is unchanged.

**Acceptance Scenarios**:

1. **Given** no brand shop override, **When** shoppers open that brand shop, **Then** they see the global shop selection and order, and only products of that brand.
2. **Given** a saved override for one brand shop, **When** shoppers open that brand shop, **Then** they see the override. Other brand shops still inherit the global shop.
3. **Given** an admin who can view products but cannot edit them, **When** they open the configuration, **Then** they can see it and cannot change it.
4. **Given** a staff user from another company, **When** they read or save configuration, **Then** they cannot see or change this company's settings.

---

### User Story 2 - Global home, with a brand override (Priority: P1)

An admin sets the home product list separately from the shop. Brands inherit the global home setting until a brand home override exists. Home and shop do not overwrite each other.

**Why this priority**: Home sections and shops are different surfaces. Each needs a global default and a per-brand exception.

**Independent Test**: Set global home one way and global shop another way. A brand with no overrides shows those two results inside its own products. A home override for one brand does not change that brand's shop.

**Acceptance Scenarios**:

1. **Given** a global home configuration and no brand home override, **When** a brand section is shown on the home page, **Then** that section uses the global home selection and order, limited to that brand.
2. **Given** a home override for one brand, **When** that brand's home section is shown, **Then** the override is used. Its shop still inherits the global shop if no shop override exists.
3. **Given** a product that is inactive, hidden, or in trash, **When** a surface is shown, **Then** that product is omitted even if a selection rule or manual position refers to it.

---

### User Story 3 - Select from existing classifications (Priority: P1)

An admin limits a surface to products that already carry classifications, categories, or merchandising flags managed in the catalog. The admin cannot type a new category or a new flag.

**Why this priority**: Velvet already classifies products. A fixed three-way list would hide that taxonomy.

**Independent Test**: Select an existing age, category, and merchandising flag that products already have. Only matching eligible products remain. A classification id that is not in the catalog vocabulary is rejected.

**Acceptance Scenarios**:

1. **Given** products tagged with an existing classification, **When** the admin selects that classification, **Then** only eligible products with that classification are in the surface.
2. **Given** a category that already exists for the company, **When** the admin selects it, **Then** only products in that category are included, still inside the brand boundary.
3. **Given** a classification or category that does not exist for the company, **When** the admin saves it, **Then** the save is refused.
4. **Given** no selection rules, **When** shoppers view the surface, **Then** every eligible product in the brand boundary is included.

---

### User Story 4 - Order with an existing key, including verified sales and manual order (Priority: P2)

An admin chooses one existing ordering key for the products already selected. The bestseller badge and verified sales are different keys. Manual order stores positions for existing product ids only. A sort the customer explicitly chooses still wins for that visit.

**Why this priority**: Ordering is separate from selection. Verified sales stay available, and they are not the only order.

**Independent Test**: Select the same products on two surfaces and apply two different ordering keys. Customer filters can narrow the list further. Choosing a customer sort does not rewrite the saved admin order.

**Acceptance Scenarios**:

1. **Given** a selected set, **When** the admin chooses an existing ordering key other than verified sales, **Then** that key orders the selected products only.
2. **Given** verified sales as the ordering key and no completed purchases, **When** the admin saves, **Then** the save is refused and the previous order remains.
3. **Given** verified sales and completed purchases, **When** shoppers view the surface, **Then** selected products are ordered by verified units, and unit counts are not shown.
4. **Given** a manual order, **When** the admin moves selected products, **Then** only those ids are stored, and products outside the selection are not added.
5. **Given** a saved admin order, **When** the customer applies their own sort, **Then** the customer sort is what they see, and the saved admin order is unchanged.
6. **Given** a customer filter such as age or category, **When** they apply it, **Then** the filter narrows the admin-selected list. It does not pull in products the admin selection excluded or products from another brand.

---

### Edge Cases

- No saved global configuration keeps today's behavior: eligible products in catalog order.
- A brand with no override inherits the global surface. It does not inherit the other surface.
- Removing an override restores inheritance on the next read.
- Selection never crosses a brand boundary on a brand home section or a brand shop.
- The global shop may include every brand. A brand shop still shows only that brand.
- Inactive, hidden, and trashed products stay out.
- Duplicate manual ids are rejected. Ids from another company are rejected.
- Ties use catalog order, then product slug.
- New selected products missing from a manual sequence appear after the saved sequence.
- The bestseller badge does not count as verified sales. Turning the badge on does not by itself change verified-sales order.
- Featured as a merchandising flag and the collection value named featured are different existing fields. Saving one does not silently write the other.
- Last successful save wins. One activity entry is recorded per save.
- Arabic and English labels come from the existing catalog labels. Layout follows the admin's language direction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Admins who can edit products MUST be able to save a shop configuration and a home configuration for the company, and an optional override per existing brand for each of those two surfaces.
- **FR-002**: Selection and ordering MUST inherit or override independently for each brand. An unset field inherits that field from the same global surface. Home MUST NOT inherit shop, and shop MUST NOT inherit home.
- **FR-003**: Configuration MUST separate product selection from product ordering. Selection decides which eligible products are included. Ordering decides the sequence of that selected set.
- **FR-004**: Selection rules MUST reference only existing catalog data: merchandising flags, filter-attribute groups and their existing option ids, existing collection ids including promotional collections, and existing categories. Multiple rules MUST support match-all and match-any, defaulting to match-all. The system MUST reject unknown ids and the quick-shop flag. It MUST NOT create categories, flags, or classification values.
- **FR-005**: With no selection rules, the surface MUST include every eligible product inside the applicable brand boundary.
- **FR-006**: Brand home sections and brand shops MUST include only products of that brand, after selection. The global shop MAY include products from every brand of the company.
- **FR-007**: Ordering MUST use one existing key: catalog order, featured, new arrival, bestseller flag, verified sales, manual positions, newest, oldest, price ascending, price descending, or name. The admin UI MUST NOT offer only featured, bestseller, and manual. Most-viewed and random MUST NOT be offered.
- **FR-008**: Verified-sales ordering MUST rank by units on completed or delivered retail orders only, using the inspected status allow-list. It MUST refuse to save when the selected set has no such units. The bestseller flag MUST remain a separate key and MUST NOT be treated as sales.
- **FR-009**: If verified sales were saved and qualifying units later drop to none, shoppers MUST see the selected products in catalog order. They MUST NOT see an invented sales rank or unit counts.
- **FR-010**: Manual order MUST store product ids and positions for the selected set only. It MUST NOT copy product records.
- **FR-011**: Customer filters MUST be able to narrow the selected set. They MUST NOT add products outside the selection or outside the brand boundary.
- **FR-012**: An explicit customer-selected sort MUST order that visit. It MUST NOT change the saved admin configuration.
- **FR-013**: Shoppers MUST receive the resolved selection and order through the existing public storefront content, without a second product feed.
- **FR-014**: Until a global configuration exists, shoppers MUST keep the current catalog membership and catalog order for that surface.
- **FR-015**: View-only product staff MUST be able to read configuration and MUST NOT change it. Users outside the company MUST NOT read or write it.
- **FR-016**: Each successful save MUST record one activity-history entry.
- **FR-017**: Admin labels MUST use the existing Arabic and English catalog labels for classifications, categories, flags, and brands.
- **FR-018**: The existing company-wide catalog reorder MUST keep working and MUST NOT delete a surface configuration.

### Key Entities

- **Surface**: Home or shop.
- **Scope**: Global for a surface, or one existing brand. Selection and ordering inherit or override independently. An unset field inherits the same field from that surface's global setting.
- **Selection**: A match mode, default match-all, plus references to existing merchandising flags, filter values, promotional collection values, or categories. Not a new classification. Quick shop is not a selection source.
- **Ordering key**: One existing sequence for the selected products: catalog order, featured, new arrival, bestseller flag, verified sales, manual positions, newest, oldest, price ascending, price descending, or name.
- **Manual sequence**: Ordered product ids for one saved configuration. Not a product copy.
- **Eligible product**: Active, visible, not trashed, and inside the brand boundary when the surface is brand-scoped.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can save a global shop, a brand shop override, a global home, and a brand home override in one sitting, in under 5 minutes, without leaving the existing product admin.
- **SC-002**: After refresh and sign-in again, inherited surfaces still match their global configuration, and overrides still differ, in 100% of trials with two brands.
- **SC-003**: A selection that uses an existing classification returns only products that already have that classification, and rejects an unknown classification, in 100% of trials.
- **SC-004**: With no completed purchases, saving verified-sales order is refused. With completed purchases, rank matches units sold, and cancelled or returned purchases do not increase rank.
- **SC-005**: A shopper view includes no unit-sold counts. A customer sort and a customer filter leave the saved admin configuration unchanged.
- **SC-006**: A second company cannot read or change the first company's configuration.

## Assumptions

- Global home is applied inside each brand section, then limited to that brand. Global shop is the default for every brand shop, then limited to that brand. A brand inherits selection and ordering separately. Setting one does not copy the other.
- Empty selection means every eligible product in the brand boundary. Match-all is the default when rules exist. Match-any is explicit.
- Promotional collection ids already in the catalog vocabulary are valid selection sources. The quick-shop flag is not. Homepage offer attachments are not a second product list.
- Most-viewed and random are excluded until a reliable product ranking exists.
- Newest and oldest use the product's existing created time. Price ascending and price descending use the existing public price. Name uses the existing product name.
- Eligible products stay active, visible, and not trashed. This feature does not change those visibility flags.
- Selection options are loaded from the company's brands, categories, merchandising flags, and the existing filter-attribute vocabulary. Velvet workbook tags are already mapped into that vocabulary. They are not a second list.
- The featured merchandising flag and the collection id `featured` stay distinct because both already exist on products.
- The bestseller merchandising flag and verified-sales order stay distinct.
- One primary ordering key is stored. Ties use catalog order, then slug.
- A verified purchase is a retail order whose status is completed or the legacy delivered alias. In-progress, cancelled, and returned orders do not count. Payment method and invoice payment status do not count.
- Editors use the existing product-edit permission. Viewers use the existing product-view permission.
- The Velvet storefront applies the published configuration only after this platform contract is verified.
- Rows store configuration and product ids. Product records are not copied. Applying the schema to Staging or Production is a later approval.

## Out of Scope

- A new admin module, a second taxonomy, or copied product records.
- Inventing categories, filter values, or merchandising flags.
- Replacing customer filters or an explicit customer sort.
- Homepage-offer product lists and the quick-shop flag.
- Most-viewed and random order.
- Applying the migration to Staging or Production, or editing the storefront repository, in this phase.

## Approved decisions (2026-10-06)

- **D1**: Selection and ordering inherit or override independently per brand. An unset field inherits that field from the same global surface.
- **D2**: Multiple selection rules support match-all and match-any. The default is match-all.
- **D3**: Ordering keys include catalog order, featured, new arrival, bestseller flag, verified sales, manual positions, newest, oldest, price ascending, price descending, and name.
- **D4**: Most-viewed and random stay excluded until reliable ranking support exists.
- **D5**: Existing promotional collection ids are selection sources. Quick shop is excluded.
