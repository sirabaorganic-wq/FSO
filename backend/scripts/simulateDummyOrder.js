const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const axios = require('axios');
dotenv.config();

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
};

const run = async () => {
  await connectDB();
  const User = require('../models/User');
  const Product = require('../models/Product');
  const Vendor = require('../models/Vendor');
  
  // Find a user or create one
  let user = await User.findOne({ email: 'dummycustomer@example.com' });
  if (!user) {
    user = await User.create({
      name: 'Dummy Customer',
      email: 'dummycustomer@example.com',
      password: 'password123',
      isVerified: true,
      phone: '9999999999'
    });
  }

  // Find a product that belongs to a vendor (isVendorProduct = true)
  const product = await Product.findOne({ isVendorProduct: true }).populate('vendor');
  if (!product) {
    console.log("No vendor product found!");
    process.exit(1);
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  console.log("Placing order for product:", product.name);

  const orderPayload = {
    orderItems: [
      {
        name: product.name,
        quantity: 1,
        image: product.image || (product.images && product.images[0] ? product.images[0].url : 'https://via.placeholder.com/150'),
        price: product.price,
        product: product._id,
      }
    ],
    shippingAddress: {
      name: 'John Doe',
      address: '123 Test St',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
      phone: '9999999999'
    },
    paymentMethod: 'COD',
    itemsPrice: product.price,
    taxPrice: 0,
    shippingPrice: 50,
    totalPrice: product.price + 50,
  };

  try {
    const res = await axios.post('http://localhost:5000/api/orders', orderPayload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Order Placed successfully!");
    console.log("Main Order ID:", res.data._id);
    console.log("Waiting 10 seconds for BullMQ to process the Shiprocket job...");
    
    setTimeout(async () => {
      const VendorOrder = require('../models/VendorOrder');
      const vendorOrders = await VendorOrder.find({ order: res.data._id });
      console.log(`Found ${vendorOrders.length} vendor order(s). Retrieving status:`);
      vendorOrders.forEach(vo => {
        console.log("------------------------");
        console.log("VendorOrder ID:", vo._id);
        console.log("Vendor ID:", vo.vendor);
        console.log("Status:", vo.status);
        console.log("Shiprocket Order ID:", vo.shiprocketOrderId || "Not Set");
        console.log("AWB Code:", vo.awbCode || "Not Set");
      });
      console.log("------------------------");
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error("Failed to place order:", error.response?.data || error.message);
    process.exit(1);
  }
};

run();
