const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    items: [],
    message: "Items endpoint scaffold. Wire to Prisma to fetch real data."
  });
});

router.post("/", (req, res) => {
  res.status(501).json({
    error: "Not implemented",
    message: "Create item endpoint scaffold. Implement with Prisma."
  });
});

module.exports = router;
