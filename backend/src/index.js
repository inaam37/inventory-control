const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const overviewRouter = require("./routes/overview");
const itemsRouter = require("./routes/items");
const locationsRouter = require("./routes/locations");
const inventoryRouter = require("./routes/inventory");
const reportsRouter = require("./routes/reports");

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "pantrypilot-backend" });
});

app.use("/api/overview", overviewRouter);
app.use("/api/items", itemsRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/reports", reportsRouter);

const port = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`PantryPilot backend listening on ${port}`);
  });
}

module.exports = app;
