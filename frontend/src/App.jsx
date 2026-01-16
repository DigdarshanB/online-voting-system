import React from "react";
import VoterAuthPage from "./pages/VoterAuthPage";

/**
 * File: App.jsx
 *
 * Purpose:
 *   Provide the top-level component for the voter portal.
 *
 * Rationale:
 *   A single-page entry is used to stabilize UI development for authentication
 *   before adding route-based navigation.
 */
export default function App() {
  return <VoterAuthPage />;
}
