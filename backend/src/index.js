const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const overviewRouter = require("./routes/overview");
const itemsRouter = require("./routes/items");
const authRouter = require("./routes/auth");

dotenv.config();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(optionalAuth);

app.get("/health", async (req, res) => {
  res.json({
    status: "ok",
    service: "inventory-control-backend",
    restaurantName: process.env.RESTAURANT_NAME || "Restaurant"
  });
});

app.use("/api/auth", authRouter);
app.use("/api/overview", overviewRouter);
app.use("/api/items", itemsRouter);

app.use(errorHandler);

const port = Number(process.env.PORT) || 3001;

async function startServer() {
  try {
    await connectDatabase();

    app.listen(port, () => {
      console.log(`Inventory Control backend listening on ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDatabase();
  process.exit(0);
});

startServer();
