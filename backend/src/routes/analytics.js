const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function parseDateRange(query) {
  const now = new Date();
  const period = query.period || "month";

  const endDate = query.endDate ? new Date(query.endDate) : now;
  if (Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid endDate. Use ISO format YYYY-MM-DD.");
  }

  let startDate;
  if (query.startDate) {
    startDate = new Date(query.startDate);
  } else {
    const spanByPeriod = { day: 1, week: 7, month: 30, quarter: 90, year: 365 };
    const span = spanByPeriod[period] || 30;
    startDate = new Date(endDate.getTime() - span * MS_IN_DAY);
  }

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Invalid startDate. Use ISO format YYYY-MM-DD.");
  }

  if (startDate > endDate) {
    throw new Error("startDate cannot be later than endDate.");
  }

  return { period, startDate, endDate };
}

function getBucketKey(date, period) {
  const d = new Date(date);
  if (period === "day") {
    return d.toISOString().slice(0, 10);
  }
  if (period === "week") {
    const start = new Date(d);
    const day = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - day);
    return start.toISOString().slice(0, 10);
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function sumBy(array, mapper) {
  return array.reduce((acc, row) => acc + mapper(row), 0);
}

function ensurePrisma() {
  if (!prisma) {
    const error = new Error("Prisma client is not available. Run npm install and prisma generate.");
    error.statusCode = 503;
    throw error;
  }
}

router.get("/cogs", async (req, res) => {
  try {
    ensurePrisma();
    const { period, startDate, endDate } = parseDateRange(req.query);

    const salesIngredients = await prisma.salesIngredient.findMany({
      where: {
        salesLog: {
          soldDate: {
            gte: startDate,
            lte: endDate
          }
        },
        item: req.query.organizationId
          ? { organizationId: req.query.organizationId }
          : undefined
      },
      select: {
        quantity: true,
        item: { select: { id: true, name: true, costPerUnit: true } },
        salesLog: { select: { soldDate: true } }
      }
    });

    const totals = new Map();
    for (const row of salesIngredients) {
      const key = getBucketKey(row.salesLog.soldDate, period);
      const cogs = row.quantity * row.item.costPerUnit;
      totals.set(key, (totals.get(key) || 0) + cogs);
    }

    const series = [...totals.entries()]
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([bucket, cogs]) => ({ bucket, cogs: Number(cogs.toFixed(2)) }));

    const totalCogs = sumBy(series, (row) => row.cogs);

    res.json({
      period,
      startDate,
      endDate,
      totalCogs: Number(totalCogs.toFixed(2)),
      series
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.get("/inventory-value", async (req, res) => {
  try {
    ensurePrisma();
    const asOf = req.query.asOf ? new Date(req.query.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new Error("Invalid asOf date. Use ISO format YYYY-MM-DD.");
    }

    const items = await prisma.item.findMany({
      where: req.query.organizationId ? { organizationId: req.query.organizationId } : undefined,
      select: {
        id: true,
        name: true,
        unit: true,
        onHand: true,
        costPerUnit: true,
        priceHistory: {
          where: { effectiveDate: { lte: asOf } },
          orderBy: { effectiveDate: "desc" },
          take: 1,
          select: { amount: true }
        }
      }
    });

    const breakdown = items.map((item) => {
      const unitCost = item.priceHistory[0]?.amount ?? item.costPerUnit;
      const inventoryValue = item.onHand * unitCost;
      return {
        itemId: item.id,
        itemName: item.name,
        onHand: item.onHand,
        unit: item.unit,
        unitCost: Number(unitCost.toFixed(2)),
        inventoryValue: Number(inventoryValue.toFixed(2))
      };
    });

    const totalInventoryValue = sumBy(breakdown, (row) => row.inventoryValue);

    res.json({
      asOf,
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      itemCount: breakdown.length,
      breakdown
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.get("/ingredient-costs", async (req, res) => {
  try {
    ensurePrisma();
    const { period, startDate, endDate } = parseDateRange(req.query);

    const history = await prisma.priceHistory.findMany({
      where: {
        effectiveDate: { gte: startDate, lte: endDate },
        item: req.query.organizationId
          ? { organizationId: req.query.organizationId }
          : undefined
      },
      orderBy: [{ itemId: "asc" }, { effectiveDate: "asc" }],
      select: {
        amount: true,
        effectiveDate: true,
        item: { select: { id: true, name: true, unit: true, costPerUnit: true } }
      }
    });

    const grouped = new Map();
    for (const row of history) {
      const entry = grouped.get(row.item.id) || {
        itemId: row.item.id,
        itemName: row.item.name,
        unit: row.item.unit,
        currentCost: Number(row.item.costPerUnit.toFixed(2)),
        averageCost: 0,
        minCost: Number.POSITIVE_INFINITY,
        maxCost: Number.NEGATIVE_INFINITY,
        trend: []
      };
      entry.minCost = Math.min(entry.minCost, row.amount);
      entry.maxCost = Math.max(entry.maxCost, row.amount);
      entry.trend.push({
        bucket: getBucketKey(row.effectiveDate, period),
        amount: row.amount
      });
      grouped.set(row.item.id, entry);
    }

    const ingredientCosts = [...grouped.values()].map((entry) => {
      const averageCost = entry.trend.length
        ? sumBy(entry.trend, (point) => point.amount) / entry.trend.length
        : entry.currentCost;

      const mergedBuckets = entry.trend.reduce((acc, point) => {
        acc[point.bucket] = acc[point.bucket] || { sum: 0, count: 0 };
        acc[point.bucket].sum += point.amount;
        acc[point.bucket].count += 1;
        return acc;
      }, {});

      return {
        itemId: entry.itemId,
        itemName: entry.itemName,
        unit: entry.unit,
        currentCost: entry.currentCost,
        averageCost: Number(averageCost.toFixed(2)),
        minCost: Number((Number.isFinite(entry.minCost) ? entry.minCost : entry.currentCost).toFixed(2)),
        maxCost: Number((Number.isFinite(entry.maxCost) ? entry.maxCost : entry.currentCost).toFixed(2)),
        trend: Object.entries(mergedBuckets)
          .sort(([a], [b]) => (a > b ? 1 : -1))
          .map(([bucket, value]) => ({
            bucket,
            amount: Number((value.sum / value.count).toFixed(2))
          }))
      };
    });

    res.json({
      period,
      startDate,
      endDate,
      ingredientCount: ingredientCosts.length,
      ingredientCosts
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.get("/waste-cost", async (req, res) => {
  try {
    ensurePrisma();
    const { period, startDate, endDate } = parseDateRange(req.query);

    const wasteLogs = await prisma.usageLog.findMany({
      where: {
        usedDate: { gte: startDate, lte: endDate },
        wasteQty: { gt: 0 },
        item: req.query.organizationId
          ? { organizationId: req.query.organizationId }
          : undefined
      },
      select: {
        wasteQty: true,
        wasteReason: true,
        usedDate: true,
        item: { select: { id: true, name: true, costPerUnit: true } }
      }
    });

    const periodTotals = new Map();
    const byItem = new Map();
    for (const row of wasteLogs) {
      const cost = row.wasteQty * row.item.costPerUnit;
      const bucket = getBucketKey(row.usedDate, period);
      periodTotals.set(bucket, (periodTotals.get(bucket) || 0) + cost);

      const existing = byItem.get(row.item.id) || {
        itemId: row.item.id,
        itemName: row.item.name,
        wasteQty: 0,
        wasteCost: 0
      };
      existing.wasteQty += row.wasteQty;
      existing.wasteCost += cost;
      byItem.set(row.item.id, existing);
    }

    const totalWasteCost = sumBy([...byItem.values()], (row) => row.wasteCost);

    res.json({
      period,
      startDate,
      endDate,
      totalWasteCost: Number(totalWasteCost.toFixed(2)),
      series: [...periodTotals.entries()]
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([bucket, wasteCost]) => ({ bucket, wasteCost: Number(wasteCost.toFixed(2)) })),
      byIngredient: [...byItem.values()]
        .sort((a, b) => b.wasteCost - a.wasteCost)
        .map((row) => ({
          ...row,
          wasteQty: Number(row.wasteQty.toFixed(2)),
          wasteCost: Number(row.wasteCost.toFixed(2))
        }))
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.get("/profit-margin", async (req, res) => {
  try {
    ensurePrisma();
    const { startDate, endDate } = parseDateRange(req.query);

    const recipes = await prisma.recipe.findMany({
      where: req.query.organizationId ? { organizationId: req.query.organizationId } : undefined,
      select: {
        id: true,
        name: true,
        yield: true,
        menuPrice: true,
        ingredients: {
          select: {
            quantity: true,
            item: { select: { costPerUnit: true } }
          }
        },
        sales: {
          where: {
            soldDate: { gte: startDate, lte: endDate }
          },
          select: {
            servings: true
          }
        }
      }
    });

    const report = recipes.map((recipe) => {
      const totalRecipeCost = sumBy(
        recipe.ingredients,
        (line) => line.quantity * line.item.costPerUnit
      );
      const yieldCount = recipe.yield > 0 ? recipe.yield : 1;
      const costPerDish = totalRecipeCost / yieldCount;
      const grossProfitPerDish = recipe.menuPrice - costPerDish;
      const marginPercent = recipe.menuPrice > 0
        ? (grossProfitPerDish / recipe.menuPrice) * 100
        : 0;
      const servingsSold = sumBy(recipe.sales, (sale) => sale.servings);

      return {
        recipeId: recipe.id,
        recipeName: recipe.name,
        menuPrice: Number(recipe.menuPrice.toFixed(2)),
        costPerDish: Number(costPerDish.toFixed(2)),
        grossProfitPerDish: Number(grossProfitPerDish.toFixed(2)),
        marginPercent: Number(marginPercent.toFixed(2)),
        servingsSold,
        realizedRevenue: Number((servingsSold * recipe.menuPrice).toFixed(2)),
        realizedProfit: Number((servingsSold * grossProfitPerDish).toFixed(2))
      };
    });

    res.json({
      startDate,
      endDate,
      recipes: report.sort((a, b) => b.marginPercent - a.marginPercent)
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.get("/inventory-turnover", async (req, res) => {
  try {
    ensurePrisma();
    const { startDate, endDate } = parseDateRange(req.query);

    const [salesIngredients, wasteLogs, items] = await Promise.all([
      prisma.salesIngredient.findMany({
        where: {
          salesLog: {
            soldDate: { gte: startDate, lte: endDate }
          },
          item: req.query.organizationId
            ? { organizationId: req.query.organizationId }
            : undefined
        },
        select: {
          itemId: true,
          quantity: true,
          item: { select: { costPerUnit: true } }
        }
      }),
      prisma.usageLog.findMany({
        where: {
          usedDate: { gte: startDate, lte: endDate },
          item: req.query.organizationId
            ? { organizationId: req.query.organizationId }
            : undefined
        },
        select: { itemId: true, usedQty: true, wasteQty: true }
      }),
      prisma.item.findMany({
        where: req.query.organizationId ? { organizationId: req.query.organizationId } : undefined,
        select: { id: true, name: true, onHand: true, costPerUnit: true }
      })
    ]);

    const consumptionByItem = wasteLogs.reduce((acc, row) => {
      acc[row.itemId] = (acc[row.itemId] || 0) + row.usedQty + row.wasteQty;
      return acc;
    }, {});

    const cogs = sumBy(salesIngredients, (row) => row.quantity * row.item.costPerUnit);

    const openingValue = sumBy(items, (item) => {
      const estimatedOpeningQty = item.onHand + (consumptionByItem[item.id] || 0);
      return estimatedOpeningQty * item.costPerUnit;
    });
    const closingValue = sumBy(items, (item) => item.onHand * item.costPerUnit);
    const averageInventoryValue = (openingValue + closingValue) / 2;

    const turnoverRatio = averageInventoryValue > 0 ? cogs / averageInventoryValue : 0;

    res.json({
      startDate,
      endDate,
      cogs: Number(cogs.toFixed(2)),
      openingInventoryValue: Number(openingValue.toFixed(2)),
      closingInventoryValue: Number(closingValue.toFixed(2)),
      averageInventoryValue: Number(averageInventoryValue.toFixed(2)),
      inventoryTurnoverRatio: Number(turnoverRatio.toFixed(4)),
      methodology:
        "Opening inventory is estimated as current on-hand plus logged usage+waste during the selected period."
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

module.exports = router;
