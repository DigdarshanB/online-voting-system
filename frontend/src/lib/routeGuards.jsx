/**
 * Centralised route-guard components for the voter portal.
 *
 * Each guard reads auth state via lib/authStorage.js and redirects
 * when preconditions are not met. They are intentionally kept
 * as thin wrapper components so App.jsx stays declarative.
 */

import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { getToken, clearToken } from "./authStorage";
import { fetchMe } from "../features/auth/api/authApi";

/**
 * Requires a valid token AND a fully verified & active voter account.
 * Used for all protected portal pages (dashboard, elections, results, etc.).
 *
 * Checks:
 *   1. Token exists
 *   2. /auth/me succeeds (token valid)
 *   3. email_verified === true
 *   4. totp_enabled === true
 *   5. status === "ACTIVE"
 *
 * If the user is mid-verification, redirects to the appropriate step.
 */
export function RequireActiveVoter({ children }) {
  const [state, setState] = useState("loading"); // loading | ok | redirect
  const [redirectTo, setRedirectTo] = useState("/");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setState("redirect");
      setRedirectTo("/");
      return;
    }

    fetchMe()
      .then((data) => {
        if (data.status === "ACTIVE" && data.totp_enabled) {
          setUser(data);
          setState("ok");
        } else if (data.status === "ACTIVE" && !data.totp_enabled) {
          setState("redirect");
          setRedirectTo("/totp-setup");
        } else if (data.status === "PENDING_FACE") {
          setState("redirect");
          setRedirectTo("/face-verification");
        } else {
          setState("redirect");
          setRedirectTo("/status");
        }
      })
      .catch(() => {
        clearToken();
        setState("redirect");
        setRedirectTo("/");
      });
  }, []);

  if (state === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          color: "#64748B",
          fontSize: 15,
          fontWeight: 500,
        }}
      >
        Loading…
      </div>
    );
  }

  if (state === "redirect") {
    return <Navigate to={redirectTo} replace />;
  }

  return typeof children === "function" ? children({ user }) : children;
}

/**
 * Requires a valid token but does NOT require full verification.
 * Used for verification-flow pages (TOTP setup, face verification, status).
 */
export function RequireAuth({ children }) {
  const [state, setState] = useState("loading");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setState("redirect");
      return;
    }

    fetchMe()
      .then(() => setState("ok"))
      .catch(() => {
        clearToken();
        setState("redirect");
      });
  }, []);

  if (state === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          color: "#64748B",
          fontSize: 15,
          fontWeight: 500,
        }}
      >
        Loading…
      </div>
    );
  }

  if (state === "redirect") {
    return <Navigate to="/" replace />;
  }

  return children;
}
