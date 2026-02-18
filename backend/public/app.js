const dateForm = document.getElementById("date-filter-form");
const startInput = document.getElementById("startDate");
const endInput = document.getElementById("endDate");

const totalValueNode = document.getElementById("total-value");
const quickStatsNode = document.getElementById("quick-stats");
const lowStockList = document.getElementById("low-stock-list");
const expiringList = document.getElementById("expiring-list");
const transactionsBody = document.getElementById("transactions-body");

let categoryChart;
let flowChart;

function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function setDefaults() {
  const end = new Date("2026-02-17T23:59:59Z");
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  startInput.value = start.toISOString().slice(0, 10);
  endInput.value = end.toISOString().slice(0, 10);
}

function renderQuickStats(metrics, currency) {
  const cards = [
    { label: "Total Items", value: metrics.totalItems },
    { label: "Categories", value: metrics.totalCategories },
    { label: "Waste This Week", value: formatCurrency(metrics.wasteThisWeek, currency) },
    { label: "Low Stock Alerts", value: metrics.lowStockCount }
  ];

  quickStatsNode.innerHTML = cards
    .map(
      (card) => `
      <article class="stat-card">
        <p>${card.label}</p>
        <strong>${card.value}</strong>
      </article>
    `
    )
    .join("");
}

function renderAlerts(target, list, type) {
  if (!list.length) {
    target.innerHTML = `<li class="alert-item ${type}">No alerts in this range.</li>`;
    return;
  }

  target.innerHTML = list
    .map((item) => {
      const suffix = type === "red"
        ? `${item.quantity} ${item.unit} left (reorder at ${item.reorderLevel})`
        : `Expires on ${item.expiryDate}`;
      return `<li class="alert-item ${type}"><strong>${item.name}</strong><br />${suffix}</li>`;
    })
    .join("");
}

function renderTransactions(rows) {
  if (!rows.length) {
    transactionsBody.innerHTML = "<tr><td colspan='5'>No transactions found for selected dates.</td></tr>";
    return;
  }

  transactionsBody.innerHTML = rows
    .map(
      (txn) => `
      <tr>
        <td>${formatDate(txn.timestamp)}</td>
        <td>${txn.itemName}</td>
        <td><span class="badge ${txn.type.toLowerCase()}">${txn.type}</span></td>
        <td>${txn.quantity}</td>
        <td>${txn.reason}</td>
      </tr>
    `
    )
    .join("");
}

function renderCharts(data) {
  if (categoryChart) {
    categoryChart.destroy();
  }

  if (flowChart) {
    flowChart.destroy();
  }

  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "doughnut",
    data: {
      labels: data.charts.inventoryByCategory.labels,
      datasets: [
        {
          data: data.charts.inventoryByCategory.values,
          backgroundColor: ["#3066ff", "#2ab07f", "#f7a733", "#8f6bff", "#1f9ae0", "#e05d8f"]
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });

  flowChart = new Chart(document.getElementById("flowChart"), {
    type: "line",
    data: {
      labels: data.charts.stockFlow.labels,
      datasets: [
        {
          label: "Stock In",
          data: data.charts.stockFlow.stockIn,
          borderColor: "#2ab07f",
          backgroundColor: "rgba(42, 176, 127, 0.12)",
          tension: 0.3,
          fill: true
        },
        {
          label: "Stock Out",
          data: data.charts.stockFlow.stockOut,
          borderColor: "#e04848",
          backgroundColor: "rgba(224, 72, 72, 0.1)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false
      }
    }
  });
}

async function loadDashboard(startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await fetch(`/api/dashboard?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Unable to load dashboard data");
  }

  const data = await response.json();

  totalValueNode.textContent = formatCurrency(data.metrics.totalInventoryValue, data.meta.currency);
  renderQuickStats(data.metrics, data.meta.currency);
  renderAlerts(lowStockList, data.alerts.lowStock, "red");
  renderAlerts(expiringList, data.alerts.expiringSoon, "yellow");
  renderTransactions(data.recentTransactions);
  renderCharts(data);
}

dateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadDashboard(startInput.value, endInput.value);
});

setDefaults();
loadDashboard(startInput.value, endInput.value).catch((error) => {
  totalValueNode.textContent = "Error loading dashboard";
  console.error(error);
});
