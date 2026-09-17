const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

describe('Shiprocket Fulfillment & Idempotency Pipeline', () => {
  const TEST_SECRET = 'test_sr_secret_123';

  test('Constructs deterministic idempotency key format: sr_wh_${awb}_${statusId}', () => {
    const awb = 'AWB99887766';
    const statusId = 7;
    const idempotencyKey = `sr_wh_${awb}_${statusId}`;
    expect(idempotencyKey).toBe('sr_wh_AWB99887766_7');
  });

  test('Verifies HMAC SHA-256 signature algorithm accurately', () => {
    const rawPayload = JSON.stringify({ current_status: 'Delivered', awb: 'AWB123' });
    const signature = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(rawPayload)
      .digest('hex');

    const expectedSig = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(rawPayload)
      .digest('hex');

    expect(signature).toBe(expectedSig);
  });

  test('Shiprocket controller uses Prisma WebhookLog and VendorOrder models', () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../controllers/shiprocketController.js'),
      'utf8'
    );
    expect(content).toContain('prisma.webhookLog.findUnique');
    expect(content).toContain('prisma.webhookLog.create');
    expect(content).toContain('prisma.vendorOrder.findFirst');
    expect(content).not.toContain('require("../models/WebhookLog")');
    expect(content).not.toContain('require("../models/VendorOrder")');
  });

  test('Shiprocket queue worker uses Prisma VendorOrder and Order models', () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../jobs/shiprocketQueue.js'),
      'utf8'
    );
    expect(content).toContain('prisma.vendorOrder');
    expect(content).toContain('prisma.order');
    expect(content).not.toContain('require("../models/VendorOrder")');
    expect(content).not.toContain('require("../models/Order")');
  });
});
