const { hasPermission } = require("../config/roles");

function authorize(permission) {
  return function permissionMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Role ${req.user.role} cannot perform ${permission}`
      });
    }

    return next();
  };
}

module.exports = {
  authorize
};
