const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "Backend scaffolding active",
    nextSteps: [
      "Connect Prisma client",
      "Add authentication",
      "Implement CRUD for items/vendors/recipes",
      "Add purchase order workflows",
      "Enable notifications",
      "Phase 10: expiry management + FIFO consumption"
    ],
    endpoints: [
      "GET /health",
      "GET /api/overview",
      "GET /api/items",
      "GET /api/inventory/expiring-soon",
      "POST /api/inventory/:itemId/batches",
      "POST /api/inventory/:itemId/use",
      "GET /api/inventory/waste-report"
    ]
  });
});

module.exports = router;
