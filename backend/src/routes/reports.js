const express = require("express");

const { state, findLocationById } = require("../data/store");

const router = express.Router();

const sum = (values) => values.reduce((acc, value) => acc + value, 0);

router.get("/location/:locationId", (req, res) => {
  const { locationId } = req.params;
  const location = findLocationById(locationId);

  if (!location) {
    return res.status(404).json({
      error: "Location not found",
      message: `No location exists for locationId ${locationId}`
    });
  }

  const records = state.inventory.filter((record) => record.locationId === locationId);
  const inventoryUnits = sum(records.map((record) => record.quantity));

  return res.json({
    location,
    analytics: {
      skuCount: records.length,
      inventoryUnits,
      lowStockItems: records.filter((record) => record.quantity <= 5)
    },
    ingredients: records
  });
});

router.get("/consolidated", (req, res) => {
  const ingredientTotals = state.inventory.reduce((acc, record) => {
    const key = `${record.itemName.toLowerCase()}::${record.unit}`;
    if (!acc[key]) {
      acc[key] = {
        itemName: record.itemName,
        unit: record.unit,
        totalQuantity: 0,
        byLocation: []
      };
    }

    acc[key].totalQuantity = Number((acc[key].totalQuantity + record.quantity).toFixed(4));
    acc[key].byLocation.push({
      locationId: record.locationId,
      quantity: record.quantity
    });

    return acc;
  }, {});

  const transfersByLocation = state.locations.map((location) => {
    const inbound = state.transfers.filter((transfer) => transfer.toLocationId === location.id);
    const outbound = state.transfers.filter((transfer) => transfer.fromLocationId === location.id);

    return {
      locationId: location.id,
      locationName: location.name,
      inboundTransfers: inbound.length,
      outboundTransfers: outbound.length,
      netTransferQuantity:
        Number(
          (
            sum(inbound.map((transfer) => transfer.quantity)) -
            sum(outbound.map((transfer) => transfer.quantity))
          ).toFixed(4)
        )
    };
  });

  res.json({
    organizationSummary: {
      locationCount: state.locations.length,
      skuCount: state.inventory.length,
      totalInventoryUnits: Number(
        state.inventory.reduce((total, record) => total + record.quantity, 0).toFixed(4)
      ),
      transferCount: state.transfers.length
    },
    ingredientTotals: Object.values(ingredientTotals),
    transfersByLocation
  });
});

module.exports = router;
