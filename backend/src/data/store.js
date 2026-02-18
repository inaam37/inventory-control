const crypto = require("crypto");

const defaultLocationId = "loc-main";

const state = {
  locations: [
    {
      id: defaultLocationId,
      name: "Main Location",
      timezone: "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  inventory: [
    {
      id: crypto.randomUUID(),
      itemName: "Tomatoes",
      unit: "kg",
      quantity: 40,
      locationId: defaultLocationId,
      updatedAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      itemName: "Mozzarella",
      unit: "kg",
      quantity: 18,
      locationId: defaultLocationId,
      updatedAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      itemName: "Basil",
      unit: "bunch",
      quantity: 25,
      locationId: defaultLocationId,
      updatedAt: new Date().toISOString()
    }
  ],
  transfers: []
};

const findLocationById = (locationId) =>
  state.locations.find((location) => location.id === locationId);

const getInventoryRecord = (locationId, itemName, unit) =>
  state.inventory.find(
    (record) =>
      record.locationId === locationId &&
      record.itemName.toLowerCase() === itemName.toLowerCase() &&
      record.unit === unit
  );

const upsertInventoryRecord = ({ locationId, itemName, unit, quantityDelta }) => {
  const existing = getInventoryRecord(locationId, itemName, unit);
  if (existing) {
    existing.quantity = Number((existing.quantity + quantityDelta).toFixed(4));
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const next = {
    id: crypto.randomUUID(),
    locationId,
    itemName,
    unit,
    quantity: Number(quantityDelta.toFixed(4)),
    updatedAt: new Date().toISOString()
  };
  state.inventory.push(next);
  return next;
};

module.exports = {
  state,
  findLocationById,
  getInventoryRecord,
  upsertInventoryRecord,
  defaultLocationId
};
