const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "pantrypilot-backend" });
});

app.get("/api/overview", (req, res) => {
  res.json({
    message: "Backend scaffolding active",
    nextSteps: [
      "Connect Prisma client",
      "Add authentication",
      "Implement CRUD for items/vendors/recipes",
      "Add purchase order workflows",
      "Enable notifications"
    ]
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`PantryPilot backend listening on ${port}`);
});
