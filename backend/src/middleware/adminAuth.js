function adminAuth(req, res, next) {
  const expectedToken = process.env.ADMIN_TOKEN;
  const providedToken = req.header("x-admin-token");

  if (!expectedToken || !providedToken || providedToken !== expectedToken) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Provide a valid x-admin-token header to access admin endpoints."
    });
  }

  return next();
}

module.exports = adminAuth;
