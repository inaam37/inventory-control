const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

const DEFAULT_ORGANIZATION_ID = process.env.DEFAULT_ORGANIZATION_ID;

function requireOrganizationId(res) {
  if (!DEFAULT_ORGANIZATION_ID) {
    res.status(500).json({
      error: "DEFAULT_ORGANIZATION_ID not configured",
      message: "Set DEFAULT_ORGANIZATION_ID in your backend environment."
    });
    return null;
  }

  return DEFAULT_ORGANIZATION_ID;
}

router.get("/", async (req, res) => {
  const organizationId = requireOrganizationId(res);
  if (!organizationId) {
    return;
  }

  try {
    const inventory = await prisma.inventory.findMany({
      where: { organizationId },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
            reorderPoint: true
          }
        }
      },
      orderBy: [{ location: "asc" }, { updatedAt: "desc" }]
    });

    res.json({
      count: inventory.length,
      inventory
    });
  } catch (error) {
    console.error("Failed to fetch inventory", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

router.get("/low-stock", async (req, res) => {
  const organizationId = requireOrganizationId(res);
  if (!organizationId) {
    return;
  }

  try {
    const lowStock = await prisma.inventory.findMany({
      where: {
        organizationId,
        ingredient: {
          reorderPoint: { gt: 0 }
        }
      },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
            reorderPoint: true
          }
        }
      },
      orderBy: [{ quantity: "asc" }, { location: "asc" }]
    });

    const critical = lowStock.filter((entry) => entry.quantity < entry.ingredient.reorderPoint);

    res.json({
      count: critical.length,
      items: critical
    });
  } catch (error) {
    console.error("Failed to fetch low-stock inventory", error);
    res.status(500).json({ error: "Failed to fetch low-stock inventory" });
  }
});

module.exports = router;
