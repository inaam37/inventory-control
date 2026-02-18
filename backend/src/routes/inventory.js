const express = require("express");

const {
  addStockIn,
  addStockOut,
  getTransactionHistory,
  getCogsSummary
} = require("../data/inventoryStore");

const router = express.Router();

router.post("/stock-in", (req, res) => {
  const result = addStockIn(req.body);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json(result);
});

router.post("/stock-out", (req, res) => {
  const result = addStockOut(req.body);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json(result);
});

router.get("/transactions", (req, res) => {
  res.json({ transactions: getTransactionHistory() });
});

router.get("/cogs", (req, res) => {
  res.json(getCogsSummary());
});

module.exports = router;
