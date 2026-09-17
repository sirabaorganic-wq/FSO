# FSO — Phase 3: Cart & Order Integrity Forensic Baseline Report

**Execution Date**: September 16, 2026  
**Status**: Read-Only Pre-Implementation Forensic Analysis  
**Authoritative Persistence**: Neon PostgreSQL via Prisma ORM  
**Baseline Database Hash**: `3a68f2f387dfb58e5f986a78e7bee91a2a0d17066b4322bf32bbe5a4cff44179`  
**Database Row Counts**: 2 Users, 3 Vendors, 0 Products, 0 Orders, 0 Payments, 0 Reviews, 1 Cart, 0 CartItems

---

## A. Current Cart Lifecycle
1. **Authenticated Users**:
   - `GET /api/cart`: Calls `getOrCreateCart(userId)` from `prisma.cart`. Fetches associated `CartItem` records. Enriches items with current catalog metadata (`Product` model) and returns an array of enriched cart item DTOs.
   - `POST /api/cart`: Accepts `{ productId, quantity, variant }`. Queries `prisma.product` by `id` or `slug`. If found, finds or creates `prisma.cartItem`. Increments or updates quantity capped by `product.stockQuantity`.
   - `PUT /api/cart`: Accepts `{ cartItems: Array<{ productId, quantity, variant }> }`. Resolves products by `id` or `slug`. Uses a Prisma transaction to clear existing `CartItem` records and recreate validated items.
   - `PUT /api/cart/item/:id`: Updates single `CartItem` quantity.
   - `DELETE /api/cart/item/:id`: Deletes single `CartItem`.
   - `DELETE /api/cart`: Deletes all `CartItem` records for the user's cart.
2. **Guest Users**:
   - Cart resides purely on client in browser `localStorage` (`fso_guest_cart`).
   - Guest items are hydrated on initial mount and updated locally.
   - Upon login, guest items are submitted to `PUT /api/cart` (`syncCartApi`) and cleared from `localStorage`.

---

## B. Current Order Lifecycle
1. Order creation endpoint is `POST /api/orders`.
2. Authenticated user submits `orderItems`, `shippingAddress`, `paymentMethod`, `couponCode`, etc.
3. Backend fetches products from `prisma.product` and validates availability, stock, and pricing.
4. An atomic Prisma transaction (`prisma.$transaction`):
   - Decrements `product.stockQuantity`.
   - Creates parent `Order` record with `status: PENDING`, `paymentStatus: PENDING`.
   - Creates child `OrderItem` records.
   - Partitions line items by `vendorId` and creates child `VendorOrder` records with `status: PENDING`.
5. After the transaction commits, the cart is cleared via separate query (non-transactional currently).
6. Order cancellation is supported via `POST /api/orders/:id/cancel`:
   - Validates owner identity.
   - Checks that status is not `SHIPPED`, `DELIVERED`, or `CANCELLED`.
   - Restores product stock via atomic transaction.
   - Updates `Order` status to `CANCELLED` and child `VendorOrder` records to `CANCELLED`.

---

## C. Current Checkout Lifecycle
1. User enters `/checkout`.
2. User fills shipping address and selects payment method (`razorpay` or `cod`).
3. User clicks "Place order":
   - Calls `POST /api/orders`.
   - If `cod`: clears cart and navigates to `/checkout/success?orderId=...`.
   - If `razorpay`: attempts to initialize Razorpay; if Razorpay window object is absent, falls back to a simulated verification that cleared cart and navigated to `/checkout/success` (Bypass identified!).

---

## D. Product Identifier Used by Frontend
- The product detail page calls `addToCart(product.slug, 1, null, product)`.
- The product slug (e.g. `kashmir-saffron-heritage`) was passed as the primary item identifier in `CartLine.id`.
- For guest users, `CartLine.id` is explicitly the product slug.
- For authenticated users, `toFrontendCartLine` mapped `item.id || item.productId`. Since `item.id` was the `CartItem.id`, `CartLine.id` held the `CartItem.id` while `item.productId` held the `Product.id`.
- When submitting orders, `items.map(i => ({ productId: i.id }))` passed `i.id`. If `i.id` was a `CartItem.id` or a `slug`, it caused a mismatch!

---

## E. Product Identifier Expected by Backend
- In `backend/prisma/schema.prisma`:
  - `Product.id`: CUID (e.g. `cmtx...`).
  - `Product.slug`: Unique String (e.g. `kashmir-saffron-heritage`).
  - `CartItem.productId`: String (stores `Product.id`).
  - `OrderItem.productId`: String with foreign key relation `@relation(fields: [productId], references: [id])`.
- In `backend/routes/cartRoutes.js`:
  - `POST /api/cart` and `PUT /api/cart` accept either `id` OR `slug`:
    `where: { OR: [{ id: pId }, { slug: pId }] }`.
- In `backend/routes/orderRoutes.js`:
  - `POST /api/orders` strictly queried `where: { id: { in: productIds } }`.
  - **CONFIRMED CRITICAL MISMATCH**: `orderRoutes.js` failed to resolve slugs! If slugs or CartItem IDs were passed as `productId`, `prisma.product.findMany` returned zero results and rejected the order with `Product not available for purchase`.

---

## F. CartItem Identifier Contract
- In PostgreSQL: `CartItem.id` is a CUID.
- Relational compound uniqueness: `@@unique([cartId, productId, variant])`.
- Adding the same product and variant MUST update the existing row rather than attempting duplicate insertion.

---

## G. OrderItem Identifier Contract
- In PostgreSQL: `OrderItem.id` is a CUID.
- Belongs to `Order` via `orderId`.
- Foreign key: `productId` references `Product.id`.
- Stores snapshot fields: `name`, `image`, `quantity`, `price`, `total`, `hsn`, `variant`, `taxRate`, `taxAmount`.

---

## H. Authenticated User Identity Contract
- Handled via Phase 1 `protect` middleware in `backend/middleware/authMiddleware.js`.
- JWT access token parsed from `Authorization: Bearer <token>`.
- Verified against `process.env.JWT_SECRET`.
- User loaded from `prisma.user.findUnique({ where: { id: decoded.id } })`.
- Attached to request as `req.user`.
- Authoritative User ID is `req.user.id`.

---

## I. Guest-Cart Behavior
- Guest cart stored in `localStorage` under key `fso_guest_cart`.
- Does not create server-side database records.
- On user login, client sends guest cart to `PUT /api/cart` to merge/replace into server cart, then removes `fso_guest_cart` from `localStorage`.

---

## J. Price Calculation Location
- **Server Authoritative**:
  - `backend/routes/orderRoutes.js` reads unit prices directly from `prisma.product.findMany`.
  - Calculates line totals: `unitPrice * qty`.
  - Calculates subtotal, 5% food GST, and shipping fee (₹0 if $\ge ₹500$, else ₹70).
  - VULNERABILITY FOUND: `let finalDiscount = Number(discountAmount) || 0;` accepted arbitrary client discount amounts if `couponCode` was not passed. Must be eliminated!

---

## K. Quantity Validation
- In `cartRoutes.js`:
  - `parseInt(quantity) || 1`.
  - Capped by `product.stockQuantity`.
  - Does not currently reject negative, fractional, or non-integer numbers rigorously.
- In `orderRoutes.js`:
  - `parseInt(item.quantity || item.qty) || 1`.
  - Does not reject non-integers, decimals, or negative values explicitly before parsing.

---

## L. Product Availability Validation
- Product is valid if:
  - `product !== null`.
  - `product.isActive === true`.
  - `product.isPublic === true`.
  - `product.stockQuantity >= requestedQuantity`.

---

## M. Vendor Ownership Behavior
- Derived strictly server-side from `dbProduct.vendorId`.
- Never accepted from client payload.
- Items partitioned by `vendorId` to generate `VendorOrder` records.

---

## N. Order Transaction Behavior
- Stock decrement, `Order` creation, `OrderItem` creation, and `VendorOrder` creation run within `prisma.$transaction`.
- Cart clearing currently runs *after* transaction commits. Must be moved inside the transaction for absolute atomicity.

---

## O. Existing Response Shapes
- `Cart`: Array of enriched item objects:
  `[{ id, productId, name, slug, image, price, compareAtPrice, stockQuantity, quantity, variant, vendorId }]`.
- `Order`: Formatted order object:
  `{ id, _id, orderNumber, status, paymentStatus, subtotal, discountPrice, taxPrice, shippingPrice, totalPrice, orderItems: [...], vendorOrders: [...] }`.

---

## P. Existing Frontend/Backend Mismatches
1. **Slug vs CUID in Orders**: Frontend passes `product.slug` or `CartItem.id` in `orderItems[].productId`. Backend `orderRoutes.js` only checked `where: { id: { in: productIds } }`.
2. **Client-Controlled Discount**: Backend checked `req.body.discountAmount` without verifying coupon validity.
3. **CartLine `id`**: `toFrontendCartLine` assigned `item.id` (`CartItem.id`) to `CartLine.id` instead of `item.productId`.
4. **Order Status Mapping**: Frontend `toFrontendOrder` mapped `CANCELLED` and `REFUNDED` to `'Processing'`.

---

## Q. Existing Mocks/Fallbacks
1. `CheckoutPage` had a fallback simulation on lines 745-748 that cleared the cart and navigated to `/checkout/success` when Razorpay was unavailable.
2. `client/data/customer.ts` contains hardcoded mock orders and cart lines (not currently imported by customer pages, but present).

---

## R. Existing Security Weaknesses
1. Client-supplied `discountAmount` could bypass coupon validation in `orderRoutes.js`.
2. Missing rigorous input validation on `quantity` (allowing floats, negative numbers, or invalid types).
3. Cart clearing not atomic with order creation.

---

## S. Existing Tests
- Existing test suites in `backend/tests/`:
  - `cors_security.test.js`
  - `security.test.js`
  - `no_mongoose_runtime.test.js`
  - `prisma_admin_routes.test.js`
  - `prisma_vendor_routes.test.js`
  - `financial_idempotency.test.js`
  - `shiprocket_prisma.test.js`
- No dedicated unit/integration test suite currently existed for Cart & Order ownership isolation, quantity validation, and atomic multi-vendor transactions.

---

## T. Exact Files Requiring Modification
1. `backend/routes/cartRoutes.js`: Enhance quantity validation, slug resolution on all item routes, and duplicate item handling.
2. `backend/routes/orderRoutes.js`: Add dual slug/CUID product resolution, atomic in-transaction cart clearing, remove client discount bypass, derive vendor commission from vendor record, and strict quantity validation.
3. `client/lib/cart-context.tsx`: Ensure `productId` is preserved on `CartLine`, ensure guest cart sync passes valid identifiers.
4. `client/lib/api/mappers.ts`: Ensure `toFrontendCartLine` maps `productId` to `CartLine.id` or preserves `productId`, and map order statuses truthfully.
5. `client/components/customer/customer-pages.tsx`: Remove fake payment simulation in `CheckoutPage`; establish truthful intermediate state for online payments awaiting Phase 4; preserve COD order placement.
6. `client/components/product/product-detail-page.tsx`: Pass `product.id || product.slug` to `addToCart`.
7. `backend/tests/cart_order_integrity.test.js`: New comprehensive test suite covering all 30 required test cases.
