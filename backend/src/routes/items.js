const express = require("express");
const crypto = require("crypto");

const store = require("../dataStore");

const { state } = require("../data/store");

const router = express.Router();

const items = [];

router.get("/", (req, res) => {
  const items = state.inventory.map((record) => ({
    itemName: record.itemName,
    unit: record.unit,
    quantity: record.quantity,
    location_id: record.locationId
  }));

  res.json({
    items,
    count: items.length,
    message: "Items fetched successfully"
  });
});

router.post("/", (req, res) => {
  const { name, category, unit } = req.body;

  if (!name || !category || !unit) {
    return res.status(400).json({
      error: "Validation failed",
      message: "name, category, and unit are required"
    });
  }

  const newItem = {
    id: items.length + 1,
    name,
    category,
    unit,
    onHand: Number(req.body.onHand || 0)
  };

  items.push(newItem);

  return res.status(201).json({
    message: "Item created",
    item: newItem
  });

  return res.status(201).json({ item });
}));

module.exports = router;
