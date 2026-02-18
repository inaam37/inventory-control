const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const overviewRouter = require("./routes/overview");
const itemsRouter = require("./routes/items");
const alertsRouter = require("./routes/alerts");

dotenv.config();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

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
app.use("/api/alerts", alertsRouter);

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const port = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`PantryPilot backend listening on ${port}`);
  });
}

module.exports = app;
