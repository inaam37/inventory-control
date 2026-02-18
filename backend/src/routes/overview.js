const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Backend scaffolding active",
    modules: [
      "Inventory item tracking",
      "Alert generation engine",
      "In-app notification bell payload",
      "Per-user alert preferences",
      "Daily digest dispatch"
    ],
    endpoints: [
      "GET /health",
      "GET /api/overview",
      "GET /api/items",
      "POST /api/items",
      "POST /api/alerts/run",
      "GET /api/alerts/notifications?userId=:id",
      "POST /api/alerts/notifications/:id/read",
      "GET /api/alerts/preferences/:userId",
      "PUT /api/alerts/preferences/:userId",
      "POST /api/alerts/digest/daily"
    ]
  });
});

module.exports = router;
