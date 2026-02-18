const items = new Map();
const transactions = [];

const STOCK_OUT_REASONS = new Set(["cooking", "waste", "spoilage"]);

const ensureNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : NaN;
};

const addStockIn = ({ ingredient_id, quantity, supplier_id, price_paid, expiry_date, batch_number }) => {
  const normalizedQuantity = ensureNumber(quantity);
  const normalizedPricePaid = ensureNumber(price_paid);

  if (!ingredient_id || typeof ingredient_id !== "string") {
    return { error: "ingredient_id is required" };
  }

  if (Number.isNaN(normalizedQuantity) || normalizedQuantity <= 0) {
    return { error: "quantity must be a positive number" };
  }

  if (!supplier_id || typeof supplier_id !== "string") {
    return { error: "supplier_id is required" };
  }

  if (Number.isNaN(normalizedPricePaid) || normalizedPricePaid < 0) {
    return { error: "price_paid must be a non-negative number" };
  }

  const existingItem = items.get(ingredient_id) ?? {
    ingredient_id,
    quantity_on_hand: 0,
    average_unit_cost: 0,
    total_inventory_value: 0
  };

  const incomingUnitCost = normalizedPricePaid / normalizedQuantity;
  const newQuantityOnHand = existingItem.quantity_on_hand + normalizedQuantity;
  const newTotalInventoryValue = existingItem.total_inventory_value + normalizedPricePaid;
  const newAverageUnitCost = newQuantityOnHand > 0 ? newTotalInventoryValue / newQuantityOnHand : 0;

  const updatedItem = {
    ...existingItem,
    quantity_on_hand: Number(newQuantityOnHand.toFixed(4)),
    average_unit_cost: Number(newAverageUnitCost.toFixed(4)),
    total_inventory_value: Number(newTotalInventoryValue.toFixed(4))
  };

  items.set(ingredient_id, updatedItem);

  const transaction = {
    id: `txn_${transactions.length + 1}`,
    type: "stock_in",
    ingredient_id,
    quantity: normalizedQuantity,
    supplier_id,
    unit_cost: Number(incomingUnitCost.toFixed(4)),
    price_paid: normalizedPricePaid,
    expiry_date: expiry_date ?? null,
    batch_number: batch_number ?? null,
    reason: null,
    cogs_amount: 0,
    timestamp: new Date().toISOString()
  };

  transactions.push(transaction);

  return {
    transaction,
    ingredient_balance: updatedItem
  };
};

const addStockOut = ({ ingredient_id, quantity, reason, timestamp }) => {
  const normalizedQuantity = ensureNumber(quantity);

  if (!ingredient_id || typeof ingredient_id !== "string") {
    return { error: "ingredient_id is required" };
  }

  if (Number.isNaN(normalizedQuantity) || normalizedQuantity <= 0) {
    return { error: "quantity must be a positive number" };
  }

  if (!reason || !STOCK_OUT_REASONS.has(reason)) {
    return { error: "reason must be one of: cooking, waste, spoilage" };
  }

  const existingItem = items.get(ingredient_id);

  if (!existingItem) {
    return { error: "ingredient has no stock history" };
  }

  if (existingItem.quantity_on_hand < normalizedQuantity) {
    return { error: "insufficient quantity on hand" };
  }

  const cogsAmount = normalizedQuantity * existingItem.average_unit_cost;
  const newQuantityOnHand = existingItem.quantity_on_hand - normalizedQuantity;
  const newTotalInventoryValue = existingItem.total_inventory_value - cogsAmount;

  const updatedItem = {
    ...existingItem,
    quantity_on_hand: Number(newQuantityOnHand.toFixed(4)),
    total_inventory_value: Number(Math.max(newTotalInventoryValue, 0).toFixed(4))
  };

  items.set(ingredient_id, updatedItem);

  const transaction = {
    id: `txn_${transactions.length + 1}`,
    type: "stock_out",
    ingredient_id,
    quantity: normalizedQuantity,
    supplier_id: null,
    unit_cost: Number(existingItem.average_unit_cost.toFixed(4)),
    price_paid: null,
    expiry_date: null,
    batch_number: null,
    reason,
    cogs_amount: Number(cogsAmount.toFixed(4)),
    timestamp: timestamp ?? new Date().toISOString()
  };

  transactions.push(transaction);

  return {
    transaction,
    ingredient_balance: updatedItem
  };
};

const getTransactionHistory = () => transactions;

const getCogsSummary = () => {
  const totalCogs = transactions
    .filter((transaction) => transaction.type === "stock_out")
    .reduce((sum, transaction) => sum + transaction.cogs_amount, 0);

  return {
    total_cogs: Number(totalCogs.toFixed(4)),
    stock_out_count: transactions.filter((transaction) => transaction.type === "stock_out").length,
    transactions_count: transactions.length
  };
};

module.exports = {
  addStockIn,
  addStockOut,
  getTransactionHistory,
  getCogsSummary
};
