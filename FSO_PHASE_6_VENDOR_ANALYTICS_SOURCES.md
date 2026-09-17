# FSO — Phase 6: Vendor Analytics & Financial Sources

**Specification Date**: September 17, 2026  
**Persistence Layer**: Neon PostgreSQL via Prisma ORM  
**Governing Financial Policy**: Persisted Order Snapshots & Official SIRABA Economics Architecture  

---

## 1. Metric Categorization: Snapshot vs. Period

To prevent analytical distortion (e.g. filtering current stock on hand by a 30-day sales window), all metrics are formally separated into two categories:

### A. Period Metrics (Filtered by `?period=7d|30d|90d|1y|all`)
Filtered by `VendorOrder.createdAt >= startDate`:

| UI Metric | Prisma Model | Filtering Criteria | Aggregation / Formula | Time Period | Backend API Field | Frontend Consumer |
|---|---|---|---|---|---|---|
| **Gross Revenue** | `VendorOrder` | `vendorId == req.vendor.id` AND `status != 'CANCELLED'` AND `createdAt >= startDate` | $\sum \text{subtotal}$ | Selected period | `analytics.revenue` | `Overview.Metric[Revenue]`, `Analytics.Metric[Revenue]` |
| **Net Payout / Earnings** | `VendorOrder` | `vendorId == req.vendor.id` AND `status != 'CANCELLED'` AND `createdAt >= startDate` | $\sum \text{payoutAmount}$ | Selected period | `analytics.payout` | `Overview.Metric[Payout]`, `Analytics.Metric[Payout]` |
| **Marketplace Commission** | `VendorOrder` | `vendorId == req.vendor.id` AND `status != 'CANCELLED'` AND `createdAt >= startDate` | $\sum \text{commissionAmount}$ (Persisted) | Selected period | `analytics.commission` | `Analytics.Metric[Commission]` |
| **Total Orders in Period** | `VendorOrder` | `vendorId == req.vendor.id` AND `createdAt >= startDate` | `count(*)` | Selected period | `analytics.orders` | `Overview.Metric[Orders]`, `Analytics.Metric[Orders]` |
| **Completed Orders** | `VendorOrder` | `vendorId == req.vendor.id` AND `status == 'DELIVERED'` AND `createdAt >= startDate` | `count(*)` | Selected period | `analytics.completedOrders` | `Analytics.CompletedOrders` |
| **Cancelled Orders** | `VendorOrder` | `vendorId == req.vendor.id` AND `status == 'CANCELLED'` AND `createdAt >= startDate` | `count(*)` | Selected period | `analytics.cancelledOrders` | `Analytics.CancelledOrders` |
| **AOV (Avg Order Value)** | `VendorOrder` | `vendorId == req.vendor.id` AND `status != 'CANCELLED'` AND `createdAt >= startDate` | $\frac{\sum \text{subtotal}}{\text{count(orders)}}$ | Selected period | `analytics.aov` | `Analytics.Metric[AOV]` |
| **Products Sold Units** | `VendorOrder` | `vendorId == req.vendor.id` AND `status != 'CANCELLED'` AND `createdAt >= startDate` | Sum of item quantities in JSON `items` snapshot | Selected period | `analytics.productsSold` | `Overview.Metric[Products sold]` |
| **Sales Chart Trend** | `VendorOrder` | `vendorId == req.vendor.id` AND `status != 'CANCELLED'` AND `createdAt >= startDate` | Group by day: $\sum \text{subtotal}$ | Selected period (e.g. 30 days) | `analytics.salesTrend[]` | `Overview.Chart[Revenue overview]`, `Analytics.Chart` |

### B. Snapshot Metrics (Unfiltered by Date; Represents Current Active State)
Always represents the active operational reality at the exact moment of query:

| UI Metric | Prisma Model | Filtering Criteria | Aggregation / Formula | Time Scope | Backend API Field | Frontend Consumer |
|---|---|---|---|---|---|---|
| **Total Active Products** | `Product` | `vendorId == req.vendor.id` AND `isActive == true` | `count(*)` | **Current Snapshot** | `snapshot.totalProducts` | `Overview.Metric[Products]`, `ProductTable.Count` |
| **Total Stock on Hand** | `Product` | `vendorId == req.vendor.id` | $\sum \text{stockQuantity}$ | **Current Snapshot** | `snapshot.totalUnits` | `Inventory.Metric[Total units]` |
| **Low Stock Count** | `Product` | `vendorId == req.vendor.id` AND `stockQuantity < 15` | `count(*)` | **Current Snapshot** | `snapshot.lowStockCount` | `Inventory.Metric[Low stock]`, `Overview.Alerts` |
| **Inventory Stock Value** | `Product` | `vendorId == req.vendor.id` | $\sum (\text{price} \times \text{stockQuantity})$ | **Current Snapshot** | `snapshot.stockValue` | `Inventory.Metric[Stock value]` |
| **Pending Orders** | `VendorOrder` | `vendorId == req.vendor.id` AND `status in ['PENDING', 'ACCEPTED', 'PROCESSING', 'READY_TO_SHIP']` | `count(*)` | **Current Snapshot** | `snapshot.pendingOrders` | `Overview.Metric[Pending]`, `Orders.Badge` |
| **Available Wallet Balance** | `VendorOrder` + `VendorTransfer` | `vendorId == req.vendor.id` | $\sum \text{payoutAmount (DELIVERED)} - \sum \text{transfers (completed/pending)}$ | **Current Snapshot** | `wallet.balance` | `Payouts.Metric[Available balance]` |
| **Upcoming / In-Transit Payout** | `VendorOrder` | `vendorId == req.vendor.id` AND `status in ['SHIPPED', 'DELIVERED']` AND `payoutStatus == 'pending'` | $\sum \text{payoutAmount}$ | **Current Snapshot** | `payouts.upcomingPayout` | `Payouts.Metric[Upcoming payout]` |
| **Total Paid Out** | `VendorTransfer` | `vendorId == req.vendor.id` AND `status == 'completed'` | $\sum \text{amount}$ | **All-Time** | `payouts.totalPaidOut` | `Payouts.Metric[Total paid out]` |
| **Attributed Returns Count** | `RefundLog` | Attributed to `vendorId` via `orderId` & reason | `count(*)`, $\sum \text{amount}$ | **All-Time** | `returns.total` | `Returns.Count` |

---

## 2. Commission Authority & Economic Rules

1. **Persisted Commission Snapshot Rule**:
   - Commission is **NEVER** arbitrarily assumed to be 6%.
   - When an order is placed, `orderRoutes.js` calculates and saves `commissionRate` and `commissionAmount` onto the `VendorOrder` row:
     - If the vendor has a configured subscription plan (`vendorPlans.js`):
       - Starter: 15%
       - Professional: 10%
       - Business: 8%
       - Enterprise: 6%
     - If unconfigured, platform default (`orderRoutes.js:322` is 10%).
   - In Phase 6 analytics and finance, commission is derived **directly from the persisted `VendorOrder.commissionAmount` and `VendorOrder.commissionRate`** fields. Historical snapshots are immutable.
2. **Deterministic Rounding**:
   - All financial amounts are rounded to exactly 2 decimal places using deterministic currency arithmetic (`Math.round(val * 100) / 100`).
3. **Zero Frontend Mutation**:
   - The seller frontend cannot mutate `commissionRate`, `commissionAmount`, or `payoutAmount`. These are server-authoritative.
