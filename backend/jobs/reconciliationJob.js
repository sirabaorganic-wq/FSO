const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const prisma = require('../config/prisma');
const razorpayClient = require('../config/razorpay');

const connection = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null,
    });

const reconciliationQueue = new Queue('daily-reconciliation', { connection });

const scheduleReconciliation = async () => {
    await reconciliationQueue.add('reconcile-payments', {}, {
        repeat: { cron: '0 0 * * *' },
    });
};

const reconciliationWorker = new Worker('daily-reconciliation', async (job) => {
    console.log('[Reconciliation] Starting daily payment reconciliation...');
    
    const to = Math.floor(Date.now() / 1000);
    const from = to - (24 * 60 * 60);

    let stats = {
        matched: 0,
        fixed: 0,
        flagged: 0,
        fetched: 0,
    };

    try {
        if (!razorpayClient?.payments) {
            console.warn('[Reconciliation] Razorpay client not configured, skipping run.');
            return { stats, message: 'Razorpay not configured' };
        }

        const rzpPayments = await razorpayClient.payments.all({
            from,
            to,
            count: 100,
        });
        
        stats.fetched = rzpPayments.items.length;

        for (const rzpPayment of rzpPayments.items) {
            const dbPayment = await prisma.payment.findFirst({
                where: { razorpayOrderId: rzpPayment.order_id },
            });
            
            if (!dbPayment) {
                console.warn(`[Reconciliation] Flagged: Payment ${rzpPayment.id} exists in Razorpay but no local Payment record.`);
                stats.flagged++;
                continue;
            }

            if (rzpPayment.status === 'captured' && dbPayment.status !== 'captured') {
                console.log(`[Reconciliation] Fixing mismatch for Order: ${dbPayment.orderId}. Updating DB to captured.`);
                
                await prisma.payment.update({
                    where: { id: dbPayment.id },
                    data: {
                        status: 'captured',
                        razorpayPaymentId: rzpPayment.id,
                        paymentMethod: rzpPayment.method,
                        capturedAt: new Date(rzpPayment.created_at * 1000),
                    },
                });

                if (dbPayment.orderId) {
                    await prisma.order.update({
                        where: { id: dbPayment.orderId },
                        data: {
                            isPaid: true,
                            paidAt: new Date(rzpPayment.created_at * 1000),
                            status: 'PROCESSING',
                        },
                    }).catch(() => {});
                }

                stats.fixed++;
            } else {
                stats.matched++;
            }
        }

        console.log(`[Reconciliation Completed] Fetched: ${stats.fetched}, Matched: ${stats.matched}, Fixed: ${stats.fixed}, Flagged: ${stats.flagged}`);
        return { stats };
    } catch (error) {
        console.error('[Reconciliation] Daily payment job failed:', error);
        throw error;
    }
}, { connection });

module.exports = { scheduleReconciliation, reconciliationQueue, reconciliationWorker };
