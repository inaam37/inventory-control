const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

router.get("/", requireAuth, authorize("overview:read"), (req, res) => {
  res.json({
    message: "Backend scaffolding active",
    nextSteps: [
      "Connect authentication",
      "Expand purchase order workflows",
      "Add reporting and forecasting",
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
      "POST /api/recipes",
      "POST /api/recipes/:id/ingredients/:ingredientId",
      "GET /api/recipes/:id/can-make?servings=1",
      "POST /api/recipes/:id/sell"
    ]
  });
});

module.exports = router;
