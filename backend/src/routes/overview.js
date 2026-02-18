const express = require("express");

const { getOverview } = require("../controllers/overviewController");

const router = express.Router();

router.get("/", getOverview);

module.exports = router;
