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
    endpoints: [
      "GET /health",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "POST /api/auth/refresh",
      "GET /api/auth/me",
      "GET /api/overview",
      "GET /api/items",
      "GET /api/analytics/cogs",
      "GET /api/analytics/inventory-value",
      "GET /api/analytics/ingredient-costs",
      "GET /api/analytics/waste-cost",
      "GET /api/analytics/profit-margin",
      "GET /api/analytics/inventory-turnover"
    ]
  });
});

module.exports = router;
