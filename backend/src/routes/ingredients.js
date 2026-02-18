const express = require("express");
const { PrismaClient, Prisma } = require("@prisma/client");

const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

const prisma = new PrismaClient();
const router = express.Router();

const normalizeString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const parseOptionalString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parsePositiveNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return { error: `${fieldName} is required` };
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${fieldName} must be a non-negative number` };
  }

  return { value: parsed };
};

const validateIngredientPayload = (payload, options = { partial: false }) => {
  const errors = [];

  const validated = {};

  if (!options.partial || payload.name !== undefined) {
    const name = normalizeString(payload.name);
    if (!name) {
      errors.push("name is required and must be a non-empty string");
    } else if (name.length > 120) {
      errors.push("name must be 120 characters or less");
    } else {
      validated.name = name;
    }
  }

  if (!options.partial || payload.category !== undefined) {
    const category = normalizeString(payload.category);
    if (!category) {
      errors.push("category is required and must be a non-empty string");
    } else if (category.length > 80) {
      errors.push("category must be 80 characters or less");
    } else {
      validated.category = category;
    }
  }

  if (!options.partial || payload.unit !== undefined) {
    const unit = normalizeString(payload.unit);
    if (!unit) {
      errors.push("unit is required and must be a non-empty string");
    } else if (unit.length > 30) {
      errors.push("unit must be 30 characters or less");
    } else {
      validated.unit = unit;
    }
  }

  if (!options.partial || payload.reorderLevel !== undefined) {
    const reorderLevel = parsePositiveNumber(payload.reorderLevel, "reorderLevel");
    if (reorderLevel.error) {
      errors.push(reorderLevel.error);
    } else {
      validated.reorderPoint = reorderLevel.value;
    }
  }

  if (!options.partial || payload.onHand !== undefined) {
    if (payload.onHand !== undefined) {
      const onHand = parsePositiveNumber(payload.onHand, "onHand");
      if (onHand.error) {
        errors.push(onHand.error);
      } else {
        validated.onHand = onHand.value;
      }
    }
  }

  if (!options.partial || payload.costPerUnit !== undefined) {
    if (payload.costPerUnit !== undefined) {
      const costPerUnit = parsePositiveNumber(payload.costPerUnit, "costPerUnit");
      if (costPerUnit.error) {
        errors.push(costPerUnit.error);
      } else {
        validated.costPerUnit = costPerUnit.value;
      }
    }
  }

  if (!options.partial || payload.supplierId !== undefined) {
    if (payload.supplierId !== undefined && payload.supplierId !== null) {
      if (typeof payload.supplierId !== "string" || payload.supplierId.trim().length === 0) {
        errors.push("supplierId must be a non-empty string when provided");
      } else {
        validated.vendorId = payload.supplierId.trim();
      }
    } else if (payload.supplierId === null) {
      validated.vendorId = null;
    }
  }

  return { errors, data: validated };
};

const mapIngredientResponse = (item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  unit: item.unit,
  reorderLevel: item.reorderPoint,
  onHand: item.onHand,
  costPerUnit: item.costPerUnit,
  supplier: item.vendor
    ? {
        id: item.vendor.id,
        name: item.vendor.name
      }
    : null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

router.post("/", async (req, res) => {
  const { errors, data } = validateIngredientPayload(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation error", details: errors });
  }

  try {
    const ingredient = await prisma.item.create({
      data: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        name: data.name,
        category: data.category,
        unit: data.unit,
        reorderPoint: data.reorderPoint,
        onHand: data.onHand ?? 0,
        costPerUnit: data.costPerUnit ?? 0,
        vendorId: data.vendorId ?? null
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(201).json(mapIngredientResponse(ingredient));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(400).json({ error: "Validation error", details: ["supplierId does not exist"] });
    }

    return res.status(500).json({ error: "Failed to create ingredient" });
  }
});

router.get("/", async (req, res) => {
  const category = parseOptionalString(req.query.category);
  const supplier = parseOptionalString(req.query.supplier);

  const where = {
    organizationId: DEFAULT_ORGANIZATION_ID
  };

  if (category) {
    where.category = {
      equals: category,
      mode: "insensitive"
    };
  }

  if (supplier) {
    where.OR = [
      {
        vendorId: supplier
      },
      {
        vendor: {
          name: {
            contains: supplier,
            mode: "insensitive"
          }
        }
      }
    ];
  }

  try {
    const ingredients = await prisma.item.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return res.json(ingredients.map(mapIngredientResponse));
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch ingredients" });
  }
});

router.get("/search/:name", async (req, res) => {
  const name = normalizeString(req.params.name);

  if (!name) {
    return res.status(400).json({ error: "Validation error", details: ["name parameter is required"] });
  }

  try {
    const ingredients = await prisma.item.findMany({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        name: {
          contains: name,
          mode: "insensitive"
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return res.json(ingredients.map(mapIngredientResponse));
  } catch (error) {
    return res.status(500).json({ error: "Failed to search ingredients" });
  }
});

router.put("/:id", async (req, res) => {
  const id = normalizeString(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Validation error", details: ["id parameter is required"] });
  }

  const { errors, data } = validateIngredientPayload(req.body, { partial: true });

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation error", details: errors });
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({
      error: "Validation error",
      details: ["At least one updatable field is required"]
    });
  }

  try {
    const existing = await prisma.item.findFirst({
      where: {
        id,
        organizationId: DEFAULT_ORGANIZATION_ID
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Ingredient not found" });
    }

    const ingredient = await prisma.item.update({
      where: { id },
      data,
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.json(mapIngredientResponse(ingredient));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(400).json({ error: "Validation error", details: ["supplierId does not exist"] });
    }

    return res.status(500).json({ error: "Failed to update ingredient" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = normalizeString(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Validation error", details: ["id parameter is required"] });
  }

  try {
    const existing = await prisma.item.findFirst({
      where: {
        id,
        organizationId: DEFAULT_ORGANIZATION_ID
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Ingredient not found" });
    }

    await prisma.item.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete ingredient" });
  }
});

module.exports = router;
