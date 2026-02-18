const crypto = require("crypto");

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.JWT_ACCESS_TTL_SECONDS || 900);
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.JWT_REFRESH_TTL_SECONDS || 604800);

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-access-secret";
}

function getJwtRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createSignedToken(payload, secret, expiresInSeconds) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
}

function verifySignedToken(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed token");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(unsignedToken)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new Error("Token expired");
  }

  return payload;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384 }, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key.toString("hex"));
    });
  });

  return `${salt}:${hash}`;
}

async function comparePassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) {
    return false;
  }

  const currentHash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384 }, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key.toString("hex"));
    });
  });

  return crypto.timingSafeEqual(Buffer.from(originalHash), Buffer.from(currentHash));
}

function generateAccessToken(user) {
  return createSignedToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId
    },
    getJwtSecret(),
    ACCESS_TOKEN_TTL_SECONDS
  );
}

function generateRefreshToken(user) {
  return createSignedToken(
    { sub: user.id, type: "refresh" },
    getJwtRefreshSecret(),
    REFRESH_TOKEN_TTL_SECONDS
  );
}

function verifyAccessToken(token) {
  return verifySignedToken(token, getJwtSecret());
}

function verifyRefreshToken(token) {
  return verifySignedToken(token, getJwtRefreshSecret());
}

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
