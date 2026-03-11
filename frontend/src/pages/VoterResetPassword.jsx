import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./VoterAuthPage.css";

const API = "http://localhost:8000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VoterResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    email: searchParams.get("email") ?? "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    setError("");

    const emailTrimmed = form.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!form.code.trim()) {
      setError("Please enter the reset code from your email.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        email: emailTrimmed,
        code: form.code.trim(),
        new_password: form.newPassword,
        confirm_password: form.confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 3000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string" ? detail : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="voter-auth-shell">
      <section
        className="voter-auth-card"
        style={{ maxWidth: 540 }}
        aria-label="Reset Password"
      >
        <header className="voter-auth-header">
          <img
            className="voter-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />
          <h1 className="voter-title">Reset Password</h1>
          <p className="voter-subtitle">
            Enter the code from your email and choose a new password.
          </p>
        </header>

        {success ? (
          <div style={{ padding: "0 0 28px" }}>
            <div
              style={{
                background: "#f0fdf4",
                border: "2px solid #86efac",
                borderRadius: 12,
                padding: "18px 20px",
                color: "#166534",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.7,
                textAlign: "center",
              }}
              role="status"
            >
              <div style={{ fontSize: 26, marginBottom: 8 }}>&#10003;</div>
              Password reset successfully.
              <br />
              <span style={{ fontWeight: 400, fontSize: 13, color: "#15803d" }}>
                Redirecting you to the login page&hellip;
              </span>
            </div>
          </div>
        ) : (
          <form className="voter-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="voter-error" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <div
              style={{
                background: "#f0f4ff",
                border: "1.5px solid #c5d2f8",
                borderLeft: "4px solid var(--primary-blue)",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#1e3a8a",
                lineHeight: 1.65,
              }}
            >
              Enter the 6-digit code we sent to your email and set a new password.
              The code expires in 15&nbsp;minutes.
            </div>

            <div className="voter-grid voter-grid-login">
              <div className="voter-field">
                <label className="voter-label" htmlFor="rpEmail">
                  Registered Email Address
                </label>
                <input
                  id="rpEmail"
                  className="voter-input"
                  type="email"
                  placeholder="Enter your registered email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="voter-field">
                <label className="voter-label" htmlFor="rpCode">
                  Reset Code
                </label>
                <input
                  id="rpCode"
                  className="voter-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code from your email"
                  value={form.code}
                  onChange={(e) => update("code", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoComplete="one-time-code"
                  maxLength={6}
                />
              </div>

              <div className="voter-field">
                <label className="voter-label" htmlFor="rpNewPw">
                  New Password
                </label>
                <div className="voter-password-row">
                  <input
                    id="rpNewPw"
                    className="voter-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={form.newPassword}
                    onChange={(e) => update("newPassword", e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="voter-mini-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="voter-field">
                <label className="voter-label" htmlFor="rpConfirmPw">
                  Confirm New Password
                </label>
                <div className="voter-password-row">
                  <input
                    id="rpConfirmPw"
                    className="voter-input"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="voter-mini-btn"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <button className="voter-continue" type="submit" disabled={loading}>
              {loading ? "Resetting\u2026" : "Reset Password"}
            </button>

            <footer className="voter-footer">
              <Link
                to="/forgot-password"
                style={{
                  color: "var(--muted)",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                &larr; Request a new code
              </Link>
              {" \u00b7 "}
              <Link
                to="/"
                style={{
                  color: "var(--muted)",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Back to login
              </Link>
            </footer>
          </form>
        )}
      </section>
    </main>
  );
}
