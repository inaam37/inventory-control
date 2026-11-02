const express = require("express");
const crypto = require("crypto");
const { state } = require("../data/store");

const router = express.Router();

/**
 * Parse CSV content into items
 * Expected CSV format:
 * Item Name,Quantity,Unit,Price
 * Tomato Can,20,oz,$30
 * Olive Oil,2,litre,$30
 */
function parseInventoryCSV(csvContent) {
  const { parseCSV } = require('../../../inventory-engine');
  return parseCSV(csvContent).map((row, index) => {
    const name = row['Item Name'] || row.Name || row.name;
    const unit = row.Unit || row.unit;
    const quantity = row.Quantity ?? row.quantity;
    const price = row.Price ?? row.price;
    if (!name || !unit || [quantity,price].some(v => v === undefined || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0)) throw new Error(`Invalid CSV row ${index+2}`);
    return {id:crypto.randomUUID(),itemName:name,unit,quantity:Number(quantity),price:Number(price),locationId:'loc-main',createdAt:new Date().toISOString()};
  });
}

/**
 * POST /import/csv
 * Import inventory items from CSV content
 * Body: { csv: "csv content" }
 */
router.post("/csv", (req, res) => {
  try {
    const { csv } = req.body;

    if (!csv || typeof csv !== "string") {
      return res.status(400).json({
        error: "Validation failed",
        message: "CSV content is required"
      });
    }

    const items = parseInventoryCSV(csv);

    if (!state.inventory) {
      state.inventory = [];
    }

    // Add items to inventory
    state.inventory.push(...items);

    res.status(201).json({
      message: `Successfully imported ${items.length} items`,
      itemsImported: items.length,
      items
    });
  } catch (error) {
    console.error("Error importing CSV:", error);
    res.status(400).json({
      error: "Import failed",
      message: error.message
    });
  }
});

/**
 * POST /recipe-cost
 * Calculate recipe cost based on inventory items
 * Expects: { recipeName, yield, ingredients: [{ itemName, quantity, unit }] }
 */
router.post("/recipe-cost", (req, res) => {
  try {
    const { recipeName, yield: recipeYield, ingredients } = req.body;

    if (!recipeName || !recipeYield || !Array.isArray(ingredients)) {
      return res.status(400).json({
        error: "Validation failed",
        message: "recipeName, yield, and ingredients array are required"
      });
    }

    const costBreakdown = ingredients.map((ingredient) => {
      const inventoryItem = state.inventory.find(
        (i) => i.itemName.toLowerCase() === ingredient.itemName.toLowerCase()
      );

      const unitPrice = inventoryItem?.price || 0;
      const totalCost = unitPrice * ingredient.quantity;

      return {
        itemName: ingredient.itemName,
        quantity: ingredient.quantity,
        unit: ingredient.unit || "each",
        unitPrice,
        totalCost: Number(totalCost.toFixed(2)),
        found: !!inventoryItem
      };
    });

    const totalRecipeCost = costBreakdown.reduce((sum, item) => sum + item.totalCost, 0);
    const costPerServing = recipeYield ? totalRecipeCost / recipeYield : 0;

    res.json({
      recipeName,
      yield: recipeYield,
      costBreakdown,
      totalCost: Number(totalRecipeCost.toFixed(2)),
      costPerServing: Number(costPerServing.toFixed(2)),
      missingItems: costBreakdown.filter((i) => !i.found).map((i) => i.itemName)
    });
  } catch (error) {
    console.error("Error calculating recipe cost:", error);
    res.status(400).json({
      error: "Calculation failed",
      message: error.message
    });
  }
});

module.exports = router;