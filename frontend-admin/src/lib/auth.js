/**
 * Token storage, MFA session helpers, and JWT payload parsing
 * for the admin portal.
 */

/* ── Token storage ─────────────────────────────────────────── */

export function getToken() {
  return localStorage.getItem("access_token");
}

export function setToken(token) {
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
}

/* ── MFA session flag ──────────────────────────────────────── */

export function isMfaVerified() {
  return sessionStorage.getItem("admin_mfa_ok") === "1";
}

export function setMfaVerified() {
  sessionStorage.setItem("admin_mfa_ok", "1");
}

export function clearMfaVerified() {
  sessionStorage.removeItem("admin_mfa_ok");
}

/* ── JWT payload parsing ───────────────────────────────────── */

function parseTokenPayload(token) {
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const payloadJson = atob(
      payloadBase64.replace(/-/g, "+").replace(/_/g, "/")
    );
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

export function getTokenRole(token) {
  const payload = parseTokenPayload(token);
  return payload?.role ?? null;
}

// Best-effort user-data extraction; returns sensible defaults when the JWT
// is missing or malformed so the UI never crashes mid-render.
export function getTokenUserData(token) {
  const payload = parseTokenPayload(token);
  if (!payload) {
    return {
      fullName: "Administrator",
      role: "System Admin",
      email: "admin@election.gov.np",
      adminId: "ADMIN-001",
      phone: "+977 1-XXXXXXX",
      status: "Active",
    };
  }
  return {
    fullName: payload.full_name || payload.name || "Administrator",
    role: payload.role || "Admin",
    email: payload.email || "admin@election.gov.np",
    adminId: payload.sub || "ADMIN-001",
    phone: payload.phone_number || "+977 XXXXXXXX",
    status: "Active",
  };
}
