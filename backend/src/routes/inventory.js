const express = require("express");

const prisma = require("../lib/prisma");
const { createExpiringSoonFilter, startOfToday } = require("../lib/expiry");

const router = express.Router();

router.get("/expiring-soon", async (req, res) => {
  const days = Number.parseInt(req.query.days, 10) || 3;
  const organizationId = req.query.organizationId;

  if (!organizationId) {
    return res.status(400).json({
      error: "organizationId is required"
    });
  }

  try {
    const items = await prisma.item.findMany({
      where: {
        organizationId,
        inventoryBatches: {
          some: {
            expiryDate: createExpiringSoonFilter(days),
            remainingQty: { gt: 0 }
          }
        }
      },
      include: {
        inventoryBatches: {
          where: {
            expiryDate: createExpiringSoonFilter(days),
            remainingQty: { gt: 0 }
          },
          orderBy: {
            expiryDate: "asc"
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    const payload = items.map((item) => ({
      itemId: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      onHand: item.onHand,
      expiringBatches: item.inventoryBatches.map((batch) => ({
        batchId: batch.id,
        expiryDate: batch.expiryDate,
        remainingQty: batch.remainingQty,
        receivedAt: batch.receivedAt
      }))
    }));

    return res.json({
      days,
      count: payload.length,
      items: payload
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch expiring inventory", details: error.message });
  }
});

router.post("/:itemId/batches", async (req, res) => {
  const { itemId } = req.params;
  const { receivedQty, expiryDate, unitCost } = req.body;

  if (!receivedQty || !expiryDate) {
    return res.status(400).json({ error: "receivedQty and expiryDate are required" });
  }

  try {
    const batch = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.inventoryBatch.create({
        data: {
          itemId,
          receivedQty,
          remainingQty: receivedQty,
          unitCost,
          expiryDate: new Date(expiryDate)
        }
      });

      await tx.item.update({
        where: { id: itemId },
        data: { onHand: { increment: receivedQty } }
      });

      return createdBatch;
    });

    return res.status(201).json(batch);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create inventory batch", details: error.message });
  }
});

router.post("/:itemId/use", async (req, res) => {
  const { itemId } = req.params;
  const { quantity, usedDate, wasteQty = 0, wasteReason } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be greater than 0" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: itemId } });

      if (!item) {
        throw new Error("Item not found");
      }

      let remainingToConsume = quantity;

      const candidateBatches = await tx.inventoryBatch.findMany({
        where: {
          itemId,
          remainingQty: { gt: 0 }
        },
        orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }]
      });

      for (const batch of candidateBatches) {
        if (remainingToConsume <= 0) {
          break;
        }

        const consumedQty = Math.min(batch.remainingQty, remainingToConsume);
        remainingToConsume -= consumedQty;

        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { remainingQty: { decrement: consumedQty } }
        });
      }

      if (remainingToConsume > 0) {
        throw new Error("Insufficient inventory in batches for FIFO consumption");
      }

      const totalMovement = quantity + wasteQty;

      const usageLog = await tx.usageLog.create({
        data: {
          itemId,
          usedQty: quantity,
          wasteQty,
          wasteReason,
          isExpiredWaste: wasteReason ? wasteReason.toLowerCase().includes("expired") : false,
          usedDate: usedDate ? new Date(usedDate) : new Date()
        }
      });

      await tx.item.update({
        where: { id: itemId },
        data: {
          onHand: { decrement: totalMovement }
        }
      });

      return usageLog;
    });

    return res.status(201).json({
      message: "FIFO usage applied",
      usageLog: result
    });
  } catch (error) {
    const statusCode = error.message.includes("Insufficient inventory") || error.message.includes("not found") ? 400 : 500;

    return res.status(statusCode).json({
      error: "Failed to apply FIFO usage",
      details: error.message
    });
  }
});

router.get("/waste-report", async (req, res) => {
  const organizationId = req.query.organizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  try {
    const expiredWasteEntries = await prisma.usageLog.findMany({
      where: {
        isExpiredWaste: true,
        item: {
          organizationId
        }
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            category: true,
            unit: true,
            costPerUnit: true
          }
        }
      },
      orderBy: {
        usedDate: "desc"
      }
    });

    const totalWasteQty = expiredWasteEntries.reduce((sum, entry) => sum + entry.wasteQty, 0);
    const estimatedWasteCost = expiredWasteEntries.reduce(
      (sum, entry) => sum + (entry.wasteQty * (entry.item?.costPerUnit || 0)),
      0
    );

    return res.json({
      count: expiredWasteEntries.length,
      totalWasteQty,
      estimatedWasteCost,
      entries: expiredWasteEntries
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate waste report", details: error.message });
  }
});

router.post("/jobs/expire-check", async (req, res) => {
  const organizationId = req.body.organizationId;
  const days = Number.parseInt(req.body.days, 10) || 3;

  if (!organizationId) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  try {
    const expiringItems = await prisma.item.findMany({
      where: {
        organizationId,
        inventoryBatches: {
          some: {
            expiryDate: createExpiringSoonFilter(days),
            remainingQty: { gt: 0 }
          }
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    const notifications = await Promise.all(
      expiringItems.map((item) => prisma.notification.create({
        data: {
          organizationId,
          type: "EXPIRY_ALERT",
          message: `Item ${item.name} is expiring within ${days} day(s).`
        }
      }))
    );

    return res.json({
      message: "Expiry alert job run complete",
      alertsCreated: notifications.length
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to run expiry alert job", details: error.message });
  }
});

router.get("/fifo/next/:itemId", async (req, res) => {
  const { itemId } = req.params;

  try {
    const nextBatch = await prisma.inventoryBatch.findFirst({
      where: {
        itemId,
        remainingQty: { gt: 0 },
        expiryDate: {
          gte: startOfToday()
        }
      },
      orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }]
    });

    return res.json({ itemId, nextBatch });
  } catch (error) {
    return res.status(500).json({ error: "Failed to resolve FIFO next batch", details: error.message });
  }
});

module.exports = router;
