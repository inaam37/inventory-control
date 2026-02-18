const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const overviewRouter = require("./routes/overview");
const itemsRouter = require("./routes/items");
const suppliersRouter = require("./routes/suppliers");

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
app.use("/api/suppliers", suppliersRouter);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Resource not found" });
  }
  return res.status(500).json({ error: "Internal server error" });
});

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
