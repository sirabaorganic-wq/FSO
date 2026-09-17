/**
 * FSO Phase 3: Cart & Order Integrity Verification Tests
 * Tests all 34 required cart, checkout, order, concurrency, ownership, and regression criteria
 * ZERO live database mutations: uses an isolated in-memory Prisma mock layer.
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Ensure JWT_SECRET is set for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_fso_phase3_test_key_32bytes';

// In-Memory Database State for Mocking
let mockDb = {
  users: [],
  carts: [],
  cartItems: [],
  products: [],
  vendors: [],
  coupons: [],
  orders: [],
  orderItems: [],
  vendorOrders: [],
};

function resetMockDb() {
  mockDb = {
    users: [
      { id: 'user_a', name: 'User A', email: 'usera@example.com', role: 'customer' },
      { id: 'user_b', name: 'User B', email: 'userb@example.com', role: 'customer' },
    ],
    carts: [
      { id: 'cart_a', userId: 'user_a', items: [] },
      { id: 'cart_b', userId: 'user_b', items: [] },
    ],
    cartItems: [],
    vendors: [
      { id: 'vendor_1', slug: 'kashmir-saffron-co', businessName: 'Kashmir Saffron Co', addressState: 'Jammu & Kashmir' },
      { id: 'vendor_2', slug: 'himalayan-honey-co', businessName: 'Himalayan Honey Co', addressState: 'Uttarakhand' },
    ],
    products: [
      {
        id: 'prod_saffron_cuid',
        slug: 'kashmir-saffron-heritage',
        name: 'Kashmir Mogra Saffron',
        price: 850,
        stockQuantity: 5,
        hsn: '091020',
        vendorId: 'vendor_1',
        isPublic: true,
        isActive: true,
        image: '/images/saffron.jpg',
      },
      {
        id: 'prod_honey_cuid',
        slug: 'himalayan-wild-honey',
        name: 'Raw Himalayan Wild Honey',
        price: 650,
        stockQuantity: 10,
        hsn: '040900',
        vendorId: 'vendor_2',
        isPublic: true,
        isActive: true,
        image: '/images/honey.jpg',
      },
      {
        id: 'prod_walnut_cuid',
        slug: 'kashmir-snow-walnuts',
        name: 'Snow White Walnuts',
        price: 450,
        stockQuantity: 8,
        hsn: '080231',
        vendorId: 'vendor_1', // Same vendor as saffron
        isPublic: true,
        isActive: true,
        image: '/images/walnuts.jpg',
      },
      {
        id: 'prod_inactive_cuid',
        slug: 'inactive-ingredient',
        name: 'Inactive Ingredient',
        price: 300,
        stockQuantity: 10,
        vendorId: 'vendor_1',
        isPublic: false,
        isActive: false,
      },
    ],
    coupons: [
      {
        id: 'coupon_1',
        code: 'HERITAGE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscount: 200,
        minOrderValue: 500,
        usageLimit: 100,
        usageCount: 0,
        isActive: true,
        validUntil: new Date(Date.now() + 86400000),
      },
      {
        id: 'coupon_fixed',
        code: 'FLAT100',
        discountType: 'FIXED',
        discountValue: 100,
        minOrderValue: 400,
        usageLimit: 50,
        usageCount: 0,
        isActive: true,
        validUntil: new Date(Date.now() + 86400000),
      },
      {
        id: 'coupon_expired',
        code: 'EXPIRED20',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minOrderValue: 0,
        usageLimit: 100,
        usageCount: 0,
        isActive: true,
        validUntil: new Date(Date.now() - 86400000), // Expired yesterday
      },
    ],
    orders: [],
    orderItems: [],
    vendorOrders: [],
  };
}

// Mock Prisma client
jest.mock('../config/prisma', () => {
  return {
    user: {
      findUnique: jest.fn(async ({ where }) => {
        return mockDb.users.find((u) => u.id === where.id) || null;
      }),
      update: jest.fn(async ({ where, data }) => {
        const u = mockDb.users.find((u) => u.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      }),
    },
    cart: {
      findUnique: jest.fn(async ({ where, include }) => {
        const c = mockDb.carts.find((c) => (where.id ? c.id === where.id : c.userId === where.userId));
        if (!c) return null;
        const items = mockDb.cartItems.filter((i) => i.cartId === c.id);
        return { ...c, items };
      }),
      create: jest.fn(async ({ data }) => {
        const c = { id: `cart_${Date.now()}_${Math.random()}`, userId: data.userId, items: [] };
        mockDb.carts.push(c);
        return c;
      }),
    },
    cartItem: {
      findFirst: jest.fn(async ({ where }) => {
        return (
          mockDb.cartItems.find((i) => {
            if (where.cartId && i.cartId !== where.cartId) return false;
            if (where.productId && i.productId !== where.productId) return false;
            if (where.variant !== undefined && (i.variant || null) !== (where.variant || null)) return false;
            if (where.OR) {
              const matched = where.OR.some((cond) => {
                if (cond.id && i.id === cond.id) return true;
                if (cond.productId && i.productId === cond.productId) return true;
                return false;
              });
              if (!matched) return false;
            }
            return true;
          }) || null
        );
      }),
      create: jest.fn(async ({ data }) => {
        const item = {
          id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          cartId: data.cartId,
          productId: data.productId,
          quantity: data.quantity,
          variant: data.variant || null,
        };
        mockDb.cartItems.push(item);
        return item;
      }),
      update: jest.fn(async ({ where, data }) => {
        const item = mockDb.cartItems.find((i) => i.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
      delete: jest.fn(async ({ where }) => {
        const idx = mockDb.cartItems.findIndex((i) => i.id === where.id);
        if (idx !== -1) mockDb.cartItems.splice(idx, 1);
        return { id: where.id };
      }),
      deleteMany: jest.fn(async ({ where }) => {
        const prevLen = mockDb.cartItems.length;
        mockDb.cartItems = mockDb.cartItems.filter((i) => i.cartId !== where.cartId);
        return { count: prevLen - mockDb.cartItems.length };
      }),
    },
    product: {
      findFirst: jest.fn(async ({ where }) => {
        if (where.OR) {
          return (
            mockDb.products.find((p) =>
              where.OR.some((cond) => (cond.id && p.id === cond.id) || (cond.slug && p.slug === cond.slug))
            ) || null
          );
        }
        return mockDb.products.find((p) => (where.id && p.id === where.id) || (where.slug && p.slug === where.slug)) || null;
      }),
      findUnique: jest.fn(async ({ where }) => {
        return mockDb.products.find((p) => (where.id && p.id === where.id) || (where.slug && p.slug === where.slug)) || null;
      }),
      findMany: jest.fn(async ({ where }) => {
        if (!where) return [...mockDb.products];
        if (where.id && where.id.in) {
          return mockDb.products.filter((p) => where.id.in.includes(p.id));
        }
        if (where.OR) {
          const idCond = where.OR.find((c) => c.id && c.id.in);
          const slugCond = where.OR.find((c) => c.slug && c.slug.in);
          const ids = idCond ? idCond.id.in : [];
          const slugs = slugCond ? slugCond.slug.in : [];
          return mockDb.products.filter((p) => ids.includes(p.id) || slugs.includes(p.slug));
        }
        return [...mockDb.products];
      }),
      update: jest.fn(async ({ where, data }) => {
        const p = mockDb.products.find((prod) => prod.id === where.id);
        if (p && data.stockQuantity && data.stockQuantity.increment) {
          p.stockQuantity += data.stockQuantity.increment;
        }
        return p;
      }),
    },
    coupon: {
      findUnique: jest.fn(async ({ where }) => {
        return mockDb.coupons.find((c) => c.code === where.code) || null;
      }),
      update: jest.fn(async ({ where, data }) => {
        const c = mockDb.coupons.find((cp) => cp.id === where.id);
        if (c && data.usageCount && data.usageCount.increment) {
          c.usageCount += data.usageCount.increment;
        }
        return c;
      }),
    },
    order: {
      findFirst: jest.fn(async ({ where }) => {
        return (
          mockDb.orders.find((o) => {
            if (where.OR) {
              return where.OR.some((cond) => (cond.id && o.id === cond.id) || (cond.orderNumber && o.orderNumber === cond.orderNumber));
            }
            return (where.id && o.id === where.id) || (where.orderNumber && o.orderNumber === where.orderNumber);
          }) || null
        );
      }),
      findUnique: jest.fn(async ({ where }) => {
        const o = mockDb.orders.find((ord) => ord.id === where.id);
        if (!o) return null;
        const oItems = mockDb.orderItems.filter((oi) => oi.orderId === o.id);
        const vOrders = mockDb.vendorOrders.filter((vo) => vo.orderId === o.id);
        return { ...o, orderItems: oItems, vendorOrders: vOrders };
      }),
      findMany: jest.fn(async ({ where }) => {
        return mockDb.orders
          .filter((o) => (where && where.userId ? o.userId === where.userId : true))
          .map((o) => {
            const oItems = mockDb.orderItems.filter((oi) => oi.orderId === o.id);
            const vOrders = mockDb.vendorOrders.filter((vo) => vo.orderId === o.id);
            return { ...o, orderItems: oItems, vendorOrders: vOrders };
          });
      }),
    },
    $transaction: jest.fn(async (cb) => {
      // Create transactional mock context tx
      const tx = {
        product: {
          updateMany: jest.fn(async ({ where, data }) => {
            const prod = mockDb.products.find((p) => p.id === where.id);
            if (!prod) return { count: 0 };
            const requiredQty = where.stockQuantity && where.stockQuantity.gte ? where.stockQuantity.gte : 0;
            if (prod.stockQuantity < requiredQty) {
              return { count: 0 }; // Cannot decrement, concurrency guard triggered!
            }
            if (data.stockQuantity && data.stockQuantity.decrement) {
              prod.stockQuantity -= data.stockQuantity.decrement;
            }
            return { count: 1 };
          }),
          update: jest.fn(async ({ where, data }) => {
            const p = mockDb.products.find((prod) => prod.id === where.id);
            if (p && data.stockQuantity && data.stockQuantity.increment) {
              p.stockQuantity += data.stockQuantity.increment;
            }
            return p;
          }),
        },
        coupon: {
          updateMany: jest.fn(async ({ where, data }) => {
            const c = mockDb.coupons.find((cp) => cp.id === where.id);
            if (!c) return { count: 0 };
            if (where.usageCount && where.usageCount.lt !== undefined) {
              if (c.usageCount >= where.usageCount.lt) return { count: 0 };
            }
            if (data.usageCount && data.usageCount.increment) {
              c.usageCount += data.usageCount.increment;
            }
            return { count: 1 };
          }),
          update: jest.fn(async ({ where, data }) => {
            const c = mockDb.coupons.find((cp) => cp.id === where.id);
            if (c && data.usageCount && data.usageCount.increment) {
              c.usageCount += data.usageCount.increment;
            }
            return c;
          }),
        },
        order: {
          create: jest.fn(async ({ data }) => {
            const ord = { id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`, ...data };
            mockDb.orders.push(ord);
            return ord;
          }),
          update: jest.fn(async ({ where, data }) => {
            const ord = mockDb.orders.find((o) => o.id === where.id);
            if (ord) Object.assign(ord, data);
            return ord;
          }),
        },
        orderItem: {
          create: jest.fn(async ({ data }) => {
            const oi = { id: `oi_${Date.now()}_${Math.floor(Math.random() * 1000)}`, ...data };
            mockDb.orderItems.push(oi);
            return oi;
          }),
        },
        vendorOrder: {
          create: jest.fn(async ({ data }) => {
            const vo = { id: `vo_${Date.now()}_${Math.floor(Math.random() * 1000)}`, ...data };
            mockDb.vendorOrders.push(vo);
            return vo;
          }),
          updateMany: jest.fn(async ({ where, data }) => {
            mockDb.vendorOrders.forEach((vo) => {
              if (vo.orderId === where.orderId) Object.assign(vo, data);
            });
            return { count: 1 };
          }),
        },
        cart: {
          findUnique: jest.fn(async ({ where }) => {
            return mockDb.carts.find((c) => c.userId === where.userId) || null;
          }),
        },
        cartItem: {
          deleteMany: jest.fn(async ({ where }) => {
            mockDb.cartItems = mockDb.cartItems.filter((i) => i.cartId !== where.cartId);
            return { count: 1 };
          }),
        },
        user: {
          update: jest.fn(async ({ where, data }) => {
            const u = mockDb.users.find((user) => user.id === where.id);
            if (u) Object.assign(u, data);
            return u;
          }),
        },
      };

      return await cb(tx);
    }),
  };
});

// Import route handlers after prisma mock
const cartRoutes = require('../routes/cartRoutes');
const orderRoutes = require('../routes/orderRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  return app;
}

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('FSO Phase 3: Cart & Order Integrity Verification Suite', () => {
  let app;
  let tokenA;
  let tokenB;

  beforeEach(() => {
    resetMockDb();
    app = createApp();
    tokenA = generateToken('user_a');
    tokenB = generateToken('user_b');
  });

  // ==========================================
  // CART TESTS (1 - 15)
  // ==========================================

  test('1. Unauthenticated cart access rejected with 401', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  test('2. Authenticated cart access returns enriched cart items', async () => {
    // Seed an item in User A's cart
    mockDb.cartItems.push({
      id: 'ci_1',
      cartId: 'cart_a',
      productId: 'prod_saffron_cuid',
      quantity: 2,
      variant: null,
    });

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].productId).toBe('prod_saffron_cuid');
    expect(res.body[0].price).toBe(850);
    expect(res.body[0].quantity).toBe(2);
  });

  test('3. User isolation: USER A cannot view or mutate USER B cart', async () => {
    // Seed User B's cart
    mockDb.cartItems.push({
      id: 'ci_b',
      cartId: 'cart_b',
      productId: 'prod_honey_cuid',
      quantity: 1,
    });

    // User A fetches cart
    const resA = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.length).toBe(0); // User A's cart is empty

    // User A attempts to update or delete User B's cart item
    const resMutate = await request(app)
      .put('/api/cart/item/ci_b')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ quantity: 5 });

    expect(resMutate.status).toBe(404); // Item does not belong to User A's cart
  });

  test('4. Add product by CUID adds CartItem with canonical Product.id', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'prod_saffron_cuid', quantity: 1 });

    expect(res.status).toBe(200);
    expect(mockDb.cartItems.length).toBe(1);
    expect(mockDb.cartItems[0].productId).toBe('prod_saffron_cuid');
    expect(mockDb.cartItems[0].cartId).toBe('cart_a');
  });

  test('5. Add product by slug resolves slug and persists canonical Product.id', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'kashmir-saffron-heritage', quantity: 1 });

    expect(res.status).toBe(200);
    expect(mockDb.cartItems.length).toBe(1);
    expect(mockDb.cartItems[0].productId).toBe('prod_saffron_cuid'); // CUID stored, not slug
  });

  test('6. Add same product twice updates existing CartItem quantity up to stockQuantity', async () => {
    // First add: quantity 2
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'prod_saffron_cuid', quantity: 2 });

    expect(mockDb.cartItems.length).toBe(1);
    expect(mockDb.cartItems[0].quantity).toBe(2);

    // Second add: quantity 2 (total 4 <= 5 stock)
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'prod_saffron_cuid', quantity: 2 });

    expect(res.status).toBe(200);
    expect(mockDb.cartItems.length).toBe(1); // No duplicate row!
    expect(mockDb.cartItems[0].quantity).toBe(4);
  });

  test('7. Invalid/non-existent product rejected with 404', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'non_existent_cuid', quantity: 1 });

    expect(res.status).toBe(404);
  });

  test('8. Invalid quantity: 0 rejected with 422', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'prod_saffron_cuid', quantity: 0 });

    expect(res.status).toBe(422);
  });

  test('9. Invalid quantity: negative rejected with 422', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'prod_saffron_cuid', quantity: -3 });

    expect(res.status).toBe(422);
  });

  test('10. Invalid quantity: fractional/float rejected with 422', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'prod_saffron_cuid', quantity: 1.5 });

    expect(res.status).toBe(422);
  });

  test('11. Invalid quantity: string / NaN / Infinity rejected with 422', async () => {
    const res1 = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'prod_saffron_cuid', quantity: 'abc' });
    expect(res1.status).toBe(422);

    const res2 = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'prod_saffron_cuid', quantity: 999999 });
    expect(res2.status).toBe(422); // Exceeds 100 limit
  });

  test('12. Update quantity for existing CartItem', async () => {
    mockDb.cartItems.push({
      id: 'ci_test',
      cartId: 'cart_a',
      productId: 'prod_saffron_cuid',
      quantity: 1,
    });

    const res = await request(app)
      .put('/api/cart/item/ci_test')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ quantity: 3 });

    expect(res.status).toBe(200);
    expect(mockDb.cartItems[0].quantity).toBe(3);
  });

  test('13. Remove item from cart deletes the item', async () => {
    mockDb.cartItems.push({
      id: 'ci_del',
      cartId: 'cart_a',
      productId: 'prod_saffron_cuid',
      quantity: 1,
    });

    const res = await request(app)
      .delete('/api/cart/item/ci_del')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(mockDb.cartItems.length).toBe(0);
  });

  test('14. Clear cart removes all items for authenticated user', async () => {
    mockDb.cartItems.push(
      { id: 'ci_1', cartId: 'cart_a', productId: 'prod_saffron_cuid', quantity: 1 },
      { id: 'ci_2', cartId: 'cart_a', productId: 'prod_honey_cuid', quantity: 2 },
      { id: 'ci_b', cartId: 'cart_b', productId: 'prod_saffron_cuid', quantity: 1 }
    );

    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(mockDb.cartItems.length).toBe(1);
    expect(mockDb.cartItems[0].cartId).toBe('cart_b'); // User B's cart untouched!
  });

  test('15. Empty cart returns empty array []', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // ==========================================
  // CHECKOUT & ORDER TESTS (16 - 34)
  // ==========================================

  test('16. Empty cart / orderItems rejected with 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ orderItems: [] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EMPTY_CART');
  });

  test('17. Invalid product reference in orderItems rejected with 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'non_existent_ref', quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PRODUCT_UNAVAILABLE');
  });

  test('18. Prices are backend-authoritative from database (client prices ignored)', async () => {
    // Saffron db price is ₹850. Client tries to claim ₹10!
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1, price: 10 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(850); // Database price enforced!
    expect(res.body.orderItems[0].price).toBe(850);
  });

  test('19. Client total cannot override server total', async () => {
    // Saffron (850) + 5% tax (42.50) + free shipping (0) = 892.50
    // Client attempts to pass totalPrice: 50
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1 }],
        totalPrice: 50,
      });

    expect(res.status).toBe(201);
    expect(res.body.totalPrice).toBe(892.5); // Authoritative server calculation
  });

  test('20. Client discountAmount is ignored, authoritative coupon calculation enforced', async () => {
    // Client tries to inject ₹500 discount without coupon
    const resNoCoupon = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1 }],
        discountAmount: 500,
      });

    expect(resNoCoupon.status).toBe(201);
    expect(resNoCoupon.body.discountPrice).toBe(0); // Discount rejected!

    // Valid coupon HERITAGE10 (10% on 850 = 85)
    const resCoupon = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1 }],
        couponCode: 'heritage10',
      });

    expect(resCoupon.status).toBe(201);
    expect(resCoupon.body.discountPrice).toBe(85);
  });

  test('21. Client-supplied vendorId cannot override product.vendorId', async () => {
    // Saffron belongs to vendor_1. Client attempts to assign vendor_999
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1, vendorId: 'vendor_999' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.orderItems[0].vendorId).toBe('vendor_1'); // Authoritative vendor preserved!
  });

  test('22. Order created atomically with status PENDING and paymentStatus PENDING', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.paymentStatus).toBe('PENDING');
  });

  test('23. Order items created with authoritative snapshot fields (price, hsn, taxRate, taxAmount, name, image)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 2 }],
      });

    expect(res.status).toBe(201);
    const item = res.body.orderItems[0];
    expect(item.name).toBe('Kashmir Mogra Saffron');
    expect(item.price).toBe(850);
    expect(item.total).toBe(1700);
    expect(item.hsn).toBe('091020');
    expect(item.taxRate).toBe(5);
    expect(item.taxAmount).toBe(85); // 5% of 1700
    expect(item.image).toBe('/images/saffron.jpg');
  });

  test('24. VendorOrders created correctly and partitioned by vendorId', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.vendorOrders.length).toBe(1);
    expect(res.body.vendorOrders[0].vendorId).toBe('vendor_1');
    expect(res.body.vendorOrders[0].subtotal).toBe(850);
    expect(res.body.vendorOrders[0].commissionRate).toBe(10);
    expect(res.body.vendorOrders[0].commissionAmount).toBe(85);
    expect(res.body.vendorOrders[0].payoutAmount).toBe(765);
  });

  test('25. Same-vendor multi-product partitioning groups into single VendorOrder', async () => {
    // Saffron (vendor_1) and Walnut (vendor_1)
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [
          { productId: 'prod_saffron_cuid', quantity: 1 }, // 850
          { productId: 'prod_walnut_cuid', quantity: 1 },  // 450
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.orderItems.length).toBe(2);
    expect(res.body.vendorOrders.length).toBe(1); // Single combined vendor order
    expect(res.body.vendorOrders[0].vendorId).toBe('vendor_1');
    expect(res.body.vendorOrders[0].subtotal).toBe(1300); // 850 + 450
    expect(res.body.vendorOrders[0].commissionAmount).toBe(130);
    expect(res.body.vendorOrders[0].payoutAmount).toBe(1170);
  });

  test('26. Cross-vendor multi-product partitioning creates distinct VendorOrders per vendor', async () => {
    // Saffron (vendor_1) and Honey (vendor_2)
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [
          { productId: 'prod_saffron_cuid', quantity: 1 }, // 850
          { productId: 'prod_honey_cuid', quantity: 1 },   // 650
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.orderItems.length).toBe(2);
    expect(res.body.vendorOrders.length).toBe(2); // Two distinct vendor orders!
    const v1Order = res.body.vendorOrders.find((vo) => vo.vendorId === 'vendor_1');
    const v2Order = res.body.vendorOrders.find((vo) => vo.vendorId === 'vendor_2');
    expect(v1Order.subtotal).toBe(850);
    expect(v2Order.subtotal).toBe(650);
  });

  test('27. Mixed slug and CUID references resolve to canonical products', async () => {
    // Pass saffron by slug and honey by CUID
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [
          { productId: 'kashmir-saffron-heritage', quantity: 1 }, // slug
          { productId: 'prod_honey_cuid', quantity: 1 },         // cuid
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.orderItems[0].productId).toBe('prod_saffron_cuid'); // Resolved to CUID
    expect(res.body.orderItems[1].productId).toBe('prod_honey_cuid');
  });

  test('28. Concurrency safety: conditional stock decrement rejects overselling and rolls back', async () => {
    // Saffron has stockQuantity = 5. Attempting to purchase 6 must be rejected.
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 6 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
    expect(mockDb.orders.length).toBe(0); // Rollback: no order created!
    expect(mockDb.products.find((p) => p.id === 'prod_saffron_cuid').stockQuantity).toBe(5); // Stock unchanged!
  });

  test('29. Transaction failure preserves cart (cart not cleared)', async () => {
    // Populate user cart
    mockDb.cartItems.push({
      id: 'ci_preserve',
      cartId: 'cart_a',
      productId: 'prod_saffron_cuid',
      quantity: 1,
    });

    // Order attempt with insufficient stock
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 99 }],
      });

    // Cart items must remain intact!
    expect(mockDb.cartItems.length).toBe(1);
    expect(mockDb.cartItems[0].id).toBe('ci_preserve');
  });

  test('30. Successful order clears cart inside the transaction', async () => {
    // Populate user cart
    mockDb.cartItems.push({
      id: 'ci_clear',
      cartId: 'cart_a',
      productId: 'prod_saffron_cuid',
      quantity: 1,
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1 }],
      });

    expect(res.status).toBe(201);
    // Cart is now cleared!
    const remainingForA = mockDb.cartItems.filter((i) => i.cartId === 'cart_a');
    expect(remainingForA.length).toBe(0);
  });

  test('31. Cross-user order access rejected with 403', async () => {
    // Create an order for User B
    const orderB = {
      id: 'ord_b',
      orderNumber: 'FSO-TEST-B',
      userId: 'user_b',
      totalPrice: 850,
      status: 'PENDING',
    };
    mockDb.orders.push(orderB);

    // User A attempts to view User B's order
    const res = await request(app)
      .get('/api/orders/ord_b')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('32. Order cancellation restores stock and sets status to CANCELLED', async () => {
    // Create an order for User A with saffron (qty 2)
    // Saffron stock starts at 5. Simulate post-order stock = 3.
    const saffron = mockDb.products.find((p) => p.id === 'prod_saffron_cuid');
    saffron.stockQuantity = 3;

    const ord = {
      id: 'ord_cancel_test',
      orderNumber: 'FSO-CANCEL-1',
      userId: 'user_a',
      status: 'PENDING',
      orderItems: [{ id: 'oi_c', productId: 'prod_saffron_cuid', quantity: 2 }],
    };
    mockDb.orders.push(ord);
    mockDb.orderItems.push({ id: 'oi_c', orderId: 'ord_cancel_test', productId: 'prod_saffron_cuid', quantity: 2 });

    const res = await request(app)
      .post('/api/orders/ord_cancel_test/cancel')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reason: 'Ordered by mistake' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('CANCELLED');
    expect(saffron.stockQuantity).toBe(5); // Stock restored from 3 back to 5!
  });

  test('33. Payment success is NOT falsely claimed (paymentStatus remains PENDING)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1 }],
        paymentMethod: 'razorpay',
      });

    expect(res.status).toBe(201);
    expect(res.body.paymentStatus).toBe('PENDING'); // Truthful intermediate state
    expect(res.body.paidAt).toBeFalsy();
  });

  test('34. Frontend checkout code contains zero fake payment simulation bypasses', () => {
    const fs = require('fs');
    const path = require('path');
    const customerPages = fs.readFileSync(
      path.join(__dirname, '../../client/components/customer/customer-pages.tsx'),
      'utf8'
    );

    expect(customerPages).not.toContain('Fallback server verification simulation');
    expect(customerPages).not.toContain('simulate verified payment flow');
  });

  test('35. Deterministic tax apportionment: sum of line-item taxes strictly equals order.taxPrice', async () => {
    // Saffron (850) and Honey (650) = Subtotal 1500
    // Coupon HERITAGE10 (10% = 150 discount)
    // Discounted subtotal = 1350
    // Line 1: 850 - (850/1500)*150 = 850 - 85 = 765 taxable base -> tax = 765 * 0.05 = 38.25
    // Line 2: 650 - (650/1500)*150 = 650 - 65 = 585 taxable base -> tax = 585 * 0.05 = 29.25
    // Total order tax = 38.25 + 29.25 = 67.50
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [
          { productId: 'prod_saffron_cuid', quantity: 1 },
          { productId: 'prod_honey_cuid', quantity: 1 },
        ],
        couponCode: 'HERITAGE10',
      });

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(1500);
    expect(res.body.discountPrice).toBe(150);
    expect(res.body.taxPrice).toBe(67.5);

    const sumLineTaxes = res.body.orderItems.reduce((acc, item) => acc + item.taxAmount, 0);
    expect(sumLineTaxes).toBe(res.body.taxPrice); // Exact match!
    expect(res.body.orderItems[0].taxAmount).toBe(38.25);
    expect(res.body.orderItems[1].taxAmount).toBe(29.25);
  });

  test('36. Coupon usage concurrency guard: atomic conditional check rejects order when usageLimit reached', async () => {
    // Set coupon usageCount to usageLimit - 1 (e.g. 99/100)
    const coupon = mockDb.coupons.find((c) => c.code === 'HERITAGE10');
    coupon.usageCount = 99;
    coupon.usageLimit = 100;

    // Order 1 takes the 100th slot
    const res1 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderItems: [{ productId: 'prod_saffron_cuid', quantity: 1 }],
        couponCode: 'HERITAGE10',
      });

    expect(res1.status).toBe(201);
    expect(coupon.usageCount).toBe(100);

    // Order 2 concurrent/subsequent attempt finds usageCount >= usageLimit (100 >= 100)
    const res2 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        orderItems: [{ productId: 'prod_honey_cuid', quantity: 1 }],
        couponCode: 'HERITAGE10',
      });

    expect(res2.status).toBe(400);
    expect(res2.body.code).toBe('COUPON_LIMIT_REACHED');
  });
});
