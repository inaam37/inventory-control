const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const overviewRouter = require("./routes/overview");
const itemsRouter = require("./routes/items");
const adminRouter = require("./routes/admin");
const cacheResponse = require("./middleware/cacheResponse");

dotenv.config();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
    }
  });
  next();
});

const cacheTtlSeconds = Number(process.env.CACHE_TTL_SECONDS || 30);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "pantrypilot-backend" });
});

app.use("/api/overview", cacheResponse("overview", cacheTtlSeconds), overviewRouter);
app.use("/api/items", cacheResponse("items", cacheTtlSeconds), itemsRouter);
app.use("/api/admin", adminRouter);

app.use((err, req, res, next) => {
  if (process.env.SENTRY_DSN) {
    console.error("[SENTRY_PLACEHOLDER]", err);
  }

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

module.exports = app;
