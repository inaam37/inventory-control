const express = require("express");

const prisma = require("../prisma");

const router = express.Router();

const DEFAULT_APPROVAL_THRESHOLD = 1000;
const allowedStatusUpdates = new Set(["PENDING", "PARTIAL", "DELIVERED", "CANCELLED"]);

const buildExpectedDeliveryDate = (items) => {
  const leadTimes = items.map((item) => item.leadTimeDays || 0);
  const maxLeadTimeDays = Math.max(0, ...leadTimes);
  const expectedDeliveryDate = new Date();
  expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + maxLeadTimeDays);
  return expectedDeliveryDate;
};

const buildOrderItems = (items) =>
  items.map((item) => ({
    itemId: item.itemId || item.id,
    quantity: item.quantity,
    unitCost: item.unitCost ?? item.costPerUnit ?? 0
  }));

const calculateTotalCost = (items) =>
  items.reduce((sum, item) => sum + item.quantity * (item.unitCost ?? item.costPerUnit ?? 0), 0);

const toPurchaseOrderResponse = (purchaseOrder) => ({
  id: purchaseOrder.id,
  organizationId: purchaseOrder.organizationId,
  vendor: {
    id: purchaseOrder.vendor.id,
    name: purchaseOrder.vendor.name,
    email: purchaseOrder.vendor.email,
    phone: purchaseOrder.vendor.phone
  },
  status: purchaseOrder.status,
  approvalStatus: purchaseOrder.approvalStatus,
  approvedAt: purchaseOrder.approvedAt,
  totalCost: purchaseOrder.totalCost,
  approvalThreshold: purchaseOrder.approvalThreshold,
  expectedDeliveryDate: purchaseOrder.expectedDeliveryDate,
  createdAt: purchaseOrder.createdAt,
  updatedAt: purchaseOrder.updatedAt,
  items: purchaseOrder.items.map((line) => ({
    id: line.id,
    quantity: line.quantity,
    unitCost: line.unitCost,
    item: {
      id: line.item.id,
      name: line.item.name,
      sku: line.item.sku,
      unit: line.item.unit
    }
  }))
});

router.post("/", async (req, res) => {
  const {
    organizationId,
    vendorId,
    items,
    approvalThreshold = DEFAULT_APPROVAL_THRESHOLD,
    status = "PENDING"
  } = req.body;

  if (!organizationId || !vendorId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "Invalid payload",
      message: "organizationId, vendorId, and a non-empty items array are required"
    });
  }

  if (![...allowedStatusUpdates].includes(status)) {
    return res.status(400).json({
      error: "Invalid status",
      message: `status must be one of: ${[...allowedStatusUpdates].join(", ")}`
    });
  }

  const invalidItem = items.find(
    (item) => !item.itemId || typeof item.quantity !== "number" || item.quantity <= 0
  );

  if (invalidItem) {
    return res.status(400).json({
      error: "Invalid items",
      message: "Each item must include itemId and quantity > 0"
    });
  }

  try {
    const itemIds = items.map((item) => item.itemId);
    const dbItems = await prisma.item.findMany({
      where: {
        organizationId,
        vendorId,
        id: { in: itemIds }
      }
    });

    if (dbItems.length !== itemIds.length) {
      return res.status(400).json({
        error: "Item mismatch",
        message: "All items must belong to the organization and selected supplier"
      });
    }

    const itemMap = new Map(dbItems.map((item) => [item.id, item]));
    const enrichedItems = items.map((item) => ({
      ...item,
      leadTimeDays: itemMap.get(item.itemId).leadTimeDays,
      unitCost: item.unitCost ?? itemMap.get(item.itemId).costPerUnit
    }));

    const totalCost = calculateTotalCost(enrichedItems);
    const needsApproval = totalCost > approvalThreshold;

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        organizationId,
        vendorId,
        status,
        totalCost,
        approvalThreshold,
        approvalStatus: needsApproval ? "PENDING_APPROVAL" : "APPROVED",
        approvedAt: needsApproval ? null : new Date(),
        expectedDeliveryDate: buildExpectedDeliveryDate(enrichedItems),
        items: {
          create: buildOrderItems(enrichedItems)
        }
      },
      include: {
        vendor: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    return res.status(201).json({
      purchaseOrder: toPurchaseOrderResponse(purchaseOrder),
      message: needsApproval
        ? "Purchase order created and queued for approval"
        : "Purchase order created and approved"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create purchase order",
      details: error.message
    });
  }
});

router.post("/auto-generate", async (req, res) => {
  const { organizationId, approvalThreshold = DEFAULT_APPROVAL_THRESHOLD } = req.body;

  if (!organizationId) {
    return res.status(400).json({
      error: "Invalid payload",
      message: "organizationId is required"
    });
  }

  try {
    const lowStockItems = await prisma.item.findMany({
      where: {
        organizationId,
        vendorId: { not: null },
        reorderPoint: { gt: 0 }
      },
      include: {
        vendor: true
      }
    });

    const actionableItems = lowStockItems.filter((item) => item.onHand < item.reorderPoint);

    const groupedByVendor = actionableItems.reduce((acc, item) => {
      if (!acc[item.vendorId]) {
        acc[item.vendorId] = [];
      }
      acc[item.vendorId].push(item);
      return acc;
    }, {});

    const createdOrders = [];

    for (const [vendorId, vendorItems] of Object.entries(groupedByVendor)) {
      const orderItems = vendorItems.map((item) => ({
        itemId: item.id,
        quantity: Math.max(item.parLevel || item.reorderPoint, item.reorderPoint) - item.onHand,
        unitCost: item.costPerUnit,
        leadTimeDays: item.leadTimeDays
      }));

      const validItems = orderItems.filter((item) => item.quantity > 0);
      if (validItems.length === 0) {
        continue;
      }

      const totalCost = calculateTotalCost(validItems);
      const needsApproval = totalCost > approvalThreshold;

      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          organizationId,
          vendorId,
          status: "PENDING",
          totalCost,
          approvalThreshold,
          approvalStatus: needsApproval ? "PENDING_APPROVAL" : "APPROVED",
          approvedAt: needsApproval ? null : new Date(),
          expectedDeliveryDate: buildExpectedDeliveryDate(validItems),
          items: {
            create: buildOrderItems(validItems)
          }
        },
        include: {
          vendor: true,
          items: {
            include: { item: true }
          }
        }
      });

      createdOrders.push(toPurchaseOrderResponse(purchaseOrder));
    }

    return res.status(201).json({
      purchaseOrders: createdOrders,
      generatedCount: createdOrders.length,
      message: createdOrders.length
        ? "Auto-generated purchase orders for low stock items"
        : "No low stock items needed reorder"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to auto-generate purchase orders",
      details: error.message
    });
  }
});

router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !allowedStatusUpdates.has(status)) {
    return res.status(400).json({
      error: "Invalid status",
      message: `status must be one of: ${[...allowedStatusUpdates].join(", ")}`
    });
  }

  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        error: "Not found",
        message: "Purchase order not found"
      });
    }

    const updates = { status };
    if (status === "DELIVERED" && existing.approvalStatus === "PENDING_APPROVAL") {
      return res.status(400).json({
        error: "Approval required",
        message: "Cannot mark as delivered before order approval"
      });
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: updates,
      include: {
        vendor: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    return res.json({
      purchaseOrder: toPurchaseOrderResponse(purchaseOrder),
      message: "Purchase order status updated"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to update purchase order status",
      details: error.message
    });
  }
});

module.exports = router;
