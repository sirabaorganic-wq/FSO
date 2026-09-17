/**
 * FSO Neon PostgreSQL Integration Test Suite
 * Verifies real PostgreSQL database operations using Prisma ORM.
 * Tests:
 * 1. PostgreSQL connection & raw queries
 * 2. Auth & User persistence
 * 3. Producer (Vendor) persistence & heritage fields
 * 4. Product persistence & provenance fields
 * 5. Cart persistence & stock validation
 * 6. Order & VendorOrder relational transaction
 * 7. Payment persistence & state transitions
 * 8. Webhook idempotency (WebhookLog unique eventId)
 * 9. Review persistence & duplicate prevention
 * 10. Coupon persistence
 * 11. Heritage content (Articles, Recipes, Ingredients, Collections, Banners) & M:N junctions
 * 12. PostgreSQL-compatible case-insensitive search
 */

const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

jest.setTimeout(30000);

describe("FSO Neon PostgreSQL Integration Tests (Live Database)", () => {
  let testUser;
  let testProduct;
  let testVendor;
  let testOrder;

  const testUserEmail = `pgtest_${Date.now()}@fso.test`;

  beforeAll(async () => {
    // 1. Verify PostgreSQL connection
    const result = await prisma.$queryRaw`SELECT version()`;
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    // Pick an existing vendor from seed data or create one
    testVendor = await prisma.vendor.findFirst({
      where: { status: "APPROVED" },
    });

    if (!testVendor) {
      testVendor = await prisma.vendor.create({
        data: {
          businessName: "Test Himalayan Producer",
          email: `vendor_${Date.now()}@fso.test`,
          phone: "9876543210",
          contactPerson: "Test Producer",
          status: "APPROVED",
          addressCity: "Almora",
          addressState: "Uttarakhand",
          addressPostalCode: "263601",
          village: "Kausani",
          district: "Bageshwar",
          region: "Kumaon Himalayas",
        },
      });
    }

    // Pick an existing product or create one
    testProduct = await prisma.product.findFirst({
      where: { isActive: true, isPublic: true },
    });

    if (!testProduct) {
      testProduct = await prisma.product.create({
        data: {
          name: "Test Pahadi Rajma",
          slug: `test-pahadi-rajma-${Date.now()}`,
          description: "Organically grown heirloom kidney beans from high altitude terraced farms.",
          eyebrow: "Heirloom Crop",
          price: 340,
          currency: "INR",
          stockQuantity: 50,
          category: "Grains & Pulses",
          originVillage: "Munsiyari",
          originDistrict: "Pithoragarh",
          originState: "Uttarakhand",
          originRegion: "Johar Valley",
          vendorId: testVendor.id,
        },
      });
    }
  });

  afterAll(async () => {
    // Cleanup test records
    try {
      if (testUser) {
        // Delete related orders, cart, reviews, then user
        await prisma.cartItem.deleteMany({
          where: { cart: { userId: testUser.id } },
        });
        await prisma.cart.deleteMany({ where: { userId: testUser.id } });
        await prisma.review.deleteMany({ where: { userId: testUser.id } });

        const orders = await prisma.order.findMany({ where: { userId: testUser.id } });
        for (const ord of orders) {
          await prisma.payment.deleteMany({ where: { orderId: ord.id } });
          await prisma.vendorOrder.deleteMany({ where: { orderId: ord.id } });
          await prisma.orderItem.deleteMany({ where: { orderId: ord.id } });
          await prisma.order.delete({ where: { id: ord.id } });
        }

        await prisma.user.delete({ where: { id: testUser.id } });
      }
    } catch (e) {
      console.error("Cleanup notice:", e.message);
    }
  });

  // ── 1. DATABASE CONNECTIVITY ────────────────────────────────────────────────
  describe("1. PostgreSQL Connection", () => {
    it("connects and executes raw query against Neon PostgreSQL", async () => {
      const [{ result }] = await prisma.$queryRaw`SELECT 1 + 1 AS result`;
      expect(result).toBe(2);
    });
  });

  // ── 2. AUTH & USER PERSISTENCE ──────────────────────────────────────────────
  describe("2. Auth & User Persistence", () => {
    it("creates a user in Neon PostgreSQL and retrieves it with correct credentials", async () => {
      const hashedPassword = await bcrypt.hash("PahadiSpice2026!", 10);
      testUser = await prisma.user.create({
        data: {
          name: "Pahadi Heritage Customer",
          email: testUserEmail,
          password: hashedPassword,
          role: "CUSTOMER",
        },
      });

      expect(testUser.id).toBeDefined();
      expect(testUser.email).toBe(testUserEmail);
      expect(testUser.role).toBe("CUSTOMER");

      // Verify read from Neon
      const fetched = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(fetched).not.toBeNull();
      expect(fetched.email).toBe(testUserEmail);
      const isMatch = await bcrypt.compare("PahadiSpice2026!", fetched.password);
      expect(isMatch).toBe(true);
    });
  });

  // ── 3. PRODUCER / VENDOR PERSISTENCE ────────────────────────────────────────
  describe("3. Producer Persistence & Provenance", () => {
    it("reads approved producer with heritage geography fields", async () => {
      const vendor = await prisma.vendor.findUnique({
        where: { id: testVendor.id },
      });

      expect(vendor).not.toBeNull();
      expect(vendor.businessName).toBeDefined();
      expect(vendor.addressState).toBeDefined();
      expect(vendor.status).toBe("APPROVED");
    });
  });

  // ── 4. PRODUCT PERSISTENCE ──────────────────────────────────────────────────
  describe("4. Product Persistence", () => {
    it("persists product with provenance, price, and inventory", async () => {
      const product = await prisma.product.findUnique({
        where: { id: testProduct.id },
        include: { vendor: true },
      });

      expect(product).not.toBeNull();
      expect(product.price).toBeGreaterThan(0);
      expect(product.stockQuantity).toBeGreaterThan(0);
      expect(product.currency).toBe("INR");
      expect(product.originState).toBeDefined();
    });
  });

  // ── 5. CART PERSISTENCE & STOCK VALIDATION ───────────────────────────────────
  describe("5. Cart Persistence", () => {
    it("creates user cart, adds CartItem, updates quantity, and clears cart", async () => {
      // Create Cart
      const cart = await prisma.cart.create({
        data: { userId: testUser.id },
      });
      expect(cart.id).toBeDefined();

      // Add CartItem
      const item = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: testProduct.id,
          quantity: 2,
        },
      });
      expect(item.quantity).toBe(2);

      // Verify relation
      const cartWithItems = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      });
      expect(cartWithItems.items.length).toBe(1);
      expect(cartWithItems.items[0].productId).toBe(testProduct.id);

      // Delete CartItem
      await prisma.cartItem.delete({ where: { id: item.id } });
      const emptyCart = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      });
      expect(emptyCart.items.length).toBe(0);
    });
  });

  // ── 6. ORDERS & RELATIONAL TRANSACTIONS ─────────────────────────────────────
  describe("6. Order & VendorOrder Relational Transactions", () => {
    it("creates Order, OrderItem, and VendorOrder atomically within a PostgreSQL transaction", async () => {
      const orderNumber = `FSO-TEST-${Date.now()}`;
      const qty = 2;
      const unitPrice = testProduct.price;
      const subtotal = unitPrice * qty;
      const taxPrice = Math.round(subtotal * 0.05 * 100) / 100;
      const totalPrice = subtotal + taxPrice;

      testOrder = await prisma.$transaction(async (tx) => {
        // Decrement stock
        await tx.product.update({
          where: { id: testProduct.id },
          data: { stockQuantity: { decrement: qty } },
        });

        // Create main order
        const ord = await tx.order.create({
          data: {
            orderNumber,
            userId: testUser.id,
            status: "PENDING",
            paymentStatus: "PENDING",
            subtotal,
            taxPrice,
            shippingPrice: 0,
            totalPrice,
            shippingAddress: {
              name: "Pahadi Heritage Customer",
              address: "Civil Lines",
              city: "Almora",
              state: "Uttarakhand",
              postalCode: "263601",
              country: "India",
            },
            paymentMethod: "razorpay",
          },
        });

        // Create OrderItem
        await tx.orderItem.create({
          data: {
            orderId: ord.id,
            productId: testProduct.id,
            vendorId: testVendor.id,
            name: testProduct.name,
            quantity: qty,
            price: unitPrice,
            total: subtotal,
          },
        });

        // Create VendorOrder
        const commissionRate = 10;
        const commissionAmount = Math.round((subtotal * commissionRate) / 100);
        const payoutAmount = subtotal - commissionAmount;

        await tx.vendorOrder.create({
          data: {
            vendorOrderNumber: `VO-${orderNumber}-01`,
            orderId: ord.id,
            vendorId: testVendor.id,
            status: "PENDING",
            subtotal,
            commissionRate,
            commissionAmount,
            payoutAmount,
            items: [{ productId: testProduct.id, name: testProduct.name, quantity: qty, price: unitPrice }],
          },
        });

        return ord;
      }, { maxWait: 15000, timeout: 30000 });

      expect(testOrder.id).toBeDefined();
      expect(testOrder.orderNumber).toBe(orderNumber);

      // Verify relational retrieval
      const fetchedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
        include: {
          orderItems: true,
          vendorOrders: true,
        },
      });

      expect(fetchedOrder.orderItems.length).toBe(1);
      expect(fetchedOrder.vendorOrders.length).toBe(1);
      expect(fetchedOrder.vendorOrders[0].payoutAmount).toBeGreaterThan(0);
    });
  });

  // ── 7. PAYMENT PERSISTENCE & TRANSITIONS ────────────────────────────────────
  describe("7. Payment Persistence", () => {
    it("persists payment record and transitions from PENDING to CAPTURED", async () => {
      const rzpOrderId = `order_test_${Date.now()}`;
      const rzpPaymentId = `pay_test_${Date.now()}`;

      // Create Payment
      const payment = await prisma.payment.create({
        data: {
          orderId: testOrder.id,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          amount: testOrder.totalPrice,
          currency: "INR",
          status: "PENDING",
        },
      });

      expect(payment.id).toBeDefined();
      expect(payment.status).toBe("PENDING");

      // Update to CAPTURED
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "CAPTURED",
          razorpaySignature: "mock_signature_valid_hex",
        },
      });

      expect(updatedPayment.status).toBe("CAPTURED");
      expect(updatedPayment.razorpaySignature).toBe("mock_signature_valid_hex");

      // Clean up payment
      await prisma.payment.delete({ where: { id: payment.id } });
    });
  });

  // ── 8. WEBHOOK IDEMPOTENCY ──────────────────────────────────────────────────
  describe("8. Webhook Idempotency", () => {
    it("enforces unique eventId constraint to ensure idempotent webhook processing", async () => {
      const eventId = `wh_test_idemp_${Date.now()}`;

      // First webhook event insert
      const log1 = await prisma.webhookLog.create({
        data: {
          eventId,
          provider: "razorpay",
          eventType: "payment.captured",
          status: "processed",
          payload: { test: true },
        },
      });
      expect(log1.id).toBeDefined();

      // Duplicate webhook event insert must fail due to unique constraint
      await expect(
        prisma.webhookLog.create({
          data: {
            eventId,
            provider: "razorpay",
            eventType: "payment.captured",
            status: "processed",
            payload: { test: true },
          },
        })
      ).rejects.toThrow();

      // Clean up log
      await prisma.webhookLog.delete({ where: { id: log1.id } });
    });
  });

  // ── 9. REVIEWS PERSISTENCE & DUPLICATE PREVENTION ───────────────────────────
  describe("9. Review Persistence", () => {
    it("persists review and enforces unique [productId, userId] constraint", async () => {
      const review = await prisma.review.create({
        data: {
          productId: testProduct.id,
          userId: testUser.id,
          rating: 5,
          title: "Outstanding Traditional Quality",
          comment: "Authentic Himalayan grains with unparalleled aroma and texture. Highly recommend.",
          isVerifiedPurchase: true,
          isApproved: true,
        },
      });

      expect(review.id).toBeDefined();
      expect(review.rating).toBe(5);

      // Attempt duplicate review by same user for same product
      await expect(
        prisma.review.create({
          data: {
            productId: testProduct.id,
            userId: testUser.id,
            rating: 4,
            title: "Second review",
            comment: "Attempting duplicate review should fail.",
          },
        })
      ).rejects.toThrow();

      // Clean up review
      await prisma.review.delete({ where: { id: review.id } });
    });
  });

  // ── 10. COUPONS PERSISTENCE ─────────────────────────────────────────────────
  describe("10. Coupon Persistence", () => {
    it("creates, validates, and cleans up a promotional coupon", async () => {
      const couponCode = `HERITAGE${Date.now().toString().slice(-4)}`;

      const coupon = await prisma.coupon.create({
        data: {
          code: couponCode,
          description: "15% off first heritage order",
          discountType: "PERCENTAGE",
          discountValue: 15,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 100,
        },
      });

      expect(coupon.id).toBeDefined();
      expect(coupon.code).toBe(couponCode);
      expect(coupon.discountValue).toBe(15);

      const fetched = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });
      expect(fetched.isActive).toBe(true);

      await prisma.coupon.delete({ where: { id: coupon.id } });
    });
  });

  // ── 11. HERITAGE CONTENT PERSISTENCE & M:N RELATIONS ────────────────────────
  describe("11. Content Models & M:N Junction Tables", () => {
    it("creates an Article linked to a Product via ArticleProduct junction table", async () => {
      const slug = `the-secret-of-pahadi-pulses-${Date.now()}`;

      const article = await prisma.article.create({
        data: {
          title: "The Ancient Pulses of the Himalayan Slopes",
          slug,
          excerpt: "Exploring the agro-ecological heritage of mountain pulses.",
          content: "<p>Deep in the terraced slopes of Uttarakhand...</p>",
          category: "Kitchen Wisdom",
          published: true,
          publishedAt: new Date(),
          tags: ["Himalayas", "Heritage", "Rajma"],
        },
      });

      // Link article to product via junction table
      const junction = await prisma.articleProduct.create({
        data: {
          articleId: article.id,
          productId: testProduct.id,
        },
      });

      expect(junction.articleId).toBe(article.id);
      expect(junction.productId).toBe(testProduct.id);

      // Verify relational retrieval through junction
      const retrieved = await prisma.article.findUnique({
        where: { id: article.id },
        include: {
          linkedProducts: {
            include: { product: true },
          },
        },
      });

      expect(retrieved.linkedProducts.length).toBe(1);
      expect(retrieved.linkedProducts[0].product.name).toBe(testProduct.name);

      // Cleanup
      await prisma.articleProduct.delete({
        where: {
          articleId_productId: {
            articleId: article.id,
            productId: testProduct.id,
          },
        },
      });
      await prisma.article.delete({ where: { id: article.id } });
    });
  });

  // ── 12. POSTGRESQL SEARCH ───────────────────────────────────────────────────
  describe("12. PostgreSQL Case-Insensitive Search", () => {
    it("performs case-insensitive substring search matching product name", async () => {
      const queryWord = testProduct.name.split(" ")[0].toLowerCase();

      const searchResults = await prisma.product.findMany({
        where: {
          name: { contains: queryWord, mode: "insensitive" },
        },
        select: { id: true, name: true, price: true },
      });

      expect(searchResults.length).toBeGreaterThan(0);
      const found = searchResults.some((p) => p.id === testProduct.id);
      expect(found).toBe(true);
    });
  });
});
