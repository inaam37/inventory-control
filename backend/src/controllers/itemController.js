const { listItems } = require("../models/itemModel");

async function getItems(req, res, next) {
  try {
    const items = await listItems();

    res.json({
      items,
      message: "Items fetched successfully"
    });
  } catch (error) {
    next(error);
  }
}

function createItem(req, res) {
  res.status(501).json({
    error: "Not implemented",
    message: "Create item endpoint scaffold. Implement with Prisma."
  });
}

module.exports = {
  getItems,
  createItem
};
