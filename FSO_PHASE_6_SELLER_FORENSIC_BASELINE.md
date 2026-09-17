# FSO — Phase 6: Seller / Vendor Portal & Fulfillment Operations Forensic Baseline

**Inspection Date**: September 17, 2026  
**Status**: COMPLETE FORENSIC AUDIT (REVISED WITH CONTRACT CLARIFICATIONS)  
**Authoritative Persistence**: Neon PostgreSQL via Prisma ORM (v6.19.3)  
**Database Snapshot Baseline**: `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179`  

---

## 1. Executive Summary

Flash Sales Online (FSO) currently operates a multi-vendor marketplace backend with a dedicated schema partition for vendors (`Vendor`, `VendorOrder`, `VendorTransfer`, `EnterpriseSettlement`, `Product`, `Notification`, `RefundLog`). 

While backend services in `backend/services/vendor/` and routes in `backend/routes/vendorRoutes.js` contain foundational logic for vendor authentication, profile, products, inventory, orders, and finance, the frontend seller portal (`client/components/seller/seller-portal.tsx`) is **100% disconnected from the backend** and imports static mock data directly from `client/data/seller.ts`.

Phase 6 replaces all mocked seller portal views with real Prisma-backed REST APIs, establishes strict server-side vendor ownership resolution (`req.user.id` $\rightarrow$ `User.email` $\rightarrow$ `Vendor.id`), enforces rigorous cross-vendor RBAC isolation, integrates Phase 5 logistics without duplication, and validates complete database invariance.

---

## 2. Prisma Schema Models & Enum Verification

### 2.1 State Model & Enum Audit
Forensic verification of `backend/prisma/schema.prisma`:

- **`enum Role`**:
  `CUSTOMER`, `ADMIN`, `CONTENT_EDITOR`, `OPERATIONS_MANAGER`, `CUSTOMER_SUPPORT`, `FINANCE_ADMIN`, `PRODUCER_MANAGER`, `VENDOR_ONBOARDER`, `BLOG_CREATOR`.
- **`enum VendorOrderStatus`**:
  `PENDING`, `ACCEPTED`, `PROCESSING`, `READY_TO_SHIP`, `SHIPPED`, `DELIVERED`, `CANCELLED`.
- **`enum OrderStatus`**:
  `PENDING`, `CONFIRMED`, `PROCESSING`, `DISPATCHED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
  
> [!CRITICAL]
> **Phase 5 State Model Verification**:
> `PARTIALLY_DELIVERED` **DOES NOT EXIST** in the authoritative `OrderStatus` or `VendorOrderStatus` enum in `schema.prisma`. It appeared as an in-memory parent status aggregation in Phase 5 documentation, but the PostgreSQL database enum only accepts `SHIPPED` or `DELIVERED`. In Phase 6, parent order status aggregation must strictly use authoritative enum values (`SHIPPED` if any sub-order is in progress/delivered; `DELIVERED` only when all vendor orders are delivered).

- **`enum PaymentStatus`**:
  `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
- **`enum VendorStatus`**:
  `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED`.

### 2.2 Relational Model Mapping

| Model | Key Fields | Purpose in Seller Portal |
|---|---|---|
| `User` | `id`, `email`, `role`, `isAdmin`, `isBlocked` | Authoritative credential & identity provider (`PRODUCER_MANAGER`) |
| `Vendor` | `id`, `slug`, `email`, `businessName`, `status`, `bankDetails`, `shiprocketPickupCode`, `shopSettings`, `metrics` | Business entity, store profile, pickup location, compliance |
| `Product` | `id`, `name`, `slug`, `price`, `stockQuantity`, `category`, `sku`, `hsn`, `vendorId`, `vendorStatus`, `isActive` | Seller catalog and inventory items |
| `VendorOrder` | `id`, `vendorOrderNumber`, `orderId`, `vendorId`, `status`, `subtotal`, `commissionRate`, `commissionAmount`, `payoutAmount`, `payoutStatus`, `items`, `shipmentId`, `awbCode`, `courierName`, `trackingUrl` | Per-vendor order slice, fulfillment, tracking, commission |
| `VendorTransfer` | `id`, `vendorId`, `amount`, `transferId`, `status`, `createdAt` | Payout history, ledger records |
| `EnterpriseSettlement` | `id`, `vendorId`, `period`, `amount`, `status`, `createdAt` | Monthly enterprise settlement records |
| `RefundLog` | `id`, `orderId`, `paymentId`, `razorpayRefundId`, `amount`, `status`, `reason` | Persisted refund records for vendor returns visibility |
| `Notification` | `id`, `userId`, `vendorId`, `title`, `message`, `type`, `isRead`, `createdAt` | Vendor operational notifications |
| `Review` | `id`, `productId`, `userId`, `rating`, `comment`, `createdAt` | Customer reviews on vendor products |

---

## 3. Vendor Authentication, Ownership & RBAC Boundaries

### 3.1 Authoritative Identity Architecture
Vendor authentication resolves strictly through the unified identity pipeline:

$$\text{User} \xrightarrow{\text{role: PRODUCER\_MANAGER}} \text{Vendor} \xrightarrow{\text{Vendor.id}} \text{Scoped Resources}$$

1. **User Identity Provider**:
   Vendors log in with email and password via `POST /api/v1/auth/login` or `POST /api/v1/vendors/login`. Both authenticate against the authoritative `User` table.
2. **Access Token**:
   Signed with `JWT_SECRET`, storing `{ id: user.id, role: user.role }`. Kept strictly in client memory; refresh token stored in `httpOnly` cookie.
3. **Server-Side Ownership Derivation**:
   For any vendor request:
   ```
   req.headers.authorization (Bearer token)
       ↓
   jwt.verify(token, JWT_SECRET)
       ↓
   decoded.id (User.id)
       ↓
   Prisma query: User.findUnique({ where: { id: decoded.id } })
       ↓
   Assert user.role === 'PRODUCER_MANAGER'
       ↓
   Prisma query: Vendor.findUnique({ where: { email: user.email } })
       ↓
   Assert vendor.status === 'APPROVED' && vendor.isActive === true
       ↓
   req.vendor = vendor (Vendor.id)
   ```
4. **Strict Admin vs. Vendor Boundary**:
   Vendor endpoints (`/api/v1/vendors/*`) require an authenticated `PRODUCER_MANAGER` with a direct `Vendor` binding. Admins managing vendors must use dedicated admin endpoints (`/api/v1/admin/vendors/*`, `/api/v1/admin/vendor-orders/*`) where target `vendorId` is explicit. Admins are NOT ambiently assumed to be vendors on self-service routes.
5. **Zero Client Trust**:
   The backend **never** trusts `vendorId` supplied in:
   - Request body (`req.body.vendorId`)
   - URL query parameters (`req.query.vendorId`)
   - Route parameters (unless validated against `req.vendor.id`)
   - Web storage (`localStorage`, `sessionStorage`)

### 3.2 RBAC Authorization Rules
- `Unauthenticated` $\rightarrow$ **HTTP 401 Unauthorized**
- `CUSTOMER` role $\rightarrow$ **HTTP 403 Forbidden**
- `PRODUCER_MANAGER` with unapproved or suspended vendor $\rightarrow$ **HTTP 403 Forbidden**
- `PRODUCER_MANAGER` accessing another vendor's resource $\rightarrow$ **HTTP 403 Forbidden / 404 Not Found**
- `ADMIN` on vendor self-service routes without vendor binding $\rightarrow$ **HTTP 403 Forbidden**

---

## 4. Contract Corrections & Business Rules

### 4.1 Commission Rate Authority
- Commission is **NOT** hardcoded to 6%.
- At order placement time, `VendorOrder.commissionRate` and `VendorOrder.commissionAmount` are calculated based on the vendor's active plan or platform setting (`vendorPlans.js`: starter 15%, professional 10%, business 8%, enterprise 6%; platform default in `orderRoutes.js` is 10%).
- In Phase 6 analytics and finance, all commission calculations derive directly from the **persisted `VendorOrder.commissionAmount` and `VendorOrder.commissionRate`** records. Historical snapshots are immutable.

### 4.2 Customer Summary Scope (`/seller/customers`)
- Rather than leaving `/seller/customers` mocked or removing it, a vendor-scoped customer summary endpoint is implemented:
  `GET /api/v1/vendors/customers`
- Aggregates unique customers from the vendor's non-cancelled `VendorOrder` records:
  - `id`: Customer user ID
  - `name`: Customer name
  - `email`: Customer email
  - `orders`: Count of vendor orders placed by this customer
  - `spend`: Total subtotal spend with this vendor
  - `lastOrder`: Date of most recent order with this vendor
- Returns `[]` with an honest empty state when 0 orders exist.

### 4.3 Review Replies
- `POST /api/v1/reviews/:id/reply` is explicitly documented and implemented.
- Requires `protectVendor`.
- Verifies that `review.product.vendorId === req.vendor.id`. Rejects with 403 if review belongs to another vendor's product.
- Requires non-empty reply text ($\ge 10$ characters).

### 4.4 Seller Settings Integration
- `/seller/settings` is explicitly connected to existing backend shop settings:
  - `GET /api/v1/vendors/shop` (`vendorProfileService.getShopSettings`)
  - `PUT /api/v1/vendors/shop` (`vendorProfileService.updateShopSettings`)
- Manages store email, support phone, banner, and notification preferences.

### 4.5 Vendor Registration Status
- In `backend/services/vendor/vendorAuthService.js:117`, existing code sets `status: 'APPROVED'` on initial OTP-verified registration. This existing behavior is preserved.
- However, `protectVendor` and `approvedVendor` strictly check `vendor.status === 'APPROVED'`. If an admin changes a vendor's status to `PENDING`, `SUSPENDED`, or `REJECTED`, the vendor is immediately barred with 403 Forbidden.

### 4.6 Payout & Wallet Business Rules
- `POST /api/v1/vendors/wallet/payout` enforces:
  1. `availableBalance`: Sum of `payoutAmount` for delivered orders (`status == 'DELIVERED'` and `payoutStatus in ['pending', 'completed']`) minus sum of all existing `VendorTransfer` amounts with `status in ['pending', 'processing', 'completed']`.
  2. If requested `amount > availableBalance` $\rightarrow$ Throws `INSUFFICIENT_WALLET_BALANCE` (HTTP 400).
  3. Minimum payout amount: ₹500.
  4. Concurrency / Duplicate check: If an existing payout request is in `status == 'pending'` or `status == 'processing'`, new requests are rejected with `PAYOUT_ALREADY_IN_PROGRESS` (HTTP 409).

### 4.7 Compliance Upload File Security Boundaries
- `POST /api/v1/vendors/compliance` validates:
  1. Uploaded via `backend/routes/uploadRoutes.js` (enforces 5MB max, MIME type whitelist: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
  2. `fileUrl` must validate URL structure and match allowed file extensions (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`).
  3. Arbitrary untrusted external URL schemes (`javascript:`, `data:`, `file:`) are strictly rejected.

### 4.8 Deterministic Multi-Vendor Refund Attribution
- `RefundLog` is an order-level entity. In a multi-vendor order, showing all order refunds to every vendor would leak financial data and show incorrect return counts.
- **Rule**: A vendor only sees refunds that are attributed to their `VendorOrder`:
  1. `RefundLog.reason` containing the `vendorOrder.id` or `vendorOrder.vendorOrderNumber`.
  2. Single-vendor orders where `order.vendorOrders.length === 1`.
  3. Refunds initiated by the vendor via `POST /api/v1/vendors/orders/:id/refund`.

### 4.9 Analytics Metric Separation
- **Period Metrics** (filtered by `7d`, `30d`, `90d`, `1y`):
  - Gross Revenue, Net Payout, Commission, Orders Count, Completed Orders, Cancelled Orders, AOV, Daily Sales Trend.
- **Snapshot Metrics** (unfiltered by date; represents active current state):
  - Current Active Products, Total Stock Units on Hand, Low Stock Count (< 15 units), Pending Orders awaiting dispatch, Available Wallet Balance.
