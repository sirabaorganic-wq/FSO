# FSO — PHASE 5 SCHEMA GAP REPORT & RESOLUTION
**Flash Sales Online (FSO) — Logistics & Fulfillment Authority**
**Date**: September 2026
**Authority**: Prisma ORM (v6.19.3) & Neon PostgreSQL
**Directives**: Incorporating Mandatory Phase 5 Amendments (Amendments 1, 2, 12)

---

## 1. Schema Authority & Invariance Constraint
The existing `schema.prisma` is the sole database authority. No Prisma schema migrations or untracked tables are permitted.

---

## 2. Concept Mapping Table

| Business Concept | Prisma Model | Prisma Field | Shiprocket Field | Constraint & Semantics |
|---|---|---|---|---|
| FSO Commercial Order | `Order` | `id`, `orderNumber` | `channel_order_id` / tracking reference | Aggregate commercial order |
| Customer Delivery Address | `Order` | `shippingAddress` (Json) | `billing_*`, `shipping_*` | Stored on `Order`, inherited by all `VendorOrder`s |
| Vendor Fulfillment Partition | `VendorOrder` | `id`, `vendorOrderNumber` | `order_id` | Authoritative single-vendor logistics unit |
| Shiprocket Order ID | `VendorOrder` | `shiprocketOrderId` | `order_id` (provider response) | String/Numeric Shiprocket internal ID |
| Shiprocket Shipment ID | `VendorOrder` | `shipmentId` | `shipment_id` | Unique shipment identifier |
| Air Waybill Tracking Code | `VendorOrder` | `awbCode` | `awb_code` | Courier AWB tracking number |
| Carrier Name | `VendorOrder` | `courierName` | `courier_name` | Name of assigned courier company |
| Provider Tracking URL | `VendorOrder` | `trackingUrl` | `label_url` | Direct shipping label or tracking link |
| Vendor Pickup Location | `Vendor` | `shiprocketPickupCode`, `pickupAddress` | `pickup_location` | Must match verified Shiprocket location nickname |
| Webhook Event Idempotency | `WebhookLog` | `eventId` (`@unique`), `provider` | `event_id` / derived immutable fingerprint | Prevents duplicate processing |
| Refund Record | `RefundLog` | `razorpayRefundId` (`@unique`), `amount` | N/A (Razorpay financial authority) | Financial refund logging |

---

## 3. Evaluated Schema Gaps & Authoritative Rules

### Gap 1: Package Weight Authority (Amendment 1)
- **Constraint**: `Product` and `OrderItem` models do not have scalar `weight` columns.
- **Strict Rule**:
  - Do NOT treat `Product.packSize` or `OrderItem.variant` as automatically equivalent to shipping weight.
  - Do NOT infer mass from volume units (e.g. `1 L = 1 kg` or `500 ml = 0.5 kg` is strictly prohibited).
  - Do NOT invent artificial `weightPerItem` values.
- **Authoritative Resolution**:
  1. Check if line item snapshot contains an explicit `weight` (numeric > 0).
  2. Alternatively, check if `product.packSize` or `item.variant` explicitly declares mass in metric mass units:
     - Grams (`g`, `gm`, `gram`, `grams`) → converted to kg (`value / 1000`).
     - Kilograms (`kg`, `kilogram`, `kilograms`) → numeric kg.
  3. If authoritative mass cannot be established:
     - **FAIL VALIDATION TRUTHFULLY with error code: `MISSING_PACKAGE_WEIGHT`**.
     - Do NOT dispatch with fake defaults.

---

### Gap 2: Package Dimensions Authority (Amendment 2)
- **Constraint**: `Product` and `OrderItem` models do not have `length`, `breadth`, or `height` columns.
- **Strict Rule**:
  - Do NOT introduce `10x10x10` cm as a new fallback or move it into `SiteSettings`.
  - Use configured authoritative packaging dimensions only.
- **Authoritative Resolution**:
  1. Check authoritative packaging configuration from `SiteSettings` (`key: "shippingConfig"`, `value.packageDimensions: { length, breadth, height }`) or vendor packaging settings.
  2. If packaging dimensions are not configured:
     - **FAIL VALIDATION TRUTHFULLY with error code: `MISSING_PACKAGE_DIMENSIONS`**.
     - Do NOT send fake defaults merely to satisfy the external API.

---

### Gap 3: VendorOrder Shipping Address
- **Constraint**: `VendorOrder` model does not have a `shippingAddress` column.
- **Authoritative Resolution**:
  - `Order.shippingAddress` (Json) is the authoritative customer delivery address.
  - Required fields (`address`, `city`, `state`, `postalCode`, `phone`) are validated server-side.
  - Missing address data fails with `INCOMPLETE_SHIPPING_ADDRESS`.

---

### Gap 4: VendorOrder Return Status
- **Constraint**: `VendorOrder` has no `returnStatus` column.
- **Authoritative Resolution**:
  - Returns are tracked via `RefundLog` and business return semantics; no schema migration is needed.
