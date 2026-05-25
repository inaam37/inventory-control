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

  const PHASE2_SCHEMA_VERSION = 1;
  const PHASE2_STORAGE_FIELDS = [
    "items",
    "vendors",
    "recipes",
    "sales",
    "usageLogs",
    "priceHistory",
    "poDrafts",
    "invoices",
    "receivingLogs",
    "inventorySnapshots",
    "schedules",
    "users",
    "feedback",
    "posUploads",
    "reportSchedules",
    "lastGeneratedReport",
    "settings",
    "activeCountSession"
  ];
  const PHASE2_CURRENCIES = ["CAD", "USD", "EUR", "GBP"];

  function phase2DefaultSettings() {
    return {
      safetyDays: 2,
      currency: "CAD",
      notifyEmail: "",
      notifyPhone: ""
    };
  }

  function phase2BlankState() {
    return {
      schemaVersion: PHASE2_SCHEMA_VERSION,
      items: [],
      vendors: [],
      recipes: [],
      sales: [],
      usageLogs: [],
      priceHistory: [],
      poDrafts: [],
      invoices: [],
      receivingLogs: [],
      inventorySnapshots: [],
      schedules: [],
      users: [],
      feedback: [],
      posUploads: [],
      reportSchedules: [],
      lastGeneratedReport: null,
      settings: phase2DefaultSettings(),
      activeCountSession: null
    };
  }

  function phase2StateSnapshot() {
    const snapshot = phase2BlankState();
    PHASE2_STORAGE_FIELDS.forEach(field => {
      if (typeof state !== "undefined" && Object.prototype.hasOwnProperty.call(state, field)) {
        snapshot[field] = state[field];
      }
    });
    snapshot.settings = {
      ...phase2DefaultSettings(),
      ...(snapshot.settings || {})
    };
    if (!PHASE2_CURRENCIES.includes(snapshot.settings.currency)) {
      snapshot.settings.currency = "CAD";
    }
    return snapshot;
  }

  function migrateState(raw) {
    const incoming = raw && typeof raw === "object" ? raw : {};
    const migrated = phase2BlankState();

    PHASE2_STORAGE_FIELDS.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(incoming, field)) {
        migrated[field] = incoming[field];
      }
    });

    migrated.schemaVersion = PHASE2_SCHEMA_VERSION;
    migrated.settings = {
      ...phase2DefaultSettings(),
      ...(incoming.settings || {})
    };
    migrated.settings.safetyDays = Number(migrated.settings.safetyDays || 0);
    if (!PHASE2_CURRENCIES.includes(migrated.settings.currency)) {
      migrated.settings.currency = "CAD";
    }

    return migrated;
  }

  function phase2ApplyState(snapshot) {
    if (typeof state === "undefined") return;
    PHASE2_STORAGE_FIELDS.forEach(field => {
      state[field] = snapshot[field];
    });
  }

  function phase2EnsureSaveStatus() {
    let status = document.getElementById("saveStatus");
    let warning = document.getElementById("saveWarning");
    if (status && warning) return { status, warning };

    const nav = document.getElementById("nav");
    const bar = document.createElement("div");
    bar.className = "save-status-bar";
    bar.setAttribute("aria-live", "polite");
    bar.style.cssText = "align-items:center;background:#fff;border:1px solid var(--border);border-radius:10px;display:flex;gap:10px;justify-content:space-between;margin:0 0 16px;padding:10px 12px;";

    status = document.createElement("span");
    status.id = "saveStatus";
    status.className = "pill ok";
    status.textContent = "Saved locally";

    warning = document.createElement("span");
    warning.id = "saveWarning";
    warning.style.cssText = "color:#b42318;font-size:13px;font-weight:600;";

    bar.append(status, warning);
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(bar, nav.nextSibling);
    } else {
      document.body.prepend(bar);
    }
    return { status, warning };
  }

  function phase2SetSaveStatus(status, message = "") {
    const controls = phase2EnsureSaveStatus();
    const config = {
      saved: { label: "Saved locally", tone: "ok" },
      unsaved: { label: "Unsaved changes", tone: "warn" },
      failed: { label: "Save failed", tone: "alert" }
    }[status] || { label: "Unsaved changes", tone: "warn" };

    controls.status.textContent = config.label;
    controls.status.className = `pill ${config.tone}`;
    controls.warning.textContent = message;
  }

  function safeSaveState(snapshot = phase2StateSnapshot()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      phase2SetSaveStatus("saved");
      return true;
    } catch (error) {
      phase2SetSaveStatus("failed", "Unable to save changes in this browser. Export JSON before closing.");
      console.error("PantryPilot save failed:", error);
      return false;
    }
  }

  function phase2SyncSettingsControls() {
    const safetyDaysInput = document.getElementById("safetyDays");
    const currencySelect = document.getElementById("currencySelect");
    const notifyEmail = document.getElementById("notifyEmail");
    const notifyPhone = document.getElementById("notifyPhone");
    if (safetyDaysInput) safetyDaysInput.value = state.settings?.safetyDays ?? 2;
    if (currencySelect) currencySelect.value = state.settings?.currency || "CAD";
    if (notifyEmail) notifyEmail.value = state.settings?.notifyEmail || "";
    if (notifyPhone) notifyPhone.value = state.settings?.notifyPhone || "";
  }

  function phase2ResetForms() {
    if (typeof resetItemForm === "function") resetItemForm();
    if (typeof resetVendorForm === "function") resetVendorForm();
    if (typeof resetRecipeForm === "function") resetRecipeForm();
  }

  function phase2EnsureDataTools() {
    const dataPanel = document.getElementById("data");
    const exportJsonBtn = document.getElementById("exportJson");
    const importJsonInput = document.getElementById("importJson");
    const safetyDaysInput = document.getElementById("safetyDays");

    if (!document.getElementById("clearAll")) {
      const clearButton = document.createElement("button");
      clearButton.id = "clearAll";
      clearButton.className = "danger";
      clearButton.type = "button";
      clearButton.textContent = "Clear all data";
      clearButton.addEventListener("click", () => {
        const ok = confirm("This deletes local browser data only for PantryPilot on this device. Continue?");
        if (!ok) return;
        localStorage.removeItem(STORAGE_KEY);
        phase2ApplyState(migrateState({ schemaVersion: PHASE2_SCHEMA_VERSION }));
        safeSaveState();
        phase2ResetForms();
        phase2SyncSettingsControls();
        if (typeof renderAll === "function") renderAll();
      });

      const actionRow = importJsonInput?.closest(".file-input") || exportJsonBtn?.parentElement;
      if (actionRow) {
        actionRow.appendChild(clearButton);
      } else if (dataPanel) {
        dataPanel.prepend(clearButton);
      }
    }

    if (!document.getElementById("currencySelect") && safetyDaysInput) {
      const wrapper = document.createElement("div");
      const label = document.createElement("label");
      const select = document.createElement("select");
      label.htmlFor = "currencySelect";
      label.textContent = "Currency";
      select.id = "currencySelect";
      PHASE2_CURRENCIES.forEach(code => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = code;
        select.appendChild(option);
      });
      wrapper.append(label, select);
      safetyDaysInput.closest("div")?.after(wrapper);
    }

    const currencySelect = document.getElementById("currencySelect");
    if (currencySelect && !currencySelect.dataset.phase2Bound) {
      currencySelect.dataset.phase2Bound = "true";
      currencySelect.addEventListener("change", () => {
        state.settings = { ...phase2DefaultSettings(), ...(state.settings || {}) };
        state.settings.currency = currencySelect.value || "CAD";
        saveState();
        if (typeof renderAll === "function") renderAll();
      });
    }
  }

  function phase2Currency(value) {
    const code = PHASE2_CURRENCIES.includes(state.settings?.currency) ? state.settings.currency : "CAD";
    const amount = Number(value);
    return (Number.isFinite(amount) ? amount : 0).toLocaleString("en-CA", {
      style: "currency",
      currency: code
    });
  }

  function phase2BuildUsageItemOptions() {
    ingredientAutocomplete.innerHTML = "";
    [...state.items]
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .forEach(item => {
        const option = document.createElement("option");
        option.value = item.name;
        ingredientAutocomplete.appendChild(option);
      });
  }

  function phase2ValidateItem() {
    clearInvalidFields([itemForm.name, itemForm.cost, itemForm.onHand, itemForm.barcode]);
    const itemName = itemForm.name.value.trim();
    const barcode = itemForm.barcode.value.trim();
    if (!itemName) {
      itemForm.name.classList.add("invalid");
      return "Item name is required.";
    }
    const duplicateName = state.items.find(item =>
      item.id !== state.activeItemId &&
      String(item.name || "").trim() === itemName
    );
    if (duplicateName) {
      itemForm.name.classList.add("invalid");
      return "An inventory item with this name already exists.";
    }
    if (Number(itemForm.cost.value || 0) < 0) {
      itemForm.cost.classList.add("invalid");
      return "Cost cannot be negative.";
    }
    if (Number(itemForm.onHand.value || 0) < 0) {
      itemForm.onHand.classList.add("invalid");
      return "On-hand quantity cannot be negative.";
    }
    if (barcode) {
      const duplicateBarcode = state.items.find(item =>
        item.id !== state.activeItemId &&
        String(item.barcode || "").trim() === barcode
      );
      if (duplicateBarcode) {
        itemForm.barcode.classList.add("invalid");
        return "An inventory item with this barcode already exists.";
      }
    }
    return "";
  }

  function phase2ExportJson() {
    const payload = JSON.stringify({
      ...phase2StateSnapshot(),
      exportedAt: new Date().toISOString()
    }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pantrypilot-data.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function phase2ImportJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object") {
          alert("Invalid file format.");
          return;
        }
        phase2ApplyState(migrateState(data));
        saveState();
        phase2ResetForms();
        phase2SyncSettingsControls();
        if (typeof renderAll === "function") renderAll();
        alert("Data imported successfully.");
      } catch {
        alert("Could not read that file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function phase2InstallPersistence() {
    if (typeof state === "undefined" || typeof STORAGE_KEY === "undefined") return;

    phase2EnsureSaveStatus();
    phase2EnsureDataTools();

    const saveImpl = function saveState() {
      phase2SetSaveStatus("unsaved");
      return safeSaveState();
    };

    window.getStateSnapshot = phase2StateSnapshot;
    window.migrateState = migrateState;
    window.safeSaveState = safeSaveState;
    window.saveState = saveImpl;
    window.currency = phase2Currency;
    window.buildUsageItemOptions = phase2BuildUsageItemOptions;
    window.validateItem = phase2ValidateItem;

    try { saveState = saveImpl; } catch {}
    try { currency = phase2Currency; } catch {}
    try { buildUsageItemOptions = phase2BuildUsageItemOptions; } catch {}
    try { validateItem = phase2ValidateItem; } catch {}

    try {
      exportJsonBtn.removeEventListener("click", exportJson);
      exportJson = phase2ExportJson;
      window.exportJson = phase2ExportJson;
      exportJsonBtn.addEventListener("click", phase2ExportJson);
    } catch {}

    try {
      importJsonInput.removeEventListener("change", importJson);
      importJson = phase2ImportJson;
      window.importJson = phase2ImportJson;
      importJsonInput.addEventListener("change", phase2ImportJson);
    } catch {}

    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      phase2ApplyState(migrateState(stored || phase2StateSnapshot()));
    } catch {
      phase2ApplyState(migrateState(phase2StateSnapshot()));
    }

    safeSaveState();
    phase2SyncSettingsControls();
    if (typeof renderAll === "function") renderAll();
  }

  window.addEventListener("DOMContentLoaded", phase2InstallPersistence);

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
