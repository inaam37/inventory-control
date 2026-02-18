const express = require("express");
const crypto = require("crypto");

const {
  state,
  findLocationById,
  getInventoryRecord,
  upsertInventoryRecord
} = require("../data/store");

const router = express.Router();

router.get("/", (req, res) => {
  const { locationId } = req.query;

  const inventory = locationId
    ? state.inventory.filter((record) => record.locationId === locationId)
    : state.inventory;

  res.json({ inventory, totalRecords: inventory.length });
});

router.post("/", (req, res) => {
  const { itemName, unit, quantity, locationId } = req.body ?? {};

  if (!itemName || !unit || typeof quantity !== "number" || !locationId) {
    return res.status(400).json({
      error: "Validation error",
      message: "itemName, unit, quantity(number), and locationId are required"
    });
  }

  if (!findLocationById(locationId)) {
    return res.status(404).json({
      error: "Location not found",
      message: `No location exists for locationId ${locationId}`
    });
  }

  const record = upsertInventoryRecord({
    locationId,
    itemName,
    unit,
    quantityDelta: quantity
  });

  res.status(201).json({ message: "Inventory updated", record });
});

router.post("/transfer", (req, res) => {
  const { fromLocationId, toLocationId, itemName, unit, quantity } = req.body ?? {};

  if (!fromLocationId || !toLocationId || !itemName || !unit || typeof quantity !== "number") {
    return res.status(400).json({
      error: "Validation error",
      message:
        "fromLocationId, toLocationId, itemName, unit and quantity(number) are required"
    });
  }

  if (fromLocationId === toLocationId) {
    return res.status(400).json({
      error: "Validation error",
      message: "Cannot transfer inventory to the same location"
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({
      error: "Validation error",
      message: "quantity must be greater than zero"
    });
  }

  const fromLocation = findLocationById(fromLocationId);
  const toLocation = findLocationById(toLocationId);

  if (!fromLocation || !toLocation) {
    return res.status(404).json({
      error: "Location not found",
      message: "Both fromLocationId and toLocationId must exist"
    });
  }

  const sourceRecord = getInventoryRecord(fromLocationId, itemName, unit);
  if (!sourceRecord || sourceRecord.quantity < quantity) {
    return res.status(400).json({
      error: "Insufficient inventory",
      message: `Not enough ${itemName} at source location`
    });
  }

  sourceRecord.quantity = Number((sourceRecord.quantity - quantity).toFixed(4));
  sourceRecord.updatedAt = new Date().toISOString();

  const destinationRecord = upsertInventoryRecord({
    locationId: toLocationId,
    itemName,
    unit,
    quantityDelta: quantity
  });

  const transfer = {
    id: crypto.randomUUID(),
    fromLocationId,
    toLocationId,
    itemName,
    unit,
    quantity,
    createdAt: new Date().toISOString()
  };

  state.transfers.push(transfer);

  res.status(201).json({
    message: "Inventory transferred",
    transfer,
    sourceRecord,
    destinationRecord
  });
});

module.exports = router;
