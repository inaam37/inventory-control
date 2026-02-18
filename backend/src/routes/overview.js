const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

router.get("/", requireAuth, authorize("overview:read"), (req, res) => {
  res.json({
    message: "Backend scaffolding active",
    nextSteps: [
      "Connect Prisma client",
      "Add authentication",
      "Implement CRUD for items/vendors/recipes",
      "Add purchase order workflows",
      "Enable notifications",
      "Expand analytics dashboards with profitability and cost controls"
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
      "GET /api/locations",
      "POST /api/locations",
      "GET /api/inventory?locationId=<id>",
      "POST /api/inventory",
      "POST /api/inventory/transfer",
      "GET /api/reports/location/:locationId",
      "GET /api/reports/consolidated"
    ]
  });
});

module.exports = router;
