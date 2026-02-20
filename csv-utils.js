(function attachCsvUtils(global) {
  function normalizeHeaders(headers) {
    return headers.map(header => {
      if (typeof header === "string") {
        return { key: header, label: header };
      }
      return header;
    });
  }

  function normalizeCellValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  function escapeCsvValue(value) {
    const normalized = normalizeCellValue(value);
    const needsQuotes = /[",\n\r]/.test(normalized) || normalized.trim() !== normalized;
    if (!needsQuotes) return normalized;
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  function toCSV(rows, headers) {
    const orderedHeaders = normalizeHeaders(headers);
    const lines = [orderedHeaders.map(header => escapeCsvValue(header.label)).join(",")];

    rows.forEach(row => {
      const line = orderedHeaders
        .map(header => escapeCsvValue(row ? row[header.key] : ""))
        .join(",");
      lines.push(line);
    });

    return lines.join("\n");
  }

  function downloadCSV(filename, csvText) {
    const normalizedFilename = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = normalizedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  global.toCSV = toCSV;
  global.downloadCSV = downloadCSV;
})(window);
