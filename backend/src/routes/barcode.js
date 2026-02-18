const express = require("express");

const itemStore = require("../lib/item-store");
const asyncHandler = require("../lib/async-handler");

const router = express.Router();

function checksumForEan13(twelveDigits) {
  const values = twelveDigits.split("").map(Number);
  const sum = values.reduce((acc, current, index) => {
    const multiplier = index % 2 === 0 ? 1 : 3;
    return acc + current * multiplier;
  }, 0);

  return (10 - (sum % 10)) % 10;
}

function generateEan13Number() {
  const payload = String(Math.floor(Math.random() * 10 ** 12)).padStart(12, "0");
  return `${payload}${checksumForEan13(payload)}`;
}

async function createUniqueBarcode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const barcode = generateEan13Number();
    const exists = await itemStore.findByBarcode(barcode);

    if (!exists) {
      return barcode;
    }
  }

  throw new Error("Could not generate a unique barcode after multiple attempts");
}

function barcodeSvgBase64(barcode) {
  const bits = barcode
    .split("")
    .map((digit) => Number(digit).toString(2).padStart(4, "0"))
    .join("");

  const barWidth = 2;
  const height = 90;
  const width = bits.length * barWidth + 20;

  const bars = bits
    .split("")
    .map((bit, index) => {
      if (bit === "0") {
        return "";
      }

      const x = 10 + index * barWidth;
      return `<rect x=\"${x}\" y=\"10\" width=\"${barWidth}\" height=\"${height}\" fill=\"#000\" />`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="130" viewBox="0 0 ${width} 130">
  <rect width="100%" height="100%" fill="#fff"/>
  ${bars}
  <text x="50%" y="118" text-anchor="middle" font-family="monospace" font-size="16">${barcode}</text>
</svg>`;

  return Buffer.from(svg, "utf8").toString("base64");
}

router.post("/generate/:ingredientId", asyncHandler(async (req, res) => {
  const ingredientId = req.params.ingredientId;

  const ingredient = await itemStore.findById(ingredientId);

  if (!ingredient) {
    return res.status(404).json({ error: "Ingredient not found" });
  }

  const barcode = ingredient.barcode || (await createUniqueBarcode());

  const updatedIngredient = ingredient.barcode
    ? ingredient
    : await itemStore.updateItem(ingredientId, { barcode });

  return res.json({
    ingredient: updatedIngredient,
    barcode,
    imageBase64: barcodeSvgBase64(barcode),
    mimeType: "image/svg+xml"
  });
}));

router.post("/scan", asyncHandler(async (req, res) => {
  const { barcode, mode = "lookup", quantity = 1 } = req.body;

  if (!barcode) {
    return res.status(400).json({ error: "barcode is required" });
  }

  const ingredient = await itemStore.findByBarcode(barcode);

  if (!ingredient) {
    return res.status(404).json({ error: "No ingredient found for barcode" });
  }

  if (mode === "lookup") {
    return res.json({ ingredient, mode });
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: "quantity must be a positive number" });
  }

  const delta = mode === "stock_out" ? -qty : qty;

  if (!["stock_in", "stock_out"].includes(mode)) {
    return res.status(400).json({ error: "mode must be lookup, stock_in, or stock_out" });
  }

  const nextOnHand = ingredient.onHand + delta;
  if (nextOnHand < 0) {
    return res.status(400).json({ error: "Insufficient stock for stock_out request" });
  }

  const updatedIngredient = await itemStore.updateItem(ingredient.id, {
    onHand: nextOnHand
  });

  return res.json({
    mode,
    quantity: qty,
    ingredient: updatedIngredient
  });
}));

router.post("/print-bulk", asyncHandler(async (req, res) => {
  const { ingredientIds = [] } = req.body;

  if (!Array.isArray(ingredientIds) || ingredientIds.length === 0) {
    return res.status(400).json({ error: "ingredientIds must be a non-empty array" });
  }

  const ingredients = await itemStore.findManyByIds(ingredientIds);

  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

  const rows = [];
  for (const ingredientId of ingredientIds) {
    const ingredient = byId.get(ingredientId);
    if (!ingredient) {
      rows.push({ ingredientId, error: "Ingredient not found" });
      continue;
    }

    const barcode = ingredient.barcode || (await createUniqueBarcode());
    const persisted = ingredient.barcode
      ? ingredient
      : await itemStore.updateItem(ingredientId, { barcode });

    rows.push({
      ingredient: persisted,
      barcode,
      imageBase64: barcodeSvgBase64(barcode),
      mimeType: "image/svg+xml"
    });
  }

  return res.json({ labels: rows });
}));

module.exports = router;
