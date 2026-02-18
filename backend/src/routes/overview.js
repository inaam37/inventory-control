const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

router.get("/", requireAuth, authorize("overview:read"), (req, res) => {
  res.json({
    message: "Backend scaffolding active",
    nextSteps: [
      "Connect Prisma client",
      "Authentication enabled",
      "Implement CRUD for items/vendors/recipes",
      "Add purchase order workflows",
      "Enable notifications"
    ],
    endpoints: [
      "GET /health",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "POST /api/auth/refresh",
      "GET /api/auth/me",
      "GET /api/overview",
      "GET /api/items",
      "POST /api/inventory/stock-in",
      "POST /api/inventory/stock-out",
      "GET /api/inventory/transactions",
      "GET /api/inventory/cogs"
    ]
  });
});

module.exports = router;
