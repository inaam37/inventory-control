const express = require("express");

const router = express.Router();

const INVENTORY_ITEMS = [
  {
    id: "itm-001",
    name: "Roma Tomatoes",
    category: "Produce",
    quantity: 18,
    unit: "kg",
    unitCost: 3.2,
    reorderLevel: 25,
    expiryDate: "2026-02-20"
  },
  {
    id: "itm-002",
    name: "Chicken Breast",
    category: "Meat",
    quantity: 42,
    unit: "kg",
    unitCost: 8.75,
    reorderLevel: 20,
    expiryDate: "2026-02-25"
  },
  {
    id: "itm-003",
    name: "Mozzarella",
    category: "Dairy",
    quantity: 16,
    unit: "kg",
    unitCost: 6.3,
    reorderLevel: 18,
    expiryDate: "2026-02-22"
  },
  {
    id: "itm-004",
    name: "Olive Oil",
    category: "Pantry",
    quantity: 24,
    unit: "L",
    unitCost: 7.9,
    reorderLevel: 10,
    expiryDate: "2026-05-18"
  },
  {
    id: "itm-005",
    name: "Spinach",
    category: "Produce",
    quantity: 7,
    unit: "kg",
    unitCost: 4.4,
    reorderLevel: 12,
    expiryDate: "2026-02-19"
  },
  {
    id: "itm-006",
    name: "Salmon Fillet",
    category: "Seafood",
    quantity: 9,
    unit: "kg",
    unitCost: 12.5,
    reorderLevel: 8,
    expiryDate: "2026-02-21"
  },
  {
    id: "itm-007",
    name: "Basmati Rice",
    category: "Dry Goods",
    quantity: 65,
    unit: "kg",
    unitCost: 2.1,
    reorderLevel: 30,
    expiryDate: "2026-10-01"
  },
  {
    id: "itm-008",
    name: "Yogurt",
    category: "Dairy",
    quantity: 11,
    unit: "kg",
    unitCost: 3.9,
    reorderLevel: 15,
    expiryDate: "2026-02-24"
  }
];

const TRANSACTIONS = [
  { id: "txn-101", itemId: "itm-001", type: "OUT", quantity: 6, timestamp: "2026-02-12T10:05:00Z", reason: "Lunch service" },
  { id: "txn-102", itemId: "itm-002", type: "IN", quantity: 12, timestamp: "2026-02-12T13:20:00Z", reason: "Supplier delivery" },
  { id: "txn-103", itemId: "itm-005", type: "OUT", quantity: 4, timestamp: "2026-02-13T08:12:00Z", reason: "Salad prep" },
  { id: "txn-104", itemId: "itm-003", type: "OUT", quantity: 5, timestamp: "2026-02-13T17:48:00Z", reason: "Dinner service" },
  { id: "txn-105", itemId: "itm-007", type: "IN", quantity: 30, timestamp: "2026-02-14T09:30:00Z", reason: "Restock" },
  { id: "txn-106", itemId: "itm-006", type: "OUT", quantity: 3, timestamp: "2026-02-14T19:05:00Z", reason: "Special menu" },
  { id: "txn-107", itemId: "itm-008", type: "OUT", quantity: 2, timestamp: "2026-02-15T11:02:00Z", reason: "Breakfast service" },
  { id: "txn-108", itemId: "itm-004", type: "IN", quantity: 8, timestamp: "2026-02-16T10:42:00Z", reason: "Top-up order" },
  { id: "txn-109", itemId: "itm-001", type: "OUT", quantity: 7, timestamp: "2026-02-16T18:55:00Z", reason: "Catering event" },
  { id: "txn-110", itemId: "itm-005", type: "OUT", quantity: 3, timestamp: "2026-02-17T14:16:00Z", reason: "Prep loss" }
];

const WASTE_LOG = [
  { date: "2026-02-11", amount: 28.5 },
  { date: "2026-02-12", amount: 14.2 },
  { date: "2026-02-13", amount: 19.1 },
  { date: "2026-02-14", amount: 12.8 },
  { date: "2026-02-15", amount: 23.4 },
  { date: "2026-02-16", amount: 16.9 },
  { date: "2026-02-17", amount: 9.7 }
];

const DEFAULT_END = new Date("2026-02-17T23:59:59Z");

function parseDate(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

router.get("/", (req, res) => {
  const endDate = parseDate(req.query.endDate, DEFAULT_END);
  const startDate = parseDate(req.query.startDate, new Date(endDate.getTime() - 13 * 24 * 60 * 60 * 1000));

  const lowStockAlerts = INVENTORY_ITEMS.filter((item) => item.quantity <= item.reorderLevel);
  const expiringSoonItems = INVENTORY_ITEMS.filter((item) => {
    const expiry = new Date(item.expiryDate);
    const daysToExpiry = Math.ceil((expiry.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000));
    return daysToExpiry >= 0 && daysToExpiry <= 7;
  });

  const transactionWindow = TRANSACTIONS.filter((txn) => {
    const time = new Date(txn.timestamp);
    return time >= startDate && time <= endDate;
  });

  const recentTransactions = transactionWindow
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8)
    .map((txn) => {
      const item = INVENTORY_ITEMS.find((entry) => entry.id === txn.itemId);
      return {
        ...txn,
        itemName: item ? item.name : "Unknown item"
      };
    });

  const totalInventoryValue = INVENTORY_ITEMS.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const categoryMap = INVENTORY_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = 0;
    }

    acc[item.category] += item.quantity * item.unitCost;
    return acc;
  }, {});

  const trendMap = transactionWindow.reduce((acc, txn) => {
    const day = txn.timestamp.slice(0, 10);
    if (!acc[day]) {
      acc[day] = { in: 0, out: 0 };
    }

    if (txn.type === "IN") {
      acc[day].in += txn.quantity;
    } else {
      acc[day].out += txn.quantity;
    }

    return acc;
  }, {});

  const trendLabels = Object.keys(trendMap).sort();
  const stockInTrend = trendLabels.map((day) => trendMap[day].in);
  const stockOutTrend = trendLabels.map((day) => trendMap[day].out);

  const wasteThisWeek = WASTE_LOG.filter((entry) => {
    const day = new Date(`${entry.date}T00:00:00Z`);
    return day >= new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000) && day <= endDate;
  }).reduce((sum, entry) => sum + entry.amount, 0);

  res.json({
    meta: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      currency: "USD"
    },
    metrics: {
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      lowStockCount: lowStockAlerts.length,
      expiringSoonCount: expiringSoonItems.length,
      totalItems: INVENTORY_ITEMS.length,
      totalCategories: Object.keys(categoryMap).length,
      wasteThisWeek: Number(wasteThisWeek.toFixed(2))
    },
    alerts: {
      lowStock: lowStockAlerts,
      expiringSoon: expiringSoonItems
    },
    recentTransactions,
    charts: {
      inventoryByCategory: {
        labels: Object.keys(categoryMap),
        values: Object.values(categoryMap).map((value) => Number(value.toFixed(2)))
      },
      stockFlow: {
        labels: trendLabels,
        stockIn: stockInTrend,
        stockOut: stockOutTrend
      }
    }
  });
});

module.exports = router;
