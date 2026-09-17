const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const prisma = require('../config/prisma');

const connection = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null,
    });

const orderExpiryQueue = new Queue('order-expiry', { connection });

/**
 * Enqueue order for expiration checking.
 * @param {string} orderId 
 * @param {string} paymentId
 * @param {number} delayMs - Milliseconds until execution
 */
const queueOrderExpiry = async (orderId, paymentId, delayMs) => {
    await orderExpiryQueue.add('check-expiry', { orderId, paymentId }, {
        delay: delayMs,
        attempts: 2,
    });
};

const orderExpiryWorker = new Worker('order-expiry', async (job) => {
    const { orderId, paymentId } = job.data;

    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
    });
    if (!payment) return { status: 'skipped', reason: 'Payment record missing' };

    if (payment.status === 'created') {
        console.log(`Order ${orderId} expired without payment. Cancelling.`);
        
        await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'failed',
                notes: { ...(typeof payment.notes === 'object' && payment.notes ? payment.notes : {}), reason: 'unpaid_timeout' },
            },
        });

        if (orderId) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: 'failed',
                },
            }).catch(() => {});

            await prisma.vendorOrder.updateMany({
                where: { orderId },
                data: { status: 'CANCELLED' },
            }).catch(() => {});
        }
    }

    return { status: 'processed' };
}, { connection });

module.exports = { queueOrderExpiry, orderExpiryQueue, orderExpiryWorker };
