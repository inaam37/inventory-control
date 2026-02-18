const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const overviewRouter = require("./routes/overview");
const itemsRouter = require("./routes/items");
const inventoryRouter = require("./routes/inventory");

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
app.use("/api/inventory", inventoryRouter);

process.on("SIGINT", async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDatabase();
  process.exit(0);
});

startServer();
