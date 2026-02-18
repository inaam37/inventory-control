const express = require("express");

const store = require("../dataStore");
const { ALERT_TYPES, runAlertSweep, sendDailyDigest } = require("../services/alertsEngine");

const router = express.Router();

router.get("/types", (req, res) => {
  res.json({
    alertTypes: Object.values(ALERT_TYPES)
  });
});

router.post("/run", (req, res) => {
  const result = runAlertSweep({ store });
  res.json({
    message: "Alert sweep completed",
    ...result
  });
});

router.post("/digest/daily", (req, res) => {
  const result = sendDailyDigest({ store });
  res.json({
    message: "Daily digest processed",
    ...result
  });
});

router.get("/notifications", (req, res) => {
  const userId = req.query.userId;

  const notifications = userId
    ? store.notifications.filter((notification) => notification.userId === userId)
    : store.notifications;

  const unread = notifications.filter((notification) => !notification.readAt).length;

  res.json({
    notifications,
    unread,
    bell: {
      showDot: unread > 0,
      unread
    }
  });
});

router.post("/notifications/:id/read", (req, res) => {
  const notification = store.notifications.find((entry) => entry.id === req.params.id);

  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }

  notification.readAt = new Date();
  return res.json({ message: "Notification marked as read", notification });
});

router.get("/preferences/:userId", (req, res) => {
  const user = store.users.find((entry) => entry.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    userId: user.id,
    preferences: user.alertPreferences
  });
});

router.put("/preferences/:userId", (req, res) => {
  const user = store.users.find((entry) => entry.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Request body must be a preferences object" });
  }

  user.alertPreferences = {
    ...user.alertPreferences,
    ...req.body
  };

  return res.json({
    message: "Preferences updated",
    userId: user.id,
    preferences: user.alertPreferences
  });
});

router.get("/delivery-log", (req, res) => {
  res.json({ deliveries: store.deliveryLog });
});

module.exports = router;
