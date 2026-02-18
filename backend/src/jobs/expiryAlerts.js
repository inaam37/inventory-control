const prisma = require("../lib/prisma");
const { createExpiringSoonFilter } = require("../lib/expiry");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function runExpiryAlertJob(days = 3) {
  const organizations = await prisma.organization.findMany({
    select: { id: true }
  });

  for (const organization of organizations) {
    const expiringItems = await prisma.item.findMany({
      where: {
        organizationId: organization.id,
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

    for (const item of expiringItems) {
      await prisma.notification.create({
        data: {
          organizationId: organization.id,
          type: "EXPIRY_ALERT",
          message: `Item ${item.name} is expiring within ${days} day(s).`
        }
      });
    }
  }
}

function scheduleExpiryAlertJob() {
  runExpiryAlertJob().catch((error) => {
    console.error("Initial expiry alert job failed", error);
  });

  setInterval(() => {
    runExpiryAlertJob().catch((error) => {
      console.error("Scheduled expiry alert job failed", error);
    });
  }, ONE_DAY_MS);
}

module.exports = {
  runExpiryAlertJob,
  scheduleExpiryAlertJob
};
