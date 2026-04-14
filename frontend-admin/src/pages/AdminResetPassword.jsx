import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import OtpInput from "../components/ui/OtpInput";
import "./AdminAuthPage.css";

const API = "http://localhost:8000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminResetPassword() {
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
    <div className="admin-auth-shell">
      <div
        className="admin-auth-card"
        style={{ maxWidth: 540 }}
        aria-label="Reset Password"
      >
        <header className="admin-auth-header">
          <img
            className="admin-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />
          <h1 className="admin-title">Reset Password</h1>
          <p className="admin-subtitle">
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
          <form className="admin-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="admin-error" role="alert" aria-live="polite">
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

            <div className="admin-grid">
              <div className="admin-field">
                <label className="admin-label" htmlFor="arpEmail">
                  Registered Email Address
                </label>
                <input
                  id="arpEmail"
                  className="admin-input"
                  type="email"
                  placeholder="Enter your registered email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" style={{ textAlign: "center", display: "block", marginBottom: 4 }}>
                  Reset Code
                </label>
                <OtpInput
                  value={form.code}
                  onChange={(val) => update("code", val)}
                  autoFocus={false}
                  disabled={loading}
                  hasError={!!error && !form.code.trim()}
                  ariaLabel="Password reset code"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="arpNewPw">
                  New Password
                </label>
                <div className="admin-password-row">
                  <input
                    id="arpNewPw"
                    className="admin-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={form.newPassword}
                    onChange={(e) => update("newPassword", e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="arpConfirmPw">
                  Confirm New Password
                </label>
                <div className="admin-password-row">
                  <input
                    id="arpConfirmPw"
                    className="admin-input"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <button className="admin-continue" type="submit" disabled={loading}>
              {loading ? "Resetting\u2026" : "Reset Password"}
            </button>

            <div className="admin-footer">
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
