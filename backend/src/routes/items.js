const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

router.get("/", requireAuth, authorize("items:read"), (req, res) => {
  res.json({
    items: [],
    message: "Items endpoint scaffold. Wire to Prisma to fetch real data.",
    viewer: req.user
  });
});

router.post("/", requireAuth, authorize("items:write"), (req, res) => {
  res.status(501).json({
    error: "Not implemented",
    message: "Create item endpoint scaffold. Implement with Prisma."
  });
});

module.exports = router;
