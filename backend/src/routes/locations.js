const express = require("express");
const crypto = require("crypto");

const { state } = require("../data/store");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ locations: state.locations });
});

router.post("/", (req, res) => {
  const { name, timezone = "UTC" } = req.body ?? {};

  if (!name || typeof name !== "string") {
    return res.status(400).json({
      error: "Validation error",
      message: "name is required"
    });
  }

  const now = new Date().toISOString();
  const location = {
    id: crypto.randomUUID(),
    name: name.trim(),
    timezone,
    createdAt: now,
    updatedAt: now
  };

  state.locations.push(location);

  return res.status(201).json({
    message: "Location created",
    location
  });
});

module.exports = router;
