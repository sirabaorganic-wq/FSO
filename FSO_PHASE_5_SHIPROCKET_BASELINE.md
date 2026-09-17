# FSO — PHASE 5 SHIPROCKET & LOGISTICS FORENSIC BASELINE
**Flash Sales Online (FSO) — Heritage Kitchen Marketplace**
**Baseline Date**: September 2026
**Persistence Target**: Next.js 16 / React 19 Frontend → Express REST API → Prisma ORM (v6.19.3) → Neon PostgreSQL
**Database Row Hash**: `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179` (Verified invariant: 2 Users, 3 Vendors, 0 Products, 0 Orders, 0 Payments, 0 Reviews, 1 Cart, 0 CartItems)

---

## 1. Prisma Logistics Schema
The logistics entities in `backend/prisma/schema.prisma` are strictly PostgreSQL models:
- **`Vendor`**: Stores vendor fulfillment information, specifically:
  - `shiprocketPickupCode` (`String?`): Location nickname/code registered in Shiprocket (e.g. `VEND_NOIDA_01`).
  - `shiprocketPickupStatus` (`String @default("unregistered")`): Status of pickup location registration.
  - `shiprocketLocationName` (`String?`): Official Shiprocket registered location name.
  - `shiprocketLocationId` (`String?`): Shiprocket address ID.
  - `shiprocketRegisteredAt` (`DateTime?`) & `shiprocketLastVerifiedAt` (`DateTime?`).
  - `shiprocketLastError` (`String?`).
  - `pickupAddress` (`Json?`): Detailed pickup address object `{ contactPerson, phone, addressLine1, addressLine2, city, state, pincode, country }`.
  - Core address fields: `addressStreet`, `addressCity`, `addressState`, `addressPostalCode`, `addressCountry`.
- **`VendorOrder`**: The authoritative vendor fulfillment unit (see Section 3).
- **`WebhookLog`**: Provider webhook log with unique `eventId` (`@unique`).
- **`SiteSettings`**: Optional home settings with `shippingConfig` Json.

---

## 2. Order Schema
`model Order`:
- Primary Key: `id String @id @default(cuid())`
- Fields:
  - `orderNumber String @unique`
  - `userId String`, `user User @relation(...)`
  - `status OrderStatus @default(PENDING)` (`PENDING`, `CONFIRMED`, `PROCESSING`, `DISPATCHED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`)
  - `paymentStatus PaymentStatus @default(PENDING)` (`PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`)
  - `paymentMethod String @default("ONLINE")`
  - `subtotal Float`, `taxPrice Float @default(0)`, `shippingPrice Float @default(0)`, `discountPrice Float @default(0)`, `totalPrice Float`
  - `shippingAddress Json`: `{ fullName/name, address, city, state, postalCode, country, phone }`
  - `billingAddress Json?`
  - `isPaid Boolean @default(false)`, `paidAt DateTime?`
  - `isDelivered Boolean @default(false)`, `deliveredAt DateTime?`
  - `cancelledAt DateTime?`, `cancellationReason String?`
- Relations:
  - `orderItems OrderItem[]`
  - `vendorOrders VendorOrder[]`
  - `payments Payment[]`
  - `refunds RefundLog[]`

---

## 3. VendorOrder Schema
`model VendorOrder`:
- Primary Key: `id String @id @default(cuid())`
- Relational Keys:
  - `vendorOrderNumber String @unique`
  - `orderId String`, `order Order @relation(...)`
  - `vendorId String`, `vendor Vendor @relation(...)`
- Fulfillment & Financial Fields:
  - `status VendorOrderStatus @default(PENDING)` (`PENDING`, `ACCEPTED`, `PROCESSING`, `READY_TO_SHIP`, `SHIPPED`, `DELIVERED`, `CANCELLED`)
  - `subtotal Float`, `shippingFee Float @default(0)`, `taxAmount Float @default(0)`
  - `commissionRate Float @default(0)`, `commissionAmount Float @default(0)`
  - `payoutAmount Float`, `payoutStatus String @default("pending")`
- Authoritative Shiprocket Logistics Identifiers:
  - `shiprocketOrderId String?`: Numeric/string identifier returned by Shiprocket (`/orders/create/adhoc`).
  - `shipmentId String?`: Shiprocket shipment identifier.
  - `awbCode String?`: Carrier Air Waybill tracking number.
  - `courierName String?`: Assigned courier name (e.g. "Delhivery", "BlueDart").
  - `trackingUrl String?`: Generated shipping label / tracking URL.
  - `shippedAt DateTime?`
  - `deliveredAt DateTime?`
  - `items Json`: JSON snapshot of line items belonging to this vendor.

---

## 4. RefundLog Schema
`model RefundLog`:
- Primary Key: `id String @id @default(cuid())`
- Relational Keys:
  - `orderId String`, `order Order @relation(...)`
  - `paymentId String?`
  - `razorpayRefundId String? @unique`
- Fields:
  - `amount Float`: Refunded amount in INR.
  - `reason String?`: Cancellation or return justification.
  - `status String @default("processed")`
  - `createdAt DateTime @default(now())`

---

## 5. Payment Schema
`model Payment`:
- Primary Key: `id String @id @default(cuid())`
- Relational Keys:
  - `orderId String`, `order Order @relation(...)`
  - `razorpayOrderId String`
  - `razorpayPaymentId String @unique`
- Fields:
  - `razorpaySignature String?`
  - `amount Float`
  - `currency String @default("INR")`
  - `status PaymentStatus @default(PENDING)`
  - `method String?`, `bank String?`, `wallet String?`, `vpa String?`
  - `errorReason String?`, `rawResponse Json?`

---

## 6. Existing Shiprocket Implementation
Existing files:
- `backend/services/shiprocketService.js`: Contains `login()`, `registerPickupLocation()`, `checkServiceability()`, `verifyPickupLocation()`, `assignAwb()`, `generatePickup()`, `createShipment()`, `cancelShipment()`, `trackOrder()`, and `rollbackInventory()`.
- `backend/jobs/shiprocketQueue.js`: BullMQ queue `shiprocket-shipments` and worker using Redis connection.
- `backend/controllers/shiprocketController.js`: Standalone controller with `handleWebhook` (not mounted in `server.js`).
- `backend/routes/shiprocketRoutes.js`: Mounted at `/api/shiprocket` with `/track/:awbCode`, `/serviceability`, and `/retry/:vendorOrderId`.
- `backend/routes/shiprocketWebhookRoutes.js`: Mounted at `/api/fulfillment/status` and `/api/shiprocket/webhook`.
- `backend/routes/shippingRoutes.js`: Multi-vendor shipping fee calculation using Shiprocket serviceability.

---

## 7. Shiprocket API Version
- Base URL: `https://apiv2.shiprocket.in/v1/external` (API v2 External API).
- Endpoints utilized:
  - POST `/auth/login`
  - GET `/settings/company/pickup`
  - POST `/settings/company/addpickup`
  - GET `/courier/serviceability/`
  - POST `/orders/create/adhoc`
  - POST `/courier/assign/awb`
  - POST `/courier/generate/pickup`
  - POST `/orders/cancel/awb`
  - GET `/courier/track/awb/{awbCode}`

---

## 8. Authentication Mechanism
- HTTP Basic payload `{ email, password }` sent to POST `/auth/login`.
- Returns JWT Bearer token valid for ~10 days.
- Existing caching mechanism:
  - Redis cache `shiprocket_token` (TTL 8 days) with silent fallback to in-memory `this.inMemoryToken`.
  - **Identified Gap**: No concurrency mutex. If token expires or is uninitialized, simultaneous requests can trigger parallel login requests (token stampede). Must add in-flight login promise locking.

---

## 9. Existing Shipment Identifiers
- `vendorOrder.shiprocketOrderId`: Shiprocket order identifier (`order_id` in provider payload).
- `vendorOrder.shipmentId`: Shiprocket shipment identifier (`shipment_id` in provider payload).
- `vendorOrder.awbCode`: Carrier AWB code.

---

## 10. Existing AWB Mapping
- On adhoc order creation (`/orders/create/adhoc`), Shiprocket may return `awb_code` immediately, or require explicit assignment via POST `/courier/assign/awb` using `shipment_id`.
- Persisted to `VendorOrder.awbCode`.

---

## 11. Existing Tracking Implementation
- Backend: `shiprocketService.trackOrder(awbCode)` queries `GET /courier/track/awb/{awbCode}`.
- Route: `GET /api/shiprocket/track/:awbCode` exists but is currently public with no customer ownership verification.
- Route: `GET /api/orders/track/:id` returns order and orderItems.
- Frontend: `OrderDetailPage` displays timeline based on `order.status` and `order.date`. It does not yet display courier name, AWB, or tracking URL from `vendorOrders`.

---

## 12. Existing Webhook Implementation
- Mounted at:
  - `POST /api/fulfillment/status`
  - `POST /api/shiprocket/webhook`
- Handled in `backend/routes/shiprocketWebhookRoutes.js`.
- Security: Checks `x-api-key`, `x-shiprocket-secret`, or `shiprocket-secret` against `process.env.SHIPROCKET_WEBHOOK_SECRET`.
- Idempotency: Creates `WebhookLog` with `eventId = sr_wh_${rawId}` before processing.

---

## 13. Cancellation Implementation
- Customer cancellation: `POST /api/orders/:id/cancel` in `backend/routes/orderRoutes.js`.
  - Verifies `order.userId === req.user.id`.
  - Checks if status is not in `["SHIPPED", "DELIVERED", "CANCELLED"]`.
  - Atomically increments product stock, marks `Order` as `CANCELLED`, and marks all `VendorOrder`s as `CANCELLED`.
  - **Identified Gap**: Does not cancel active Shiprocket shipment (`cancelShipment(awbCode)`) if AWB exists.
- Vendor cancellation: `PUT /api/vendors/orders/:id/status` with `CANCELLED`.
  - **Identified Gap**: Does not invoke Shiprocket shipment cancellation or calculate vendor-specific refund.

---

## 14. Return Implementation
- Phase 2 established: Returns are tracked via `RefundLog` and business return semantics; `VendorOrder` schema has no `returnStatus` column.
- Vendor returns query: `GET /api/vendors/returns` queries `RefundLog` where `orderId` belongs to vendor orders.
- Admin returns query: `GET /api/admin/orders/returns` queries `RefundLog`.

---

## 15. Refund Implementation
- Payment refunds are handled by `backend/services/paymentService.js`: `initiateRefund(paymentId, amount, reason)`.
- `RefundLog` records the refund with `razorpayRefundId`.
- Shiprocket does NOT independently decide refund amounts or mutate `PaymentStatus`.

---

## 16. Queues & Jobs
- `backend/jobs/shiprocketQueue.js` uses BullMQ `Queue('shiprocket-shipments')` and `Worker`.
- Automatically enqueued when payment is confirmed in `paymentController.js` and `razorpayWebhook.js` via `enqueueShipment(vendorOrderId, orderId, vendorId)`.
- Redis dependency in tests: Jest tests must mock `enqueueShipment` to prevent connection attempts to `127.0.0.1:6379`.

---

## 17. Frontend Consumers
- Customer Order Detail: `client/components/customer/customer-pages.tsx` (`OrderDetailPage`).
- Public Order Tracking: `client/lib/api/orders.ts` (`trackOrderPublicApi`).
- Customer Account Orders: `client/components/customer/customer-pages.tsx` (`OrdersPage`).

---

## 18. Seller Consumers
- Seller Portal: `client/components/seller/seller-portal.tsx` (`Orders`, `OrderTable`).
- Vendor Order endpoints:
  - `GET /api/vendors/orders`
  - `GET /api/vendors/orders/:id`
  - `PUT /api/vendors/orders/:id/status`
  - `POST /api/vendors/orders/:id/refund`
  - `GET /api/vendors/returns`

---

## 19. Admin Consumers
- Admin Order endpoints:
  - `GET /api/admin/orders`
  - `GET /api/admin/orders/vendor-orders`
  - `PUT /api/admin/orders/vendor-orders/:id/payout`
  - `GET /api/admin/orders/returns`
  - `POST /api/shiprocket/retry/:vendorOrderId`

---

## 20. Mocks & Fallbacks (To Eliminate / Harden)
- `shiprocketService.js`:
  - Hardcoded email: `order.user?.email || 'customer@sirabaorganic.com'`
  - Hardcoded phone: `'9549892293'`
  - Hardcoded address fallback: `'Jaipur'`, `'Main Street'`, `'Rajasthan'`
  - Hardcoded dimensions: `length: 10, breadth: 10, height: 10`
  - Default weight: `0.5`
- `shiprocketQueue.js`:
  - Platform vendor fallback has hardcoded address and phone.

---

## 21. Schema Gaps
- `Product` and `OrderItem` models in Prisma do not possess `weight`, `length`, `breadth`, or `height` columns.
- `VendorOrder` does not have a `shippingAddress` column (relies on parent `Order.shippingAddress`).
- (See `FSO_PHASE_5_SCHEMA_GAP_REPORT.md` for full analysis and deterministic resolution).

---

## 22. Security Gaps
- `GET /api/shiprocket/track/:awbCode` has no authentication or customer ownership authorization; any caller can probe tracking data.
- Webhook route: When `SHIPROCKET_WEBHOOK_SECRET` is not configured, webhooks are processed without secret verification.
- Out-of-order webhook processing: `mapShiprocketStatus` allows an `IN TRANSIT` event to downgrade a `DELIVERED` vendor order back to `SHIPPED`.
- In `createShipment`, cross-vendor data exposure must be strictly prohibited: a vendor order must only include its own line items and the specific vendor's pickup code.

---

## 23. Exact Files Requiring Changes
1. `backend/services/shiprocketService.js`:
   - Concurrency mutex on `login()`.
   - Elimination of all mock/hardcoded customer details (`sirabaorganic.com`, dummy phone, placeholder address).
   - Authoritative package data assembly and deterministic weight extraction.
   - Strict validation: fail safely if customer phone, address, or pickup code is missing.
   - Robust idempotency check for existing `shipmentId` or `shiprocketOrderId`.
   - AWB assignment & cancellation support.
2. `backend/routes/shiprocketRoutes.js`:
   - Enforce authentication & customer ownership on tracking: `GET /api/shiprocket/track/:awbCode`.
   - Harden admin retry endpoint `POST /api/shiprocket/retry/:vendorOrderId`.
3. `backend/routes/shiprocketWebhookRoutes.js`:
   - Enforce strict secret verification.
   - Enforce monotonic state transition matrix (prevent out-of-order state regression).
   - Ensure logistics state never mutates `PaymentStatus`.
4. `backend/jobs/shiprocketQueue.js`:
   - Ensure clean resilience without hardcoded fallback strings.
5. `backend/routes/orderRoutes.js`:
   - In order cancellation (`POST /api/orders/:id/cancel`), orchestrate Shiprocket shipment cancellation for eligible active shipments.
6. `backend/services/vendor/vendorOrderService.js`:
   - Prevent vendor from setting invalid states or regressing states.
   - Connect cancellation to Shiprocket shipment cancellation.
7. `client/lib/api/types.ts`:
   - Add `awbCode`, `courierName`, `trackingUrl`, `shipmentId` to `BackendVendorOrder`.
8. `client/components/customer/customer-pages.tsx`:
   - Render carrier information, AWB, and provider tracking URL in `OrderDetailPage`.
9. `backend/tests/shiprocket_logistics_integrity.test.js` (NEW):
   - Comprehensive unit and integration test suite covering authentication, multi-vendor shipment creation, AWB assignment, webhook idempotency, out-of-order event protection, ownership checks, and refund isolation.
