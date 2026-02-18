const express = require("express");

const prisma = require("../prisma");

const router = express.Router();

const normalizeQuantity = (value) => {
  const qty = Number(value);
  return Number.isFinite(qty) ? qty : NaN;
};

const calculateRecipeCost = async (recipeId, tx = prisma) => {
  const ingredients = await tx.recipeIngredient.findMany({
    where: { recipeId },
    include: { item: true }
  });

  const total = ingredients.reduce((sum, ingredient) => {
    return sum + ingredient.quantity * ingredient.item.costPerUnit;
  }, 0);

  await tx.recipe.update({
    where: { id: recipeId },
    data: { costToPrepare: total }
  });

  return total;
};

router.post("/", async (req, res) => {
  try {
    const {
      organizationId,
      name,
      ingredients = [],
      quantities = [],
      preparation_time,
      yield: recipeYield,
      menu_price,
      notes
    } = req.body;

    if (!organizationId || !name) {
      return res.status(400).json({ error: "organizationId and name are required" });
    }

    if (!Array.isArray(ingredients) || !Array.isArray(quantities) || ingredients.length !== quantities.length) {
      return res.status(400).json({ error: "ingredients and quantities must be arrays of matching length" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          organizationId,
          name,
          preparationTime: Number(preparation_time) || 0,
          yield: Number(recipeYield) || 1,
          menuPrice: Number(menu_price) || 0,
          notes: notes || null
        }
      });

      for (let index = 0; index < ingredients.length; index += 1) {
        const itemId = ingredients[index];
        const quantity = normalizeQuantity(quantities[index]);
        if (!itemId || Number.isNaN(quantity) || quantity <= 0) {
          throw new Error("Invalid ingredient payload");
        }

        await tx.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            itemId,
            quantity
          }
        });
      }

      const costToPrepare = await calculateRecipeCost(recipe.id, tx);

      return tx.recipe.findUnique({
        where: { id: recipe.id },
        include: {
          ingredients: {
            include: {
              item: {
                select: { id: true, name: true, unit: true, costPerUnit: true, onHand: true }
              }
            }
          }
        }
      }).then((fullRecipe) => ({ ...fullRecipe, costToPrepare }));
    });

    return res.status(201).json({ recipe: created });
  } catch (error) {
    if (error.message === "Invalid ingredient payload") {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: "Failed to create recipe", detail: error.message });
  }
});

router.post("/:id/ingredients/:ingredientId", async (req, res) => {
  try {
    const { id: recipeId, ingredientId } = req.params;
    const quantity = normalizeQuantity(req.body.quantity);

    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "quantity must be a positive number" });
    }

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const item = await prisma.item.findUnique({ where: { id: ingredientId } });
    if (!item) {
      return res.status(404).json({ error: "Ingredient item not found" });
    }

    const line = await prisma.recipeIngredient.upsert({
      where: {
        recipeId_itemId: {
          recipeId,
          itemId: ingredientId
        }
      },
      update: { quantity: { increment: quantity } },
      create: {
        recipeId,
        itemId: ingredientId,
        quantity
      }
    });

    const costToPrepare = await calculateRecipeCost(recipeId);

    return res.status(201).json({ ingredient: line, costToPrepare });
  } catch (error) {
    return res.status(500).json({ error: "Failed to add ingredient", detail: error.message });
  }
});

router.get("/:id/can-make", async (req, res) => {
  try {
    const { id: recipeId } = req.params;
    const servings = Math.max(1, Number(req.query.servings) || 1);

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: {
            item: {
              select: { id: true, name: true, unit: true, onHand: true }
            }
          }
        }
      }
    });

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const requirements = recipe.ingredients.map((ingredient) => {
      const required = ingredient.quantity * servings;
      return {
        itemId: ingredient.item.id,
        itemName: ingredient.item.name,
        unit: ingredient.item.unit,
        required,
        onHand: ingredient.item.onHand,
        shortBy: Math.max(0, required - ingredient.item.onHand),
        sufficient: ingredient.item.onHand >= required
      };
    });

    return res.json({
      recipeId,
      servings,
      canMake: requirements.every((line) => line.sufficient),
      requirements
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to check recipe availability", detail: error.message });
  }
});

router.post("/:id/sell", async (req, res) => {
  try {
    const { id: recipeId } = req.params;
    const servings = Math.max(1, Number(req.body.servings) || 1);
    const soldDate = req.body.soldDate ? new Date(req.body.soldDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: {
            include: {
              item: true
            }
          }
        }
      });

      if (!recipe) {
        throw new Error("NOT_FOUND");
      }

      const shortages = [];
      for (const ingredient of recipe.ingredients) {
        const required = ingredient.quantity * servings;
        if (ingredient.item.onHand < required) {
          shortages.push({
            itemId: ingredient.item.id,
            itemName: ingredient.item.name,
            required,
            onHand: ingredient.item.onHand,
            shortBy: required - ingredient.item.onHand
          });
        }
      }

      if (shortages.length > 0) {
        const out = new Error("INSUFFICIENT_INVENTORY");
        out.shortages = shortages;
        throw out;
      }

      const salesLog = await tx.salesLog.create({
        data: {
          recipeId,
          servings,
          soldDate
        }
      });

      for (const ingredient of recipe.ingredients) {
        const usedQty = ingredient.quantity * servings;

        await tx.item.update({
          where: { id: ingredient.item.id },
          data: {
            onHand: {
              decrement: usedQty
            }
          }
        });

        await tx.salesIngredient.create({
          data: {
            salesLogId: salesLog.id,
            itemId: ingredient.item.id,
            quantity: usedQty
          }
        });
      }

      const updatedInventory = await tx.recipeIngredient.findMany({
        where: { recipeId },
        include: {
          item: {
            select: { id: true, name: true, onHand: true, unit: true }
          }
        }
      });

      return { salesLog, updatedInventory };
    });

    return res.status(201).json(result);
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Recipe not found" });
    }

    if (error.message === "INSUFFICIENT_INVENTORY") {
      return res.status(409).json({ error: "Not enough ingredients to complete sale", shortages: error.shortages });
    }

    return res.status(500).json({ error: "Failed to process sale", detail: error.message });
  }
});

module.exports = router;
