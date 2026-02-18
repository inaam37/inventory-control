const express = require("express");
const { clearCache, cacheStore } = require("../cache");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.use(adminAuth);

router.get("/status", (req, res) => {
  res.json({
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: process.uptime(),
    cacheEntries: cacheStore.size,
    sentryEnabled: Boolean(process.env.SENTRY_DSN)
  });
});

router.post("/cache/invalidate", (req, res) => {
  clearCache();
  res.json({
    message: "Application cache cleared",
    cacheEntries: cacheStore.size
  });
});

module.exports = router;
