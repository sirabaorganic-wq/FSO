const express = require("express");
const router = express.Router();
const {
  getProducers,
  getProducerById,
  getProducerProducts,
} = require("../controllers/producerController");

// Public producer discovery routes
router.get("/", getProducers);
router.get("/:id", getProducerById);
router.get("/:id/products", getProducerProducts);

module.exports = router;
