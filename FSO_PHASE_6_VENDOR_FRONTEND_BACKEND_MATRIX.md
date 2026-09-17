# FSO — Phase 6: Vendor Frontend ↔ Backend Integration Matrix

**Audit Date**: September 17, 2026  
**Status**: Comprehensive View & Component Mapping  

---

## 1. Page to API & Database Field Mapping

| Seller Route / View | Component | API Client Method | REST Endpoint | Backend Service | Prisma Model & Field | Mismatch / Remediation |
|---|---|---|---|---|---|---|
| `/seller` (`overview`) | `Overview` (`seller-portal.tsx`) | `getVendorDashboardStatsApi()` | `GET /api/v1/vendors/dashboard` | `vendorFinanceService.getDashboardStats` | `VendorOrder.subtotal`, `VendorOrder.payoutAmount`, `VendorOrder.status`, `Product.count` | Currently uses static `sellerOrders`, `salesData`, hardcoded `₹64,820`. Replace with dynamic API state. |
| `/seller/products` (`products`) | `ProductTable` (`seller-portal.tsx`) | `getVendorProductsApi({ page, status })` | `GET /api/v1/vendors/products` | `vendorProductService.listVendorProducts` | `Product.name`, `Product.price`, `Product.stockQuantity`, `Product.sku`, `Product.vendorStatus` | Currently uses static `sellerProducts`. Replace with dynamic API table, filters & pagination. |
| `/seller/products/new` (`new-product`) | `ProductForm` (`seller-portal.tsx`) | `createVendorProductApi(data)` | `POST /api/v1/vendors/products` | `vendorProductService.createVendorProduct` | `Product.name`, `Product.description`, `Product.price`, `Product.stockQuantity`, `Product.category`, `Product.image` | Form had no submission handler. Connect multi-step submit to `createVendorProductApi`. |
| `/seller/products/[id]` (`product-detail`) | `ProductDetail` (`seller-portal.tsx`) | `getVendorProductByIdApi(id)` & `updateVendorProductApi(id, data)` | `GET /api/v1/vendors/products/:id` & `PUT /api/v1/vendors/products/:id` | `vendorProductService.getVendorProduct` & `updateVendorProduct` | `Product.*` | `GET /api/v1/vendors/products/:id` was missing. Implement endpoint and connect edit view. |
| `/seller/orders` (`orders`) | `Orders` / `OrderTable` (`seller-portal.tsx`) | `getVendorOrdersApi({ page, status })` | `GET /api/v1/vendors/orders` | `vendorOrderService.listVendorOrders` | `VendorOrder.vendorOrderNumber`, `VendorOrder.subtotal`, `VendorOrder.status`, `Order.user.name` | Currently uses static `sellerOrders`. Connect to real orders API. |
| `/seller/orders/[id]` (`order-detail`) | `OrderDetailView` (new in `seller-portal.tsx`) | `getVendorOrderByIdApi(id)` & `updateVendorOrderStatusApi(id, status)` | `GET /api/v1/vendors/orders/:id` & `PUT /api/v1/vendors/orders/:id/status` | `vendorOrderService.getVendorOrder` & `updateOrderStatus` | `VendorOrder.items`, `VendorOrder.status`, `VendorOrder.awbCode`, `VendorOrder.courierName`, `VendorOrder.trackingUrl` | Page was broken (didn't pass `id`). Add dedicated order detail sub-view with dispatch & tracking actions. |
| `/seller/inventory` (`inventory`) | `Inventory` (`seller-portal.tsx`) | `getVendorInventoryApi()` & `updateInventoryItemApi(id, stock)` | `GET /api/v1/vendors/inventory` & `PUT /api/v1/vendors/inventory/:itemId` | `vendorProductService.listInventory` & `updateInventoryItem` | `Product.stockQuantity`, `Product.sku`, `Product.price` | Currently uses static `sellerProducts` and hardcoded metric `130 units`. Connect to dynamic inventory API. |
| `/seller/profile` (`profile`) | `Profile` (`seller-portal.tsx`) | `getVendorProfileApi()` & `updateVendorProfileApi(data)` | `GET /api/v1/vendors/profile` & `PUT /api/v1/vendors/profile` | `vendorProfileService.getVendorProfile` & `updateVendorProfile` | `Vendor.businessName`, `Vendor.contactPerson`, `Vendor.addressStreet`, `Vendor.addressCity`, `Vendor.addressState`, `Vendor.producerStory` | Currently uses hardcoded defaults ("Saraswati Oil Mill"). Connect to real vendor profile API. |
| `/seller/documents` (`documents`) | `Documents` (`seller-portal.tsx`) | `getVendorComplianceApi()` | `GET /api/v1/vendors/compliance` | `vendorProfileService.getComplianceDocs` | `Vendor.certifications`, `Vendor.gstNumber`, `Vendor.fssaiNumber` | Currently uses static `sellerDocuments`. Connect to real compliance docs API. |
| `/seller/payouts` (`payouts`) | `Payouts` (`seller-portal.tsx`) | `getVendorPayoutsApi()` & `getVendorWalletApi()` | `GET /api/v1/vendors/payouts` & `GET /api/v1/vendors/wallet` | `vendorFinanceService.listPayouts` & `getWalletBalance` | `VendorTransfer.*`, `VendorOrder.payoutAmount` | Currently uses static `sellerPayouts` and hardcoded `₹18,420`. Connect to real payouts/wallet API. |
| `/seller/analytics` (`analytics`) | `Analytics` (`seller-portal.tsx`) | `getVendorAnalyticsApi(period)` | `GET /api/v1/vendors/analytics` | `vendorFinanceService.getVendorAnalytics` | `VendorOrder.subtotal`, `VendorOrder.commissionAmount`, `VendorOrder.payoutAmount`, `VendorOrder.createdAt` | Currently uses static `salesData` and hardcoded metrics. Implement backend endpoint and connect time filter. |
| `/seller/reviews` (`reviews`) | `Reviews` (`seller-portal.tsx`) | `getVendorReviewsApi()` & `addVendorReviewReplyApi(id, reply)` | `GET /api/v1/vendors/reviews` & `POST /api/v1/reviews/:id/reply` | `reviewController.getVendorReviews` & `addVendorReply` | `Review.rating`, `Review.comment`, `Review.createdAt`, `Product.name` | Currently uses static `sellerReviews`. Implement vendor reviews list endpoint and connect. |
| `/seller/customers` (`customers`) | `Customers` (`seller-portal.tsx`) | `getVendorCustomersApi()` | `GET /api/v1/vendors/customers` | `vendorProfileService.getVendorCustomers` | `VendorOrder`, `Order`, `User` | Identified as mocked. Implement real vendor-scoped customer summary endpoint and connect view. |
| `/seller/settings` (`settings`) | `SettingsView` (`seller-portal.tsx`) | `getShopSettingsApi()` & `updateShopSettingsApi(data)` | `GET /api/v1/vendors/shop` & `PUT /api/v1/vendors/shop` | `vendorProfileService.getShopSettings` & `updateShopSettings` | `Vendor.shopSettings` | Currently static inputs. Connect to backend shop settings API. |
| Seller Nav & Header Notifications | `SellerPortal` Header & Dropdown | `getVendorNotificationsApi()` & `markAllVendorNotificationsReadApi()` | `GET /api/v1/notifications/vendor` & `PUT /api/v1/notifications/vendor/read-all` | `notificationRoutes` | `Notification.title`, `Notification.message`, `Notification.isRead`, `Notification.createdAt` | Currently uses static `sellerNotifications`. Connect to real notifications API. |
| `/seller/register` | `SellerRegisterCard` (`seller-register-card.tsx`) | `registerSellerApi(data)` | `POST /api/v1/vendors/register` | `vendorAuthService.registerVendor` | `User`, `Vendor`, `OTP` | Already connected to live API. Preserved intact. |

---

## 2. Identified Mismatches & Action Plan

1. **Frontend API Client Absence**:
   `client/lib/api/seller.ts` does not yet exist.
   $\rightarrow$ **Action**: Create `client/lib/api/seller.ts` with fully typed API methods matching all vendor backend endpoints.
2. **Missing Backend Endpoints**:
   - `GET /api/v1/vendors/products/:id` (Vendor Product Detail)
   - `GET /api/v1/vendors/analytics` (Vendor Scoped Analytics with date filter)
   - `GET /api/v1/vendors/customers` (Vendor Scoped Customer Summary)
   - `GET /api/v1/vendors/reviews` (Vendor Product Reviews)
   - `GET /api/v1/vendors/shop` & `PUT /api/v1/vendors/shop` (Shop Settings)
   $\rightarrow$ **Action**: Implement these endpoints cleanly in `vendorProductService.js`, `vendorFinanceService.js`, `vendorProfileService.js`, and `reviewController.js`.
3. **Broken Order Detail Route**:
   `client/app/seller/orders/[id]/page.tsx` was passing `view="orders"` without `id`.
   $\rightarrow$ **Action**: Update `page.tsx` to pass `view="order-detail"` and `id={id}` to `<SellerPortal />`.
4. **State Machine & Empty States**:
   When the database has zero records, every seller view must render an honest empty state (`0 orders`, `0 products`, `₹0 revenue`, empty lists) with loading skeleton indicators.
