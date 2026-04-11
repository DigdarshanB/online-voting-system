/**
 * main.jsx
 *
 * Initialize the voter portal and attach the router context
 * to the component tree. BrowserRouter wraps App so that
 * all route hooks work throughout the portal.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
