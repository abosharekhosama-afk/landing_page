# Research: Velvet Dropshipping

Revised 2026-10-06 after reconciliation with
`Velvet_Dropshipping_Business_Flow_AR.docx` and
`Velvet_Dropshipping_Developer_Spec_AR.docx`.

## Decision: Separate program

**Decision**: Keep a new `velvet_dropship_` program. Do not extend iCare
dropshipping tables, routes, or screens.

**Rationale**: iCare is a marketer wallet and withdrawal workflow. Velvet is a
merchant store, buyer confirmation, central fulfillment, and Thursday
statements. The source documents describe that second workflow.

**Alternatives considered**: Reusing `dropshipper_profiles` was rejected in the
first plan and remains rejected.

## Decision: Open registration and one store

**Decision**: Registration creates an active merchant and one active store.
Administrators activate or deactivate. There is no pending approval queue.
The public link is `/store/{slug}` and the slug is stable.

**Rationale**: The developer specification lists open registration as a fixed
decision. The business flow gives each merchant one landing page. Deactivation
is the control, not an approval queue.

**Alternatives considered**: The earlier draft required administrator approval
before selling. That conflicts with the source documents and is withdrawn.

## Decision: Admin prices only

**Decision**: Administrators set `selling_unit_price` and `merchant_unit_price`
on the Velvet offer. Per-unit profit is selling price minus merchant price.
Merchants cannot edit prices. Order lines snapshot both prices and the profit.
No company fee, coupon, or discount applies.

**Rationale**: Both source documents state this formula and forbid merchant
price edits. The worked example is 100, 80, and 20.

**Alternatives considered**: Merchant-entered customer prices and a platform
fee were draft assumptions. They are withdrawn.

## Decision: Clean image, generated merchant image, unbranded fallback

**Decision**: An administrator designates the clean source image. Adding a
product generates a merchant image from that source, the store name, and the
logo. Failure or a missing clean image keeps the selection and shows a
neutral unbranded fallback. Velvet-branded catalog images are never the source
and never the shop image. Later logo or name changes do not regenerate images
already stored.

**Rationale**: The developer specification requires automatic generation, a
safe fallback, and no automatic regeneration of old images.

**Alternatives considered**: Showing the catalog image when generation fails
would publish Velvet branding on the merchant store. That option is rejected.

## Decision: Full store page and both dashboards

**Decision**: The public store, cart, and checkout live on the existing public
storefront surface at `/store/:slug`. The merchant dashboard and the admin
dashboard live in CPanel. The customer has no dashboard.

**Rationale**: The source documents require a fixed landing page, cart,
checkout, and the listed merchant and admin screens inside the current store.
This repository already serves public storefront pages and the admin shell.
The page is not a site builder and it is not only an admin preview.

**Alternatives considered**: API-only shop JSON with the customer page deferred
to a later project. That left the required storefront out of the plan and is
withdrawn.

## Decision: Buyer WhatsApp, then one atomic deduction

**Decision**: The merchant starts a WhatsApp chat to the customer's phone.
The program does not send the message. Stock changes only inside a successful
confirm transaction: verify every line, deduct, write movements, then set
`CONFIRMED`. A replay does not deduct again. A short line aborts the whole
deduction and marks that line for resolution.

**Rationale**: The business flow deducts stock when the merchant presses
confirm after the buyer agrees. The developer specification requires the
transaction to be atomic, idempotent, and not silently partial.

**Alternatives considered**: Deducting on order create, confirming by opening
a link to the company's WhatsApp number, and a WhatsApp Business API were
draft or external options. They conflict with the source documents.

## Decision: Shared catalog stock and a Velvet ledger

**Decision**: Available quantity is the existing catalog quantity. Velvet
writes `velvet_dropship_inventory_movements` in the same transaction. The
writer is `api/src/velvetDropshipping/stock.js`. It does not edit Product
Display Priority files and it does not write iCare `available_stock`.

**Rationale**: The developer specification says to follow the current inventory
shape and to keep a traceable movement for every change.

**Alternatives considered**: A second Velvet warehouse quantity was rejected
because every merchant must see one shared number.

## Decision: Missing item replace or remove

**Decision**: After confirmation, an administrator can mark a line missing.
The order becomes `NEEDS_ITEM_RESOLUTION`. In the same transaction the ledger
reverses that line's confirmation deduction and records a separate physical
discrepancy so the quantity does not become sellable. Removal zeroes that
line's profit and does not move stock again. Replacement verifies and deducts
the substitute only. Other lines stay active. If nothing remains, the order is
`CANCELLED_OPERATIONAL`. Otherwise it returns to the fulfillment status it
had before the exception. Repeating a miss or replacement does not move stock
twice.

**Rationale**: The owner approved this warehouse-miss handling on 2026-10-06.
The business flow still forbids cancelling the whole order because one line
is missing. The developer specification still requires profit recalculation,
an audit trail, and atomic stock changes.

## Decision: Fulfillment states and no return after delivery

**Decision**: States match the developer specification:
`PENDING_MERCHANT_CONFIRMATION`, `CONFIRMED`, `PROCESSING`, `PACKED`,
`OUT_FOR_DELIVERY`, `DELIVERED_COLLECTED`, `CANCELLED_UNCONFIRMED`,
`CANCELLED_OPERATIONAL`, and `NEEDS_ITEM_RESOLUTION`. Operational cancel before
delivery returns stock once. No return exists after delivery. Packaging is
unbranded and free to the merchant. Delivery uses the city's existing delivery
price, is collected from the customer, and is excluded from merchant profit.

**Rationale**: These are listed as fixed decisions in the developer
specification and as the operational path in the business flow.

**Alternatives considered**: A post-delivery return adjustment was in the
draft. It conflicts with "no return after delivery" and is withdrawn.

## Decision: Thursday close in Asia/Hebron

**Decision**: Settlement runs on Thursday in `Asia/Hebron`. Included orders are
those in `DELIVERED_COLLECTED` that have no settlement line yet, including
older unsettled orders. The total is the sum of per-unit profit multiplied by
eligible quantity. Pay records time, the merchant payout method, and an
optional reference. No money is transferred.

**Rationale**: The business flow uses Thursday and only collected deliveries.
The correction to this plan sets the timezone to Asia/Hebron. The developer
formula has no extra platform fee and does not limit eligibility to a
Friday–Thursday window.

**Alternatives considered**: `Asia/Riyadh` and a Friday-through-Thursday window
were draft assumptions. They are withdrawn.

## Decision: Migration 041 stays unapplied

**Decision**: The schema remains a proposed `041_velvet_dropshipping.sql`.
This reconciliation does not approve writing or applying it. `040` and the
Product Display Priority files stay untouched.

**Rationale**: Constitution III. The owner has not approved implementation.
