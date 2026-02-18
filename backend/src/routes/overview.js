const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
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
      "GET /api/overview",
      "GET /api/items",
      "GET /api/suppliers",
      "GET /api/suppliers/:id",
      "POST /api/suppliers",
      "PUT /api/suppliers/:id",
      "DELETE /api/suppliers/:id"
    ]
  });
});

module.exports = router;
