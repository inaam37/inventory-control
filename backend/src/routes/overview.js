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
      "POST /api/recipes",
      "POST /api/recipes/:id/ingredients/:ingredientId",
      "GET /api/recipes/:id/can-make?servings=1",
      "POST /api/recipes/:id/sell"
    ]
  });
});

module.exports = router;
