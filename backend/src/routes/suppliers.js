const express = require("express");

const prisma = require("../db");

const router = express.Router();

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const parseScore = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 5) {
    return null;
  }
  return parsed;
};

const parseIngredientIds = (ingredientIds) => {
  if (ingredientIds === undefined) {
    return undefined;
  }
  if (!Array.isArray(ingredientIds)) {
    return null;
  }
  return ingredientIds.filter((id) => typeof id === "string" && id.trim().length > 0);
};

const mapSupplier = (vendor) => ({
  id: vendor.id,
  organizationId: vendor.organizationId,
  name: vendor.name,
  contactName: vendor.contactName,
  email: vendor.email,
  phone: vendor.phone,
  address: vendor.address,
  deliverySchedule: vendor.deliverySchedule,
  paymentTerms: vendor.paymentTerms,
  reliabilityScore: vendor.reliabilityScore,
  ratingCount: vendor.ratingCount,
  notes: vendor.notes,
  ingredients: vendor.supplierItems.map((link) => ({
    id: link.item.id,
    name: link.item.name,
    category: link.item.category,
    unit: link.item.unit
  })),
  createdAt: vendor.createdAt,
  updatedAt: vendor.updatedAt
});

router.get("/", asyncHandler(async (req, res) => {
  const { organizationId } = req.query;

  if (!organizationId) {
    return res.status(400).json({
      error: "Missing organizationId query parameter"
    });
  }

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: String(organizationId) },
    include: {
      supplierItems: {
        include: {
          item: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return res.json({ suppliers: vendors.map(mapSupplier) });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: req.params.id },
    include: {
      supplierItems: {
        include: {
          item: true
        }
      }
    }
  });

  if (!vendor) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  return res.json({ supplier: mapSupplier(vendor) });
}));

router.post("/", asyncHandler(async (req, res) => {
  const {
    organizationId,
    name,
    contactName,
    email,
    phone,
    address,
    deliverySchedule,
    paymentTerms,
    reliabilityScore,
    notes,
    ingredientIds
  } = req.body;

  if (!organizationId || !name) {
    return res.status(400).json({ error: "organizationId and name are required" });
  }

  const parsedIngredients = parseIngredientIds(ingredientIds);
  if (parsedIngredients === null) {
    return res.status(400).json({ error: "ingredientIds must be an array of item ids" });
  }

  const parsedScore = parseScore(reliabilityScore);
  if (parsedScore === null) {
    return res.status(400).json({ error: "reliabilityScore must be between 0 and 5" });
  }

  const vendor = await prisma.vendor.create({
    data: {
      organizationId,
      name,
      contactName,
      email,
      phone,
      address,
      deliverySchedule,
      paymentTerms,
      reliabilityScore: parsedScore ?? 0,
      notes,
      ratingCount: parsedScore !== undefined ? 1 : 0,
      supplierItems: parsedIngredients
        ? {
            create: parsedIngredients.map((itemId) => ({
              item: {
                connect: { id: itemId }
              }
            }))
          }
        : undefined
    },
    include: {
      supplierItems: {
        include: {
          item: true
        }
      }
    }
  });

  return res.status(201).json({ supplier: mapSupplier(vendor) });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const {
    name,
    contactName,
    email,
    phone,
    address,
    deliverySchedule,
    paymentTerms,
    reliabilityScore,
    notes,
    ingredientIds,
    reliabilityRating
  } = req.body;

  const parsedScore = parseScore(reliabilityScore);
  if (parsedScore === null) {
    return res.status(400).json({ error: "reliabilityScore must be between 0 and 5" });
  }

  const parsedIngredients = parseIngredientIds(ingredientIds);
  if (parsedIngredients === null) {
    return res.status(400).json({ error: "ingredientIds must be an array of item ids" });
  }

  const existing = await prisma.vendor.findUnique({
    where: { id: req.params.id },
    include: { supplierItems: true }
  });

  if (!existing) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  let updatedScore = parsedScore;
  let updatedCount = existing.ratingCount;

  if (reliabilityRating !== undefined) {
    const newRating = parseScore(reliabilityRating);
    if (newRating === null) {
      return res.status(400).json({ error: "reliabilityRating must be between 0 and 5" });
    }

    const totalScore = existing.reliabilityScore * existing.ratingCount + newRating;
    updatedCount = existing.ratingCount + 1;
    updatedScore = totalScore / updatedCount;
  }

  const vendor = await prisma.$transaction(async (tx) => {
    if (parsedIngredients) {
      await tx.supplierItem.deleteMany({ where: { vendorId: req.params.id } });
    }

    return tx.vendor.update({
      where: { id: req.params.id },
      data: {
        name,
        contactName,
        email,
        phone,
        address,
        deliverySchedule,
        paymentTerms,
        reliabilityScore: updatedScore,
        ratingCount: reliabilityRating !== undefined || parsedScore !== undefined ? updatedCount : undefined,
        notes,
        supplierItems: parsedIngredients
          ? {
              create: parsedIngredients.map((itemId) => ({
                item: { connect: { id: itemId } }
              }))
            }
          : undefined
      },
      include: {
        supplierItems: {
          include: {
            item: true
          }
        }
      }
    });
  });

  return res.json({ supplier: mapSupplier(vendor) });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.vendor.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  await prisma.vendor.delete({ where: { id: req.params.id } });

  return res.status(204).send();
}));

module.exports = router;
