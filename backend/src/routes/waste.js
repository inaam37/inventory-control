const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

const ALLOWED_REASONS = new Set(["SPOILED", "DAMAGED", "OVERSTOCK", "THEFT"]);

const normalizeReason = (reason) => {
  if (typeof reason !== "string") {
    return null;
  }

  const normalized = reason.trim().toUpperCase();
  return ALLOWED_REASONS.has(normalized) ? normalized : null;
};

router.post("/", async (req, res) => {
  const { ingredient_id, quantity_wasted, reason, date, cost } = req.body;

  if (!ingredient_id || Number(quantity_wasted) <= 0 || Number(cost) < 0) {
    return res.status(400).json({
      error: "ValidationError",
      message: "ingredient_id, positive quantity_wasted, and non-negative cost are required."
    });
  }

  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) {
    return res.status(400).json({
      error: "ValidationError",
      message: "reason must be one of spoiled, damaged, overstock, theft."
    });
  }

  const eventDate = date ? new Date(date) : new Date();
  if (Number.isNaN(eventDate.getTime())) {
    return res.status(400).json({
      error: "ValidationError",
      message: "date must be a valid date string."
    });
  }

  try {
    const ingredient = await prisma.item.findUnique({
      where: { id: ingredient_id },
      select: { id: true }
    });

    if (!ingredient) {
      return res.status(404).json({
        error: "NotFound",
        message: `Ingredient ${ingredient_id} does not exist.`
      });
    }

    const wasteLog = await prisma.wasteLog.create({
      data: {
        ingredientId: ingredient_id,
        quantityWasted: Number(quantity_wasted),
        reason: normalizedReason,
        date: eventDate,
        cost: Number(cost)
      },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            category: true,
            unit: true
          }
        }
      }
    });

    return res.status(201).json({ waste: wasteLog });
  } catch (error) {
    console.error("Failed to create waste log", error);
    return res.status(500).json({
      error: "InternalError",
      message: "Failed to log waste event."
    });
  }
});

router.get("/report", async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate || endDate) {
    where.date = {};

    if (startDate) {
      const parsedStart = new Date(startDate);
      if (Number.isNaN(parsedStart.getTime())) {
        return res.status(400).json({
          error: "ValidationError",
          message: "startDate must be a valid date string."
        });
      }
      where.date.gte = parsedStart;
    }

    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        return res.status(400).json({
          error: "ValidationError",
          message: "endDate must be a valid date string."
        });
      }
      where.date.lte = parsedEnd;
    }
  }

  try {
    const [wasteLogs, wasteCostByReason] = await Promise.all([
      prisma.wasteLog.findMany({
        where,
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              category: true,
              unit: true
            }
          }
        },
        orderBy: { date: "desc" }
      }),
      prisma.wasteLog.groupBy({
        by: ["reason"],
        where,
        _sum: {
          cost: true,
          quantityWasted: true
        },
        _count: {
          _all: true
        }
      })
    ]);

    const totalWasteCost = wasteLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalWasteQuantity = wasteLogs.reduce((sum, log) => sum + log.quantityWasted, 0);

    const ingredientStatsMap = new Map();
    const categoryStatsMap = new Map();

    for (const log of wasteLogs) {
      const ingredientKey = log.ingredient.id;
      const ingredientStats = ingredientStatsMap.get(ingredientKey) || {
        ingredient_id: log.ingredient.id,
        ingredient_name: log.ingredient.name,
        category: log.ingredient.category,
        unit: log.ingredient.unit,
        total_quantity_wasted: 0,
        total_cost: 0,
        events: 0
      };
      ingredientStats.total_quantity_wasted += log.quantityWasted;
      ingredientStats.total_cost += log.cost;
      ingredientStats.events += 1;
      ingredientStatsMap.set(ingredientKey, ingredientStats);

      const categoryKey = log.ingredient.category || "Uncategorized";
      const categoryStats = categoryStatsMap.get(categoryKey) || {
        category: categoryKey,
        total_quantity_wasted: 0,
        total_cost: 0,
        events: 0
      };
      categoryStats.total_quantity_wasted += log.quantityWasted;
      categoryStats.total_cost += log.cost;
      categoryStats.events += 1;
      categoryStatsMap.set(categoryKey, categoryStats);
    }

    const ingredientBreakdown = Array.from(ingredientStatsMap.values())
      .map((row) => ({
        ...row,
        waste_percentage: totalWasteQuantity === 0 ? 0 : Number(((row.total_quantity_wasted / totalWasteQuantity) * 100).toFixed(2)),
        cost_percentage: totalWasteCost === 0 ? 0 : Number(((row.total_cost / totalWasteCost) * 100).toFixed(2))
      }))
      .sort((a, b) => b.total_cost - a.total_cost);

    const categoryBreakdown = Array.from(categoryStatsMap.values())
      .map((row) => ({
        ...row,
        waste_percentage: totalWasteQuantity === 0 ? 0 : Number(((row.total_quantity_wasted / totalWasteQuantity) * 100).toFixed(2)),
        cost_percentage: totalWasteCost === 0 ? 0 : Number(((row.total_cost / totalWasteCost) * 100).toFixed(2))
      }))
      .sort((a, b) => b.total_cost - a.total_cost);

    const highWasteItems = ingredientBreakdown
      .filter((item) => item.cost_percentage >= 15 || item.waste_percentage >= 15)
      .slice(0, 10);

    return res.json({
      summary: {
        total_events: wasteLogs.length,
        total_waste_quantity: Number(totalWasteQuantity.toFixed(2)),
        total_waste_cost: Number(totalWasteCost.toFixed(2))
      },
      trend: wasteLogs.map((log) => ({
        id: log.id,
        ingredient_id: log.ingredientId,
        ingredient_name: log.ingredient.name,
        category: log.ingredient.category,
        quantity_wasted: log.quantityWasted,
        cost: log.cost,
        reason: log.reason,
        date: log.date
      })),
      by_reason: wasteCostByReason.map((entry) => ({
        reason: entry.reason,
        events: entry._count._all,
        quantity_wasted: Number((entry._sum.quantityWasted || 0).toFixed(2)),
        cost: Number((entry._sum.cost || 0).toFixed(2))
      })),
      by_ingredient: ingredientBreakdown,
      by_category: categoryBreakdown,
      high_waste_items: highWasteItems
    });
  } catch (error) {
    console.error("Failed to build waste report", error);
    return res.status(500).json({
      error: "InternalError",
      message: "Failed to load waste report."
    });
  }
});

module.exports = router;
