const now = new Date();
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const users = [
  {
    id: "u-manager",
    fullName: "Morgan Lee",
    email: "morgan.manager@pantrypilot.local",
    phone: "+15550001111",
    role: "MANAGER",
    alertPreferences: {
      lowStock: { email: true, sms: false, inApp: true, slack: false },
      expiringSoon: { email: true, sms: false, inApp: true, slack: false },
      inventoryVariance: { email: true, sms: true, inApp: true, slack: false },
      highWaste: { email: true, sms: true, inApp: true, slack: false },
      supplierDeliveryDue: { email: true, sms: false, inApp: true, slack: false },
      dailyDigest: { email: true, sms: false, inApp: false, slack: false }
    }
  },
  {
    id: "u-staff",
    fullName: "Alex Rivera",
    email: "alex.staff@pantrypilot.local",
    phone: "+15550002222",
    role: "STAFF",
    alertPreferences: {
      lowStock: { email: false, sms: false, inApp: true, slack: false },
      expiringSoon: { email: false, sms: false, inApp: true, slack: false },
      inventoryVariance: { email: false, sms: false, inApp: true, slack: false },
      highWaste: { email: false, sms: false, inApp: true, slack: false },
      supplierDeliveryDue: { email: false, sms: false, inApp: true, slack: false },
      dailyDigest: { email: false, sms: false, inApp: false, slack: false }
    }
  }
];

const items = [
  {
    id: "i-olive-oil",
    name: "Olive Oil",
    onHand: 5,
    reorderPoint: 8,
    expiresAt: addDays(now, 20)
  },
  {
    id: "i-spinach",
    name: "Spinach",
    onHand: 6,
    reorderPoint: 5,
    expiresAt: addDays(now, 2)
  },
  {
    id: "i-yogurt",
    name: "Greek Yogurt",
    onHand: 12,
    reorderPoint: 5,
    expiresAt: addDays(now, 1)
  }
];

const varianceEvents = [
  {
    id: "v-001",
    itemName: "Olive Oil",
    variancePercent: 18,
    detectedAt: addDays(now, -1)
  }
];

const wasteEvents = [
  {
    id: "w-001",
    itemName: "Spinach",
    wasteQty: 4,
    thresholdQty: 2,
    recordedAt: addDays(now, -0.5)
  }
];

const supplierDeliveries = [
  {
    id: "d-001",
    supplierName: "Fresh Farms Co.",
    dueAt: addDays(now, 1),
    status: "DUE"
  },
  {
    id: "d-002",
    supplierName: "Coastal Provisions",
    dueAt: addDays(now, 4),
    status: "SCHEDULED"
  }
];

const notifications = [];
const deliveryLog = [];

module.exports = {
  users,
  items,
  varianceEvents,
  wasteEvents,
  supplierDeliveries,
  notifications,
  deliveryLog
};
