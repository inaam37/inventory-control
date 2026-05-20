const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { state } = require("../data/store");

const router = express.Router();

/**
 * Parse Excel/CSV content and categorize using ChatGPT
 */
async function categorizeWithAI(items) {
  try {
    const itemDescriptions = items.map((item) => `- ${item.name} (${item.quantity} ${item.unit}) - $${item.price}`).join("\n");

    const prompt = `You are a restaurant inventory management expert. Analyze these ingredients and categorize each one:

Ingredients:
${itemDescriptions}

For each ingredient, respond ONLY with JSON array, no other text:
[
  {
    "name": "ingredient name",
    "category": "ingredient" or "recipe",
    "type": "Produce", "Meat", "Seafood", "Dairy", "Dry Storage", "Frozen", "Beverages", "Bakery", "Spices/Condiments", or "Other",
    "reason": "brief reason"
  }
]

Rules:
- If it sounds like a finished dish or has multiple ingredients (e.g., "Tomato Sauce", "Pasta Mix"), mark as "recipe"
- If it's a raw ingredient (e.g., "Tomato Can", "Olive Oil"), mark as "ingredient"
- Assign appropriate type/category`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a JSON API. Respond ONLY with valid JSON, no markdown formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const content = response.data.choices[0].message.content;
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error calling ChatGPT:", error);
    // Fallback: simple heuristic categorization
    return items.map((item) => ({
      ...item,
      category: item.name.toLowerCase().includes("sauce") || item.name.toLowerCase().includes("mix") ? "recipe" : "ingredient",
      type: "Other"
    }));
  }
}

/**
 * POST /excel
 * Upload and process Excel file
 * Expects FormData with file field
 */
router.post("/excel", async (req, res) => {
  try {
    // Only Chef can upload
    if (req.user?.role !== "CHEF") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only Chef can import data"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Excel file is required"
      });
    }

    // Parse Excel file (you'll need to install xlsx package)
    const XLSX = require("xlsx");
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Normalize data
    const items = data.map((row) => ({
      name: row["Item Name"] || row["Name"] || row["Ingredient"],
      quantity: parseFloat(row["Quantity"] || row["Qty"] || 0),
      unit: row["Unit"] || "each",
      price: parseFloat(row["Price"] || row["Cost"] || 0)
    })).filter((item) => item.name);

    if (items.length === 0) {
      return res.status(400).json({
        error: "No valid items found",
        message: "Excel file must contain items with Name, Quantity, Unit, and Price columns"
      });
    }

    // Categorize with AI
    const categorized = await categorizeWithAI(items);

    // Separate into ingredients and recipes
    const ingredients = [];
    const recipes = [];

    for (const item of categorized) {
      if (item.category === "ingredient") {
        ingredients.push({
          id: crypto.randomUUID(),
          itemName: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          type: item.type,
          locationId: "loc-main",
          createdAt: new Date().toISOString()
        });
      } else if (item.category === "recipe") {
        recipes.push({
          id: crypto.randomUUID(),
          name: item.name,
          yield: 1,
          menuPrice: item.price,
          ingredients: [],
          notes: `Imported from Excel: ${item.reason}`,
          createdBy: req.user.id,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Add to state
    if (!state.inventory) state.inventory = [];
    if (!state.recipes) state.recipes = [];

    state.inventory.push(...ingredients);
    state.recipes.push(...recipes);

    res.status(201).json({
      message: "Excel imported successfully",
      summary: {
        ingredientsImported: ingredients.length,
        recipesImported: recipes.length,
        totalItems: categorized.length
      },
      ingredients,
      recipes,
      categorization: categorized
    });
  } catch (error) {
    console.error("Error importing Excel:", error);
    res.status(400).json({
      error: "Import failed",
      message: error.message
    });
  }
});

module.exports = router;