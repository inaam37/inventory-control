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
      "Enable notifications"
    ],
    endpoints: [
      "GET /health",
      "GET /api/overview",
      "GET /api/items",
      "POST /api/count-session",
      "POST /api/count-session/:id/items",
      "GET /api/count-session/:id/variance-report"
    ]
  });
});

module.exports = router;
