import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminAuthPage.css";

const API = "http://localhost:8000";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("access_token")}` };
}

export default function AdminChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Guard: redirect unauthenticated / unapproved visitors to login.
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const mfaOk = sessionStorage.getItem("admin_mfa_ok") === "1";
    if (!token || !mfaOk) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleShow(field) {
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    setError("");

    if (!form.currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/auth/change-password`,
        {
          current_password: form.currentPassword,
          new_password: form.newPassword,
          confirm_new_password: form.confirmNewPassword,
        },
        { headers: authHeaders() }
      );
      setSuccess(true);
      // Token version was incremented — clear both JWT and MFA flag, then redirect.
      setTimeout(() => {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("admin_mfa_ok");
        navigate("/", { replace: true });
      }, 3000);
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
        style={{ maxWidth: 520 }}
        aria-label="Change Password"
      >
        <header className="admin-auth-header">
          <img
            className="admin-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />
          <h1 className="admin-title">Change Password</h1>
          <p className="admin-subtitle">
            Update your password. You will be signed out of all sessions.
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
              Password changed successfully.
              <br />
              <span style={{ fontWeight: 400, fontSize: 13, color: "#15803d" }}>
                You have been signed out. Redirecting to login&hellip;
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

            <div className="admin-field">
              <label className="admin-label" htmlFor="acpCurrent">
                Current Password
              </label>
              <div className="admin-password-row">
                <input
                  id="acpCurrent"
                  className="admin-input"
                  type={show.current ? "text" : "password"}
                  placeholder="Enter your current password"
                  value={form.currentPassword}
                  onChange={(e) => update("currentPassword", e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="admin-mini-btn"
                  onClick={() => toggleShow("current")}
                  aria-label="Toggle current password visibility"
                >
                  {show.current ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="acpNew">
                New Password
              </label>
              <div className="admin-password-row">
                <input
                  id="acpNew"
                  className="admin-input"
                  type={show.new ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={form.newPassword}
                  onChange={(e) => update("newPassword", e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="admin-mini-btn"
                  onClick={() => toggleShow("new")}
                  aria-label="Toggle new password visibility"
                >
                  {show.new ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="acpConfirm">
                Confirm New Password
              </label>
              <div className="admin-password-row">
                <input
                  id="acpConfirm"
                  className="admin-input"
                  type={show.confirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={form.confirmNewPassword}
                  onChange={(e) => update("confirmNewPassword", e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="admin-mini-btn"
                  onClick={() => toggleShow("confirm")}
                  aria-label="Toggle confirm password visibility"
                >
                  {show.confirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div
              style={{
                background: "#fffbeb",
                border: "1.5px solid #fde68a",
                borderLeft: "4px solid #f59e0b",
                borderRadius: 11,
                padding: "11px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#78350f",
                lineHeight: 1.55,
              }}
            >
              Changing your password will sign you out of all active sessions,
              including this one.
            </div>

            <button className="admin-continue" type="submit" disabled={loading}>
              {loading ? "Saving\u2026" : "Change Password"}
            </button>

            <div className="admin-footer">
              <Link
                to="/dashboard"
                style={{
                  color: "var(--muted)",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                &larr; Back to dashboard
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
