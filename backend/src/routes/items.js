const express = require("express");
const crypto = require("crypto");
const { state } = require("../data/store");

const router = express.Router();

// GET all items
router.get("/", (req, res) => {
  try {
    const items = state.inventory.map((record) => ({
      id: record.id,
      itemName: record.itemName,
      unit: record.unit,
      quantity: record.quantity,
      locationId: record.locationId,
      price: record.price || 0,
      createdAt: record.createdAt || new Date().toISOString()
    }));

    res.json({
      items,
      count: items.length,
      message: "Items fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({
      error: "Failed to fetch items",
      message: error.message
    });
  }
});

// POST create item
router.post("/", (req, res) => {
  try {
    const { name, category, unit, quantity = 0, price = 0, locationId } = req.body;

    // Validate required fields
    if (!name || !category || !unit) {
      return res.status(400).json({
        error: "Validation failed",
        message: "name, category, and unit are required"
      });
    }

    const newItem = {
      id: crypto.randomUUID(),
      name,
      category,
      unit,
      quantity: Number(quantity) || 0,
      price: Number(price) || 0,
      locationId: locationId || "loc-main",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to inventory
    if (!state.inventory) {
      state.inventory = [];
    }
    
    state.inventory.push({
      id: newItem.id,
      itemName: name,
      unit,
      quantity: newItem.quantity,
      locationId: newItem.locationId,
      price: newItem.price,
      createdAt: newItem.createdAt
    });

    return res.status(201).json({
      message: "Item created successfully",
      item: newItem
    });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({
      error: "Failed to create item",
      message: error.message
    });
  }
});

// PUT update item
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, price, name } = req.body;

    const item = state.inventory.find((i) => i.id === id);
    if (!item) {
      return res.status(404).json({
        error: "Not found",
        message: `Item ${id} not found`
      });
    }

    if (quantity !== undefined) item.quantity = Number(quantity);
    if (price !== undefined) item.price = Number(price);
    if (name !== undefined) item.itemName = name;
    item.updatedAt = new Date().toISOString();

    res.json({
      message: "Item updated successfully",
      item
    });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({
      error: "Failed to update item",
      message: error.message
    });
  }
});

// DELETE item
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const index = state.inventory.findIndex((i) => i.id === id);

    if (index === -1) {
      return res.status(404).json({
        error: "Not found",
        message: `Item ${id} not found`
      });
    }

    const deleted = state.inventory.splice(index, 1);
    res.json({
      message: "Item deleted successfully",
      item: deleted[0]
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({
      error: "Failed to delete item",
      message: error.message
    });
  }
});

module.exports = router;
