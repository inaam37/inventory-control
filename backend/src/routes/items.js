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

  const items = await itemStore.listByOrganization(organizationId);

  return res.json({ items });
}));

router.post("/", asyncHandler(async (req, res) => {
  const {
    organizationId,
    vendorId,
    name,
    category,
    unit,
    sku,
    barcode,
    onHand,
    parLevel,
    reorderPoint,
    costPerUnit,
    leadTimeDays,
    usagePerDay
  } = req.body;

  if (!organizationId || !name || !category || !unit) {
    return res.status(400).json({
      error: "organizationId, name, category, and unit are required"
    });
  }

  const item = await itemStore.createItem({
    organizationId,
    vendorId: vendorId || null,
    name,
    category,
    unit,
    sku: sku || null,
    barcode: barcode || null,
    onHand: normalizeNumber(onHand),
    parLevel: normalizeNumber(parLevel),
    reorderPoint: normalizeNumber(reorderPoint),
    costPerUnit: normalizeNumber(costPerUnit),
    leadTimeDays: Math.round(normalizeNumber(leadTimeDays)),
    usagePerDay: normalizeNumber(usagePerDay)
  });

  return res.status(201).json({ item });
}));

module.exports = router;
