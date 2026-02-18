function errorHandler(err, req, res, next) {
  console.error(err);

  res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong while processing your request."
  });
}

module.exports = errorHandler;
