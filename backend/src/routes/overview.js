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
      "GET /api/suppliers",
      "GET /api/suppliers/:id",
      "POST /api/suppliers",
      "PUT /api/suppliers/:id",
      "DELETE /api/suppliers/:id"
    ]
  });
});

module.exports = router;
