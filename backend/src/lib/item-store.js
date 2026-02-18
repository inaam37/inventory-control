const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const storageDir = path.join(__dirname, "../../data");
const storagePath = path.join(storageDir, "ingredients-table.json");

async function ensureStorage() {
  await fs.mkdir(storageDir, { recursive: true });

  try {
    await fs.access(storagePath);
  } catch {
    await fs.writeFile(storagePath, "[]\n", "utf8");
  }
}

async function readAll() {
  await ensureStorage();
  const raw = await fs.readFile(storagePath, "utf8");
  const parsed = JSON.parse(raw || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

async function writeAll(items) {
  await ensureStorage();
  await fs.writeFile(storagePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function defaultedItem(data) {
  const timestamp = nowIso();
  return {
    id: data.id || crypto.randomUUID(),
    organizationId: data.organizationId,
    vendorId: data.vendorId || null,
    name: data.name,
    category: data.category,
    unit: data.unit,
    sku: data.sku || null,
    barcode: data.barcode || null,
    onHand: Number(data.onHand || 0),
    parLevel: Number(data.parLevel || 0),
    reorderPoint: Number(data.reorderPoint || 0),
    costPerUnit: Number(data.costPerUnit || 0),
    leadTimeDays: Number(data.leadTimeDays || 0),
    usagePerDay: Number(data.usagePerDay || 0),
    createdAt: data.createdAt || timestamp,
    updatedAt: timestamp
  };
}

async function listByOrganization(organizationId) {
  const all = await readAll();
  return all
    .filter((item) => item.organizationId === organizationId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function createItem(data) {
  const all = await readAll();

  if (data.barcode && all.some((item) => item.barcode === data.barcode)) {
    throw new Error("Barcode already exists");
  }

  const item = defaultedItem(data);
  all.push(item);
  await writeAll(all);
  return item;
}

async function findById(id) {
  const all = await readAll();
  return all.find((item) => item.id === id) || null;
}

async function findByBarcode(barcode) {
  const all = await readAll();
  return all.find((item) => item.barcode === barcode) || null;
}

async function updateItem(id, patch) {
  const all = await readAll();
  const index = all.findIndex((item) => item.id === id);

  if (index < 0) {
    return null;
  }

  const next = {
    ...all[index],
    ...patch,
    updatedAt: nowIso()
  };

  if (next.barcode && all.some((item, row) => row !== index && item.barcode === next.barcode)) {
    throw new Error("Barcode already exists");
  }

  all[index] = next;
  await writeAll(all);
  return next;
}

async function findManyByIds(ids) {
  const set = new Set(ids);
  const all = await readAll();
  return all.filter((item) => set.has(item.id));
}

module.exports = {
  listByOrganization,
  createItem,
  findById,
  findByBarcode,
  updateItem,
  findManyByIds
};
