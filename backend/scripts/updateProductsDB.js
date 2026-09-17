const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function updateProducts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const keepNames = [
            "Kashmiri Mongra Saffron",
            "Premium Asafoetida (Hing)",
            "Organic Turmeric Powder"
        ];

        const deleteResult = await Product.deleteMany({ name: { $nin: keepNames } });
        console.log(`Deleted ${deleteResult.deletedCount} dummy products from DB.`);

        const update1 = await Product.updateOne(
            { name: "Kashmiri Mongra Saffron" },
            { $set: { image: "/images/saffron_jar.png", images: ["/images/saffron_jar.png"] } }
        );
        console.log(`Updated Saffron: ${update1.modifiedCount} modified.`);

        const update2 = await Product.updateOne(
            { name: "Premium Asafoetida (Hing)" },
            { $set: { image: "/images/hing_jar_s.png", images: ["/images/hing_jar_s.png"] } }
        );
        console.log(`Updated Hing: ${update2.modifiedCount} modified.`);

        const update3 = await Product.updateOne(
            { name: "Organic Turmeric Powder" },
            { $set: { image: "/images/turmeric_powder.png", images: ["/images/turmeric_powder.png"] } }
        );
        console.log(`Updated Turmeric: ${update3.modifiedCount} modified.`);

        mongoose.connection.close();
    } catch (error) {
        console.error('Error updating products:', error);
        process.exit(1);
    }
}

updateProducts();
