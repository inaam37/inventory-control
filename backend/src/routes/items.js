const express = require("express");

const itemStore = require("../lib/item-store");
const asyncHandler = require("../lib/async-handler");

const router = express.Router();

function normalizeNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

router.get("/", asyncHandler(async (req, res) => {
  const organizationId = req.query.organizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "organizationId query param is required" });
  }

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
