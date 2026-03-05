/**
 * File: ActivateInvitePage.jsx
 *
 * Purpose:
 *   Public page for invited admins to activate their account by clicking the
 *   activation link sent to them.  No existing auth required.
 *
 * Flow:
 *   On mount → read ?token from URL → GET /auth/admin/activate/validate
 *     bad token → "error" state (block form)
 *     good token → "form" state (prefill recipient if email-like)
 *   On submit → POST /auth/admin/activate { token, ... }
 *     success   → "done" state
 *     error     → show inline error
 */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./AdminAuthPage.css";

const API = "http://localhost:8000";

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

export default function ActivateInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") ?? "";

  // "validating" | "error" | "form" | "submitting" | "done"
  const [step, setStep] = useState("validating");
  const [tokenError, setTokenError] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef(null);

  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    citizenshipNumber: "",
    password: "",
    confirmPassword: "",
  });

  // ── Validate token on mount ───────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenError("No activation token found. Please use the link you received.");
      setStep("error");
      return;
    }

    axios
      .get(`${API}/auth/admin/activate/validate`, { params: { token } })
      .then(({ data }) => {
        // Prefill citizenship if recipient looks like a citizenship number,
        // or leave blank if it's an email (user fills it in).
        const recipient = data.recipient_identifier ?? "";
        setExpiresAt(data.expires_at ?? "");
        setForm((f) => ({
          ...f,
          citizenshipNumber: isEmail(recipient) ? "" : recipient,
        }));
        setStep("form");
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        setTokenError(
          typeof detail === "string" ? detail : "Invalid or expired activation link."
        );
        setStep("error");
      });
  }, [token]);

  // ── Submit activation ─────────────────────────────────────────
  async function handleSubmit(evt) {
    evt.preventDefault();
    setServerError("");

    if (form.password !== form.confirmPassword) {
      setServerError("Passwords do not match.");
      return;
    }

    setStep("submitting");
    try {
      await axios.post(`${API}/auth/admin/activate`, {
        token,
        full_name: form.fullName.trim(),
        phone_number: form.phoneNumber.trim(),
        citizenship_number: form.citizenshipNumber.trim(),
        password: form.password,
      });
      setStep("done");
      // Start countdown then redirect to login with fromActivation flag
      let secs = 5;
      setCountdown(secs);
      countdownRef.current = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(countdownRef.current);
          navigate("/", { state: { fromActivation: true } });
        }
      }, 1000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setServerError(
        typeof detail === "string" ? detail : "Activation failed. Please try again."
      );
      setStep("form");
    }
  }

  function field(id, label, type = "text", value, placeholder = "") {
    return (
      <div className="admin-field">
        <label className="admin-label" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          className="admin-input"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) =>
            setForm((f) => ({ ...f, [id]: e.target.value }))
          }
          required
        />
      </div>
    );
  }

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-card">
        <header className="admin-auth-header">
          <img
            className="admin-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />
          <h1 className="admin-title">Activate Admin Account</h1>
          <p className="admin-subtitle">
            Complete your profile to activate your administrator account.
          </p>
        </header>

        {/* ── Validating ── */}
        {step === "validating" && (
          <p style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
            Verifying your activation link…
          </p>
        )}

        {/* ── Token error ── */}
        {step === "error" && (
          <div style={{ padding: "8px 0 24px" }}>
            <div className="admin-error" role="alert">
              {tokenError}
            </div>
            <p
              style={{
                textAlign: "center",
                marginTop: 20,
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              Please contact your super admin for a new invite link.
            </p>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                type="button"
                className="admin-mini-btn"
                onClick={() => navigate("/")}
              >
                ← Back to Login
              </button>
            </div>
          </div>
        )}

        {/* ── Registration form ── */}
        {(step === "form" || step === "submitting") && (
          <form onSubmit={handleSubmit} className="admin-form">
            {serverError && (
              <div className="admin-error" role="alert">
                {serverError}
              </div>
            )}

            {expiresAt && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  margin: "-4px 0 4px",
                }}
              >
                Link valid until{" "}
                {new Date(expiresAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            <div className="admin-field">
              <label className="admin-label" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                className="admin-input"
                type="text"
                placeholder="Your full name"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                required
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="phoneNumber">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                className="admin-input"
                type="text"
                placeholder="98XXXXXXXX"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                required
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="citizenshipNumber">
                Citizenship Number
              </label>
              <input
                id="citizenshipNumber"
                className="admin-input"
                type="text"
                placeholder="XX-XX-XX-XXXXX"
                value={form.citizenshipNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, citizenshipNumber: e.target.value }))
                }
                required
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="password">
                Password
              </label>
              <div className="admin-password-row">
                <input
                  id="password"
                  className="admin-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                />
                <button
                  type="button"
                  className="admin-mini-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                className="admin-input"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                required
              />
            </div>

            <button
              type="submit"
              className="admin-continue"
              disabled={step === "submitting"}
            >
              {step === "submitting" ? "Activating…" : "Activate Account"}
            </button>
          </form>
        )}

        {/* ── Done ── */}
        {step === "done" && (
          <div style={{ padding: "8px 0 24px", textAlign: "center" }}>
            <div
              style={{
                background: "#f0fdf4",
                border: "2px solid #86efac",
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 16,
                color: "#166534",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              ✓ Account created successfully!
              <br />
              <span style={{ fontWeight: 400, fontSize: 13 }}>
                You will be redirected to login to complete MFA setup.
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Redirecting in <strong>{countdown}</strong> second{countdown !== 1 ? "s" : ""}…
            </p>
            <button
              type="button"
              className="admin-mini-btn"
              onClick={() => {
                clearInterval(countdownRef.current);
                navigate("/", { state: { fromActivation: true } });
              }}
            >
              Go to Login now →
            </button>
          </div>
        )}

        <div className="admin-footer">
          Online Voting System &mdash; Admin Portal
        </div>
      </div>
    </div>
  );
}
