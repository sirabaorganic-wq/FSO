# FSO — Phase 2: API Compatibility & Frontend Consumer Matrix
## Comprehensive Forensic Inventory of All Admin, Vendor, and B2B Endpoints

**Architecture Target**: Express $\longrightarrow$ Prisma ORM $\longrightarrow$ Neon PostgreSQL  
**Persistence Baseline**: Authoritative PostgreSQL via Prisma (Zero Mongoose Runtime Dependency)  
**Database Row-Level Hash**: `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179` (100% Invariant)

---

### Legend
- **LIVE**: Connected to a live, functional frontend hook or component.
- **MOCKED**: Frontend component contains mock data / static fallback and does not yet trigger live API mutations.
- **UNUSED**: Endpoint is fully functional in backend, but has no active callers in `client/` frontend.
- **MISSING**: Endpoint expected by enterprise architecture, but frontend UI page/view is not yet built.

---

## 1. Admin Endpoints Matrix (38 Endpoints)

| # | HTTP Method | Endpoint Path | Legacy Persistence | Phase 2 Prisma Implementation | Gate / Hard Constraint Compliance | Frontend Consumer / Current Status |
|---|---|---|---|---|---|---|
| 1 | `GET` | `/api/admin/vendors` | Mongoose `Vendor.find()` | `adminVendorService.listVendors` | Prisma `vendor.findMany`, search, status filter, pagination | `LIVE` (`client/src/app/admin/vendors/page.tsx`) |
| 2 | `GET` | `/api/admin/vendors/pending` | Mongoose `Vendor.find({ status: 'pending' })` | `adminVendorService.listPendingVendors` | Prisma `vendor.findMany({ status: 'PENDING' })` | `LIVE` (`client/src/app/admin/vendors/pending/page.tsx`) |
| 3 | `GET` | `/api/admin/vendors/:id` | Mongoose `Vendor.findById()` | `adminVendorService.getVendorById` | Prisma `vendor.findUnique`, includes notes and certifications | `LIVE` (`client/src/app/admin/vendors/[id]/page.tsx`) |
| 4 | `PUT` | `/api/admin/vendors/:id/status` | Mongoose `vendor.save()` | `adminVendorService.updateVendorStatus` | Enum mapping (`APPROVED`, `REJECTED`, `SUSPENDED`), audit tracking | `LIVE` (`client/src/app/admin/vendors/[id]/page.tsx`) |
| 5 | `PUT` | `/api/admin/vendors/:id/commission` | Mongoose `vendor.save()` | `adminVendorService.updateCommissionRate` | Direct update of Prisma `commissionRate` (Float) | `UNUSED` (Backend Ready) |
| 6 | `PUT` | `/api/admin/vendors/:id/categories` | Mongoose `vendor.save()` | `adminVendorService.updateCategories` | Updates Prisma `categories` (String[]) | `UNUSED` (Backend Ready) |
| 7 | `POST` | `/api/admin/vendors/:id/notes` | Mongoose `vendor.adminNotes.push()` | `adminVendorService.addAdminNote` | Relational Prisma model `VendorAdminNote` | `LIVE` (`client/src/components/admin/VendorNotes.tsx`) |
| 8 | `GET` | `/api/admin/vendors/:id/notes` | Mongoose `vendor.adminNotes` | `adminVendorService.getAdminNotes` | Relational Prisma model `VendorAdminNote` with user author | `LIVE` (`client/src/components/admin/VendorNotes.tsx`) |
| 9 | `PUT` | `/api/admin/vendors/:id/certifications` | Mongoose `vendor.save()` | `adminVendorService.verifyCertifications` | Sets `certificationsVerified: true, certificationsVerifiedAt: now` | `LIVE` (`client/src/app/admin/vendors/[id]/page.tsx`) |
| 10 | `DELETE` | `/api/admin/vendors/:id` | Mongoose `Vendor.findByIdAndDelete()` | `adminVendorService.deleteVendor` | Gate 3 & Amendment 3: Checks for existing orders/transfers; soft-deletes (`SUSPENDED`) if historical data exists | `LIVE` (`client/src/app/admin/vendors/page.tsx`) |
| 11 | `GET` | `/api/admin/vendors/:id/products` | Mongoose `Product.find({ vendor: id })` | `adminProductService.listVendorProducts` | Prisma `product.findMany({ where: { vendorId } })` | `LIVE` (`client/src/app/admin/vendors/[id]/products/page.tsx`) |
| 12 | `PUT` | `/api/admin/vendors/:id/products/:productId/status` | Mongoose `product.save()` | `adminProductService.updateProductStatus` | Updates Prisma `vendorStatus`, syncs `isPublic: true` if approved | `LIVE` (`client/src/app/admin/products/approvals/page.tsx`) |
| 13 | `DELETE` | `/api/admin/vendors/:id/products/:productId` | Mongoose `Product.findByIdAndDelete()` | `adminProductService.deleteProduct` | Prisma `product.delete` scoped by `id` and `vendorId` | `LIVE` (`client/src/app/admin/products/page.tsx`) |
| 14 | `GET` | `/api/admin/products/pending` | Mongoose `Product.find({ vendorStatus: 'pending' })` | `adminProductService.listPendingProducts` | Prisma `product.findMany({ where: { vendorStatus: 'pending' } })` | `LIVE` (`client/src/app/admin/products/approvals/page.tsx`) |
| 15 | `PUT` | `/api/admin/products/:id/approve` | Mongoose `product.save()` | `adminProductService.approveProduct` | Updates `vendorStatus: 'approved', isPublic: true` | `LIVE` (`client/src/app/admin/products/approvals/page.tsx`) |
| 16 | `PUT` | `/api/admin/products/:id/reject` | Mongoose `product.save()` | `adminProductService.rejectProduct` | Updates `vendorStatus: 'rejected', isPublic: false` | `LIVE` (`client/src/app/admin/products/approvals/page.tsx`) |
| 17 | `GET` | `/api/admin/vendor-orders` | Mongoose `VendorOrder.find()` | `adminOrderService.listVendorOrders` | Prisma `vendorOrder.findMany`, includes `vendor` and `order` | `LIVE` (`client/src/app/admin/orders/vendor-orders/page.tsx`) |
| 18 | `PUT` | `/api/admin/vendor-orders/:id/payout` | Mongoose `vendorOrder.save()` | `adminOrderService.updateVendorOrderPayout` | Updates Prisma `payoutStatus` with validation | `LIVE` (`client/src/app/admin/orders/vendor-orders/page.tsx`) |
| 19 | `GET` | `/api/admin/orders/returns` | Mongoose `Order.find({ returnStatus: ... })` | `adminOrderService.listReturns` | Gate 1: Tracks via `RefundLog`. Zero assumption of `CANCELLED = RETURN`. | `LIVE` (`client/src/app/admin/orders/returns/page.tsx`) |
| 20 | `PUT` | `/api/admin/orders/returns/:id` | Mongoose `order.save()` | `adminOrderService.updateReturnStatus` | Gate 1: Updates `RefundLog.status` | `LIVE` (`client/src/app/admin/orders/returns/page.tsx`) |
| 21 | `GET` | `/api/admin/payouts` | Mongoose `VendorTransfer.find()` | `adminOrderService.listPayouts` | Prisma `vendorTransfer.findMany({ include: { vendor } })` | `LIVE` (`client/src/app/admin/finance/payouts/page.tsx`) |
| 22 | `GET` | `/api/admin/vendors/:id/analytics` | Mongoose `VendorOrder.aggregate()` | `adminAnalyticsService.getVendorAnalytics` | Prisma aggregation of `vendorOrder` (GMV, orders, completed) | `MOCKED` (`client/src/app/admin/vendors/[id]/analytics/page.tsx`) |
| 23 | `GET` | `/api/admin/analytics/overview` | Mongoose multi-model aggregation | `adminAnalyticsService.getPlatformOverview` | Aggregated Prisma queries for platform revenue, vendors, orders | `MOCKED` (`client/src/app/admin/dashboard/page.tsx`) |
| 24 | `GET` | `/api/admin/pricing-tiers` | Static JSON / Mongoose config | `adminAnalyticsService.getPricingTiers` | Canonical `VENDOR_PLANS` configuration | `UNUSED` (Backend Ready) |
| 25 | `GET` | `/api/admin/enterprise-settlements` | Mongoose `EnterpriseSettlement.find()` | `adminAnalyticsService.listEnterpriseSettlements` | Prisma `enterpriseSettlement.findMany`, includes `vendor` | `UNUSED` (Backend Ready) |
| 26 | `POST` | `/api/admin/enterprise-settlements/run` | Mongoose settlement runner | `adminAnalyticsService.runEnterpriseSettlement` | Gate 5: Idempotent run via `enterpriseCommitmentService` | `UNUSED` (Backend Ready) |
| 27 | `GET` | `/api/admin/shipping-config` | Mongoose `SiteSettings.findOne()` | Prisma `prisma.siteSettings.findFirst({ where: { type: 'home' } })` | Scoped via Prisma SiteSettings JSON document | `LIVE` (`client/src/app/admin/settings/shipping/page.tsx`) |
| 28 | `PUT` | `/api/admin/shipping-config` | Mongoose `SiteSettings.save()` | Prisma `prisma.siteSettings.upsert` | Updates `shippingConfig` JSON in Prisma | `LIVE` (`client/src/app/admin/settings/shipping/page.tsx`) |
| 29 | `GET` | `/api/admin/subadmins` | Mongoose `User.find({ role: { $ne: 'customer' } })` | `adminSubadminService.listSubadmins` | Gate 2: Strictly targets `role: { in: ['VENDOR_ONBOARDER', 'BLOG_CREATOR'] }` | `LIVE` (`client/src/app/admin/subadmins/page.tsx`) |
| 30 | `POST` | `/api/admin/subadmins` | Mongoose `User.create()` | `adminSubadminService.createSubadmin` | Gate 2: Validates role against `ALLOWED_SUBADMIN_ROLES`, bcrypt hash | `LIVE` (`client/src/app/admin/subadmins/page.tsx`) |
| 31 | `PUT` | `/api/admin/subadmins/:id/password` | Mongoose `user.save()` | `adminSubadminService.resetSubadminPassword` | Gate 2: Validates role before updating hashed password | `LIVE` (`client/src/app/admin/subadmins/page.tsx`) |
| 32 | `DELETE` | `/api/admin/subadmins/:id` | Mongoose `User.findByIdAndDelete()` | `adminSubadminService.deleteSubadmin` | Gate 2: Validates role before deletion | `LIVE` (`client/src/app/admin/subadmins/page.tsx`) |
| 33 | `GET` | `/api/admin/compliance/products` | Mongoose `ProductCompliance.find()` | `adminProductService.listProductCompliance` | Prisma `productCompliance.findMany({ include: { product } })` | `MOCKED` (`client/src/app/admin/compliance/page.tsx`) |
| 34 | `GET` | `/api/admin/compliance/products/:productId` | Mongoose `ProductCompliance.findOne()` | `adminProductService.getProductCompliance` | Prisma `productCompliance.findFirst({ where: { productId } })` | `MOCKED` (`client/src/app/admin/compliance/[id]/page.tsx`) |
| 35 | `PUT` | `/api/admin/compliance/products/:productId` | Mongoose `productCompliance.save()` | `adminProductService.updateProductCompliance` | Prisma `productCompliance.upsert` | `MOCKED` (`client/src/app/admin/compliance/[id]/page.tsx`) |
| 36 | `PUT` | `/api/admin/compliance/products/:productId/dimensions` | Mongoose `Product.save()` | `adminProductService.updateProductDimensions` | Updates `weight`, `dimensions` on Prisma `Product` | `UNUSED` (Backend Ready) |
| 37 | `GET` | `/api/admin/compliance/products/:productId/batches` | Mongoose `ProductBatch.find()` | `adminProductService.listProductBatches` | Prisma `productBatch.findMany({ where: { productId } })` | `MOCKED` (`client/src/app/admin/compliance/batches/page.tsx`) |
| 38 | `GET` | `/api/admin/compliance/audit-logs` | Mongoose `ComplianceAuditLog.find()` | `adminProductService.listComplianceAuditLogs` | Prisma `complianceAuditLog.findMany`, includes `product` and `admin` | `MOCKED` (`client/src/app/admin/compliance/audit/page.tsx`) |

---

## 2. Vendor Endpoints Matrix (41 Endpoints)

| # | HTTP Method | Endpoint Path | Legacy Persistence | Phase 2 Prisma Implementation | Gate / Hard Constraint Compliance | Frontend Consumer / Current Status |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/vendors/register` | Mongoose `Vendor.create()` + `User.create()` | `vendorAuthService.registerVendor` | Gate 3: Passwords stored strictly on `User`, linked to `Vendor` via email | `LIVE` (`client/src/app/vendor/register/page.tsx`) |
| 2 | `POST` | `/api/vendors/login` | Mongoose `Vendor.findOne()` + `User.findOne()` | `vendorAuthService.loginVendor` | Gate 3: Authenticates credentials against `User`, checks `Vendor` status | `LIVE` (`client/src/app/vendor/login/page.tsx`) |
| 3 | `POST` | `/api/vendors/forgot-password/send-otp` | Mongoose `OTP.create()` | `vendorAuthService.sendForgotPasswordOtp` | Prisma `OTP` model with SHA-256/bcrypt hashing and expiration | `LIVE` (`client/src/app/vendor/forgot-password/page.tsx`) |
| 4 | `POST` | `/api/vendors/forgot-password/verify-otp` | Mongoose `OTP.findOne()` | `vendorAuthService.verifyForgotPasswordOtp` | Verifies hashed OTP in Prisma with attempt limiting | `LIVE` (`client/src/app/vendor/forgot-password/page.tsx`) |
| 5 | `POST` | `/api/vendors/forgot-password/reset-password` | Mongoose `user.save()` | `vendorAuthService.resetPassword` | Hashes new password on Prisma `User` record | `LIVE` (`client/src/app/vendor/forgot-password/page.tsx`) |
| 6 | `GET` | `/api/vendors/profile` | Mongoose `Vendor.findById()` | `vendorProfileService.getVendorProfile` | Strictly scoped to authenticated `req.vendor.id` | `LIVE` (`client/src/app/vendor/profile/page.tsx`) |
| 7 | `PUT` | `/api/vendors/profile` | Mongoose `Vendor.findByIdAndUpdate()` | `vendorProfileService.updateVendorProfile` | Scoped by `req.vendor.id`, field whitelist sanitization | `LIVE` (`client/src/app/vendor/profile/page.tsx`) |
| 8 | `POST` | `/api/vendors/request-sensitive-otp` | Mongoose `OTP.create()` | `vendorProfileService.requestSensitiveOtp` | Generates OTP, persists in Prisma `oTP`, sends email | `LIVE` (`client/src/app/vendor/settings/bank/page.tsx`) |
| 9 | `PUT` | `/api/vendors/bank-details` | Mongoose `vendor.save()` | `vendorProfileService.updateBankDetailsWithOtp` | OTP verified before updating `bankDetails` JSON in Prisma | `LIVE` (`client/src/app/vendor/settings/bank/page.tsx`) |
| 10 | `PUT` | `/api/vendors/pickup-address` | Mongoose `vendor.save()` | `vendorProfileService.updatePickupAddress` | Updates `pickupAddress` and Shiprocket pickup location fields | `LIVE` (`client/src/app/vendor/settings/pickup/page.tsx`) |
| 11 | `PUT` | `/api/vendors/onboarding` | Mongoose `vendor.save()` | `vendorProfileService.updateOnboarding` | Step-by-step onboarding validation and persistence | `LIVE` (`client/src/app/vendor/onboarding/page.tsx`) |
| 12 | `POST` | `/api/vendors/compliance` | Mongoose `vendor.complianceDocuments.push()` | `vendorProfileService.addComplianceDoc` | Persists document metadata into `organicCertification.documents` | `MOCKED` (`client/src/app/vendor/compliance/page.tsx`) |
| 13 | `GET` | `/api/vendors/compliance` | Mongoose `vendor.complianceDocuments` | `vendorProfileService.getComplianceDocs` | Retrieves compliance documents from Prisma `Vendor` | `MOCKED` (`client/src/app/vendor/compliance/page.tsx`) |
| 14 | `DELETE` | `/api/vendors/compliance/:docId` | Mongoose `vendor.complianceDocuments.pull()` | `vendorProfileService.deleteComplianceDoc` | Filters document out of Prisma `Vendor` JSON | `MOCKED` (`client/src/app/vendor/compliance/page.tsx`) |
| 15 | `GET` | `/api/vendors/products` | Mongoose `Product.find({ vendor: id })` | `vendorProductService.listVendorProducts` | Scoped strictly to `where: { vendorId: req.vendor.id }` | `LIVE` (`client/src/app/vendor/products/page.tsx`) |
| 16 | `POST` | `/api/vendors/products` | Mongoose `Product.create()` | `vendorProductService.createVendorProduct` | Sets `vendorId: req.vendor.id`, `vendorStatus: 'pending'` | `LIVE` (`client/src/app/vendor/products/new/page.tsx`) |
| 17 | `PUT` | `/api/vendors/products/:productId` | Mongoose `product.save()` | `vendorProductService.updateVendorProduct` | Verifies ownership (`id` and `vendorId`) before updating | `LIVE` (`client/src/app/vendor/products/[id]/edit/page.tsx`) |
| 18 | `DELETE` | `/api/vendors/products/:productId` | Mongoose `product.remove()` | `vendorProductService.deleteVendorProduct` | Verifies ownership (`id` and `vendorId`) before deletion | `LIVE` (`client/src/app/vendor/products/page.tsx`) |
| 19 | `GET` | `/api/vendors/inventory` | Mongoose `vendor.inventory` | `vendorProductService.listInventory` | Queries Prisma `Product` inventory for `vendorId` | `LIVE` (`client/src/app/vendor/inventory/page.tsx`) |
| 20 | `POST` | `/api/vendors/inventory` | Mongoose `vendor.inventory.push()` | `vendorProductService.createInventoryBatch` | Updates or creates product stock quantity | `LIVE` (`client/src/app/vendor/inventory/page.tsx`) |
| 21 | `PUT` | `/api/vendors/inventory/:itemId` | Mongoose `vendor.inventory.id().save()` | `vendorProductService.updateInventoryItem` | Updates stock quantity on Prisma `Product` | `LIVE` (`client/src/app/vendor/inventory/page.tsx`) |
| 22 | `DELETE` | `/api/vendors/inventory/:itemId` | Mongoose `vendor.inventory.pull()` | `vendorProductService.deleteInventoryItem` | Sets `isActive: false` on Prisma `Product` | `LIVE` (`client/src/app/vendor/inventory/page.tsx`) |
| 23 | `PUT` | `/api/vendors/inventory/bulk-update` | Mongoose bulk write | `vendorProductService.bulkUpdateInventory` | Scoped `updateMany` for items owned by `vendorId` | `LIVE` (`client/src/app/vendor/inventory/page.tsx`) |
| 24 | `GET` | `/api/vendors/orders` | Mongoose `VendorOrder.find({ vendor: id })` | `vendorOrderService.listVendorOrders` | Scoped strictly to `where: { vendorId: req.vendor.id }` | `LIVE` (`client/src/app/vendor/orders/page.tsx`) |
| 25 | `GET` | `/api/vendors/orders/:id` | Mongoose `VendorOrder.findById()` | `vendorOrderService.getVendorOrder` | Scoped strictly to `id` and `vendorId` | `LIVE` (`client/src/app/vendor/orders/[id]/page.tsx`) |
| 26 | `PUT` | `/api/vendors/orders/:id/status` | Mongoose `vendorOrder.save()` | `vendorOrderService.updateOrderStatus` | Status validation (`PENDING`, `SHIPPED`, etc.) | `LIVE` (`client/src/app/vendor/orders/[id]/page.tsx`) |
| 27 | `PUT` | `/api/vendors/orders/:id/return-status` | Mongoose `vendorOrder.returnStatus` | Handled via Gate 1 RefundLog note | Gate 1: Tracks via `RefundLog`; does not conflate cancellations | `UNUSED` (Backend Ready) |
| 28 | `POST` | `/api/vendors/orders/:id/refund` | Mongoose refund processor | `vendorOrderService.processOrderRefund` | Creates Prisma `RefundLog` record, marks payout `refunded` | `UNUSED` (Backend Ready) |
| 29 | `GET` | `/api/vendors/returns` | Mongoose `VendorOrder.find({ returnStatus: ... })` | `vendorOrderService.listReturns` | Gate 1: Queries `RefundLog` records for vendor's orders | `LIVE` (`client/src/app/vendor/returns/page.tsx`) |
| 30 | `PUT` | `/api/vendors/returns/:id` | Mongoose `vendorOrder.save()` | Handled via Gate 1 RefundLog update | Gate 1: Updates `RefundLog` status | `LIVE` (`client/src/app/vendor/returns/page.tsx`) |
| 31 | `GET` | `/api/vendors/dashboard` | Mongoose aggregations | `vendorFinanceService.getDashboardStats` | Prisma aggregation of sales, earnings, orders, products | `LIVE` (`client/src/app/vendor/dashboard/page.tsx`) |
| 32 | `GET` | `/api/vendors/payouts` | Mongoose `VendorTransfer.find({ vendorId })` | `vendorFinanceService.listPayouts` | Prisma `vendorTransfer.findMany({ where: { vendorId } })` | `LIVE` (`client/src/app/vendor/payouts/page.tsx`) |
| 33 | `GET` | `/api/vendors/wallet` | Mongoose `vendor.wallet` | `vendorFinanceService.getWalletBalance` | Derives wallet balance and transfers from Prisma | `LIVE` (`client/src/app/vendor/wallet/page.tsx`) |
| 34 | `POST` | `/api/vendors/wallet/payout` | Mongoose `vendor.wallet` mutation | `vendorFinanceService.requestPayout` | Creates `VendorTransfer` with status `pending`, type `manual_request` | `LIVE` (`client/src/app/vendor/wallet/page.tsx`) |
| 35 | `GET` | `/api/vendors/wallet/transactions` | Mongoose `VendorTransfer.find()` | `vendorFinanceService.listWalletTransactions` | Prisma `vendorTransfer.findMany` ordered by `createdAt: desc` | `LIVE` (`client/src/app/vendor/wallet/page.tsx`) |
| 36 | `GET` | `/api/vendors/shop` | Mongoose `vendor.shopSettings` | `vendorProfileService.getShopSettings` | Retrieves `shopSettings` JSON from Prisma `Vendor` | `LIVE` (`client/src/app/vendor/shop/page.tsx`) |
| 37 | `PUT` | `/api/vendors/shop` | Mongoose `vendor.save()` | `vendorProfileService.updateShopSettings` | Updates `shopSettings` JSON on Prisma `Vendor` | `LIVE` (`client/src/app/vendor/shop/page.tsx`) |
| 38 | `GET` | `/api/vendors/plans` | Static JSON / Mongoose config | `vendorFinanceService.getSubscriptionPlans` | Canonical `VENDOR_PLANS` configuration | `LIVE` (`client/src/app/vendor/plans/page.tsx`) |
| 39 | `GET` | `/api/vendors/subscription` | Mongoose `vendor.subscription` | `vendorFinanceService.getVendorSubscription` | Retrieves subscription plan from Prisma `Vendor.metrics` | `LIVE` (`client/src/app/vendor/subscription/page.tsx`) |
| 40 | `POST` | `/api/vendors/subscription` | Mongoose `vendor.save()` | `vendorFinanceService.updateVendorSubscription` | Updates subscription plan in Prisma `Vendor.metrics` | `LIVE` (`client/src/app/vendor/subscription/page.tsx`) |
| 41 | `GET` | `/api/vendors/shop/:slugOrId` | Mongoose `Vendor.findOne()` + `Product.find()` | `vendorProfileService.getPublicShop` | Public shop profile + approved products via Prisma | `LIVE` (`client/src/app/shops/[slug]/page.tsx`) |

---

## 3. B2B & Support Routes Matrix (6 B2B Endpoints)

| # | HTTP Method | Endpoint Path | Legacy Persistence | Phase 2 Prisma Implementation | Gate / Hard Constraint Compliance | Frontend Consumer / Current Status |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/b2b/distributors` | Mongoose `Distributor.create()` | HTTP 501 `FEATURE_DISABLED` | Gate 6: Explicitly decoupled. Zero phantom Prisma models created. | `UNUSED` (No frontend consumer in client/) |
| 2 | `GET` | `/api/b2b/distributors` | Mongoose `Distributor.find()` | HTTP 501 `FEATURE_DISABLED` | Gate 6: Explicitly decoupled. Zero phantom Prisma models created. | `UNUSED` (No frontend consumer in client/) |
| 3 | `POST` | `/api/b2b/samples` | Mongoose `SampleRequest.create()` | HTTP 501 `FEATURE_DISABLED` | Gate 6: Explicitly decoupled. Zero phantom Prisma models created. | `UNUSED` (No frontend consumer in client/) |
| 4 | `GET` | `/api/b2b/samples` | Mongoose `SampleRequest.find()` | HTTP 501 `FEATURE_DISABLED` | Gate 6: Explicitly decoupled. Zero phantom Prisma models created. | `UNUSED` (No frontend consumer in client/) |
| 5 | `GET` | `/api/b2b/settings` | Mongoose `B2BSettings.findOne()` | HTTP 501 `FEATURE_DISABLED` | Gate 6: Explicitly decoupled. Zero phantom Prisma models created. | `UNUSED` (No frontend consumer in client/) |
| 6 | `PUT` | `/api/b2b/settings` | Mongoose `B2BSettings.findOneAndUpdate()` | HTTP 501 `FEATURE_DISABLED` | Gate 6: Explicitly decoupled. Zero phantom Prisma models created. | `UNUSED` (No frontend consumer in client/) |

---

## 4. Summary Statistics
- **Total Admin Endpoints**: 38 (100% Migrated to Prisma Services)
- **Total Vendor Endpoints**: 41 (100% Migrated to Prisma Services)
- **Total B2B Endpoints**: 6 (100% Decoupled with HTTP 501 Responses)
- **Grand Total Evaluated**: 85 Endpoints
- **Total Runtime Mongoose Dependencies**: 0
