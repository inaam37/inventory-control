const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const overviewRouter = require("./routes/overview");
const itemsRouter = require("./routes/items");
const dashboardRouter = require("./routes/dashboard");

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "pantrypilot-backend" });
});

app.use("/api/overview", overviewRouter);
app.use("/api/items", itemsRouter);
app.use("/api/dashboard", dashboardRouter);

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`PantryPilot backend listening on ${port}`);
});
