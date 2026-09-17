# FSO — Phase 4: Razorpay Payment Integrity Forensic Baseline Report

**Execution Date**: September 16, 2026  
**Status**: Read-Only Pre-Implementation Forensic Audit  
**Authoritative Persistence Layer**: Neon PostgreSQL via Prisma ORM (v6.19.3)  
**Database Row Snapshot SHA-256**: `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179`  
**Database Record Baseline**: 2 Users, 3 Vendors, 0 Products, 0 Orders, 0 Payments, 0 Reviews, 1 Cart, 0 CartItems

---

## 1. Current Order Schema (`backend/prisma/schema.prisma`)
The `Order` model in Prisma represents the commercial customer purchase contract:
- `id`: String (`cuid()`, primary key)
- `orderNumber`: String (`@unique`, e.g. `FSO-123456-7890`)
- `userId`: String (references `User.id`)
- `status`: `OrderStatus` enum (`@default(PENDING)`)
- `paymentStatus`: `PaymentStatus` enum (`@default(PENDING)`)
- `totalPrice`: Float (authoritative grand total in INR)
- `subtotal`: Float (undiscounted line-item subtotal)
- `taxPrice`: Float (5% food GST standard, calculated deterministically from line items)
- `shippingPrice`: Float (₹70 for $< ₹500$, free for $\ge ₹500$)
- `discountPrice`: Float (authoritatively validated coupon discount)
- `couponApplied`: String? (coupon code if verified)
- `shippingAddress`: Json (`{ name, address, city, state, postalCode, country, phone }`)
- `billingAddress`: Json?
- `paymentMethod`: String (`@default("razorpay")`)
- `razorpayOrderId`: String? (Razorpay order reference `order_...`)
- `razorpayPaymentId`: String? (Razorpay payment reference `pay_...`)
- `razorpaySignature`: String? (HMAC SHA-256 signature)
- `paidAt`: DateTime?
- `gstClaimed`: Boolean (`@default(false)`)
- `buyerGstNumber`: String?
- `businessName`: String?
- `deliveredAt`: DateTime?
- `cancelledAt`: DateTime?
- `cancellationReason`: String?
- `createdAt`: DateTime (`@default(now())`)
- `updatedAt`: DateTime (`@updatedAt`)
- Relations: `orderItems` (OrderItem[]), `vendorOrders` (VendorOrder[]), `payments` (Payment[]), `refunds` (RefundLog[])

---

## 2. Current Payment Schema (`backend/prisma/schema.prisma`)
The `Payment` model tracks payment provider attempts and transactions:
- `id`: String (`cuid()`, primary key)
- `orderId`: String (references `Order.id`, `onDelete: Cascade`)
- `order`: Relation to `Order`
- `razorpayOrderId`: String (indexed)
- `razorpayPaymentId`: String (`@unique`, indexed)
- `razorpaySignature`: String?
- `amount`: Float (stored in INR)
- `currency`: String (`@default("INR")`)
- `status`: `PaymentStatus` enum (`@default(PENDING)`)
- `method`: String? (e.g. `upi`, `card`, `netbanking`, `wallet`)
- `bank`: String?
- `wallet`: String?
- `vpa`: String?
- `errorReason`: String?
- `rawResponse`: Json?
- `createdAt`: DateTime (`@default(now())`)
- `updatedAt`: DateTime (`@updatedAt`)
- Constraints: `razorpayPaymentId` is `@unique` and non-null.

---

## 3. Current WebhookLog Schema (`backend/prisma/schema.prisma`)
The `WebhookLog` model provides audit logging and event idempotency:
- `id`: String (`cuid()`, primary key)
- `eventId`: String (`@unique`, indexed)
- `eventType`: String (indexed, e.g. `payment.captured`, `payment.failed`, `order.paid`)
- `provider`: String (`@default("razorpay")`)
- `payload`: Json
- `status`: String (`@default("processed")`, e.g. `processing`, `processed`, `failed`, `ignored`)
- `processedAt`: DateTime (`@default(now())`)

---

## 4. Current RefundLog Schema (`backend/prisma/schema.prisma`)
- `id`: String (`cuid()`, primary key)
- `orderId`: String (references `Order.id`)
- `paymentId`: String?
- `razorpayRefundId`: String? (`@unique`)
- `amount`: Float
- `reason`: String?
- `status`: String (`@default("processed")`)
- `createdAt`: DateTime (`@default(now())`)

---

## 5. Existing Payment & Order Enums
From `schema.prisma`:
- `OrderStatus`:
  `PENDING`, `CONFIRMED`, `PROCESSING`, `DISPATCHED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
- `PaymentStatus`:
  `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`.

---

## 6. Existing Razorpay Implementation
- **SDK Package**: `razorpay` v2.9.6 installed in `backend/package.json`.
- **Client Factory**: `backend/config/razorpay.js` validates `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` at initialization.
- **Service Layer**: `backend/services/paymentService.js` provides:
  - `createRazorpayOrder(amount, receipt, notes)`: Multiplies INR amount by 100 (`Math.round(amount * 100)`) to convert to paise, sets `currency: 'INR'`, `payment_capture: 1`. Calls `razorpayClient.orders.create`.
  - `verifyPaymentSignature(orderId, paymentId, signature)`: Computes HMAC SHA-256 of `${orderId}|${paymentId}` using `RAZORPAY_KEY_SECRET`.
  - `initiateRefund(paymentId, amount, reason, speed)`.
  - `fetchPaymentDetails(paymentId)`.
- **Webhook Controller**: `backend/controllers/razorpayWebhook.js` uses `Razorpay.validateWebhookSignature(rawBody.toString(), signature, secret)` with `WebhookLog` idempotency.

---

## 7. Existing Payment Routes
Mounted in `backend/routes/paymentRoutes.js`:
- `POST /api/payment/create-order` $\longrightarrow$ `paymentController.createOrder` (Protected)
- `POST /api/payment/verify` $\longrightarrow$ `paymentController.verifyPayment` (Protected)
- `GET /api/payment/status/:orderId` $\longrightarrow$ `paymentController.getPaymentStatus` (Protected)
Mounted in `backend/routes/razorpayWebhookRoutes.js`:
- `POST /webhooks/razorpay` $\longrightarrow$ `rawBodyMiddleware`, `handleWebhook` (Public, verified via HMAC signature)

---

## 8. Existing Frontend Payment Flow
- Handled in `client/components/customer/customer-pages.tsx` (`CheckoutPage`).
- Calls `createRazorpayOrderApi(amount, orderId)` in `client/lib/api/payments.ts`.
- Submits verification via `verifyPaymentApi(payload)`.

---

## 9. Existing Checkout Flow
1. Customer enters `/checkout`.
2. Customer selects Delivery Address and Payment Method (`razorpay` or `cod`).
3. Customer submits form $\longrightarrow$ `createOrderApi` creates backend `Order` with `status: PENDING`, `paymentStatus: PENDING`.
4. If `cod`: navigates to `/checkout/success?orderId=...&method=cod`.
5. If `razorpay`: in Phase 3, this transitioned to `/checkout/success?orderId=...&status=pending_payment` awaiting Phase 4 gateway integration.

---

## 10. Existing Payment/Order Relationship
- `Order` has 1-to-many relationship with `Payment` (`Order.payments Payment[]`).
- `Order` stores denormalized snapshot fields: `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `paidAt`, `paymentStatus`.
- `Payment` has foreign key `orderId` pointing to `Order.id`.

---

## 11. Existing Webhook Behavior
- In `backend/server.js`, `/webhooks/razorpay` is mounted BEFORE `express.json()`.
- `rawBodyMiddleware` captures `Buffer` via `express.raw({ type: 'application/json' })`.
- Signature is verified using `process.env.RAZORPAY_WEBHOOK_SECRET`.
- Supported events: `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`.

---

## 12. Existing Idempotency Capabilities
- Webhook idempotency is supported via `WebhookLog.eventId` (`@unique`).
- Payment verification idempotency is partially supported by checking `existingPayment.status === "CAPTURED"`.
- Order idempotency key at the HTTP API level is `NOT_SUPPORTED` due to the frozen schema lacking `Order.idempotencyKey`.

---

## 13. Existing Secrets & Configuration
- `RAZORPAY_KEY_ID`: Server-side environment variable.
- `RAZORPAY_KEY_SECRET`: Server-side environment variable.
- `RAZORPAY_WEBHOOK_SECRET`: Server-side environment variable.
- `.env.example` contains clean placeholders.

---

## 14. Existing Vulnerabilities & Defects Identified
1. **Broken Cross-User Authorization in `createOrder`**:
   `paymentController.createOrder` queried `prisma.order.findFirst` by receipt/ID, but DID NOT verify `localOrder.userId === req.user.id`. Any authenticated user could initialize payment for another user's order.
2. **Broken Cross-User Authorization in `verifyPayment`**:
   `paymentController.verifyPayment` looked up the order without verifying `order.userId === req.user.id`. Any user could verify another user's payment.
3. **Cross-Order Substitution Vulnerability**:
   `paymentController.verifyPayment` did not strictly assert `order.razorpayOrderId === razorpay_order_id`. A user could pay ₹1 for order A and pass that payment ID to verify order B (₹10,000).
4. **Amount Verification Gap**:
   `verifyPayment` did not verify the fetched Razorpay payment amount against `order.totalPrice`.
5. **Fake Transaction ID Placeholder in `createOrder`**:
   `paymentController.createOrder` used `pending_${rzpOrder.id}` as a placeholder `razorpayPaymentId` in the `Payment` table because `razorpayPaymentId` is non-nullable.
6. **Asynchronous Webhook Error Loss**:
   `razorpayWebhook.js` returned HTTP 200 immediately and processed events asynchronously in an unawaited promise, potentially losing failures if the server crashes.

---

## 15. Existing Mocks/Fallbacks
- Phase 3 eliminated the fake Razorpay verification bypass in `customer-pages.tsx`.
- The frontend currently redirects to `pending_payment` without opening the Razorpay Checkout popup.

---

## 16. Existing Tests
- Phase 1 security tests: 4 suites.
- Phase 2 no-Mongoose runtime test: 1 suite.
- Phase 3 cart & order integrity tests: 36 tests passing in `backend/tests/cart_order_integrity.test.js`.
- Zero existing tests for Razorpay payment integration.

---

## 17. Schema Gaps
- **Payment ID during Order Creation**: In `schema.prisma`, `Payment.razorpayPaymentId` is `String @unique` (non-null). At the time a Razorpay Order is created (`order_...`), no payment ID (`pay_...`) exists yet. Storing `razorpayOrderId` on `Order.razorpayOrderId` is supported. To persist a `Payment` row before checkout, previous code used `pending_${rzpOrder.id}`. The cleaner, schema-compliant pattern is storing `Order.razorpayOrderId` on order creation, and creating the authoritative `Payment` record upon payment attempt/capture.
- **Order Idempotency**: `Order.idempotencyKey` does not exist in `schema.prisma`. Idempotency is supported at the Webhook level via `WebhookLog.eventId` and at the Payment verification level via `Payment.razorpayPaymentId`.

---

## 18. Exact Files Requiring Modification
1. `backend/controllers/paymentController.js` (Authorize order ownership, validate amount, eliminate cross-order substitution, verify amount against DB).
2. `backend/services/paymentService.js` (Use official SDK signature verification, fetch payment details).
3. `backend/controllers/razorpayWebhook.js` (Await event processing, enforce strict state transitions, handle idempotency deterministically).
4. `client/lib/api/payments.ts` (API client contracts for order creation and verification).
5. `client/components/customer/customer-pages.tsx` (Checkout Razorpay popup integration, callback verification, authoritative SuccessPage status loading).
6. `backend/jest.config.js` (Add `razorpay_payment_integrity.test.js` to `testMatch`).
7. `backend/tests/razorpay_payment_integrity.test.js` [NEW] (Comprehensive payment test suite).
