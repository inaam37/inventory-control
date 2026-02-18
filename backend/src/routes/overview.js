const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

router.get("/", requireAuth, authorize("overview:read"), (req, res) => {
  res.json({
    message: "Backend scaffolding active",
    modules: [
      "Inventory item tracking",
      "Alert generation engine",
      "In-app notification bell payload",
      "Per-user alert preferences",
      "Daily digest dispatch"
    ],
    phase15: {
      capabilities: [
        "Manage multiple restaurant locations",
        "Track inventory by location_id",
        "Transfer inventory between locations",
        "Location analytics and consolidated reporting"
      ]
    },
    endpoints: [
      "GET /health",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "POST /api/auth/refresh",
      "GET /api/auth/me",
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
