import React from "react";
import { createRoot } from "react-dom/client";
import CPanelApp from "./CPanelApp.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CPanelApp />
  </React.StrictMode>,
);
