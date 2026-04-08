/**
 * Verification feature – API calls.
 *
 * TOTP setup/verify, citizenship upload, face upload.
 */

import apiClient from "../../../lib/apiClient";

/* ── TOTP ──────────────────────────────────────────────────── */

export function totpSetup() {
  return apiClient
    .post("/verification/totp/setup")
    .then((r) => r.data);
}

export function totpVerify(code) {
  return apiClient
    .post("/verification/totp/verify", { code })
    .then((r) => r.data);
}

/* ── Citizenship document ──────────────────────────────────── */

export function uploadCitizenship(file) {
  const form = new FormData();
  form.append("file", file);
  return apiClient
    .post("/verification/citizenship/upload", form)
    .then((r) => r.data);
}

/* ── Face photo ────────────────────────────────────────────── */

export function uploadFace(blob) {
  const file = new File([blob], "face-capture.jpg", { type: "image/jpeg" });
  const form = new FormData();
  form.append("file", file);
  return apiClient
    .post("/verification/face/upload", form)
    .then((r) => r.data);
}
