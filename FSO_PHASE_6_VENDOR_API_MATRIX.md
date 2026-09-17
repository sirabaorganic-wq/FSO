# FSO — Phase 6: Vendor API Specification Matrix

**Audit Date**: September 17, 2026  
**Status**: Comprehensive Endpoint Catalog (Revised with Contract Refinements)  
**Protocol**: Express REST / JSON  

---

## Complete Seller Endpoint Matrix

| Endpoint | Method | Auth | Required Role | Ownership Rule | Input / Validation | Prisma Models | Business Rule / State Mutation | Frontend Consumer | Status |
|---|---|---|---|---|---|---|---|---|---|
| `/api/v1/vendors/register` | `POST` | Public | None | None | Email, Password, Business details, `emailOtp` | `Vendor`, `User`, `OTP` | Validates OTP; creates User (`PRODUCER_MANAGER`) + Vendor (`APPROVED`). | `SellerRegisterCard` | **LIVE** |
| `/api/v1/vendors/login` | `POST` | Public | None | None | Email, Password | `User`, `Vendor` | Validates bcrypt hash; returns JWT access token + sets refresh cookie. | `AuthModal`, `/auth/login` | **LIVE** |
| `/api/v1/vendors/profile` | `GET` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | None | `Vendor` | Returns profile, address, contact, verification status. | `SellerPortal[profile]` | **LIVE** |
| `/api/v1/vendors/profile` | `PUT` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | Allowed profile fields | `Vendor` | Updates business info, address, story; sanitizes inputs. | `SellerPortal[profile]` | **LIVE** |
| `/api/v1/vendors/pickup-address` | `PUT` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | Address object | `Vendor` | Updates logistics pickup address. | `SellerPortal[profile]` | **LIVE** |
| `/api/v1/vendors/bank-details` | `PUT` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | Bank details, `otp` | `Vendor`, `OTP` | Requires email OTP to update sensitive bank details. | `SellerPortal[profile]` | **LIVE** |
| `/api/v1/vendors/compliance` | `GET` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | None | `Vendor` | Returns certification docs and compliance verification. | `SellerPortal[documents]` | **LIVE** |
| `/api/v1/vendors/compliance` | `POST` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | `name`, `type`, `fileUrl` (whitelisted MIME/extension) | `Vendor` | Validates file URL structure and extensions (`.pdf`, `.jpg`, `.png`, `.webp`); rejects untrusted external schemes. | `SellerPortal[documents]` | **LIVE** |
| `/api/v1/vendors/dashboard` | `GET` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | None | `VendorOrder`, `Product` | Returns snapshot metrics (pending orders, total products) and all-time revenue/earnings. | `SellerPortal[overview]` | **LIVE** |
| `/api/v1/vendors/analytics` | `GET` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | `?period=7d\|30d\|90d\|1y` | `VendorOrder`, `Product` | Returns period-filtered revenue, orders, AOV, commission, and snapshot inventory metrics. | `SellerPortal[analytics]` | **MISSING** $\rightarrow$ **TO IMPLEMENT** |
| `/api/v1/vendors/customers` | `GET` | Bearer | `PRODUCER_MANAGER` | Scoped by `VendorOrder.vendorId == req.vendor.id` | None | `VendorOrder`, `Order`, `User` | Aggregates distinct customers, spend, order counts, and last order date for this vendor. | `SellerPortal[customers]` | **MISSING** $\rightarrow$ **TO IMPLEMENT** |
| `/api/v1/vendors/products` | `GET` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | `?page`, `?limit`, `?status` | `Product` | Returns paginated vendor products with counts. | `SellerPortal[products]` | **LIVE** |
| `/api/v1/vendors/products/:id` | `GET` | Bearer | `PRODUCER_MANAGER` | `product.vendorId === req.vendor.id` | `:id` param | `Product` | Returns single product detail for editing. Rejects cross-vendor queries with 404/403. | `SellerPortal[product-detail]` | **MISSING** $\rightarrow$ **TO IMPLEMENT** |
| `/api/v1/vendors/products` | `POST` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | Name, Price, Stock, Category, SKU, HSN, etc. | `Product` | Validates fields; creates product with `vendorStatus: pending`. | `SellerPortal[new-product]` | **LIVE** |
| `/api/v1/vendors/products/:productId` | `PUT` | Bearer | `PRODUCER_MANAGER` | `product.vendorId === req.vendor.id` | Allowed update fields | `Product` | Updates product attributes; verifies ownership. | `SellerPortal[product-detail]` | **LIVE** |
| `/api/v1/vendors/products/:productId` | `DELETE` | Bearer | `PRODUCER_MANAGER` | `product.vendorId === req.vendor.id` | `:productId` param | `Product` | Deletes or inactivates vendor product. | `SellerPortal[products]` | **LIVE** |
| `/api/v1/vendors/inventory` | `GET` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | None | `Product` | Lists inventory, SKU, stock quantity, stock value. | `SellerPortal[inventory]` | **LIVE** |
| `/api/v1/vendors/inventory/:itemId` | `PUT` | Bearer | `PRODUCER_MANAGER` | `product.vendorId === req.vendor.id` | `stockQuantity` (Integer $\ge 0$) | `Product` | Updates product stock conditionally. Rejects negative/floats/strings. | `SellerPortal[inventory]` | **LIVE** |
| `/api/v1/vendors/orders` | `GET` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | `?page`, `?limit`, `?status` | `VendorOrder` | Paginated vendor orders with customer summary. | `SellerPortal[orders]` | **LIVE** |
| `/api/v1/vendors/orders/:id` | `GET` | Bearer | `PRODUCER_MANAGER` | `vo.vendorId === req.vendor.id` | `:id` param | `VendorOrder`, `Order` | Detailed vendor order slice with line items & tracking. | `SellerPortal[order-detail]` | **LIVE** |
| `/api/v1/vendors/orders/:id/status` | `PUT` | Bearer | `PRODUCER_MANAGER` | `vo.vendorId === req.vendor.id` | `status` (VendorOrderStatus) | `VendorOrder` | Monotonic state progression; reconciles AWB cancellation. | `SellerPortal[orders]` | **LIVE** |
| `/api/v1/vendors/orders/:id/ship` | `POST` | Bearer | `PRODUCER_MANAGER` | `vo.vendorId === req.vendor.id` | None | `VendorOrder` | Triggers Phase 5 `shiprocketService.createShipment`. Reuses Phase 5 concurrency mutex. | `SellerPortal[order-detail]` | **LIVE** (via Phase 5) |
| `/api/v1/vendors/returns` | `GET` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | None | `RefundLog`, `VendorOrder` | Lists return/refund logs attributed to this vendor's orders. | `SellerPortal[reviews]` | **LIVE** |
| `/api/v1/vendors/orders/:id/refund` | `POST` | Bearer | `PRODUCER_MANAGER` | `vo.vendorId === req.vendor.id` | Reason, non-auth amount | `VendorOrder`, `RefundLog`, `Payment` | Server-derived refund capped by captured payment and allocated share. | `SellerPortal[orders]` | **LIVE** |
| `/api/v1/vendors/payouts` | `GET` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | None | `VendorTransfer` | Lists historical payout transfers. | `SellerPortal[payouts]` | **LIVE** |
| `/api/v1/vendors/wallet` | `GET` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | None | `VendorTransfer`, `VendorOrder` | Returns wallet ledger balance and recent transactions. | `SellerPortal[payouts]` | **LIVE** |
| `/api/v1/vendors/wallet/payout` | `POST` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | `amount` | `VendorTransfer`, `VendorOrder` | Validates minimum ₹500, asserts `amount <= availableBalance`, checks no active pending request. | `SellerPortal[payouts]` | **LIVE** |
| `/api/v1/vendors/shop` | `GET` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | None | `Vendor` | Gets shop settings (email, phone, banner, bio). | `SellerPortal[settings]` | **LIVE** |
| `/api/v1/vendors/shop` | `PUT` | Bearer | `PRODUCER_MANAGER` | `req.vendor.id` derived from JWT $\rightarrow$ User | Shop settings payload | `Vendor` | Updates shop settings. | `SellerPortal[settings]` | **LIVE** |
| `/api/v1/vendors/reviews` | `GET` | Bearer | `PRODUCER_MANAGER` | Scoped by `product.vendorId == req.vendor.id` | `?page`, `?limit` | `Review`, `Product` | Lists customer reviews on products owned by vendor. | `SellerPortal[reviews]` | **MISSING** $\rightarrow$ **TO IMPLEMENT** |
| `/api/v1/reviews/:id/reply` | `POST` | Bearer | `PRODUCER_MANAGER` | Asserts `review.product.vendorId == req.vendor.id` | `{ reply: string }` ($\ge 10$ chars) | `Review`, `Product` | Saves vendor reply to customer review. 403 on cross-vendor attempt. | `SellerPortal[reviews]` | **LIVE** |
| `/api/v1/notifications/vendor` | `GET` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | None | `Notification` | Lists vendor operational notifications. | `SellerPortal[notifications]` | **LIVE** |
| `/api/v1/notifications/vendor/read-all`| `PUT` | Bearer | `PRODUCER_MANAGER` | Scoped by `vendorId: req.vendor.id` | None | `Notification` | Marks all vendor notifications as read. | `SellerPortal[notifications]` | **LIVE** |
