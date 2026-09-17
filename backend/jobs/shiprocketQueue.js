const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const shiprocketService = require('../services/shiprocketService');
const prisma = require('../config/prisma');

// Setup Redis Connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// Create the Queue
const shipmentQueue = new Queue('shiprocket-shipments', { connection });

// Function to add jobs to the queue
const enqueueShipment = async (vendorOrderId, orderId, vendorId) => {
  await shipmentQueue.add('create-shipment', {
    vendorOrderId, orderId, vendorId
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000 // 5s, 10s, 20s
    }
  });
};

// Create the Worker
const shipmentWorker = new Worker('shiprocket-shipments', async job => {
  const { vendorOrderId, orderId, vendorId } = job.data;

  const vendorOrder = await prisma.vendorOrder.findUnique({
    where: { id: vendorOrderId },
    include: { vendor: true },
  });
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  let vendor = vendorId ? (vendorOrder?.vendor || await prisma.vendor.findUnique({ where: { id: vendorId } })) : null;

  if (!vendor && !vendorId) {
    // Platform / Admin direct product
    const primaryLocation = process.env.SHIPROCKET_PRIMARY_LOCATION || "Primary";
    vendor = {
      id: "platform",
      businessName: process.env.FSO_BRAND_NAME ? `${process.env.FSO_BRAND_NAME} Direct` : "FSO Direct",
      phone: process.env.PLATFORM_PHONE || "",
      email: process.env.PLATFORM_EMAIL || process.env.FSO_ADMIN_EMAIL || "support@flashsalesonline.in",
      shiprocketPickupCode: primaryLocation,
      pickupAddress: {
        shiprocketLocationName: primaryLocation,
      },
    };
  }

  if (!vendorOrder || !order || !vendor) {
    throw new Error('Referenced entities not found for shipment');
  }

  // Idempotency check: don't create if already exists
  if (vendorOrder.shiprocketOrderId || vendorOrder.awbCode) {
    return { skipped: true, reason: 'Shipment already exists for this VendorOrder' };
  }

  // Generate shipment via service
  const shipmentResult = await shiprocketService.createShipment(vendorOrder, order, vendor);

  // Update VendorOrder in Prisma Neon PostgreSQL
  await prisma.vendorOrder.update({
    where: { id: vendorOrderId },
    data: {
      shiprocketOrderId: String(shipmentResult.shiprocketOrderId || ''),
      shipmentId: String(shipmentResult.shipmentId || ''),
      awbCode: shipmentResult.awbCode ? String(shipmentResult.awbCode) : null,
      courierName: shipmentResult.courierName || null,
      trackingUrl: shipmentResult.labelUrl || null,
      status: 'PROCESSING',
    },
  });

  return shipmentResult;
}, { connection });

// Handle Worker Events for Resilience/Logging
shipmentWorker.on('completed', (job) => {
  console.log(`Shipment Job ${job.id} completed successfully!`);
});

shipmentWorker.on('failed', async (job, err) => {
  console.error(`Shipment Job ${job.id} failed with error: ${err.message}`);

  const isPickupUnverified = err.code === 'PICKUP_LOCATION_NOT_REGISTERED';
  
  // If unverified pickup location OR max attempts reached
  if (isPickupUnverified || job.attemptsMade >= job.opts.attempts) {
    const { vendorOrderId } = job.data;
    try {
      const vendorOrder = await prisma.vendorOrder.findUnique({ where: { id: vendorOrderId } });
      if (vendorOrder) {
        // Alert the Vendor & Admin via Prisma Notification
        await prisma.notification.create({
          data: {
            vendorId: vendorOrder.vendorId,
            type: "order",
            title: isPickupUnverified ? "Shipment Blocked: Pickup Location Unverified" : "Shipment Creation Failed",
            message: isPickupUnverified
              ? `Shipment blocked for VendorOrder ${vendorOrderId}. Vendor pickup location is not registered in Shiprocket. Please contact Admin.`
              : `Shiprocket failed to create a shipment after max retries for order ${vendorOrderId}. Reason: ${err.message}`
          }
        });

        console.log(`VendorOrder ${vendorOrderId} shipment failed alert logged: ${err.message}`);
      }
    } catch (dbErr) {
      console.error('Failed to update DB on job failure:', dbErr);
    }
  }
});

module.exports = {
  shipmentQueue,
  enqueueShipment
};