const express = require("express");

const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require("../lib/auth");
const { ROLES } = require("../config/roles");
const { requireAuth } = require("../middleware/auth");
const { createUser, findByEmail, findById, toUserResponse } = require("../db/userStore");

const router = express.Router();
const activeRefreshTokens = new Set();

router.post("/register", async (req, res) => {
  const { email, password, role = ROLES.VIEWER, restaurantId, name, phone } = req.body;

  if (!email || !password || !restaurantId || !name) {
    return res.status(400).json({
      error: "email, password, restaurantId, and name are required"
    });
  }

  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${Object.values(ROLES).join(", ")}` });
  }

  try {
    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);
    const user = await createUser({
      email,
      password: hashedPassword,
      role,
      restaurantId,
      name,
      phone
    });

    return res.status(201).json(toUserResponse(user));
  } catch (error) {
    return res.status(500).json({ error: "Failed to register user", details: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const user = await findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    activeRefreshTokens.add(refreshToken);

    return res.json({
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      user: toUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to login", details: error.message });
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  if (!activeRefreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Refresh token is not active" });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    const accessToken = generateAccessToken(user);

    return res.json({ accessToken, tokenType: "Bearer" });
  } catch (error) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    activeRefreshTokens.delete(refreshToken);
  }

  return res.status(204).send();
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(toUserResponse(user));
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch profile", details: error.message });
  }
});

module.exports = router;
