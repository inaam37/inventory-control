import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "2rem" }}>
      <h1>Inventory Control Frontend</h1>
      <p>React UI scaffold created for Phase 1.</p>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
