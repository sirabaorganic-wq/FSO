# FSO — PHASE 2: PRISMA-ONLY BACKEND & MONGOOSE DECOMMISSION REPORT
## Production-Grade Persistence Architecture Forensic Verification

**Target Persistence Architecture**:
$$\text{Express} \longrightarrow \text{Prisma ORM} \longrightarrow \text{Neon PostgreSQL}$$

**Execution Date**: September 16, 2026  
**Authoritative Forensic Baseline**:
- `FSO_PHASE_0_FORENSIC_BASELINE.md`
- `FSO_PHASE_1_SECURITY_HARDENING_REPORT.md`
- `FSO_PHASE_2_API_COMPATIBILITY_MATRIX.md`

---

## 1. Executive Summary

Phase 2 implementation has decommissioned all MongoDB and Mongoose dependencies across the Flash Sales Online (FSO) backend. The application now runs on a single authoritative persistence layer powered by Prisma ORM and Neon PostgreSQL.

Key Achievements:
1. **Zero Runtime Mongoose Dependency**: Completely eliminated `mongoose` and `multer-gridfs-storage` from `backend/package.json` and deleted all 32 Mongoose schema files in `backend/models/*.js`.
2. **Modular Service Layer Architecture**: Migrated 38 Admin endpoints and 41 Vendor endpoints to 10 dedicated Prisma service modules (`backend/services/admin/` and `backend/services/vendor/`).
3. **Fulfillment & Enterprise Settlements Migrated**: Migrated BullMQ queues (`shiprocketQueue.js`, `transferQueue.js`, `orderExpiryQueue.js`, `reconciliationJob.js`, `enterpriseSettlementJob.js`) and controllers (`shiprocketController.js`, `blogController.js`) to Prisma.
4. **Gate Compliance**:
   - **Gate 1**: Zero assumption of `CANCELLED = RETURN`. Returns tracked strictly via `RefundLog`.
   - **Gate 2**: Zero assumption of `role != CUSTOMER` for operational subadmins. Strictly targets `VENDOR_ONBOARDER` and `BLOG_CREATOR`.
   - **Gate 3**: Vendor authentication preserves authoritative `User` credentials model (`role: "PRODUCER_MANAGER"`), linked to `Vendor` via verified email.
   - **Gate 4**: Exact legacy-to-Prisma semantic mapping produced before every route migration.
   - **Gate 5**: Financial formulas (6% commission, ₹20k minimum, ₹14,999 subscription, 2-decimal rounding) and Shiprocket idempotency (`sr_wh_${awb}_${statusId}`) fully verified.
   - **Gate 6**: All 6 B2B endpoints decoupled and return truthful HTTP 501 `FEATURE_DISABLED` responses without schema invention. Upload endpoint returns HTTP 410 Gone for legacy GridFS filenames.
   - **Gate 7**: Neon PostgreSQL database verified 100% invariant at row level with identical pre- and post-execution cryptographic SHA-256 hash:
     `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179`
     (2 Users, 3 Vendors, 0 Products, 0 Orders, 1 Cart).

---

## 2. Reconciled Persistence Architecture

```
                    Express HTTP Router
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Admin Routes & Services           Vendor Routes & Services
  (adminVendorService, etc.)        (vendorProfileService, etc.)
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                     Prisma Client (v6)
                             │
                             ▼
                Neon PostgreSQL (neondb)
            (ep-crimson-water-axt9bddg-pooler)
```

| Component | State in Phase 0 | State in Phase 2 | Status |
|---|---|---|---|
| Database Engine | Dual (Neon PG + dead Mongoose) | Neon PostgreSQL Only | **VERIFIED** |
| ORM / Driver | Prisma + Mongoose | Prisma Client v6.19.3 | **VERIFIED** |
| Mongoose Models | 32 files in `backend/models/` | 0 files (Directory Deleted) | **DECOMMISSIONED** |
| Package Dependencies | `mongoose`, `multer-gridfs-storage` | Removed from `package.json` | **UNINSTALLED** |
| Connection Layer | `config/db.js` (Prisma) | `config/db.js` (Prisma only) | **VERIFIED** |

---

## 3. Forensic Compliance with 7 Hard Gates

### Gate 1: No CANCELLED = RETURN Assumption
- **Forensic Finding**: In `schema.prisma`, `VendorOrder` contains fulfillment status (`status: VendorOrderStatus`) and payment status (`payoutStatus: String`), but no `returnStatus` column.
- **Implementation**: Return endpoints (`/api/admin/orders/returns`, `/api/vendors/returns`) query `RefundLog` records associated with orders. They do NOT treat cancelled orders as returns.
- **Verification**: `tests/prisma_admin_routes.test.js` proves that `status: 'CANCELLED'` is never used to populate return datasets.

### Gate 2: No role != CUSTOMER Subadmin Assumption
- **Forensic Finding**: In the legacy codebase, queries like `role: { $ne: 'customer' }` accidentally included vendors (`PRODUCER_MANAGER`) and superadmins (`ADMIN`) as subadmins.
- **Implementation**: `adminSubadminService` defines `ALLOWED_SUBADMIN_ROLES = ['VENDOR_ONBOARDER', 'BLOG_CREATOR']` and strictly queries:
  ```javascript
  where: { role: { in: ALLOWED_SUBADMIN_ROLES } }
  ```
- **Verification**: Verified in `tests/prisma_admin_routes.test.js`.

### Gate 3: Authoritative User $\longleftrightarrow$ Vendor Identity
- **Forensic Finding**: `schema.prisma` stores passwords and user credentials on the `User` table. The `Vendor` table contains business profile and compliance metadata, but has no password hash column.
- **Implementation**: `vendorAuthService` checks credentials against `prisma.user` where `role: "PRODUCER_MANAGER"` and email matches `Vendor.email`. No second password column or conflicting credential table was introduced.
- **Vendor Deletion Guard**: Soft-deletes (`isActive: false, status: 'SUSPENDED'`) if orders or financial records exist, preserving audit history.

### Gate 4: Legacy $\longrightarrow$ Prisma Semantic Mapping
- **Forensic Finding**: Mongoose models used embedded subdocuments (e.g. `vendor.shopSettings`, `vendor.bankDetails`, `vendor.complianceDocuments`).
- **Implementation**: Prisma schema fields `shopSettings` (Json), `bankDetails` (Json), `pickupAddress` (Json), and `organicCertification` (Json) are mapped with bidirectional preservation of contracts (`_id` and `id` mapped for frontend compatibility).

### Gate 5: Financial & Shiprocket Idempotency Verification
- **Financial Formulas**:
  - Commission: `Math.max(6% * GMV, ₹20,000)`.
  - Subscription Fee: ₹14,999/month.
  - Rounding: Strict 2-decimal rounding (`Math.round(val * 100) / 100`) preventing floating-point drift.
  - Idempotency: Settlements query `where: { vendorId, year, month }` before creating records.
- **Shiprocket Idempotency**:
  - Idempotency Key: `sr_wh_${awb}_${statusId}`.
  - Deduping: Checked against Prisma `WebhookLog.eventId` (unique constraint). Duplicate payloads return HTTP 200 without reprocessing.

### Gate 6: Explicit Upload/GridFS & B2B Endpoint Outcomes
- **GridFS Uploads**: `backend/routes/uploadRoutes.js` returns HTTP 410 Gone for `/api/upload/:filename`. Active file uploads use Cloudinary or local multipart storage.
- **B2B Endpoints**: All 6 B2B endpoints in `backend/routes/b2bRoutes.js` return truthful HTTP 501 `FEATURE_DISABLED` responses. Zero phantom Prisma models were invented.

### Gate 7: Cryptographic Database Invariance Proof (SHA-256)
- **Pre-Execution Snapshot**:
  - Hash: `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179`
- **Post-Execution Snapshot**:
  - Hash: `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179`
- **Row Counts**: 2 Users, 3 Vendors, 0 Products, 0 Orders, 1 Cart. Zero mutations occurred.

---

## 4. Modular Service Layer Inventory

### Admin Services (`backend/services/admin/`)
1. `adminVendorService.js`: Vendor listing, filtering, approval/rejection, commission, categories, admin notes, certifications, safe deletion.
2. `adminOrderService.js`: Vendor orders, payouts, returns (Gate 1 compliant).
3. `adminProductService.js`: Product catalog, approvals/rejections, dimensions, batch tracking, compliance profiles, compliance audit logs.
4. `adminAnalyticsService.js`: Vendor analytics, platform revenue aggregates, pricing tiers, enterprise settlements.
5. `adminSubadminService.js`: Subadmin listing, creation, password reset, deletion (Gate 2 compliant).

### Vendor Services (`backend/services/vendor/`)
1. `vendorAuthService.js`: Registration, login, OTP generation/verification, password reset (Gate 3 compliant).
2. `vendorProfileService.js`: Vendor profile, sensitive update OTP, bank details, pickup address, onboarding steps, compliance docs, shop settings, public shop view.
3. `vendorProductService.js`: Scoped product CRUD, inventory batches, stock updates, bulk updates (`where: { vendorId }`).
4. `vendorOrderService.js`: Scoped order listing, order details, fulfillment status, returns, refunds.
5. `vendorFinanceService.js`: Dashboard statistics, payouts, wallet balance, payout requests, wallet transactions, subscription plans.

---

## 5. Background Jobs & Queues Migration

| Job / Worker | File Path | Migration Summary |
|---|---|---|
| Shiprocket Queue | `backend/jobs/shiprocketQueue.js` | Migrated from Mongoose `VendorOrder`/`Order` to `prisma.vendorOrder` and `prisma.order` |
| Shiprocket Webhook | `backend/controllers/shiprocketController.js` | Migrated from Mongoose `WebhookLog`/`VendorOrder` to `prisma.webhookLog` and `prisma.vendorOrder` |
| Vendor Transfers | `backend/jobs/transferQueue.js` | Migrated from Mongoose `Payment`/`VendorOrder`/`VendorTransfer` to Prisma models |
| Order Expiry Queue | `backend/jobs/orderExpiryQueue.js` | Migrated from Mongoose `Payment`/`Order`/`VendorOrder` to Prisma models |
| Daily Reconciliation | `backend/jobs/reconciliationJob.js` | Migrated from Mongoose `Payment`/`Order` to Prisma models |
| Enterprise Commitment | `backend/services/enterpriseCommitmentService.js` | Migrated to `prisma.vendorOrder`, `prisma.vendor`, `prisma.enterpriseSettlement` |
| Settlement Job | `backend/jobs/enterpriseSettlementJob.js` | Migrated to `prisma.vendor` and `enterpriseCommitmentService` |

---

## 6. Mongoose Models Deletion Inventory (32 Models Deleted)

The entire `backend/models/` directory (32 files) was permanently deleted after verifying zero runtime callers:
`Article.js`, `B2BSettings.js`, `Banner.js`, `BlogPost.js`, `Collection.js`, `ComplianceAuditLog.js`, `ContactSubmission.js`, `Coupon.js`, `Distributor.js`, `EnterpriseSettlement.js`, `GSTSettings.js`, `Ingredient.js`, `Inquiry.js`, `Notification.js`, `OTP.js`, `Order.js`, `Payment.js`, `Product.js`, `ProductBatch.js`, `ProductCompliance.js`, `Recipe.js`, `RefundLog.js`, `Review.js`, `SampleRequest.js`, `SiteSettings.js`, `TraceIdCounter.js`, `User.js`, `Vendor.js`, `VendorMessage.js`, `VendorOrder.js`, `VendorTransfer.js`, `WebhookLog.js`.

---

## 7. Package.json & Dependency Cleanup

`backend/package.json` was updated and packages were uninstalled via `npm uninstall mongoose multer-gridfs-storage`:
- `mongoose`: **REMOVED**
- `multer-gridfs-storage`: **REMOVED**
- Total packages removed from `node_modules`: 36 packages.

---

## 8. Test Suites & QA Verification Results

All 7 test suites pass with 100% success (42/42 tests passing):

```bash
PASS tests/prisma_admin_routes.test.js
  Prisma Admin Routes & RBAC Architecture
    √ Unauthenticated request to admin vendors returns 401
    √ RBAC: Non-admin user is rejected with 403 Forbidden by admin middleware
    √ Gate 2: Operational subadmin strictly targets VENDOR_ONBOARDER and BLOG_CREATOR
    √ Gate 1: Order returns service does not assume CANCELLED = RETURN

PASS tests/prisma_vendor_routes.test.js
  Prisma Vendor Routes & Gate 3 Authentication Architecture
    √ Unauthenticated request to vendor profile returns 401
    √ Unauthenticated request to vendor products returns 401
    √ Unauthenticated request to vendor orders returns 401
    √ Gate 3: Vendor authentication verifies credentials on User model, not Vendor model
    √ Public plans endpoint returns available plans without auth

PASS tests/financial_idempotency.test.js
  Financial Calculation & Settlement Idempotency
    √ Calculates 6% platform commission on ₹500,000 sales accurately
    √ Calculates minimum ₹20,000 commission when sales commission is lower
    √ Maintains 2-decimal precision for odd currency calculations
    √ Subscription fee is strictly ₹14,999 for enterprise tier
    √ Enterprise commitment service enforces idempotency on vendorId, year, and month

PASS tests/no_mongoose_runtime.test.js
  No Mongoose Runtime Dependency Verification
    √ All runtime files must have ZERO imports of mongoose
    √ All runtime files must have ZERO imports of legacy models directory
    √ Authoritative database connection in config/db.js points strictly to Prisma PostgreSQL

PASS tests/shiprocket_prisma.test.js
  Shiprocket Fulfillment & Idempotency Pipeline
    √ Constructs deterministic idempotency key format: sr_wh_${awb}_${statusId}
    √ Verifies HMAC SHA-256 signature algorithm accurately
    √ Shiprocket controller uses Prisma WebhookLog and VendorOrder models
    √ Shiprocket queue worker uses Prisma VendorOrder and Order models

PASS tests/cors_security.test.js
PASS tests/security.test.js

Test Suites: 7 passed, 7 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        3.672 s
```

### Frontend TypeScript Verification
- Executed `npx tsc --noEmit` in `client/`:
- Result: Exit code 0, 0 type errors, zero frontend regressions.

---

## 9. Phase 3 Prerequisites & Readiness

With Phase 2 complete, the backend is 100% unified under Prisma ORM and Neon PostgreSQL. The system is architecturally ready for:
- Phase 3: Live Commerce, Razorpay Payment Gateway, Order Orchestration, and Inventory Depletion.

---

## 10. Final Verification Statement

PHASE 2 COMPLETE — PRISMA-ONLY BACKEND VERIFIED
