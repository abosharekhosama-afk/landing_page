# Feature Specification: Velvet Dropshipping

**Feature Branch**: `not created (directory only; branch creation requires explicit approval)`

**Created**: 2026-10-06

**Status**: Reconciled with the Velvet business flow and developer specification — implementation not approved

**Input**: User description: "Velvet Dropshipping Implementation. Plan merchant registration and dashboard, merchant storefront and product selection, pricing and profit management, orders and WhatsApp confirmation, inventory and fulfillment, Thursday settlements, and admin management. Keep Velvet Dropshipping completely separate from the existing iCare dropshipping system. Do not modify the ongoing Product Display Priority work."

**Sources reconciled**: `Velvet_Dropshipping_Business_Flow_AR.docx` and `Velvet_Dropshipping_Developer_Spec_AR.docx`.

## Constitution Constraints *(mandatory)*

Reference: `.specify/memory/constitution.md`

Every feature on iGroup Platform MUST respect these non-negotiable constraints:

- **Multi-tenancy**: Server-side tenant isolation; API is authoritative; no
  tenant-specific logic unless explicitly scoped and reusable.
- **Data integrity**: No fabricated records, balances, analytics, or success
  states; honest UI for partial/unimplemented modules.
- **Migrations**: Schema changes require explicit approval; Production migration
  is a separate approval gate.
- **Deployment**: Staging/local validation before Production; no unverified
  deployment replacements.
- **CPanel** (if UI involved): Arabic/English support, RTL/LTR behavior, existing
  design system patterns.
- **Scope**: Minimal file changes; unrelated fixes deferred.

Flag any requirement that would violate these constraints for plan-level review.

Velvet Dropshipping is the merchant program for the Velvet store. Authorization
stays company-scoped on the server. The program name is not an authorization
key, and a browser-supplied company id is never trusted.

Velvet Dropshipping must not read or write the iCare dropshipping program
(marketers, marketer wallets, withdrawals, or iCare dropshipping orders).

Product Display Priority work is out of scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Merchant registration, store, and dashboard (Priority: P1)

Any person can register as a merchant and create one store with a name and a
logo. The store has one fixed public link. The merchant dashboard shows the
store, new orders, confirmed orders, this week's profit, the amount due, and
payout settings. An administrator can activate or deactivate the merchant and
the store. A deactivated store does not accept checkout.

**Why this priority**: The store link and the merchant dashboard are the
merchant's workplace. Later selling depends on them.

**Independent Test**: Register, set a store name and logo, open the dashboard,
and confirm a second merchant cannot see the first merchant's store or orders.
Deactivate the store and confirm checkout is refused.

**Acceptance Scenarios**:

1. **Given** a new person, **When** they register and enter a store name and logo, **Then** one active merchant and one active store are created, with a unique store link of the form `/store/store-name`.
2. **Given** an existing store link, **When** another merchant tries to use the same link name, **Then** the duplicate is refused and the first link stays unchanged.
3. **Given** an active merchant, **When** they open the dashboard, **Then** they see overview counts, store identity, catalog entry, orders, earnings, and payout settings, and they do not see another merchant's records.
4. **Given** an administrator, **When** they deactivate the merchant or the store, **Then** the public page stops accepting checkout and the merchant can still view history.
5. **Given** a merchant, **When** they choose bank transfer, electronic wallet, or direct handover and save the details, **Then** later settlements use that method.

---

### User Story 2 - Merchant storefront, catalog selection, and branded images (Priority: P1)

Every Velvet catalog product is available for every merchant to add. Adding a
product generates a merchant image from the clean product image plus the store
name and logo. If generation fails, the product still stays on the store and
the shop shows a clean unbranded fallback. The public store is one fixed page:
store name, logo, selected products, selling price, available quantity, and
add to cart. There is no banner builder and no page builder. The customer has
no separate dashboard.

**Why this priority**: The public store is how customers buy, and it must show
the merchant's identity without publishing Velvet-branded artwork.

**Independent Test**: Add a product with a clean image and see a generated
image. Add a product whose generation fails and see the unbranded fallback
while the product remains selected. Open `/store/:slug` and add the product
to the cart. Confirm a Velvet-branded source image is never shown as the
merchant image.

**Acceptance Scenarios**:

1. **Given** an active store, **When** the merchant adds a catalog product, **Then** the product appears on that store and on My Products, and image generation starts from the admin-designated clean image, the store name, and the logo.
2. **Given** generation failure, **When** the product is added, **Then** the selection is kept, the shop shows a clean unbranded fallback, and the image is marked failed so it can be retried.
3. **Given** no clean image has been designated, **When** the merchant adds the product, **Then** generation is not attempted with a Velvet-branded image, and the unbranded fallback is shown.
4. **Given** a later logo or store-name change, **When** the merchant adds a new product, **Then** the new image uses the current identity and existing generated images stay as they are.
5. **Given** a visitor, **When** they open an active store, **Then** they see only that store's active selections, the shared selling price, and the shared available quantity, and they can add an in-stock product to the cart.
6. **Given** available quantity of zero, **When** a visitor views the product, **Then** it is shown as unavailable and cannot be added to the cart.
7. **Given** a deactivated store or a deactivated merchant, **When** a visitor tries to check out, **Then** checkout is refused.
8. **Given** a catalog that already groups products by category, **When** a visitor opens the store, **Then** selected products are shown in those existing categories. The merchant cannot add, remove, or restyle categories.
9. **Given** a selected product, **When** the merchant removes it from the store, **Then** it leaves the public page and existing orders keep their snapshots.

---

### User Story 3 - Admin selling price and merchant price (Priority: P1)

Velvet administration sets two prices on each product: the customer selling
price and the merchant price. Merchant profit for one unit is selling price
minus merchant price. The merchant cannot change either price. The same
selling price appears on the Velvet store and on every merchant store. A
placed order keeps the selling price, merchant price, and profit from the
moment it was placed.

**Why this priority**: The merchant's profit is defined by Velvet, not by a
price the merchant types.

**Independent Test**: Set selling price 100 and merchant price 80. Confirm the
store shows 100, the merchant preview shows profit 20, and a merchant price
edit is refused. Change the catalog prices afterward and confirm the existing
order snapshots stay 100, 80, and 20.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they save a selling price and a merchant price, **Then** both are stored and the profit preview equals selling price minus merchant price.
2. **Given** a merchant, **When** they try to change either price, **Then** the change is refused.
3. **Given** a selling price below the merchant price, **When** an administrator saves it, **Then** the save is refused because profit would be negative.
4. **Given** an existing order, **When** either current price changes, **Then** that order's snapshots and profit do not change.
5. **Given** any offer, **When** prices are shown, **Then** no coupon or discount changes the selling price or the profit.

---

### User Story 4 - Orders and WhatsApp buyer confirmation (Priority: P2)

A customer checks out on the merchant store without a customer dashboard. The
order appears at once on the merchant dashboard and the admin dashboard, with
the customer's name, phone, city, and full address. Creating the order does
not change stock. The merchant contacts the buyer on WhatsApp from a button
in the order. The message includes the items and the delivery amount for the
customer's city. Delivery is collected from the customer for Velvet and is
not part of merchant profit. If the buyer does not answer, the merchant tries
again the same calendar day in Asia/Hebron. If the buyer still does not
confirm that day, the merchant cancels the order as not confirmed. If the
buyer confirms, the merchant presses Confirm. That action checks every item,
deducts quantities, and marks the order confirmed in one indivisible step.
Pressing Confirm again does not deduct again. After confirmation the merchant
can watch the order and cannot change or cancel it.

**Why this priority**: Stock must move only after the buyer has confirmed, and
it must move once.

**Independent Test**: Place an order and confirm stock is unchanged. Open the
WhatsApp action and confirm it addresses the buyer's phone and includes the
delivery amount. Confirm the order and confirm stock drops once. Submit the
same confirmation again and confirm stock does not drop again. Cancel is
refused before two WhatsApp attempts and succeeds after the second attempt
on that Asia/Hebron day, with stock unchanged.

**Acceptance Scenarios**:

1. **Given** an active store and in-stock selections, **When** a customer checks out, **Then** one order is created in `PENDING_MERCHANT_CONFIRMATION` and both dashboards show it immediately.
2. **Given** a new order, **When** it is created, **Then** available quantity does not change.
3. **Given** a pending order, **When** the merchant opens WhatsApp, **Then** the chat is addressed to the customer's phone and the message lists the items, the merchandise total, and the city's delivery amount. Opening the chat does not confirm the order.
4. **Given** a city with no delivery price, **When** the WhatsApp message is built, **Then** no delivery number is invented. The merchandise total is still shown, and the delivery amount is shown as not set.
5. **Given** a pending order the buyer confirms, **When** the merchant confirms and every item has enough quantity, **Then** the order becomes `CONFIRMED`, each item's quantity is deducted once, and a stock movement is recorded for each deduction.
6. **Given** a pending order where any item lacks quantity, **When** the merchant confirms, **Then** no item is deducted, the order does not become `CONFIRMED`, the failed item is marked for resolution, and the merchant sees a conflict.
7. **Given** an already confirmed order, **When** confirm is requested again, **Then** the same confirmed order is returned and quantities do not change.
8. **Given** a pending order with two recorded WhatsApp attempts on the same Asia/Hebron day and no buyer confirmation, **When** the merchant cancels it, **Then** the status is `CANCELLED_UNCONFIRMED`, the default reason is that the customer was not confirmed, and stock is unchanged.
9. **Given** a pending order with fewer than two recorded WhatsApp attempts, **When** the merchant cancels it as unconfirmed, **Then** the cancel is refused and the order stays pending.
10. **Given** a confirmed order, **When** the merchant tries to cancel or edit it, **Then** the action is refused.
11. **Given** two merchants, **When** one lists orders, **Then** the other's orders are absent.
12. **Given** an order with more than one product, **When** it is confirmed or priced, **Then** each line keeps its own quantity deduction and its own profit.

---

### User Story 5 - Inventory, fulfillment, and missing-stock resolution (Priority: P2)

Available quantity is one shared Velvet quantity. Every merchant and every
storefront sees the same number. After confirmation, Velvet prepares, packs
without branding, ships, and collects payment. Packaging adds no charge for
the merchant. Velvet pays the delivery cost; the customer pays the delivery
amount on top of the merchandise. If the warehouse finds, after confirmation,
that an item is not actually there, the whole order is not cancelled. The
administrator marks that item missing, the merchant is asked to contact the
buyer, and the item is replaced or removed. There is no return after delivery.

**Why this priority**: Fulfillment and warehouse exceptions are Velvet's job,
and a missing line must not discard the rest of the order.

**Independent Test**: Move a confirmed order through processing, packed, out
for delivery, and delivered-and-collected. Mark one confirmed line missing and
confirm the ledger reverses that line's deduction, a separate discrepancy
keeps those units unsellable, and repeating the mark changes nothing. Replace
another line only after the substitute has stock. Remove a missing line and
confirm its profit is zero while the other lines stay active.

**Acceptance Scenarios**:

1. **Given** a confirmed order, **When** an administrator advances it, **Then** it moves only through `PROCESSING`, `PACKED`, `OUT_FOR_DELIVERY`, and `DELIVERED_COLLECTED`, in that order.
2. **Given** a confirmed order that has not been delivered, **When** an administrator cancels it for an operational reason, **Then** the status is `CANCELLED_OPERATIONAL` and each quantity still held for an active line is returned once. A warehouse-miss discrepancy is not returned to sale.
3. **Given** a delivered and collected order, **When** someone tries to return it, **Then** the return is refused.
4. **Given** a confirmed order, **When** an administrator marks one line unavailable in the warehouse, **Then** that line becomes `MISSING_IN_WAREHOUSE`, the order becomes `NEEDS_ITEM_RESOLUTION`, the merchant is notified, the ledger reverses that line's original confirmation deduction, and a separate physical-discrepancy entry keeps that quantity unsellable. Other lines stay active. Sellable quantity does not increase.
5. **Given** the same missing line, **When** the administrator marks it unavailable again, **Then** the ledger does not reverse the deduction a second time and does not record a second discrepancy.
6. **Given** an item missing in the warehouse and a buyer who accepts a substitute, **When** the replacement is recorded and the substitute has enough sellable quantity, **Then** the substitute is added with the current selling price, merchant price, and profit, only the substitute is deducted, and the previous line remains in the audit trail with no profit. Other lines stay active.
7. **Given** a substitute that does not have enough sellable quantity, **When** replacement is recorded, **Then** the replacement is refused, no substitute is deducted, and the order stays in `NEEDS_ITEM_RESOLUTION`.
8. **Given** a missing item and no accepted substitute, **When** it is removed, **Then** that line's profit becomes zero, the order merchandise total and merchant profit are recalculated, and the other lines stay active. Removal does not deduct or restore stock again.
9. **Given** every item on an order is removed, **When** resolution finishes, **Then** the order becomes `CANCELLED_OPERATIONAL` and it has no merchant profit.
10. **Given** every missing item is resolved and at least one item remains, **When** resolution finishes, **Then** the order returns to the fulfillment status it had before the exception.
11. **Given** a merchant, **When** they view quantity, **Then** they see the shared available quantity and cannot edit it. The missing units are not included in that quantity.

---

### User Story 6 - Thursday settlements in Asia/Hebron (Priority: P3)

Every Thursday, in Asia/Hebron, Velvet closes a settlement for each merchant.
Only orders that are delivered and collected, and that are not already on a
settlement, are included. The amount is the sum of each included line's
per-unit merchant profit multiplied by the eligible quantity. Cancelled orders
and orders that were not collected are excluded. The same order cannot appear
on two settlements. Paying a settlement records the time, the merchant's
payout method, and a reference or note when one exists. The program does not
send the money itself.

**Why this priority**: Merchant profit becomes payable only after Velvet has
delivered the goods and collected the customer's payment.

**Independent Test**: Deliver and collect two orders, leave one pending, close
Thursday twice, and confirm one statement contains only the two collected
orders. Pay it with the merchant's payout method and confirm a second close
does not add those orders again.

**Acceptance Scenarios**:

1. **Given** Thursday in Asia/Hebron and delivered-and-collected orders that are not yet settled, **When** an administrator closes the settlement, **Then** each merchant receives one statement for those orders.
2. **Given** a statement already closed for that merchant on that Thursday run, **When** close runs again, **Then** the same statement is returned and totals do not change.
3. **Given** a pending, cancelled, or undelivered order, **When** Thursday close runs, **Then** that order is excluded.
4. **Given** an unpaid statement, **When** an administrator marks it paid, **Then** the statement stores the paid time, the merchant's payout method, and any reference or note.
5. **Given** a paid statement, **When** someone tries to add or remove an order, **Then** the change is refused.
6. **Given** the merchant earnings screen, **When** they review their orders, **Then** each order shows its number, selling total, merchant price, profit, payment state, and whether it has entered a Thursday settlement.
7. **Given** a Thursday statement, **When** the merchant opens it, **Then** they see the statement date, total, payout method, and the orders inside it.

---

### User Story 7 - Admin management (Priority: P2)

Administrators manage merchants, stores, both prices, stock visibility,
orders, fulfillment, missing items, and settlements. Merchants cannot do
those jobs. Staff without the matching permission are refused. One company
cannot see another company's Velvet records.

**Why this priority**: Velvet remains the only operator of catalog, stock,
prices, fulfillment, collection, and payout recording.

**Independent Test**: As an administrator, set both prices, deactivate a
store, advance an order, resolve a missing item, and close a settlement. As a
merchant, confirm each of those actions is refused.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they search merchants, **Then** they can view and activate or deactivate the merchant and the store.
2. **Given** an administrator, **When** they open products, **Then** they see selling price, merchant price, computed profit, and shared stock.
3. **Given** an administrator, **When** they filter orders by merchant or store, **Then** the list shows the order states from this specification.
4. **Given** a merchant, **When** they try to change prices, stock, fulfillment, or settlement payment, **Then** the action is refused.
5. **Given** iCare dropshipping records, **When** Velvet orders and settlements change, **Then** those iCare records stay unchanged.
6. **Given** real Velvet orders, **When** an administrator opens totals, **Then** they see total sales and merchant profit calculated from those orders. Empty history shows zero, not a sample figure.
7. **Given** a missing-item notification, **When** the merchant opens it, **Then** it asks them to contact the buyer and can be marked read.

---

### Edge Cases

- A store link is unique. After creation it does not change when the display
  name changes, so existing links keep working.
- One merchant has one store.
- Registration does not wait for an approval queue. Deactivation is how Velvet
  stops a merchant or a store.
- Cart and checkout do not deduct stock. Only a successful confirmation does.
- Confirmation is all or nothing. One short item rolls back every deduction
  for that attempt.
- Operational cancellation returns deducted quantities once. A second cancel
  does not return them again.
- A warehouse miss does not cancel the rest of the order. Its confirmation deduction is reversed in the ledger, and a separate discrepancy keeps those units out of sellable quantity. Repeating the miss does not repeat either entry.
- An operational cancel returns only quantities that are still held for active lines. It does not put a warehouse-miss discrepancy back on sale.
- Replacement uses the prices current at replacement time and keeps the old
  line in the audit trail.
- Delivery amount is added once per order, from the company's existing delivery
  price for the customer's city. It is not multiplied per item and it is not
  merchant profit.
- Packaging is unbranded and creates no merchant charge.
- No coupon, discount, or post-delivery return exists in this program.
- The same-day second WhatsApp attempt and the unconfirmed cancellation are
  merchant actions. The calendar day is Asia/Hebron. Unconfirmed cancellation
  is available only after two recorded attempts that day. The program does not
  send the WhatsApp message by itself and does not auto-cancel at midnight.
- Changing the logo or store name does not regenerate images already stored.
- Arabic and English labels are both available. Missing Arabic copy shows the
  English copy.
- Disabled or unfinished areas show an honest empty state and do not show
  sample merchants, orders, or balances.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let any person register as a merchant and create one store with a name, a logo, and a unique stable link `/store/{slug}`.
- **FR-002**: The system MUST let an administrator activate or deactivate a merchant and a store. Checkout MUST be refused when the merchant or the store is not active.
- **FR-003**: The system MUST show the merchant a dashboard with overview, store identity, full catalog, selected products, orders, earnings, and payout settings.
- **FR-004**: The system MUST show a public store page with the store name, logo, selected products, selling price, available quantity, and add to cart, using one fixed template and no banner or page builder. When the catalog already has categories, the page MUST group selected products by those categories, and the merchant MUST NOT control that grouping.
- **FR-005**: The system MUST let a merchant add any active Velvet catalog product and later remove that selection from the store. The merchant MUST NOT edit the product's core data, prices, or stock. Removing a selection MUST NOT change existing order snapshots.
- **FR-006**: The system MUST generate a merchant image when a product is added, using only the admin-designated clean image, the store name, and the logo.
- **FR-007**: The system MUST NOT use a Velvet-branded image as the source or as the shop image.
- **FR-008**: If image generation fails, or no clean image is designated, the system MUST keep the product on the store, show a clean unbranded fallback, and record the failure for retry.
- **FR-009**: The system MUST NOT automatically regenerate existing merchant images when the logo or store name changes. Images generated after the change MUST use the current identity.
- **FR-010**: The system MUST let an administrator set a customer selling price and a merchant price for each offered product. Merchant profit per unit MUST equal selling price minus merchant price.
- **FR-011**: The system MUST reject a merchant price change from a merchant, and MUST reject an administrator save that would make profit negative.
- **FR-012**: The system MUST snapshot selling price, merchant price, and per-unit profit onto each order line at creation, and again onto a replacement line at replacement time.
- **FR-013**: The system MUST create a guest checkout order that appears immediately on the owning merchant dashboard and the admin dashboard, without deducting stock.
- **FR-014**: The system MUST give the merchant a WhatsApp action that opens a chat to the customer's phone with the items, merchandise total, and the city's delivery amount.
- **FR-015**: The system MUST take the delivery amount from the company's existing delivery price for the customer's city, MUST add it once to the amount the customer is asked to pay, and MUST exclude it from merchant profit. A missing city price MUST be shown as not set and MUST NOT be invented.
- **FR-016**: The system MUST confirm an order only as one indivisible step that verifies every line, deducts every quantity, records a movement per deduction, and then sets `CONFIRMED`. Stock and profit MUST be calculated independently for each line. A repeated confirmation MUST NOT deduct again.
- **FR-017**: If any line lacks quantity at confirmation, the system MUST deduct nothing, leave the order unconfirmed, mark that line for resolution, and return a conflict.
- **FR-018**: The system MUST let the merchant cancel a still-pending order as `CANCELLED_UNCONFIRMED` only after two WhatsApp attempts are recorded for that order on the same Asia/Hebron day. The default reason is that the customer was not confirmed. Stock MUST stay unchanged. A cancel before the second recorded attempt MUST be refused.
- **FR-019**: After `CONFIRMED`, the merchant MUST be able to read the order and MUST NOT be able to edit or cancel it.
- **FR-020**: The system MUST let an administrator move a confirmed order through `PROCESSING`, `PACKED`, `OUT_FOR_DELIVERY`, and `DELIVERED_COLLECTED`.
- **FR-021**: The system MUST let an administrator cancel a not-yet-delivered order as `CANCELLED_OPERATIONAL` and MUST return, exactly once, only quantities still held for active lines. A physical discrepancy from a warehouse miss MUST stay unsellable.
- **FR-022**: The system MUST refuse a return after `DELIVERED_COLLECTED`.
- **FR-023**: When an administrator marks a confirmed line unavailable, the system MUST, in one indivisible step, set that line to `MISSING_IN_WAREHOUSE`, move the order to `NEEDS_ITEM_RESOLUTION`, notify the merchant, reverse that line's original confirmation deduction in the inventory ledger, and record a separate physical-stock discrepancy for the same quantity. The missing quantity MUST NOT become sellable. Other lines MUST stay active. Repeating the mark MUST NOT reverse or record the discrepancy again.
- **FR-024**: The system MUST support replacement and removal of a missing line. Removal sets that line's profit to zero, recalculates the order, and MUST NOT move stock again. Replacement MUST verify the substitute's sellable quantity and deduct only that substitute when enough is available; otherwise it MUST refuse the replacement. Unaffected lines MUST stay active. The prior line stays in the audit trail.
- **FR-036**: Every inventory adjustment, including confirmation, operational cancel, warehouse-miss reversal, physical discrepancy, and replacement deduction, MUST commit with its order change or not at all, MUST be safe to repeat, and MUST leave an audit record of the actor, reason, quantity, and order line.
- **FR-025**: When no shippable line remains, the order MUST become `CANCELLED_OPERATIONAL` with zero merchant profit. When at least one shippable line remains, the order MUST return to the fulfillment status it had before the exception.
- **FR-026**: The system MUST close Thursday settlements in Asia/Hebron for `DELIVERED_COLLECTED` orders that are not already settled. The statement total MUST equal the sum of per-unit merchant profit multiplied by eligible quantity.
- **FR-027**: The system MUST refuse to place the same order on two settlements, and MUST exclude cancelled and uncollected orders.
- **FR-028**: The system MUST let an administrator mark a statement paid by recording the paid time, the merchant's payout method, and an optional reference or note. The system MUST NOT send the payout.
- **FR-029**: The system MUST let the merchant store one payout method: bank transfer, electronic wallet, or direct handover.
- **FR-030**: The system MUST scope every Velvet read and write to the server-resolved company and to the merchant identified by the session. A merchant MUST NOT supply another merchant's identity to read or write their data.
- **FR-031**: The system MUST keep Velvet stores, prices, images, orders, movements, and settlements separate from iCare dropshipping records.
- **FR-032**: The system MUST leave Product Display Priority behavior unchanged.
- **FR-033**: The system MUST record an audit trail for price changes, stock movements, order status changes, missing-item decisions, and settlement payment.
- **FR-034**: Merchant and admin screens MUST support Arabic and English and the existing direction-aware layout.
- **FR-035**: The system MUST NOT apply coupons or discounts in this program, and MUST NOT charge the merchant for packaging.
- **FR-037**: The merchant earnings view MUST show, for each order, the order number, selling total, merchant price, profit, payment state, and whether that order is on a Thursday settlement, plus the settlement history with date, total, payout method, and included orders.
- **FR-038**: The administrator MUST be able to see total sales and total merchant profit calculated from stored Velvet orders. The system MUST show zero when there are none.
- **FR-039**: The system MUST notify the merchant when a line needs buyer contact, and the merchant MUST be able to mark that notification read.
- **FR-040**: Velvet permissions MUST be added without removing or weakening existing platform permissions. Shared stock and catalog prices remain owned by their current records.

### Key Entities

- **Merchant**: A registered seller in one company, with active or inactive status, one payout method, and payout details.
- **Store**: One store per merchant, with name, logo, stable unique slug, and active or inactive status.
- **Velvet offer**: A catalog product, and variant when the catalog sells it that way, with admin selling price, admin merchant price, active flag, and the designated clean image.
- **Merchant product**: The merchant's selection, with the generated image, generation status, and active flag.
- **Order**: A customer purchase on one store, with customer name, phone, city, full address, merchandise total, delivery amount, merchant profit total, status, confirmation time, and collection time.
- **Order line**: Product, quantity, per-unit selling price, merchant price, and profit snapshots, plus a line status for normal, missing, removed, or replaced.
- **Stock movement**: A traceable ledger entry with reason, quantity delta, and order line when the entry belongs to an order. A warehouse miss writes two entries: a reversal of that line's confirmation deduction, and a separate physical discrepancy that keeps the same quantity unsellable.
- **Settlement**: One Thursday statement for one merchant, with period, total, payout method, paid time, reference, and status draft or paid.
- **Settlement line**: One order included in one statement, with the profit amount.
- **Notification**: A message to a merchant, including the request to contact the buyer about a missing line. It records when the merchant has read it.

### Order states

```text
PENDING_MERCHANT_CONFIRMATION
  → CONFIRMED
  → CANCELLED_UNCONFIRMED   (only after two WhatsApp attempts on the same Asia/Hebron day)
  → NEEDS_ITEM_RESOLUTION   (only when confirmation finds a short line; no stock is deducted)

CONFIRMED
  → PROCESSING → PACKED → OUT_FOR_DELIVERY → DELIVERED_COLLECTED
  → CANCELLED_OPERATIONAL
  → NEEDS_ITEM_RESOLUTION

NEEDS_ITEM_RESOLUTION
  → previous fulfillment status, when a shippable line remains
  → CANCELLED_OPERATIONAL, when no shippable line remains

DELIVERED_COLLECTED, CANCELLED_UNCONFIRMED, and CANCELLED_OPERATIONAL are terminal.
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can register, create a store, and open the merchant dashboard in one sitting.
- **SC-002**: In acceptance tests, 100% of merchant shop images are either generated from the designated clean image or are the unbranded fallback. Zero shop images are Velvet-branded sources.
- **SC-003**: In acceptance tests, merchant profit per unit equals selling price minus merchant price on 100% of saved offers and order lines, and 100% of merchant attempts to edit a price are refused.
- **SC-004**: Creating an order changes available quantity by zero. One successful confirmation changes it by exactly the ordered quantities. A repeated confirmation changes it by zero.
- **SC-005**: Two confirmations competing for the last unit produce one success and one conflict, and the shared quantity never goes below zero.
- **SC-006**: Marking a confirmed line unavailable reverses its confirmation deduction once and records one matching discrepancy. Sellable quantity does not increase. Removing that line sets its profit to zero and leaves other lines active. Replacing a line deducts only the substitute, and only when that substitute has enough sellable quantity.
- **SC-007**: Closing the same Thursday merchant settlement twice produces one statement. A second close does not change its total. Only delivered-and-collected, previously unsettled orders are included.
- **SC-008**: Acceptance tests show that Velvet orders and a paid settlement leave iCare marketers, orders, and withdrawal balances unchanged.
- **SC-009**: A merchant cannot read another merchant's orders, earnings, or settlements. A company cannot read another company's Velvet records.
- **SC-010**: The public store, merchant dashboard, and admin dashboard used by this program have Arabic and English labels, and layout direction follows the selected language.
- **SC-011**: One acceptance journey can register a merchant, create a store, add a product, place an order, confirm it, fulfill it, collect payment, show the merchant profit, and include that order in one Thursday settlement.

## Assumptions

- The business flow and the developer specification named above are the source of truth. This revision replaces earlier draft assumptions that conflict with them.
- The worked price example in the business flow is a selling price of 100 shekels, a merchant price of 80 shekels, and a profit of 20 shekels. Stored amounts use the store currency and this example's arithmetic.
- Shared sellable quantity remains the company catalog quantity. Velvet records the movements. It does not keep a second warehouse quantity and it does not write iCare dropshipping stock.
- The clean product image is designated by an administrator on the Velvet offer. The merchant store never falls back to a Velvet-branded catalog image.
- The public store page is part of the existing public storefront surface, at `/store/:slug`, with cart and checkout for this program. It is not a separate website and it is not only an admin preview.
- WhatsApp is a chat the merchant starts toward the customer. The program does not call a WhatsApp Business sender and does not claim the message was delivered.
- Thursday settlement uses the Asia/Hebron calendar. Eligible orders are every delivered-and-collected order not already settled, including older unsettled orders. The overview "week profit" is merchant profit collected since the most recent Thursday 00:00 in Asia/Hebron.
- Payout recording stores the merchant's chosen method. It does not move money.
- iCare dropshipping and Product Display Priority stay unchanged.
- Schema creation still requires approval before a database is changed. This reconciliation does not approve implementation.
- Warehouse-miss handling is decided: reverse the confirmation deduction in the ledger, and record the physical shortage separately so the missing quantity is not sellable.
- Velvet `company_id` and `user_id` columns use the platform's existing text identifiers. A disposable local database run showed that UUID columns cannot store those identifiers.
