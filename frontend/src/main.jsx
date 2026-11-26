// ============================================================
// 1. Load the application and browser dependencies
// ============================================================
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/main.css";

// ============================================================
// 2. Mount the routed application into the HTML root
// ============================================================
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
