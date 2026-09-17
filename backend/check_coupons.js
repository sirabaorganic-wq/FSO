const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Coupon = require('./models/Coupon');

dotenv.config();

const checkCoupons = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/siraba-organic'); // Fallback purely for safety
        console.log('MongoDB Connected');

        const listing = await Coupon.find({});
        console.log(`Found ${listing.length} coupons.`);
        listing.forEach(c => {
            console.log(`- Code: ${c.code}, Active: ${c.isActive}, Expiry: ${c.expiryDate}, AssignedTo: ${c.assignedTo}`);
        });

        if (listing.length === 0) {
            console.log('Creating a sample coupon...');
            await Coupon.create({
                code: 'WELCOME10',
                discountType: 'percentage',
                discountValue: 10,
                isActive: true
            });
            console.log('Sample coupon WELCOME10 created.');

            console.log('Creating a sample fixed coupon...');
            await Coupon.create({
                code: 'SAVE500',
                discountType: 'fixed',
                discountValue: 500,
                isActive: true
            });
            console.log('Sample coupon SAVE500 created.');
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkCoupons();
