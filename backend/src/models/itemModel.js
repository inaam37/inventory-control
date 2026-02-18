const { prisma } = require("../config/database");

async function listItems() {
  return prisma.item.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

module.exports = {
  listItems
};
