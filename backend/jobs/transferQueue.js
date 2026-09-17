const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const prisma = require('../config/prisma');
const { initiateTransfer } = require('../services/paymentService');

const connection = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null,
    });

const transferQueue = new Queue('vendor-transfers', { connection });

/**
 * Enqueue standard split payment transfers for a captured Razorpay order.
 * @param {string} paymentId
 */
const enqueueTransfer = async (paymentId) => {
    await transferQueue.add('process-transfer', { paymentId }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    });
};

const transferWorker = new Worker('vendor-transfers', async (job) => {
    const { paymentId } = job.data;
    
    // 1. Fetch Payment Data
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
    });
    if (!payment || payment.status !== 'captured') {
        throw new Error(`Invalid or uncaptured payment: ${paymentId}`);
    }

    // 2. Fetch all vendor orders associated with this main order
    const vendorOrders = await prisma.vendorOrder.findMany({
        where: { orderId: payment.orderId },
        include: { vendor: true },
    });
    
    if (vendorOrders.length === 0) {
        return { success: true, message: 'No vendor orders found to transfer' };
    }

    const transfersPayload = [];
    const vendorTransferDocs = [];

    // 3. Process each vendor's cut
    for (const vo of vendorOrders) {
        const vendor = vo.vendor;
        const linkedAccountId = vendor?.razorpayLinkedAccountId;
        if (!linkedAccountId) {
            console.warn(`Vendor ${vendor?.id} has no linked account for Razorpay Route. Skipping transfer.`);
            continue;
        }

        // Check if we already created a transfer for this vendor order
        const existingTransfers = await prisma.vendorTransfer.findMany({
            where: { vendorOrderId: vo.id },
        });
        if (existingTransfers.length > 0) continue;

        // Calculate commission
        const platformCommission = Number(process.env.PLATFORM_COMMISSION_RATE) || 10;
        const commissionRate = vendor.commissionRate !== null && vendor.commissionRate !== undefined 
            ? vendor.commissionRate 
            : platformCommission;
        
        const grossAmount = vo.subtotal || 0;
        const commissionAmount = (grossAmount * commissionRate) / 100;
        const netVendorAmount = grossAmount - commissionAmount;

        transfersPayload.push({
            account: linkedAccountId,
            amount: netVendorAmount,
            currency: 'INR',
            notes: {
                vendor_order_id: vo.id.toString(),
                order_id: payment.orderId.toString(),
            },
        });

        vendorTransferDocs.push({
            paymentId: payment.id,
            razorpayPaymentId: payment.razorpayPaymentId || '',
            vendorId: vendor.id,
            vendorOrderId: vo.id,
            razorpayLinkedAccountId: linkedAccountId,
            amount: Math.round(netVendorAmount * 100), // stored in paise
            grossAmount: Math.round(grossAmount * 100),
            commissionRate: commissionRate,
            commissionAmount: Math.round(commissionAmount * 100),
            status: 'initiated',
        });
    }

    if (transfersPayload.length === 0) {
        return { success: true, message: 'No eligible vendors for Route transfer.' };
    }

    try {
        await initiateTransfer(payment.razorpayPaymentId, transfersPayload);
        
        for (const doc of vendorTransferDocs) {
            await prisma.vendorTransfer.create({
                data: {
                    paymentId: doc.paymentId,
                    razorpayPaymentId: doc.razorpayPaymentId,
                    vendorId: doc.vendorId,
                    vendorOrderId: doc.vendorOrderId,
                    razorpayLinkedAccountId: doc.razorpayLinkedAccountId,
                    amount: doc.amount,
                    grossAmount: doc.grossAmount,
                    commissionRate: doc.commissionRate,
                    commissionAmount: doc.commissionAmount,
                    status: doc.status,
                },
            });
        }

        return { success: true, count: transfersPayload.length };
    } catch (error) {
        console.error('Razorpay Route Transfer Error:', error);
        throw error;
    }

}, { connection });

transferWorker.on('failed', async (job, err) => {
    console.error(`Job ${job.id} failed for payment ${job.data.paymentId}:`, err.message);
});

module.exports = { enqueueTransfer };
