const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

const seedExtraAdmin = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env');
        }
        await mongoose.connect(process.env.MONGO_URI);

        const email = 'admin@gmail.com';

        // Check if exists
        const existing = await User.findOne({ email });
        if (existing) {
            console.log(`⚠️ User ${email} already exists`);
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('admin123@', 10);

        const adminUser = await User.create({
            name: 'Main Admin',
            email: email,
            password: hashedPassword,
            isAdmin: true,
        });

        console.log(`✅ Admin created: ${adminUser.email}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding extra admin:', error);
        process.exit(1);
    }
};

seedExtraAdmin();
