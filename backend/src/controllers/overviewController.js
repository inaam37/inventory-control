function getOverview(req, res) {
  res.json({
    message: "Inventory Control backend foundation is running",
    restaurantName: process.env.RESTAURANT_NAME || "Restaurant",
    nextSteps: [
      "Implement authentication with JWT",
      "Add CRUD operations for inventory resources",
      "Wire frontend pages to backend APIs"
    ]
  });
}

module.exports = {
  getOverview
};
