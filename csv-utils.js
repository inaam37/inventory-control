(function () {
  function escapeCsvValue(value) {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    const needsQuotes = /[",\n\r]/.test(text) || text.trim() !== text;
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  function toCSV(rows, headers) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeHeaders = Array.isArray(headers) ? headers : [];
    const headerRow = safeHeaders.map(header => escapeCsvValue(header.label || header.key)).join(",");
    const bodyRows = safeRows.map(row =>
      safeHeaders.map(header => escapeCsvValue(row ? row[header.key] : "")).join(",")
    );
    return [headerRow, ...bodyRows].join("\n");
  }

  function downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  window.toCSV = toCSV;
  window.downloadCSV = downloadCSV;

  window.CATEGORIES = window.CATEGORIES || [];
  window.items = window.items || [];
  window.normalizeCategory = window.normalizeCategory || function normalizeCategory(rawCategory) {
    return rawCategory || "Other";
  };

  window.renderOrders = window.renderOrders || function renderOrders() {
    const query = orderSearch.value.trim().toLowerCase();
    const suggestions = state.items
      .map(item => {
        const orderQty = getSuggestedOrderQty(item);
        const onHand = Number(item.onHand || 0);
        const reorderPoint = Number(item.reorderPoint || 0);
        const needsOrdering = orderQty > 0 || onHand <= reorderPoint;
        return { item, orderQty, needsOrdering, status: getStatus(item) };
      })
      .filter(entry => entry.needsOrdering)
      .filter(entry => {
        if (!query) return true;
        const vendorName = getVendorName(entry.item.vendorId).toLowerCase();
        return (
          entry.item.name.toLowerCase().includes(query) ||
          entry.item.category.toLowerCase().includes(query) ||
          vendorName.includes(query)
        );
      })
      .sort((a, b) => {
        if (b.orderQty !== a.orderQty) return b.orderQty - a.orderQty;
        return a.item.name.localeCompare(b.item.name);
      });

    orderList.innerHTML = "";
    if (!suggestions.length) {
      orderList.innerHTML = "<div class='muted'>No items need ordering right now. Stock levels look healthy.</div>";
      return;
    }

    suggestions.forEach(({ item, orderQty, status }) => {
      const estimatedValue = orderQty * Number(item.cost || 0);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="section-title">
          <div>
            <strong>${item.name}</strong>
            <div class="muted">${item.category} &bull; Vendor: ${getVendorName(item.vendorId)}</div>
          </div>
          <span class="pill ${status.tone}">${status.label}</span>
        </div>
        <div class="grid-3" style="margin-top: 10px;">
          <div>
            <div class="muted">On-hand</div>
            <strong>${item.onHand} ${item.unit}</strong>
          </div>
          <div>
            <div class="muted">Par level</div>
            <strong>${item.par} ${item.unit}</strong>
          </div>
          <div>
            <div class="muted">Reorder point</div>
            <strong>${item.reorderPoint} ${item.unit}</strong>
          </div>
          <div>
            <div class="muted">Suggested order</div>
            <strong>${orderQty} ${item.unit}</strong>
          </div>
          <div>
            <div class="muted">Lead time</div>
            <strong>${Number(item.leadTimeDays || 0)} days</strong>
          </div>
          <div>
            <div class="muted">Estimated value</div>
            <strong>${currency(estimatedValue)}</strong>
          </div>
        </div>
      `;
      orderList.appendChild(card);
    });
  };

  function showStartupBanner(error) {
    if (document.querySelector(".startup-error")) return;
    const message = error && error.message ? error.message : String(error);
    const banner = document.createElement("div");
    banner.className = "startup-error";
    banner.style.cssText = "background:#fef2f2;border-bottom:1px solid #fecaca;color:#991b1b;font-weight:700;padding:12px 20px;";
    banner.textContent = `PantryPilot startup error: ${message}`;
    document.body.prepend(banner);
  }

  window.addEventListener("error", event => {
    showStartupBanner(event.error || event.message);
  });

  window.addEventListener("unhandledrejection", event => {
    showStartupBanner(event.reason || "Unexpected startup error");
  });
})();
