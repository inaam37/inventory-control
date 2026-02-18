const express = require("express");

const { state } = require("../data/store");

const router = express.Router();

router.get("/", (req, res) => {
  const items = state.inventory.map((record) => ({
    itemName: record.itemName,
    unit: record.unit,
    quantity: record.quantity,
    location_id: record.locationId
  }));

  res.json({
    items,
    message: "Item inventory now includes location_id for multi-location tracking."
  });
});

router.post("/", (req, res) => {
  res.status(501).json({
    error: "Not implemented",
    message: "Create item endpoint scaffold. Implement with Prisma."
  });
});

module.exports = router;
