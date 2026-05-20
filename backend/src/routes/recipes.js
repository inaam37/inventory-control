const express = require("express");
const crypto = require("crypto");
const { state } = require("../data/store");

const router = express.Router();

// Initialize recipes storage
if (!state.recipes) {
  state.recipes = [];
}

// GET all recipes with calculated costs
router.get("/", (req, res) => {
  try {
    const recipesWithCosts = state.recipes.map((recipe) => {
      const totalCost = recipe.ingredients.reduce((sum, ingredient) => {
        const item = state.inventory.find((i) => i.itemName === ingredient.itemName);
        const ingredientCost = (item?.price || 0) * ingredient.quantity;
        return sum + ingredientCost;
      }, 0);

      const costPerServing = recipe.yield ? totalCost / recipe.yield : 0;
      const profitMargin = recipe.menuPrice
        ? ((recipe.menuPrice - costPerServing) / recipe.menuPrice) * 100
        : 0;

      return {
        ...recipe,
        totalCost: Number(totalCost.toFixed(2)),
        costPerServing: Number(costPerServing.toFixed(2)),
        profitMargin: Number(profitMargin.toFixed(2))
      };
    });

    res.json({
      recipes: recipesWithCosts,
      count: recipesWithCosts.length
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({
      error: "Failed to fetch recipes",
      message: error.message
    });
  }
});

// POST create recipe
router.post("/", (req, res) => {
  try {
    const { name, yield: recipeYield, menuPrice = 0, ingredients = [], notes = "" } = req.body;

    if (!name || !recipeYield) {
      return res.status(400).json({
        error: "Validation failed",
        message: "name and yield are required"
      });
    }

    const newRecipe = {
      id: crypto.randomUUID(),
      name,
      yield: Number(recipeYield),
      menuPrice: Number(menuPrice),
      ingredients: ingredients.map((ing) => ({
        itemName: ing.itemName,
        quantity: Number(ing.quantity),
        unit: ing.unit
      })),
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.recipes.push(newRecipe);

    // Calculate costs
    const totalCost = newRecipe.ingredients.reduce((sum, ingredient) => {
      const item = state.inventory.find((i) => i.itemName === ingredient.itemName);
      return sum + (item?.price || 0) * ingredient.quantity;
    }, 0);

    res.status(201).json({
      message: "Recipe created successfully",
      recipe: {
        ...newRecipe,
        totalCost: Number(totalCost.toFixed(2)),
        costPerServing: Number((totalCost / newRecipe.yield).toFixed(2))
      }
    });
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json({
      error: "Failed to create recipe",
      message: error.message
    });
  }
});

// PUT update recipe
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, yield: recipeYield, menuPrice, ingredients, notes } = req.body;

    const recipe = state.recipes.find((r) => r.id === id);
    if (!recipe) {
      return res.status(404).json({
        error: "Not found",
        message: `Recipe ${id} not found`
      });
    }

    if (name) recipe.name = name;
    if (recipeYield) recipe.yield = Number(recipeYield);
    if (menuPrice !== undefined) recipe.menuPrice = Number(menuPrice);
    if (ingredients) {
      recipe.ingredients = ingredients.map((ing) => ({
        itemName: ing.itemName,
        quantity: Number(ing.quantity),
        unit: ing.unit
      }));
    }
    if (notes !== undefined) recipe.notes = notes;
    recipe.updatedAt = new Date().toISOString();

    res.json({
      message: "Recipe updated successfully",
      recipe
    });
  } catch (error) {
    console.error("Error updating recipe:", error);
    res.status(500).json({
      error: "Failed to update recipe",
      message: error.message
    });
  }
});

// DELETE recipe
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const index = state.recipes.findIndex((r) => r.id === id);

    if (index === -1) {
      return res.status(404).json({
        error: "Not found",
        message: `Recipe ${id} not found`
      });
    }

    const deleted = state.recipes.splice(index, 1);
    res.json({
      message: "Recipe deleted successfully",
      recipe: deleted[0]
    });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({
      error: "Failed to delete recipe",
      message: error.message
    });
  }
});

module.exports = router;