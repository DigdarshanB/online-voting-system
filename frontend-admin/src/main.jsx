/**
 * main.jsx
 *
 * Purpose:
 *   Initialize the React application and attach the router context to the component tree.
 *
 * Rationale:
 *   If the application uses React Router, BrowserRouter must wrap App to enable navigation
 *   and route resolution throughout the portal.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import AppQueryProvider from "./providers/AppQueryProvider.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppQueryProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppQueryProvider>
  </React.StrictMode>
);
