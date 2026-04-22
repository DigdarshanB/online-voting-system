// Route guards for the admin portal. Each one is a thin wrapper that reads
// auth state from ./auth and redirects when preconditions fail, so App.jsx
// can stay declarative.

import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, isMfaVerified, getTokenRole } from "./auth";

// Token + completed MFA — used by all dashboard pages.
export function RequireDashboardMfa({ children }) {
  if (!getToken()) return <Navigate to="/" replace />;
  if (!isMfaVerified()) return <Navigate to="/totp-setup" replace />;
  return children;
}

// Token + MFA + admin or super_admin role.
export function RequireAdminOrSuperAdmin({ children }) {
  const token = getToken();
  const role = getTokenRole(token);

  if (!token) return <Navigate to="/" replace />;
  if (!isMfaVerified()) return <Navigate to="/totp-setup" replace />;
  if (role !== "admin" && role !== "super_admin")
    return <Navigate to="/" replace />;
  return children;
}

// Token but MFA NOT yet completed — used by the TOTP setup page.
export function RequireAuthForTotp({ children }) {
  if (!getToken()) return <Navigate to="/" replace />;
  if (isMfaVerified()) return <Navigate to="/dashboard" replace />;
  return children;
}

// Token + MFA + super_admin role only.
export function RequireSuperAdmin({ children }) {
  const token = getToken();
  const role = getTokenRole(token);

  if (!token) return <Navigate to="/" replace />;
  if (!isMfaVerified()) return <Navigate to="/totp-setup" replace />;
  if (role !== "super_admin") return <Navigate to="/dashboard" replace />;
  return children;
}
