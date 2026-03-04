/**
 * File: AdminTotpSetup.jsx
 *
 * Purpose:
 *   Walk an admin through TOTP (Authenticator App) setup after first login.
 *   Step 1 — Generate a TOTP secret and display the QR code + manual key.
 *   Step 2 — Verify a 6-digit code to confirm the app is correctly configured.
 *   On success, redirect to /dashboard.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import "./AdminAuthPage.css";   // reuse existing card/input/button styles

const API = "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}

/** Extract the base32 secret from an otpauth:// URI. */
function extractSecret(uri) {
  try {
    const url = new URL(uri);
    return url.searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export default function AdminTotpSetup() {
  const navigate = useNavigate();

  // Step: "booting" | "idle" | "pending" | "scan" | "challenge" | "verifying" | "done"
  const [step, setStep] = useState("booting");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function bootstrap() {
      try {
        const { data } = await axios.get(`${API}/auth/me`, {
          headers: authHeaders(),
        });

        if (data.totp_enabled) {
          setStep("challenge");
        } else {
          setStep("idle");
        }
      } catch {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("admin_mfa_ok");
        navigate("/", { replace: true });
      }
    }

    bootstrap();
  }, [navigate]);

  async function handleGenerate() {
    setError("");
    setStep("pending");
    try {
      const { data } = await axios.post(
        `${API}/verification/totp/setup`,
        {},
        { headers: authHeaders() }
      );
      setOtpauthUri(data.otpauth_uri);
      setStep("scan");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 400) {
        setStep("challenge");
        setError("TOTP is already enabled. Enter your 6-digit code to continue.");
      } else {
        setError(typeof detail === "string" ? detail : "Setup failed. Please try again.");
        setStep("idle");
      }
    }
  }

  async function handleVerify(evt) {
    evt.preventDefault();
    setError("");
    setStep("verifying");
    try {
      await axios.post(
        `${API}/verification/totp/verify`,
        { code },
        { headers: authHeaders() }
      );
      sessionStorage.setItem("admin_mfa_ok", "1");
      setStep("done");
      navigate("/dashboard");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Verification failed. Try again.");
      setStep(otpauthUri ? "scan" : "challenge");
    }
  }

  const secret = otpauthUri ? extractSecret(otpauthUri) : "";

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-card">
        <header className="admin-auth-header">
          <img
            className="admin-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />
          <h1 className="admin-title">Set Up Authenticator</h1>
          <p className="admin-subtitle">
            Secure your account with a one-time password app (Microsoft
            Authenticator).
          </p>
        </header>

        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}

        {/* ── Step: idle / pending ── */}
        {step === "booting" && (
          <p style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
            Loading…
          </p>
        )}

        {/* ── Step: idle / pending (first-time setup) ── */}
        {(step === "idle" || step === "pending") && (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <p style={{ marginBottom: 20, color: "var(--muted)", fontSize: 14 }}>
              Click the button below to generate your authenticator QR code.
            </p>
            <button
              type="button"
              className="admin-continue"
              onClick={handleGenerate}
              disabled={step === "pending"}
            >
              {step === "pending" ? "Generating…" : "Generate Setup"}
            </button>
          </div>
        )}

        {/* ── Step: scan ── */}
        {step === "scan" && (
          <div style={{ padding: "16px 0" }}>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
              1. Open your authenticator app and scan the QR code below.
            </p>

            {/* QR code rendered client-side — no network request */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <QRCodeSVG
                value={otpauthUri}
                size={200}
                style={{ border: "1px solid var(--border-soft)", borderRadius: 8, display: "block", margin: "0 auto" }}
              />
            </div>

            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
              Can't scan? Enter this key manually:
            </p>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                background: "#f1f5f9",
                border: "1px solid var(--border-soft)",
                borderRadius: 8,
                padding: "8px 12px",
                wordBreak: "break-all",
                marginBottom: 20,
                userSelect: "all",
              }}
            >
              {secret}
            </div>

            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
              2. Enter the 6-digit code shown in your app:
            </p>
            <form onSubmit={handleVerify} className="admin-form">
              <div className="admin-field">
                <label className="admin-label" htmlFor="totpCode">
                  One-Time Code
                </label>
                <input
                  id="totpCode"
                  className="admin-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <button
                type="submit"
                className="admin-continue"
                disabled={code.length !== 6}
              >
                Verify &amp; Continue
              </button>
            </form>
          </div>
        )}

        {/* ── Step: challenge (already enrolled; verify every login) ── */}
        {step === "challenge" && (
          <div style={{ padding: "16px 0" }}>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
              Enter the current 6-digit code from Microsoft Authenticator to continue.
            </p>
            <form onSubmit={handleVerify} className="admin-form">
              <div className="admin-field">
                <label className="admin-label" htmlFor="totpCodeChallenge">
                  One-Time Code
                </label>
                <input
                  id="totpCodeChallenge"
                  className="admin-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <button
                type="submit"
                className="admin-continue"
                disabled={code.length !== 6}
              >
                Verify &amp; Continue
              </button>
            </form>
          </div>
        )}

        {/* ── Step: verifying ── */}
        {step === "verifying" && (
          <p style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
            Verifying…
          </p>
        )}
      </div>
    </div>
  );
}
