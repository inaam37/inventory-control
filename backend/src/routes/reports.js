const express = require("express");
const { state } = require("../data/store");

const router = express.Router();

/**
 * GET /summary (Manager/Chef view)
 * Get financial summary of recipes
 */
router.get("/summary", (req, res) => {
  try {
    // Manager can see summary
    if (!req.user?.permissions?.includes("reports:read")) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions"
      });
    }

    const recipeSummary = (state.recipes || []).map((recipe) => {
      const totalCost = recipe.ingredients.reduce((sum, ingredient) => {
        const item = state.inventory.find((i) => i.itemName === ingredient.itemName);
        return sum + (item?.price || 0) * ingredient.quantity;
      }, 0);

      const costPerServing = recipe.yield ? totalCost / recipe.yield : 0;
      const profitPerServing = recipe.menuPrice - costPerServing;
      const profitMargin = recipe.menuPrice ? (profitPerServing / recipe.menuPrice) * 100 : 0;

      return {
        name: recipe.name,
        menuPrice: recipe.menuPrice,
        costPerServing: Number(costPerServing.toFixed(2)),
        profitPerServing: Number(profitPerServing.toFixed(2)),
        profitMargin: Number(profitMargin.toFixed(2))
      };
    });

    const totalInventoryValue = state.inventory.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    res.json({
      inventorySummary: {
        totalItems: state.inventory.length,
        totalValue: Number(totalInventoryValue.toFixed(2))
      },
      recipes: recipeSummary,
      topProfitRecipes: recipeSummary.sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 5),
      lowMarginRecipes: recipeSummary.filter((r) => r.profitMargin < 30)
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({
      error: "Failed to generate summary",
      message: error.message
    });
  }
});

/**
 * GET /vendor-report
 * Vendor report for ordering
 */
router.get("/vendor-report", (req, res) => {
  try {
    // Chef and Manager can see vendor reports
    if (!req.user?.permissions?.includes("vendors:read")) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions"
      });
    }

    // Group items by vendor (need vendor field in inventory)
    const vendorGroups = {};
    (state.inventory || []).forEach((item) => {
      const vendor = item.vendor || "Unknown";
      if (!vendorGroups[vendor]) {
        vendorGroups[vendor] = [];
      }
      vendorGroups[vendor].push({
        name: item.itemName,
        currentQty: item.quantity,
        price: item.price,
        totalValue: item.quantity * item.price
      });
    });

    const vendorReport = Object.entries(vendorGroups).map(([vendor, items]) => {
      const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
      return {
        vendor,
        itemCount: items.length,
        items,
        totalValue: Number(totalValue.toFixed(2))
      };
    });

    res.json({
      generatedAt: new Date().toISOString(),
      vendorReport
    });
  } catch (error) {
    console.error("Error generating vendor report:", error);
    res.status(500).json({
      error: "Failed to generate vendor report",
      message: error.message
    });
  }
});

module.exports = router;