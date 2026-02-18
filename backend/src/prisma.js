let prisma = null;

try {
  // @prisma/client is generated during backend setup.
  // Keep startup resilient in environments where generation has not run yet.
  // eslint-disable-next-line global-require
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
} catch (error) {
  prisma = null;
}

module.exports = prisma;
