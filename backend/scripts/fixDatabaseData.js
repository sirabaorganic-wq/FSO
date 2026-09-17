const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Adjust path to .env file if necessary (assuming script is in backend/scripts/)
dotenv.config({ path: path.join(__dirname, '../.env') });

const Vendor = require('../models/Vendor');
const VendorOrder = require('../models/VendorOrder');
const User = require('../models/User');

const fixData = async () => {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // ==========================================
        // 1. Fix User Wallets
        // ==========================================
        console.log('\n--- Checking Users ---');
        const users = await User.find({});
        let userFixedCount = 0;

        for (const user of users) {
            let needsSave = false;
            if (user.walletBalance === undefined || user.walletBalance === null) {
                user.walletBalance = 0;
                needsSave = true;
            }
            if (!user.walletTransactions) {
                user.walletTransactions = [];
                needsSave = true;
            }

            if (needsSave) {
                await user.save();
                userFixedCount++;
            }
        }
        console.log(`Fixed wallet structure for ${userFixedCount} users.`);

        // ==========================================
        // 2. Fix Vendor Wallets
        // ==========================================
        console.log('\n--- Checking Vendors ---');
        const vendors = await Vendor.find({});

        for (const vendor of vendors) {
            console.log(`Processing Vendor: ${vendor.businessName} (${vendor._id})`);
            let needsSave = false;

            // 2a. Ensure wallet structure
            if (!vendor.wallet) {
                vendor.wallet = {
                    balance: 0,
                    pendingBalance: 0,
                    totalEarnings: 0,
                    totalCommissionPaid: 0,
                    totalPayouts: 0,
                    transactions: []
                };
                needsSave = true;
                console.log('  - Initialized missing wallet');
            }

            // 2b. Recalculate Pending Balance
            // Logic: Pending Balance = Sum of netAmount of orders that are NOT completed/paid-out AND NOT cancelled/returned
            // completed payoutStatus means it's in available balance.

            const pendingOrders = await VendorOrder.find({
                vendor: vendor._id,
                payoutStatus: { $ne: 'completed' }, // Not yet paid out to available balance
                status: { $nin: ['cancelled', 'returned'] }, // Order is still valid/active
                returnStatus: { $nin: ["Refunded", "Completed"] } // Not refunded
            });

            let calculatedPending = 0;
            for (const order of pendingOrders) {
                // Fallback if netAmount missing
                const net = order.netAmount !== undefined ? order.netAmount : (order.subtotal - order.commission);
                calculatedPending += net;
            }

            // Round to 2 decimals to avoid float precision issues
            calculatedPending = Math.round(calculatedPending * 100) / 100;

            if (Math.abs((vendor.wallet.pendingBalance || 0) - calculatedPending) > 1) {
                console.log(`  - PENDING BALANCE MISMATCH: Stored ${vendor.wallet.pendingBalance}, Calculated ${calculatedPending}. Updating...`);
                vendor.wallet.pendingBalance = calculatedPending;
                needsSave = true;
            } else {
                console.log(`  - Pending Balance OK: ${calculatedPending}`);
            }

            // 2c. Check for Refunded Orders that might be stuck
            // Logic: If order is 'Refunded' or 'Returned' AND payoutStatus is 'completed', ensure money was deducted.
            // verifying this is hard without transaction history parsing. 
            // But we can check if current balance is negative, which suggests correct deduction happened (potentially) or over-withdrawal.

            if ((vendor.wallet.balance || 0) < 0) {
                console.log(`  - WARNING: Negative Available Balance: ${vendor.wallet.balance}`);
            }

            if (needsSave) {
                await vendor.save();
                console.log('  - Vendor saved.');
            }
        }

        console.log('\nData fix complete.');
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixData();
