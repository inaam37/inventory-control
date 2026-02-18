const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

router.get("/", requireAuth, authorize("overview:read"), (req, res) => {
  res.json({
    message: "Backend scaffolding active",
    phase: "Phase 20 - testing, deployment, documentation",
    nextSteps: [
      "Switch item routes to Prisma persistence",
      "Configure infrastructure secrets in cloud providers",
      "Set up scheduled backups and dashboards"
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
      "GET /api/admin/status",
      "POST /api/admin/cache/invalidate"
    ]
  });
});

module.exports = router;
