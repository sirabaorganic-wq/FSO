# FSO — Phase 5: Shiprocket Logistics, Vendor Dispatch & Refund Integrity Verification Report

**Execution Date**: September 17, 2026  
**Status**: PASS — FULL INTEGRATION & LOGISTICS LIFECYCLE VERIFIED  
**Authoritative Persistence Layer**: Neon PostgreSQL via Prisma ORM (v6.19.3)  
**Logistics Provider**: Shiprocket API Integration  
**Payment Gateway**: Razorpay v2.9.6  
**Pre & Post Execution Database Hash**: `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179`  
**BASELINE_RECORDS_UNCHANGED**: `true` (2 Users, 3 Vendors, 0 Products, 0 Orders, 0 Payments, 1 Cart)  

---

## 1. Status: PASS

All Phase 5 requirements, all 12 Mandatory Amendments, all 3 Final Corrections, and all 5 Adversarial Scenarios have been implemented, verified, and regression-tested. Zero live database mutations occurred, and the live Neon database records remain 100% invariant.

---

## 2. Files Changed & Implemented

### Backend Core & Services
- [backend/services/shiprocketService.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/services/shiprocketService.js):
  - **In-flight Concurrency Mutex**: `this.loginPromise` mutex prevents concurrent authentication storms (Amendment 12); cached token reused until expiry.
  - **Per-VendorOrder Shipment Mutex**: `this.inFlightShipments` mutex serializes concurrent shipment creation calls for the same `VendorOrder.id` (Adversarial Scenario 13).
  - **Package Weight Authority**: Extracts authoritative line-item weight or parses verified metric mass (`g`, `kg`) from `product.packSize`. Explicitly rejects volume conversions (e.g. 1 L $\neq$ 1 kg, 500 ml $\neq$ 0.5 kg). Throws `MISSING_PACKAGE_WEIGHT` if mass cannot be authoritatively established (Amendment 1).
  - **Package Dimensions Authority**: Reads configured packaging dimensions from Vendor profile or `SiteSettings`; strictly rejects hardcoded `10x10x10` fake defaults. Throws `MISSING_PACKAGE_DIMENSIONS` when unconfigured (Amendment 2).
  - **Authoritative Contact & Address Verification**: Removed all placeholder defaults (`customer@sirabaorganic.com`, placeholder phone, placeholder city); validates customer destination and vendor pickup location strictly from database records (Amendment 6).
  - **Lost Response Recovery**: Reuses existing `shiprocketOrderId` and assigns AWB idempotently without re-dispatching adhoc order creation (Adversarial Scenario 14).
  - **Cancellation Method**: Added `cancelShipment(awbCode)` returning structured cancellation response.

- [backend/jobs/shiprocketQueue.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/jobs/shiprocketQueue.js):
  - Enriched entity relation loading to include `user` and `vendor`.
  - Removed dummy fallback address strings.

- [backend/services/paymentService.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/services/paymentService.js):
  - **Cumulative Refund Validation**: Enforces that cumulative refunds (`cumulativeRefunded + requestedAmount <= payment.amount`) cannot exceed captured payment; throws `REFUND_EXCEEDS_CAPTURED_AMOUNT` (Correction 1, Scenario 15).
  - **Deterministic Receipt Key**: Accepts deterministic `receipt` key (e.g., `ref_ord_${orderId}`) to prevent duplicate provider debits on network retry (Scenario 15).

- [backend/services/vendor/vendorOrderService.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/services/vendor/vendorOrderService.js):
  - **Monotonic Guards**: Prevents terminal `DELIVERED` orders from being regressed or cancelled.
  - **Vendor Refund Authority**: Vendor-submitted refund amounts in request body are treated as non-authoritative; derived server-side from order financial records and capped strictly by `Payment.amount - cumulativeRefunds` (Amendment 7 & Correction 1).

### Backend Routes & Controllers
- [backend/routes/shiprocketWebhookRoutes.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/routes/shiprocketWebhookRoutes.js):
  - **Fail-Closed Authentication**: Webhook returns HTTP 401 if `SHIPROCKET_WEBHOOK_SECRET` is unset, missing, or mismatched (Amendment 4).
  - **Immutable Event Fingerprinting & Collision Protection**: Derives `sr_wh_${shipment_id || awb}_${status_id || status}_${immutableHash}` using immutable event payload fields (`current_status`, `location`, `activity`, `scan_time`). Contains zero volatile timestamps, deduplicates retransmissions, and prevents false collisions across distinct legitimate scans (Amendment 3 & Correction 2, Scenario 16).
  - **Monotonic State Machine**: Enforces 1-to-1 status mapping; guarantees terminal state `DELIVERED` cannot be regressed by delayed out-of-order `IN TRANSIT` events (Amendment 9).
  - **Absolute Payment Decoupling**: Logistics webhooks never mutate `PaymentStatus` or `Order.paymentStatus` (Amendment 6).
  - **Centralized Parent Order Aggregation Precedence**: Computes parent order status via `computeParentOrderStatus` following strict priority table: `CANCELLED` (all cancelled) $\rightarrow$ `DELIVERED` (all delivered) $\rightarrow$ `PARTIALLY_DELIVERED` $\rightarrow$ `SHIPPED` $\rightarrow$ `PROCESSING` (Amendment 10).

- [backend/routes/shiprocketRoutes.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/routes/shiprocketRoutes.js):
  - **Customer Tracking Security**: Protected `GET /track/:awbCode` with `protect` middleware; verifies user order ownership; rejects cross-user inquiries with HTTP 403 Forbidden.
  - **Hardened Dispatch Retry**: Idempotent `POST /retry/:vendorOrderId`.

- [backend/routes/orderRoutes.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/routes/orderRoutes.js):
  - **Sanitized Public Tracking Projection**: `GET /track/:id` projects zero PII, zero payment details, zero delivery address, and zero vendor margins (Amendment 8).
  - **Cancellation Consistency & External Reconciliation**: `POST /:id/cancel` coordinates Shiprocket AWB cancellation on pre-dispatch orders; on timeout or network loss treats external state as `UNKNOWN`, logs structured reconciliation alert (`Notification`), completes local FSO cancellation atomically, and triggers prepaid refund via `paymentService.initiateRefund` without duplicate cancellation on retry (Amendment 11 & Correction 3, Scenario 17).

### Frontend Integration
- [client/types/customer.ts](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/client/types/customer.ts): Added `ShipmentInfo` and `shipments?: ShipmentInfo[]` to `Order` interface while strictly preserving `CartLine`.
- [client/lib/api/types.ts](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/client/lib/api/types.ts): Added logistics fields (`shiprocketOrderId`, `shipmentId`, `awbCode`, `courierName`, `trackingUrl`, `shippedAt`, `deliveredAt`) to `BackendVendorOrder`.
- [client/lib/api/mappers.ts](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/client/lib/api/mappers.ts): Mapped vendor order shipments in `toFrontendOrder`.
- [client/components/customer/customer-pages.tsx](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/client/components/customer/customer-pages.tsx): Rendered courier name, AWB tracking code, and provider tracking link in `OrderDetailPage`.

### Testing & Verification
- [backend/jest.config.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/jest.config.js): Added `**/tests/shiprocket_logistics_integrity.test.js` to `testMatch`.
- [backend/tests/shiprocket_logistics_integrity.test.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/tests/shiprocket_logistics_integrity.test.js): Created comprehensive test suite with 23 test cases verifying all amendments and adversarial scenarios.
- [backend/tests/shiprocket_vendor_routing.test.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/tests/shiprocket_vendor_routing.test.js): Validated multi-vendor pickup routing (33/33 tests passing).
- [backend/tests/shiprocket_prisma.test.js](file:///c:/Users/hp/OneDrive/Documents/Desktop/fso/backend/tests/shiprocket_prisma.test.js): Verified Prisma WebhookLog and VendorOrder models (4/4 tests passing).

---

## 3. Schema Mapping

The logistics implementation functions 100% within the frozen Prisma schema (`schema.prisma`):

| Business Concept | Prisma Model | Prisma Field | Shiprocket / External Field | Constraint / Rule |
|---|---|---|---|---|
| Vendor Sub-Order | `VendorOrder` | `id` | `order_id` (adhoc) | Relational partition per vendor |
| Logistics Order ID | `VendorOrder` | `shiprocketOrderId` | `order_id` | Provider integer stored as BigInt/String |
| Logistics Shipment ID | `VendorOrder` | `shipmentId` | `shipment_id` | Provider shipment entity reference |
| Air Waybill Tracking Code | `VendorOrder` | `awbCode` | `awb_code` | Courier barcode tracking number |
| Courier Partner | `VendorOrder` | `courierName` | `courier_name` | Assigned carrier (e.g. Delhivery, Bluedart) |
| Public Tracking URL | `VendorOrder` | `trackingUrl` | `tracking_url` | Courier tracking link |
| Sub-Order Logistics State | `VendorOrder` | `status` | Derived from `current_status_id` | Monotonic progression |
| Webhook Event Audit | `WebhookLog` | `eventId` | `sr_wh_${shipment}_${status}_${hash}` | `@unique`, Deduplication idempotency key |
| Webhook Event Category | `WebhookLog` | `eventType` | `current_status` | e.g. `SHIPMENT_DELIVERED` |
| Refund Financial Audit | `RefundLog` | `id` / `orderId` | Internal / References `Order.id` | Persisted refund log |
| Refund Gateway ID | `RefundLog` | `razorpayRefundId` | `rfnd_...` | Razorpay provider refund ID |
| Reconciliation Alert | `Notification` | `id` / `type` / `title` | Internal | Flags unknown external state for ops |

---

## 4. Mandatory Amendments & Adversarial Verification

### Amendments 1 & 2: Package Weight & Dimensions Authority
- **Weight**: Metric mass (`g`, `kg`) parsed; volume units (`L`, `ml`) strictly rejected without assuming density; unestablished mass throws `MISSING_PACKAGE_WEIGHT`.
- **Dimensions**: Sourced from configured vendor profile or `SiteSettings`; fake `10x10x10` default eliminated; unconfigured dimensions throw `MISSING_PACKAGE_DIMENSIONS`.

### Amendment 3 & Correction 2: Immutable Webhook Event Identity
- Deterministic event fingerprint: `sr_wh_${shipment_id || awb}_${status_id || status}_${hash(payload.current_status, payload.location, payload.activity, payload.scan_time)}`.
- Zero timestamps in hash ensures:
  1. Same event delivered twice $\rightarrow$ Exactly 1 mutation.
  2. Distinct legitimate events with same status (e.g. multiple transit hub scans) $\rightarrow$ Distinct fingerprints, zero false collisions.

### Amendments 4, 6, 8, 9, 10: Security, Sanitization & Precedence
- **Fail-Closed Secret**: 401 Unauthorized on missing/invalid secret or unset environment secret.
- **Payment Decoupling**: Logistics webhooks never mutate `PaymentStatus`.
- **Sanitized Tracking**: `GET /api/orders/track/:id` returns zero PII, zero payment data, zero addresses, zero margins.
- **Monotonic State Machine**: Terminal `DELIVERED` cannot be regressed by out-of-order `IN TRANSIT`.
- **Parent Precedence**: Aggregation follows deterministic rule: All Cancelled $\rightarrow$ `CANCELLED`; All Delivered $\rightarrow$ `DELIVERED`; Any Delivered $\rightarrow$ `PARTIALLY_DELIVERED`; Any In-Transit/Shipped $\rightarrow$ `SHIPPED`; Otherwise `PROCESSING`.

### Correction 1 & 3: Vendor Authority, Refund Caps & Financial Sequencing
- Vendor-requested refund amount is non-authoritative; derived server-side from order total and capped at `Payment.amount - cumulativeRefunded`.
- Cumulative refund cap enforces `REFUND_EXCEEDS_CAPTURED_AMOUNT` when refund exceeds captured payment.
- External operations (Shiprocket cancellation, Razorpay refund) are treated as independent. Provider timeout is classified as `UNKNOWN` rather than failure, alerting operations via `Notification` while preserving local FSO cancellation.

### Adversarial Scenarios 13–17 Verification Summary:
- **Scenario 13 (Concurrent Shipments)**: Mutex ensures two simultaneous `createShipment()` calls for the same `VendorOrder` invoke external shipment creation exactly once.
- **Scenario 14 (Lost Response on Create)**: Retry with existing `shiprocketOrderId` skips adhoc order creation and proceeds idempotently.
- **Scenario 15 (Lost Response on Refund)**: Retry using deterministic receipt key (`ref_ord_${orderId}`) prevents duplicate refund debits.
- **Scenario 16 (Legitimate Status Duplicate)**: Distinct scans with identical status produce distinct event fingerprints; no false collisions.
- **Scenario 17 (Cancellation Consistency)**: Customer cancellation succeeds locally in FSO, Shiprocket timeout records reconciliation alert, no duplicate debits occur.

---

## 5. Automated Test Suite Results

### 1. Phase 5 Logistics Integrity Suite (`tests/shiprocket_logistics_integrity.test.js`)
```
PASS tests/shiprocket_logistics_integrity.test.js
  FSO Phase 5: Logistics, Dispatch & Refund Integrity
    1. Authentication & Token Concurrency Mutex
      √ Simultaneous login requests share a single in-flight authentication call (Scenario 13 prerequisite)
      √ Cached token is returned directly without external call
    2. Package Weight Authority (Amendment 1)
      √ Correctly extracts weight from explicit line item weight
      √ Extracts mass in kilograms from packSize specification
      √ Strictly REJECTS volume units as weight (1 L != 1 kg, 500 ml != 0.5 kg)
      √ Throws MISSING_PACKAGE_WEIGHT when authoritative mass cannot be established
    3. Package Dimensions Authority (Amendment 2)
      √ Uses configured packaging dimensions from vendor or SiteSettings
      √ Throws MISSING_PACKAGE_DIMENSIONS when unconfigured; rejects fake 10x10x10 default
    4. Fail-Closed Webhook Authentication (Amendment 4)
      √ Rejects webhook with 401 when SHIPROCKET_WEBHOOK_SECRET is not configured
      √ Rejects webhook with 401 when provided secret is invalid or missing header
    5. Immutable Webhook Event Identity & Idempotency (Amendment 3)
      √ Duplicate webhook delivery results in exactly one effective state mutation (Gate 5)
    6. Monotonic State Machine & Out-of-Order Events (Amendment 9 & 20)
      √ 1-to-1 Provider Status Mapping adheres strictly to specification
      √ DELIVERED status is immutable: ignored when out-of-order IN TRANSIT arrives
    7. Absolute Payment / Logistics Decoupling
      √ Shiprocket webhook delivery NEVER mutates PaymentStatus
    8. Sanitized Public Order Tracking Projection (Amendment 8)
      √ GET /api/orders/track/:id projects zero PII, zero payment details, and zero addresses
    9. Customer Tracking Security & Ownership Verification
      √ GET /api/shiprocket/track/:awbCode returns 403 when user does not own the order
    10. Centralized Parent Order Status Aggregation Precedence
      √ Evaluates complete precedence table deterministically
    11. Cumulative Refund Caps & Vendor Authority
      √ Throws REFUND_EXCEEDS_CAPTURED_AMOUNT when requested refund exceeds captured payment balance
    12. Adversarial Scenarios 13 to 17
      √ Scenario 13: Two concurrent createShipment() calls for the same VendorOrder execute exactly one adhoc creation
      √ Scenario 14: Response lost after successful Shiprocket creation -> retry does not create another adhoc shipment
      √ Scenario 15: Razorpay refund retry with receipt key prevents duplicate refund
      √ Scenario 16: Same shipment/status combination occurring as two legitimate distinct events does not falsely collide
      √ Scenario 17: Cancellation consistency: FSO cancellation succeeds while Shiprocket times out -> reconciliation recorded

Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
```

### 2. Multi-Vendor Pickup Routing (`tests/shiprocket_vendor_routing.test.js`)
```
  Status  : ALL TESTS PASSED
  Passed  : 33 / 33
  Failed  : 0 / 33
```

### 3. Shiprocket Fulfillment & Idempotency Pipeline (`tests/shiprocket_prisma.test.js`)
```
PASS tests/shiprocket_prisma.test.js
  Shiprocket Fulfillment & Idempotency Pipeline
    √ Constructs deterministic idempotency key format: sr_wh_${awb}_${statusId}
    √ Verifies HMAC SHA-256 signature algorithm accurately
    √ Shiprocket controller uses Prisma WebhookLog and VendorOrder models
    √ Shiprocket queue worker uses Prisma VendorOrder and Order models
Tests: 4 passed, 4 total
```

### 4. Phase 4 Razorpay Payment Regression (`tests/razorpay_payment_integrity.test.js`)
```
PASS tests/razorpay_payment_integrity.test.js
Tests: 44 passed, 44 total
```

### 5. Phase 3 Cart & Order Integrity Regression (`tests/cart_order_integrity.test.js`)
```
PASS tests/cart_order_integrity.test.js
Tests: 36 passed, 36 total
```

### 6. Phase 1 Security Regression (`tests/security.test.js`)
```
PASS tests/security.test.js
Tests: 7 passed, 7 total
```

### 7. Frontend TypeScript & Production Build
- `npx tsc --noEmit` in `client`: **0 errors, clean exit**.
- `next build` (Turbopack) in `client`: **Compiled in 22.7s across all 87 static/dynamic routes**.

---

## 6. Neon PostgreSQL Row-Level Database Invariance Assertion

Final forensic row-level hash calculation executed on live database:

```json
=== ROW-LEVEL FORENSIC SNAPSHOT ===
{
  "users": [
    {
      "id": "cmtsunkqj0000vk3g90jtiqvc",
      "email": "admin@fso.in",
      "role": "ADMIN",
      "updatedAt": "2026-09-08T18:08:20.907Z"
    },
    {
      "id": "cmtxbfb2k0002vkloweyxo671",
      "email": "yiwatev648@hebase.com",
      "role": "PRODUCER_MANAGER",
      "updatedAt": "2026-09-11T18:54:31.628Z"
    }
  ],
  "vendors": [
    {
      "id": "cmtsunogt0008vk3gdea8ow6c",
      "slug": "kashmir-saffron-heritage-artisans",
      "email": "ghulam@kashmirsaffron.test",
      "businessName": "Kashmir Saffron & Heritage Artisans",
      "updatedAt": "2026-09-11T13:37:03.376Z"
    },
    {
      "id": "cmtsunozo0009vk3gxx9hidfy",
      "slug": "pahadi-amrut-forest-collective",
      "email": "kamla@pahadiamrut.test",
      "businessName": "Pahadi Amrut Forest Collective",
      "updatedAt": "2026-09-08T15:54:04.740Z"
    },
    {
      "id": "cmtxbfa050001vklox7l89crq",
      "slug": "test-company",
      "email": "yiwatev648@hebase.com",
      "businessName": "Test Company",
      "updatedAt": "2026-09-11T18:54:30.245Z"
    }
  ],
  "productsCount": 0,
  "ordersCount": 0,
  "carts": [
    {
      "id": "cmtxbfd8z0003vklog91144xi",
      "userId": "cmtxbfb2k0002vkloweyxo671",
      "updatedAt": "2026-09-11T18:54:34.452Z"
    }
  ]
}
SNAPSHOT_HASH: 3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179
```

- **Hash Match**: **EXACT MATCH** with baseline hash `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179`.
- **Row Invariance Verified**: `users: 2`, `vendors: 3`, `products: 0`, `orders: 0`, `carts: 1`. Zero rows added, modified, or deleted in the production Neon database.
