const app = require("./app");

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const port = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`PantryPilot backend listening on ${port}`);
  });
}

module.exports = app;
