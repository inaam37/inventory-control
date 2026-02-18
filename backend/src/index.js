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

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "pantrypilot-backend" });
});

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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`PantryPilot backend listening on ${port}`);
});
