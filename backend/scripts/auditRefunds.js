const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

const Vendor = require('../models/Vendor');
const VendorOrder = require('../models/VendorOrder');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const auditRefunds = async () => {
    await connectDB();

    console.log('Starting Audit for Missed Refunds...');
    const vendorOrders = await VendorOrder.find({ returnStatus: 'Completed', status: 'returned' }).populate('vendor');

    let fixedCount = 0;

    for (const vo of vendorOrders) {
        // Check if vendor wallet has a refund_debit transaction for this order
        const vendor = await Vendor.findById(vo.vendor._id);
        if (!vendor || !vendor.wallet) continue;

        const hasDebit = vendor.wallet.transactions.some(t =>
            t.type === 'refund_debit' && t.orderId && t.orderId.toString() === vo._id.toString()
        );

        if (!hasDebit) {
            console.log(`Found Missed Refund Debit for Order #${vo._id} (Vendor: ${vendor.businessName})`);

            const deductionAmount = vo.netAmount || (vo.subtotal - vo.commission);

            // Deduct from Balance (assuming if it's 'returned' and 'Completed' it was likely paid out or available)
            // But wait, if payoutStatus wasn't 'completed', we should deduct from Pending.
            // Check transactions for 'order_earning'.
            const hasEarning = vendor.wallet.transactions.some(t =>
                t.type === 'order_earning' && t.orderId && t.orderId.toString() === vo._id.toString()
            );

            // Also check current payoutStatus
            // If vo.payoutStatus is 'completed', it means it was added to balance.
            // If vo.payoutStatus is 'pending', it was in pending.

            // However, the issue is often that payoutStatus MIGHT be 'refunded' if my code ran partially, 
            // OR 'completed' if it never ran.

            // Let's rely on Wallet Balance logic:
            // If hasEarning (money added to balance) AND NO Debit -> Deduct Balance.
            // If NO Earning (money in pending) AND NO Debit -> Deduct Pending (if pending > 0).

            if (hasEarning) {
                console.log(`- Fixing: Deducting ${deductionAmount} from Available Balance`);
                vendor.wallet.balance = Math.max(0, (vendor.wallet.balance || 0) - deductionAmount);
                vendor.wallet.totalEarnings = Math.max(0, (vendor.wallet.totalEarnings || 0) - deductionAmount);
                vendor.wallet.totalCommissionPaid = Math.max(0, (vendor.wallet.totalCommissionPaid || 0) - vo.commission);

                vendor.wallet.transactions.push({
                    type: 'refund_debit',
                    amount: deductionAmount,
                    description: `Audit Fix: Refund Deduction for Order #${vo._id.toString().slice(-8)}`,
                    orderId: vo._id,
                    status: 'completed',
                    balanceAfter: vendor.wallet.balance,
                    date: new Date()
                });

                // Also fix metrics
                vendor.metrics = vendor.metrics || {};
                vendor.metrics.totalRevenue = Math.max(0, (vendor.metrics.totalRevenue || 0) - vo.subtotal);
                vendor.metrics.totalCommission = Math.max(0, (vendor.metrics.totalCommission || 0) - vo.commission);

                await vendor.save();
                fixedCount++;
            } else {
                // If it was in pending, usually 'pending_cancelled' is the type. Check that too.
                const hasPendingCancel = vendor.wallet.transactions.some(t =>
                    t.type === 'pending_cancelled' && t.orderId && t.orderId.toString() === vo._id.toString()
                );

                if (!hasPendingCancel && vendor.wallet.pendingBalance > 0) {
                    console.log(`- Fixing: Deducting ${deductionAmount} from Pending Balance`);
                    vendor.wallet.pendingBalance = Math.max(0, (vendor.wallet.pendingBalance || 0) - deductionAmount);

                    vendor.wallet.transactions.push({
                        type: 'pending_cancelled',
                        amount: deductionAmount,
                        description: `Audit Fix: Pending Refund for Order #${vo._id.toString().slice(-8)}`,
                        orderId: vo._id,
                        status: 'completed',
                        balanceAfter: vendor.wallet.balance,
                        date: new Date()
                    });

                    // Also fix metrics
                    vendor.metrics = vendor.metrics || {};
                    vendor.metrics.totalRevenue = Math.max(0, (vendor.metrics.totalRevenue || 0) - vo.subtotal);
                    vendor.metrics.totalCommission = Math.max(0, (vendor.metrics.totalCommission || 0) - vo.commission);

                    await vendor.save();
                    fixedCount++;
                }
            }
        }
    }

    console.log(`Audit Complete. Fixed ${fixedCount} orders.`);
    process.exit();
};

auditRefunds();
