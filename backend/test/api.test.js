const test = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

test("GET /health returns service health", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.service, "pantrypilot-backend");
});

test("GET /api/overview returns roadmap details", async () => {
  const response = await fetch(`${baseUrl}/api/overview`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.match(body.message, /Backend scaffolding active/);
  assert.equal(Array.isArray(body.endpoints), true);
});

test("GET /api/items returns collection", async () => {
  const response = await fetch(`${baseUrl}/api/items`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.items), true);
});

test("POST /api/items validates required fields", async () => {
  const response = await fetch(`${baseUrl}/api/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Flour" })
  });

  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error, "Validation failed");
});

test("POST /api/items creates new item", async () => {
  const response = await fetch(`${baseUrl}/api/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Flour",
      category: "Dry Goods",
      unit: "kg",
      onHand: 12
    })
  });

  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.item.name, "Flour");
});

test("GET /api/admin/status rejects missing token", async () => {
  const response = await fetch(`${baseUrl}/api/admin/status`);
  assert.equal(response.status, 401);
});

test("GET /api/admin/status returns data with valid token", async () => {
  process.env.ADMIN_TOKEN = "test-token";

  const response = await fetch(`${baseUrl}/api/admin/status`, {
    headers: { "x-admin-token": "test-token" }
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(typeof body.cacheEntries, "number");
});

test("POST /api/admin/cache/invalidate clears cache", async () => {
  process.env.ADMIN_TOKEN = "test-token";

  const response = await fetch(`${baseUrl}/api/admin/cache/invalidate`, {
    method: "POST",
    headers: { "x-admin-token": "test-token" }
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.match(body.message, /cache cleared/i);
});
