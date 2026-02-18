const express = require("express");

const prisma = require("../prisma");

const router = express.Router();

const buildVarianceReport = (countedItems) => {
  const entries = countedItems.map((entry) => ({
    itemId: entry.itemId,
    itemName: entry.item.name,
    unit: entry.item.unit,
    systemQty: entry.systemQty,
    countedQty: entry.countedQty,
    varianceQty: entry.varianceQty,
    variancePct: entry.systemQty === 0 ? null : (entry.varianceQty / entry.systemQty) * 100
  }));

  const summary = entries.reduce(
    (acc, entry) => {
      acc.totalItems += 1;
      acc.totalSystemQty += entry.systemQty;
      acc.totalCountedQty += entry.countedQty;
      acc.totalVarianceQty += entry.varianceQty;

      if (entry.varianceQty > 0) {
        acc.overages += 1;
      } else if (entry.varianceQty < 0) {
        acc.shortages += 1;
      } else {
        acc.matches += 1;
      }

      return acc;
    },
    {
      totalItems: 0,
      totalSystemQty: 0,
      totalCountedQty: 0,
      totalVarianceQty: 0,
      overages: 0,
      shortages: 0,
      matches: 0
    }
  );

  return {
    summary,
    discrepancies: entries.filter((entry) => entry.varianceQty !== 0),
    items: entries
  };
};

router.post("/", async (req, res) => {
  const { organizationId, locationId, scheduledFor, notes } = req.body;

  if (!organizationId) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  try {
    const countSession = await prisma.countSession.create({
      data: {
        organizationId,
        locationId,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        notes: notes || null
      }
    });

    return res.status(201).json(countSession);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create count session",
      details: error.message
    });
  }
});

router.post("/:id/items", async (req, res) => {
  const { id } = req.params;
  const { items, completeSession } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "items is required and must be a non-empty array"
    });
  }

  const invalidItem = items.find(
    (entry) => typeof entry.itemId !== "string" || typeof entry.countedQty !== "number"
  );
  if (invalidItem) {
    return res.status(400).json({
      error: "Each item entry must include itemId (string) and countedQty (number)"
    });
  }

  try {
    const session = await prisma.countSession.findUnique({
      where: { id }
    });

    if (!session) {
      return res.status(404).json({ error: "Count session not found" });
    }

    if (session.status === "COMPLETED") {
      return res.status(409).json({ error: "Count session already completed" });
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of items) {
        const item = await tx.item.findFirst({
          where: {
            id: entry.itemId,
            organizationId: session.organizationId
          },
          select: {
            id: true,
            onHand: true
          }
        });

        if (!item) {
          throw new Error(`Item ${entry.itemId} not found for this organization`);
        }

        const existing = await tx.countSessionItem.findUnique({
          where: {
            countSessionId_itemId: {
              countSessionId: id,
              itemId: item.id
            }
          },
          select: {
            systemQty: true
          }
        });

        const baselineSystemQty = existing ? existing.systemQty : item.onHand;
        const varianceQty = entry.countedQty - baselineSystemQty;

        await tx.countSessionItem.upsert({
          where: {
            countSessionId_itemId: {
              countSessionId: id,
              itemId: item.id
            }
          },
          update: {
            countedQty: entry.countedQty,
            varianceQty
          },
          create: {
            countSessionId: id,
            itemId: item.id,
            systemQty: baselineSystemQty,
            countedQty: entry.countedQty,
            varianceQty
          }
        });

        await tx.item.update({
          where: { id: item.id },
          data: { onHand: entry.countedQty }
        });
      }

      if (completeSession) {
        await tx.countSession.update({
          where: { id },
          data: {
            status: "COMPLETED",
            completedAt: new Date()
          }
        });
      }
    });

    const updatedSession = await prisma.countSession.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                unit: true
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    const varianceReport = buildVarianceReport(updatedSession.items);

    return res.status(200).json({
      countSession: updatedSession,
      varianceReport
    });
  } catch (error) {
    const isItemError = error.message.includes("not found for this organization");
    return res.status(isItemError ? 400 : 500).json({
      error: "Failed to log counted items",
      details: error.message
    });
  }
});

router.get("/:id/variance-report", async (req, res) => {
  const { id } = req.params;

  try {
    const countSession = await prisma.countSession.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                unit: true
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!countSession) {
      return res.status(404).json({ error: "Count session not found" });
    }

    return res.status(200).json({
      countSessionId: countSession.id,
      status: countSession.status,
      startedAt: countSession.startedAt,
      completedAt: countSession.completedAt,
      varianceReport: buildVarianceReport(countSession.items)
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to generate variance report",
      details: error.message
    });
  }
});

module.exports = router;
