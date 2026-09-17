const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Product = require('./models/Product');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const p = await Product.find({}, 'name isPublic isActive vendorStatus category tags certifications');
    console.log(p);
    process.exit(0);
}
run();
