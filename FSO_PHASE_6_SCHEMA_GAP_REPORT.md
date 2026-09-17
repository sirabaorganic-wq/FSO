# FSO — Phase 6: Schema Gap Report & Enum Verification

**Evaluation Date**: September 17, 2026  
**Status**: ZERO SCHEMA GAPS — EXISTING PRISMA SCHEMA FULLY AUTHORITATIVE  
**Prisma Version**: 6.19.3  
**Database**: Neon PostgreSQL  

---

## 1. Phase 5 State Model & Enum Forensic Verification

### 1.1 Verification of `PARTIALLY_DELIVERED`
As mandated by Step 3 of the Phase 6 specification, the enums in `backend/prisma/schema.prisma` were forensically inspected:

```prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  DISPATCHED
  SHIPPED
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum VendorOrderStatus {
  PENDING
  ACCEPTED
  PROCESSING
  READY_TO_SHIP
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### Forensic Determination:
- **`PARTIALLY_DELIVERED` DOES NOT EXIST** in the authoritative `OrderStatus` enum or `VendorOrderStatus` enum.
- In Phase 5 documentation, `PARTIALLY_DELIVERED` was discussed as a conceptual aggregation label when one sub-order of an order is delivered while others are in transit.
- In the PostgreSQL database, writing `PARTIALLY_DELIVERED` to `Order.status` would trigger a database constraint violation.
- **Rule for Phase 6**:
  Parent order status aggregation adheres strictly to the existing enum values:
  - If all vendor orders are `CANCELLED` $\rightarrow$ `CANCELLED`
  - If all vendor orders are `DELIVERED` $\rightarrow$ `DELIVERED`
  - If any vendor order is `SHIPPED` or `DELIVERED` (partial progress) $\rightarrow$ `SHIPPED`
  - Otherwise $\rightarrow$ `PROCESSING` (or `PENDING`)

---

## 2. Complete Model Capability Evaluation for Phase 6

| Seller Requirement | Existing Prisma Model | Existing Fields | Schema Sufficiency |
|---|---|---|---|
| **Vendor Identity & Credentials** | `User` | `id`, `email`, `password`, `role: PRODUCER_MANAGER`, `isAdmin` | **Sufficient**. Reuses authoritative User authentication. |
| **Vendor Business Profile** | `Vendor` | `id`, `slug`, `businessName`, `businessType`, `email`, `phone`, `address*`, `producerStory`, `certifications`, `bankDetails` | **Sufficient**. All profile metadata supported. |
| **Pickup Location & Logistics** | `Vendor` | `shiprocketPickupCode`, `pickupAddress`, `shiprocketPickupStatus` | **Sufficient**. Configured pickup code used by Phase 5 logistics. |
| **Product Catalog Management** | `Product` | `id`, `name`, `slug`, `price`, `compareAtPrice`, `description`, `category`, `image`, `images`, `sku`, `hsn`, `vendorId`, `vendorStatus`, `isActive`, `isPublic` | **Sufficient**. All catalog attributes supported. |
| **Inventory Management** | `Product` | `stockQuantity` (Integer) | **Sufficient**. Single authoritative stock field. |
| **Vendor Orders & Line Items** | `VendorOrder` | `id`, `vendorOrderNumber`, `orderId`, `vendorId`, `status`, `items` (Json), `subtotal`, `commissionRate`, `commissionAmount`, `payoutAmount`, `payoutStatus` | **Sufficient**. Full multi-vendor order partitioning. |
| **Logistics Tracking** | `VendorOrder` | `shipmentId`, `shiprocketOrderId`, `awbCode`, `courierName`, `trackingUrl`, `shippedAt`, `deliveredAt` | **Sufficient**. Phase 5 fields fully present. |
| **Returns & Refunds** | `RefundLog` | `id`, `orderId`, `paymentId`, `razorpayRefundId`, `amount`, `reason`, `status` | **Sufficient**. Relational query by `orderId` resolves vendor returns. |
| **Financial Ledgers & Payouts** | `VendorTransfer`, `EnterpriseSettlement` | `id`, `vendorId`, `amount`, `transferId`, `status`, `period` | **Sufficient**. Payout history and wallet transactions. |
| **Vendor Notifications** | `Notification` | `id`, `userId`, `vendorId`, `title`, `message`, `type`, `isRead` | **Sufficient**. Direct indexing on `[vendorId, isRead]`. |
| **Customer Product Reviews** | `Review` | `id`, `productId`, `userId`, `rating`, `comment`, `createdAt` | **Sufficient**. Relation via `product.vendorId`. |

---

## 3. Final Conclusion

**ZERO SCHEMA GAPS**.  
The existing `schema.prisma` provides complete, native relational support for all Phase 6 seller portal capabilities.  
- No `prisma db push`
- No migrations
- No schema edits
- No hidden JSON persistence workarounds
- No MongoDB/Mongoose models
