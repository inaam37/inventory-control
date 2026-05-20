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
  const lines = csvContent.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV must have header row and at least one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const items = [];

  // Find column indices (flexible header matching)
  const nameIdx = headers.findIndex(
    (h) => h.includes("name") || h.includes("item")
  );
  const quantityIdx = headers.findIndex((h) => h.includes("quantity") || h.includes("qty"));
  const unitIdx = headers.findIndex((h) => h.includes("unit"));
  const priceIdx = headers.findIndex((h) => h.includes("price") || h.includes("cost"));

  if (nameIdx === -1) {
    throw new Error("CSV must have 'Item Name' or 'Name' column");
  }

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((cell) => cell.trim());

    if (row.length < 2 || !row[nameIdx]) continue;

    const name = row[nameIdx];
    const quantity = quantityIdx !== -1 ? parseFloat(row[quantityIdx]) || 0 : 0;
    const unit = unitIdx !== -1 ? row[unitIdx] : "each";
    const priceStr = priceIdx !== -1 ? row[priceIdx] : "0";
    const price = parseFloat(priceStr.replace(/[$,]/g, "")) || 0;

    items.push({
      id: crypto.randomUUID(),
      itemName: name,
      quantity,
      unit,
      price,
      locationId: "loc-main",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return items;
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