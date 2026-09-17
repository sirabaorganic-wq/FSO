const express = require("express");
const router = express.Router();
const { search } = require("../controllers/searchController");

// Unified search across all FSO entities
router.get("/", search);

module.exports = router;
