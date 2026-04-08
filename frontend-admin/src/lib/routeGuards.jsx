/**
 * Centralised route-guard components for the admin portal.
 *
 * Each guard reads auth state via lib/auth.js and redirects
 * when preconditions are not met.  They are intentionally kept
 * as thin wrapper components so App.jsx stays declarative.
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, isMfaVerified, getTokenRole } from "./auth";

/**
 * Requires a valid token AND completed MFA.
 * Used for all dashboard-level pages.
 */
export function RequireDashboardMfa({ children }) {
  if (!getToken()) return <Navigate to="/" replace />;
  if (!isMfaVerified()) return <Navigate to="/totp-setup" replace />;
  return children;
}

/**
 * Requires token + MFA + role in {admin, super_admin}.
 */
export function RequireAdminOrSuperAdmin({ children }) {
  const token = getToken();
  const role = getTokenRole(token);

  if (!token) return <Navigate to="/" replace />;
  if (!isMfaVerified()) return <Navigate to="/totp-setup" replace />;
  if (role !== "admin" && role !== "super_admin")
    return <Navigate to="/" replace />;
  return children;
}

/**
 * Requires a token but NO completed MFA.
 * Used for the TOTP-setup page (between login and MFA verification).
 */
export function RequireAuthForTotp({ children }) {
  if (!getToken()) return <Navigate to="/" replace />;
  if (isMfaVerified()) return <Navigate to="/dashboard" replace />;
  return children;
}

/**
 * Requires token + MFA + super_admin role.
 */
export function RequireSuperAdmin({ children }) {
  const token = getToken();
  const role = getTokenRole(token);

  if (!token) return <Navigate to="/" replace />;
  if (!isMfaVerified()) return <Navigate to="/totp-setup" replace />;
  if (role !== "super_admin") return <Navigate to="/dashboard" replace />;
  return children;
}
