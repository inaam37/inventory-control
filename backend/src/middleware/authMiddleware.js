const jwt = require("jsonwebtoken");

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch (error) {
    return res.status(401).json({
      error: "Invalid token"
    });
  }

  return next();
}

module.exports = {
  optionalAuth
};
