const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { router: authRouter, requirePermission } = require("./routes/auth");
const overviewRouter = require("./routes/overview");
const itemsRouter = require("./routes/items");
const recipesRouter = require("./routes/recipes");
const importRouter = require("./routes/import");

const reportsRouter = require("./routes/reports");
const adminRouter = require("./routes/admin");
const cacheResponse = require("./middleware/cacheResponse");

dotenv.config();

const app = express();


app.disable("x-powered-by");
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

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

// Auth routes (no permission required)
app.use("/api/auth", authRouter);

// Protected routes with permission middleware
app.use("/api/overview", requirePermission("inventory:read"), cacheResponse("overview", cacheTtlSeconds), overviewRouter);
app.use("/api/items", (req, res, next) => requirePermission(req.method === "GET" ? "inventory:read" : "inventory:write")(req, res, next), itemsRouter);
app.use("/api/recipes", (req, res, next) => requirePermission(req.method === "GET" ? "recipes:read" : "recipes:write")(req, res, next), recipesRouter);
app.use("/api/import", requirePermission("import:write"), importRouter);
app.use("/api/excel-import", requirePermission("import:write"), require("./routes/excel-import"));
app.use("/api/reports", requirePermission("reports:read"), reportsRouter);
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
    message: "Request could not be processed"
  });
});

module.exports = app;