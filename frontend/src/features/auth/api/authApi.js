/**
 * Auth feature – API calls.
 *
 * login / register / email-verification / password-reset / totp-recovery
 */

import apiClient from "../../../lib/apiClient";

/* ── identity ──────────────────────────────────────────────── */

export function fetchMe() {
  return apiClient.get("/auth/me").then((r) => r.data);
}

/* ── login / register ──────────────────────────────────────── */

export function login(citizenship_number, password) {
  return apiClient
    .post("/auth/login", { citizenship_number, password })
    .then((r) => r.data);
}

export function verifyLoginMfa(mfa_token, code) {
  return apiClient
    .post("/auth/login/mfa-verify", { mfa_token, code })
    .then((r) => r.data);
}

export function register(payload) {
  return apiClient.post("/auth/register", payload).then((r) => r.data);
}

/* ── pending registration lifecycle (unauthenticated) ──────── */

export function submitRegistration(payload) {
  return apiClient.post("/registration/submit", payload).then((r) => r.data);
}

export function registrationTotpSetup(registrationId) {
  return apiClient
    .post(`/registration/${registrationId}/totp/setup`)
    .then((r) => r.data);
}

export function registrationTotpVerify(registrationId, code) {
  return apiClient
    .post(`/registration/${registrationId}/totp/verify`, { code })
    .then((r) => r.data);
}

export function getRegistrationStatus(registrationId) {
  return apiClient
    .get(`/registration/${registrationId}/status`)
    .then((r) => r.data);
}

export function uploadRegistrationDocument(registrationId, file) {
  const form = new FormData();
  form.append("file", file);
  return apiClient
    .post(`/registration/${registrationId}/document`, form)
    .then((r) => r.data);
}

export function uploadRegistrationFace(registrationId, blob) {
  const file = new File([blob], "face-capture.jpg", { type: "image/jpeg" });
  const form = new FormData();
  form.append("file", file);
  return apiClient
    .post(`/registration/${registrationId}/face`, form)
    .then((r) => r.data);
}

/* ── email verification ────────────────────────────────────── */

export function verifyEmail(token) {
  return apiClient
    .post("/auth/verify-email", { token })
    .then((r) => r.data);
}

export function resendEmailVerification() {
  return apiClient
    .post("/auth/resend-email-verification")
    .then((r) => r.data);
}

export function sendEmailVerification() {
  return apiClient
    .post("/auth/send-email-verification")
    .then((r) => r.data);
}

/* ── password reset (unauthenticated) ──────────────────────── */

export function forgotPassword(email) {
  return apiClient
    .post("/auth/forgot-password", { email })
    .then((r) => r.data);
}

export function resetPassword(payload) {
  return apiClient
    .post("/auth/reset-password", payload)
    .then((r) => r.data);
}

/* ── password change (authenticated) ───────────────────────── */

export function changePassword(payload) {
  return apiClient
    .post("/auth/change-password", payload)
    .then((r) => r.data);
}

/* ── totp recovery (unauthenticated) ───────────────────────── */

export function requestTotpRecovery(email) {
  return apiClient
    .post("/auth/totp-recovery/request", { email })
    .then((r) => r.data);
}

export function completeTotpRecovery(email, code) {
  return apiClient
    .post("/auth/totp-recovery/complete", { email, code })
    .then((r) => r.data);
}
