const express = require("express");
const crypto = require("crypto");

const store = require("../dataStore");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    items: store.items
  });
});

router.post("/", (req, res) => {
  const { name, onHand = 0, reorderPoint = 0, expiresAt = null } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const item = {
    id: crypto.randomUUID(),
    name,
    onHand: Number(onHand),
    reorderPoint: Number(reorderPoint),
    expiresAt: expiresAt ? new Date(expiresAt) : null
  };

  store.items.push(item);

  return res.status(201).json({
    message: "Item created",
    item
  });
});

module.exports = router;
