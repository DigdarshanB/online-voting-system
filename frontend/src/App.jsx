import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import VoterAuthPage from "./pages/VoterAuthPage";

/**
 * File: App.jsx
 *
 * Purpose:
 *   Provide the top-level component for the voter portal.
 */
function HomePage() {
  return <div>Welcome, voter!</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VoterAuthPage />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
