# FSO Database Cleanup / Production Bootstrap Report

**Date:** September 11, 2026  
**Environment:** Neon PostgreSQL (Serverless) via Prisma ORM v6.19.3  
**Database Host:** Neon Cloud PostgreSQL (`DATABASE_URL` via connection pooler)  
**Status:** **SUCCESSFUL & VERIFIED (100% IDEMPOTENT)**

---

## 1. Executive Summary

In preparation for production development and the homepage content pass, the demo/test commerce state in the Neon PostgreSQL database was reset according to authoritative database predicates (`isAdmin: false`, all `Product` records). 

- **Admin Users Preserved:** Exactly 1 (`admin@fso.in`, `isAdmin: true`, `role: ADMIN`)
- **Non-Admin Users Remaining:** **0** (All demo customer, producer, and non-admin staff accounts removed)
- **Products Remaining:** **0** (All demo product records removed)
- **Live Vendors/Producers Preserved:** **2** (`Kashmir Saffron & Heritage Artisans`, `Pahadi Amrut Forest Collective`)
- **Curated Categories Preserved:** **5** (`Herbs & Tisanes`, `Heritage Spices & Seasonings`, `Wild Forest Honey`, `Cold-Pressed Oils & Ghee`, `Heirloom Grains & Millets`)
- **Editorial & Botanical Content Preserved:** **100%** (1 Article, 1 Recipe, 1 Botanical Ingredient, 1 Collection, 1 Hero Banner)
- **Zero Dangling Foreign Keys:** Full relational integrity audit passed with 0 orphaned references
- **Zero Frontend Changes:** Frontend code untouched during this database task
- **Zero Schema / Migration Changes:** Prisma schema and database migrations remained unchanged

---

## 2. Table Record Counts (Pre-Cleanup vs. Post-Cleanup)

| Entity / Database Model | Pre-Cleanup Count | Post-Cleanup Count | Net Change | Status |
|---|---:|---:|---:|:---:|
| **`User` (Total)** | **5** | **1** | **-4** | Preserved `isAdmin: true` only |
| ↳ *Admin Users (`isAdmin: true`)* | 1 | 1 | 0 | **Preserved** (`admin@fso.in`) |
| ↳ *Non-Admin Users (`isAdmin: false`)* | 4 | **0** | **-4** | **Cleaned to 0** |
| **`Product`** | **2** | **0** | **-2** | **Cleaned to 0** |
| **`Vendor` (Producers)** | **2** | **2** | **0** | **100% Preserved** |
| **`Category`** | **5** | **5** | **0** | **100% Preserved** |
| **`Order`** | **3** | **0** | **-3** | Demo test orders removed |
| **`OrderItem`** | **3** | **0** | **-3** | Cascade removed with orders |
| **`VendorOrder`** | **3** | **0** | **-3** | Cascade removed with orders |
| **`Review`** | **1** | **0** | **-1** | Demo test review removed |
| **`Cart`** | **2** | **0** | **-2** | Empty demo carts removed |
| **`CartItem`** | **0** | **0** | 0 | Clean |
| **`Article`** | **1** | **1** | **0** | **100% Preserved** |
| **`Recipe`** | **1** | **1** | **0** | **100% Preserved** |
| **`Ingredient`** | **1** | **1** | **0** | **100% Preserved** |
| **`Collection`** | **1** | **1** | **0** | **100% Preserved** |
| **`Banner`** | **1** | **1** | **0** | **100% Preserved** |
| **`ArticleProduct` (Junction)** | 1 | 0 | -1 | Cascaded on Product deletion |
| **`RecipeProduct` (Junction)** | 1 | 0 | -1 | Cascaded on Product deletion |
| **`CollectionProduct` (Junction)** | 2 | 0 | -2 | Cascaded on Product deletion |
| **`ProductBatch`** | 0 | 0 | 0 | Clean |
| **`ProductCompliance`** | 0 | 0 | 0 | Clean |

---

## 3. Exact Records Removed

### Non-Admin Users Removed (4)
1. **`demo_customer@fso.in`** (`cmtsunlrp0002vk3gztixg6rp`) — `role: CUSTOMER`, `isAdmin: false`
2. **`keshav.mjdm@gmail.com`** (`cmtvplwwn0001vkbgf4q8giz0`) — `role: CUSTOMER`, `isAdmin: false`
3. **`editor@fso.in`** (`cmtsunlfy0001vk3gbnod5ioa`) — `role: CONTENT_EDITOR`, `isAdmin: false`
4. **`producer@fso.in`** (`cmtszh0ib0000vkeclrtyb541`) — `role: PRODUCER_MANAGER`, `isAdmin: false`

### Products Removed (2)
1. **`Pure Kashmiri Mongra Saffron (Grade 1)`** (`cmtsunp98000bvk3gcioeystr`, slug: `pure-kashmiri-mongra-saffron-grade-1`)
2. **`Wild Himalayan Stinging Nettle Tisane`** (`cmtsunprl000dvk3gmz4hmuh9`, slug: `wild-himalayan-stinging-nettle-tisane`)

### Demo Orders Removed (3)
1. **`FSO-370658-9821`** (`cmtsxy5jx0004vkm8tslk7xll`) — Customer: `demo_customer@fso.in`, ₹1428
2. **`FSO-428097-2249`** (`cmtsxzdvc000cvkm84o25ttsb`) — Customer: `demo_customer@fso.in`, ₹1428
3. **`FSO-475453-1717`** (`cmtsy0e69000kvkm89iwrkp8r`) — Customer: `demo_customer@fso.in`, ₹1428

### Demo Reviews & Carts Removed
1. **`Review`** `cmtsy0rgc000qvkm8amz4h17g` — Verified 5-star review on Saffron by `demo_customer@fso.in`
2. **`Cart`** `cmtsxwa0s0000vkm863dl3l43` — Belonged to `demo_customer@fso.in` (0 items)
3. **`Cart`** `cmtvpm0er0002vkbgu88zcb7b` — Belonged to `keshav.mjdm@gmail.com` (0 items)

---

## 4. Foreign Key Dependency Deletion Sequence

All operations were executed within an atomic Prisma transaction (`prisma.$transaction`) with an extended timeout (`60000ms`) to account for serverless latency:

1. **Step 1: Content Authorship Reassignment**
   - Content models (`Article`, `Recipe`, `Ingredient`, `Collection`) had `createdById` pointing to non-admin user `editor@fso.in`.
   - Reassigned `createdById` to the preserved primary admin user (`admin@fso.in`).
   - Nullified any vendor approval references (`approvedById`, `subadminApprovedById`, `verifiedById`) pointing to non-admin users.
2. **Step 2: Reviews Deletion**
   - Removed review records referencing non-admin users or products.
3. **Step 3: Demo Orders & Line Items Deletion**
   - Removed payments and refunds associated with demo orders.
   - Removed `vendorOrder` and `orderItem` records referencing the products/orders.
   - Removed the 3 demo `order` records.
4. **Step 4: Demo Carts Deletion**
   - Removed carts and cart items associated with non-admin users.
5. **Step 5: Product Junctions & Products Deletion**
   - Removed junction links: `ArticleProduct` (1), `RecipeProduct` (1), `CollectionProduct` (2).
   - Removed all `Product` records (`deletedCount: 2`).
6. **Step 6: Non-Admin Users Deletion**
   - Executed authoritative delete: `prisma.user.deleteMany({ where: { isAdmin: false } })` (`deletedCount: 4`).
7. **Step 7: Atomic Commit**
   - All changes committed simultaneously with zero partial mutations.

---

## 5. Preserved Entities & Integrity Verification

### Preserved Admin Accounts (1)
- **Email:** `admin@fso.in`
- **User ID:** `cmtsunkqj0000vk3g90jtiqvc`
- **Role:** `ADMIN`
- **isAdmin:** `true`
- **Status:** Active, password hash intact, unblocked (`isBlocked: false`)

### Preserved Vendors / Producers (2)
1. **`Kashmir Saffron & Heritage Artisans`** (`cmtsunogt0008vk3gdea8ow6c`, slug: `kashmir-saffron-heritage-artisans`) — Status: `APPROVED`, Active: `true`
2. **`Pahadi Amrut Forest Collective`** (`cmtsunozo0009vk3gxx9hidfy`, slug: `pahadi-amrut-forest-collective`) — Status: `APPROVED`, Active: `true`

### Preserved Curated Categories (5)
1. **`Herbs & Tisanes`** (`herbs-tisanes`) — Live product count: `0`
2. **`Heritage Spices & Seasonings`** (`spices`) — Live product count: `0`
3. **`Wild Forest Honey`** (`honey`) — Live product count: `0`
4. **`Cold-Pressed Oils & Ghee`** (`oils-ghee`) — Live product count: `0`
5. **`Heirloom Grains & Millets`** (`grains-millets`) — Live product count: `0`

### Preserved Editorial & Botanical Content (5)
1. **`Article`:** *The Alchemy of Saffron: Understanding Pure Mongra from Pampore* (slug: `alchemy-of-saffron-pampore-guide`)
2. **`Recipe`:** *Traditional Kashmiri Zafrani Kehwa* (slug: `traditional-kashmiri-zafrani-kehwa`)
3. **`Ingredient`:** *Kashmiri Mongra Saffron (केसर)* (slug: `kashmiri-mongra-saffron`)
4. **`Collection`:** *Himalayan Morning Rituals Box* (slug: `himalayan-morning-rituals-box`)
5. **`Banner`:** *Good Food Begins at the Source* (position: `home_hero`)

---

## 6. Verification Results

### 1. Post-Cleanup Integrity Audit
- `Non-admin users count === 0`: **PASS** (`0`)
- `Admin users count preserved`: **PASS** (`1`)
- `Product count === 0`: **PASS** (`0`)
- `OrderItem count === 0`: **PASS** (`0`)
- `Order count === 0`: **PASS** (`0`)
- `Review count === 0`: **PASS** (`0`)
- `Vendors count preserved`: **PASS** (`2`)
- `Categories count preserved`: **PASS** (`5`)
- `Editorial Articles preserved`: **PASS** (`1`)
- `Editorial Recipes preserved`: **PASS** (`1`)
- `Botanical Ingredients preserved`: **PASS** (`1`)
- `Editorial Collections preserved`: **PASS** (`1`)
- `Banners preserved`: **PASS** (`1`)
- `Dangling foreign keys check across all content models`: **PASS** (`0 dangling references found`)

### 2. Idempotency Verification
- Executed `execute_database_cleanup.js` a second time against Neon PostgreSQL.
- Result: `deletedUsersCount: 0`, `deletedProductsCount: 0`, `deletedOrdersCount: 0`.
- All integrity assertions re-verified 100% passed with zero errors.

### 3. Prisma Schema Validation
- Command: `npx prisma validate`
- Output: `The schema at prisma\schema.prisma is valid 🚀`

### 4. Live REST API Verification (`http://localhost:5000/api/v1`)
- `GET /api/v1/products`: Status `200 OK`, `count: 0`, returns `[]`
- `GET /api/v1/producers`: Status `200 OK`, `count: 2`, returns 2 approved producers
- `GET /api/v1/products/categories`: Status `200 OK`, returns all 5 categories with honest live count: `0`
- `GET /api/v1/articles`: Status `200 OK`, `count: 1`, returns Saffron article
- `GET /api/v1/collections`: Status `200 OK`, `count: 1`, returns Morning Rituals collection

---

## 7. Compliance Statements

1. **Database Engine:** Verified live Neon PostgreSQL (Cloud serverless connection).
2. **Frontend Invariant:** No frontend code was modified or added during this cleanup.
3. **Prisma Invariant:** No modifications were made to `backend/prisma/schema.prisma` or migration files.
4. **Authentic Scope:** Zero synthetic data or mock accounts were inserted.

---

**Execution is complete. Awaiting user review before proceeding with the homepage content implementation.**
