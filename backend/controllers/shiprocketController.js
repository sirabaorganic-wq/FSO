/**
 * FSO Shiprocket Webhook Controller — Neon PostgreSQL via Prisma
 * Strictly adheres to Gate 5: Webhook idempotency via WebhookLog eventId.
 */

const prisma = require('../config/prisma');

/**
 * Handles incoming webhooks from Shiprocket to update internal order statuses
 */
const handleWebhook = async (req, res) => {
  try {
    // 1. Security Check: Secret Token Validation
    const secret = req.headers['x-api-key'] || req.headers['x-shiprocket-token'];
    
    if (process.env.SHIPROCKET_WEBHOOK_SECRET && secret !== process.env.SHIPROCKET_WEBHOOK_SECRET) {
      console.warn('Unauthorized Shiprocket Webhook Attempt');
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }

    const payload = req.body || {};
    
    const awb = payload.awb;
    const currentStatus = payload.current_status || payload.shipment_status;
    const statusId = payload.current_status_id || payload.shipment_status_id || 'status';

    if (!awb || !currentStatus) {
      return res.status(400).json({ error: 'Invalid payload - missing awb or status' });
    }

    // 2. Idempotency Check (Gate 5)
    const idempotencyKey = `sr_wh_${awb}_${statusId}`;
    
    const existingLog = await prisma.webhookLog.findUnique({
      where: { eventId: idempotencyKey },
    });
    if (existingLog) {
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // Log it immediately to prevent race conditions
    await prisma.webhookLog.create({
      data: {
        eventId: idempotencyKey,
        eventType: 'shiprocket.tracking_update',
        provider: 'shiprocket',
        status: String(currentStatus),
        payload: payload,
      },
    });

    // 3. Map to internal VendorOrder
    const vendorOrder = await prisma.vendorOrder.findFirst({
      where: { awbCode: String(awb) },
    });
    if (!vendorOrder) {
      console.log(`Webhook received for unknown AWB: ${awb}`);
      return res.status(200).json({ success: true, message: 'AWB not found in our system' });
    }

    // 4. Status Mapping
    const statusMap = {
      'PICKED UP': 'SHIPPED',
      'IN TRANSIT': 'SHIPPED',
      'OUT FOR DELIVERY': 'SHIPPED',
      'DELIVERED': 'DELIVERED',
      'CANCELLED': 'CANCELLED',
    };

    const internalStatus = statusMap[String(currentStatus).toUpperCase()];
    
    const updateData = {};
    if (internalStatus) {
      updateData.status = internalStatus;
      if (internalStatus === 'DELIVERED' && !vendorOrder.deliveredAt) {
        updateData.deliveredAt = new Date();
      }
      if (internalStatus === 'SHIPPED' && !vendorOrder.shippedAt) {
        updateData.shippedAt = new Date();
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.vendorOrder.update({
        where: { id: vendorOrder.id },
        data: updateData,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Shiprocket Webhook Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  handleWebhook
};
