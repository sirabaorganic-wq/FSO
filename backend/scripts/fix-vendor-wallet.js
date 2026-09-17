/**
 * Migration Script: Fix Vendor Wallet Balances
 * 
 * This script recalculates and fixes vendor wallet pendingBalance
 * based on actual non-delivered vendor orders.
 * 
 * Run with: node scripts/fix-vendor-wallet.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const VendorOrder = require('../models/VendorOrder');

const MONGO_URI = process.env.MONGO_URI;

async function fixVendorWallets() {
    try {
        console.log('🔧 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all vendors
        const vendors = await Vendor.find({});
        console.log(`📊 Found ${vendors.length} vendors to process\n`);

        for (const vendor of vendors) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📦 Processing: ${vendor.businessName} (${vendor._id})`);

            // Get all vendor orders
            const vendorOrders = await VendorOrder.find({ vendor: vendor._id });

            // Calculate actual pending balance (sum of netAmount for non-delivered orders)
            const pendingOrders = vendorOrders.filter(order =>
                !['delivered', 'cancelled', 'returned'].includes(order.status)
            );

            const actualPendingBalance = pendingOrders.reduce((sum, order) => sum + order.netAmount, 0);

            // Get current wallet values
            const currentPendingBalance = vendor.wallet?.pendingBalance || 0;
            const currentBalance = vendor.wallet?.balance || 0;

            console.log(`   Current Pending Balance: ₹${currentPendingBalance.toLocaleString()}`);
            console.log(`   Actual Pending Balance:  ₹${actualPendingBalance.toLocaleString()}`);
            console.log(`   Pending Orders Count:    ${pendingOrders.length}`);

            // Fix if different
            if (currentPendingBalance !== actualPendingBalance) {
                console.log(`   ⚠️  MISMATCH DETECTED - Fixing...`);

                // Initialize wallet if needed
                if (!vendor.wallet) {
                    vendor.wallet = {
                        balance: 0,
                        pendingBalance: 0,
                        totalEarnings: 0,
                        totalCommissionPaid: 0,
                        totalPayouts: 0,
                        transactions: []
                    };
                }

                vendor.wallet.pendingBalance = actualPendingBalance;
                await vendor.save();

                console.log(`   ✅ Fixed! New Pending Balance: ₹${actualPendingBalance.toLocaleString()}`);
            } else {
                console.log(`   ✅ Balance is correct!`);
            }

            // Display order summary
            const deliveredOrders = vendorOrders.filter(o => o.status === 'delivered');
            const cancelledOrders = vendorOrders.filter(o => o.status === 'cancelled');
            const returnedOrders = vendorOrders.filter(o => o.status === 'returned');

            console.log(`   📊 Order Summary:`);
            console.log(`      - Pending/Processing/Shipped: ${pendingOrders.length}`);
            console.log(`      - Delivered: ${deliveredOrders.length}`);
            console.log(`      - Cancelled: ${cancelledOrders.length}`);
            console.log(`      - Returned: ${returnedOrders.length}`);
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the migration
fixVendorWallets();
