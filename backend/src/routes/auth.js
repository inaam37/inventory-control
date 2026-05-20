const express = require("express");
const crypto = require("crypto");

const router = express.Router();

// Mock user database
const users = [
  {
    id: "chef-001",
    username: "chef",
    masterKey: "chef-master-key-123",
    role: "CHEF",
    permissions: ["inventory:read", "inventory:write", "recipes:read", "recipes:write", "import:write", "vendors:read"]
  },
  {
    id: "manager-001",
    username: "manager",
    masterKey: "manager-key-456",
    role: "MANAGER",
    permissions: ["inventory:read", "recipes:read", "vendors:read", "reports:read"]
  },
  {
    id: "vendor-001",
    username: "vendor",
    masterKey: "vendor-key-789",
    role: "VENDOR",
    permissions: ["vendors:read"]
  }
];

// Simple JWT token generation
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  };
  
  // In production, use proper JWT signing
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// Login endpoint
router.post("/login", (req, res) => {
  try {
    const { username, masterKey } = req.body;

    if (!username || !masterKey) {
      return res.status(400).json({
        error: "Validation failed",
        message: "username and masterKey are required"
      });
    }

    const user = users.find((u) => u.username === username && u.masterKey === masterKey);
    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid credentials"
      });
    }

    const token = generateToken(user);
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: error.message
    });
  }
});

// Verify token endpoint
router.post("/verify", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No token provided"
      });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token"
      });
    }

    res.json({
      message: "Token valid",
      user: payload
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({
      error: "Verification failed",
      message: error.message
    });
  }
});

// Middleware to check permissions
function requirePermission(permission) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No token provided"
      });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token"
      });
    }

    if (!payload.permissions.includes(permission) && !payload.permissions.includes("*")) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Permission '${permission}' required"
      });
    }

    req.user = payload;
    next();
  };
}

module.exports = {
  router,
  requirePermission,
  verifyToken,
  generateToken
};