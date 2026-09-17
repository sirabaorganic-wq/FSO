require('dotenv').config();
const mongoose = require('mongoose');
const shiprocketService = require('../services/shiprocketService');

/**
 * Run this script via: `node backend/scripts/testShiprocket.js`
 * Make sure SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD are in your .env
 */
async function testShiprocket() {
  try {
    if (!process.env.SHIPROCKET_API_EMAIL || !process.env.SHIPROCKET_API_PASSWORD) {
        console.error("Missing SHIPROCKET_API_EMAIL or SHIPROCKET_API_PASSWORD in .env file.");
        console.error("Please add them before running this test.");
        process.exit(1);
    }

    // Test 1: Authentication
    console.log("---------- Test 1: Authentication ----------");
    const token = await shiprocketService.authenticate();
    console.log("Successfully retrieved Token:", token ? "YES (Stored in cache)" : "NO");

    // Test 2: Courier Serviceability
    console.log("---------- Test 2: Courier Serviceability ----------");
    console.log("Fetching best courier for Delhi to Delhi route (1kg, Prepaid)...");
    const bestCourier = await shiprocketService.checkServiceability({
      pickup_postcode: "110030",
      delivery_postcode: "110022",
      weight: 1,
      cod: false
    });
    console.log("Best Courier Selected:", bestCourier.courier_name);
    console.log("Rating:", bestCourier.rating);
    console.log("Estimated Delivery Hours:", bestCourier.etd_hours);
    console.log("Cost Rate: ₹", bestCourier.rate);

    console.log("\n---------- Tests Completed Successfully ----------");
    console.log("Note: To test total shipment creation, use the UI to place a new order. The Background Worker will process it automatically.");
    process.exit(0);
  } catch (error) {
    console.error("Test Failed:", error.message);
    if(error.response) console.error("Details:", error.response.data);
    process.exit(1);
  }
}

testShiprocket();
