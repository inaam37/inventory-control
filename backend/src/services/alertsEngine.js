const crypto = require("crypto");

const ALERT_TYPES = {
  LOW_STOCK: "lowStock",
  EXPIRING_SOON: "expiringSoon",
  INVENTORY_VARIANCE: "inventoryVariance",
  HIGH_WASTE: "highWaste",
  SUPPLIER_DELIVERY_DUE: "supplierDeliveryDue",
  DAILY_DIGEST: "dailyDigest"
};

const channelHandlers = {
  email: ({ user, notification, deliveryLog }) => {
    deliveryLog.push({
      id: crypto.randomUUID(),
      channel: "email",
      to: user.email,
      subject: `[PantryPilot] ${notification.title}`,
      body: notification.message,
      sentAt: new Date(),
      notificationId: notification.id
    });
  },
  sms: ({ user, notification, deliveryLog }) => {
    if (!user.phone) {
      return;
    }

    deliveryLog.push({
      id: crypto.randomUUID(),
      channel: "sms",
      to: user.phone,
      body: `${notification.title}: ${notification.message}`,
      sentAt: new Date(),
      notificationId: notification.id
    });
  },
  inApp: ({ user, notification, notifications }) => {
    notifications.push({
      ...notification,
      userId: user.id,
      channel: "inApp",
      readAt: null,
      createdAt: new Date()
    });
  },
  slack: ({ notification, deliveryLog }) => {
    deliveryLog.push({
      id: crypto.randomUUID(),
      channel: "slack",
      webhookConfigured: false,
      status: "skipped",
      reason: "Slack webhook not configured",
      sentAt: new Date(),
      notificationId: notification.id,
      preview: `${notification.title}: ${notification.message}`
    });
  }
};

const buildEventAlerts = ({ items, varianceEvents, wasteEvents, supplierDeliveries, now }) => {
  const alerts = [];

  items
    .filter((item) => item.onHand < item.reorderPoint)
    .forEach((item) => {
      alerts.push({
        type: ALERT_TYPES.LOW_STOCK,
        severity: "high",
        dedupeKey: `low-stock-${item.id}`,
        title: "Low stock item",
        message: `${item.name} is at ${item.onHand} units, below reorder level ${item.reorderPoint}.`,
        metadata: { itemId: item.id }
      });
    });

  const expiringThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  items
    .filter((item) => item.expiresAt && new Date(item.expiresAt) <= expiringThreshold)
    .forEach((item) => {
      alerts.push({
        type: ALERT_TYPES.EXPIRING_SOON,
        severity: "medium",
        dedupeKey: `expiring-${item.id}`,
        title: "Item expiring soon",
        message: `${item.name} expires on ${new Date(item.expiresAt).toISOString().slice(0, 10)} (within 3 days).`,
        metadata: { itemId: item.id }
      });
    });

  varianceEvents
    .filter((event) => event.variancePercent >= 10)
    .forEach((event) => {
      alerts.push({
        type: ALERT_TYPES.INVENTORY_VARIANCE,
        severity: "high",
        dedupeKey: `variance-${event.id}`,
        title: "Inventory variance detected",
        message: `${event.itemName} variance is ${event.variancePercent}% (threshold: 10%).`,
        metadata: { varianceEventId: event.id }
      });
    });

  wasteEvents
    .filter((event) => event.wasteQty > event.thresholdQty)
    .forEach((event) => {
      alerts.push({
        type: ALERT_TYPES.HIGH_WASTE,
        severity: "high",
        dedupeKey: `waste-${event.id}`,
        title: "High waste recorded",
        message: `${event.itemName} waste ${event.wasteQty} exceeds threshold ${event.thresholdQty}.`,
        metadata: { wasteEventId: event.id }
      });
    });

  const dueThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  supplierDeliveries
    .filter((delivery) => new Date(delivery.dueAt) <= dueThreshold && delivery.status !== "RECEIVED")
    .forEach((delivery) => {
      alerts.push({
        type: ALERT_TYPES.SUPPLIER_DELIVERY_DUE,
        severity: "medium",
        dedupeKey: `delivery-${delivery.id}`,
        title: "Supplier delivery due",
        message: `${delivery.supplierName} delivery is due ${new Date(delivery.dueAt).toISOString().slice(0, 10)}.`,
        metadata: { deliveryId: delivery.id }
      });
    });

  return alerts;
};

const deliverNotificationForUser = ({ user, alert, notifications, deliveryLog }) => {
  const prefs = user.alertPreferences?.[alert.type] || {};
  const notification = {
    id: crypto.randomUUID(),
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    dedupeKey: alert.dedupeKey,
    metadata: alert.metadata
  };

  Object.keys(channelHandlers).forEach((channel) => {
    if (!prefs[channel]) {
      return;
    }
    channelHandlers[channel]({ user, notification, notifications, deliveryLog });
  });
};

const runAlertSweep = ({ store, now = new Date() }) => {
  const alerts = buildEventAlerts({
    items: store.items,
    varianceEvents: store.varianceEvents,
    wasteEvents: store.wasteEvents,
    supplierDeliveries: store.supplierDeliveries,
    now
  });

  const uniqueAlerts = alerts.filter((alert) => {
    const exists = store.notifications.some(
      (n) => n.dedupeKey === alert.dedupeKey && n.type === alert.type
    );
    return !exists;
  });

  uniqueAlerts.forEach((alert) => {
    store.users.forEach((user) => {
      deliverNotificationForUser({
        user,
        alert,
        notifications: store.notifications,
        deliveryLog: store.deliveryLog
      });
    });
  });

  return {
    generated: alerts.length,
    dispatched: uniqueAlerts.length,
    skippedAsDuplicate: alerts.length - uniqueAlerts.length
  };
};

const sendDailyDigest = ({ store, now = new Date() }) => {
  const managementUsers = store.users.filter((user) => ["ADMIN", "MANAGER"].includes(user.role));
  const unreadCount = store.notifications.filter((notification) => !notification.readAt).length;

  const digestTemplate = {
    type: ALERT_TYPES.DAILY_DIGEST,
    severity: "low",
    title: "Daily inventory digest",
    message: `You have ${unreadCount} unread notifications. Open PantryPilot to review low stock, expiry, variance, waste, and deliveries.`
  };

  managementUsers.forEach((user) => {
    deliverNotificationForUser({
      user,
      alert: {
        ...digestTemplate,
        dedupeKey: `digest-${user.id}-${now.toISOString().slice(0, 10)}`,
        metadata: { date: now.toISOString().slice(0, 10) }
      },
      notifications: store.notifications,
      deliveryLog: store.deliveryLog
    });
  });

  return {
    recipients: managementUsers.length,
    unreadCount
  };
};

module.exports = {
  ALERT_TYPES,
  runAlertSweep,
  sendDailyDigest
};
