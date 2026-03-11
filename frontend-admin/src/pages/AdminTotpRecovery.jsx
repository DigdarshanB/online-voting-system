import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./AdminAuthPage.css";

const API = "http://localhost:8000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminTotpRecovery() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleRequest(evt) {
    evt.preventDefault();
    setError("");
    setMessage("");

    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoadingRequest(true);
    try {
      await axios.post(`${API}/auth/totp-recovery/request`, { email: normalized });
      setRequested(true);
      setMessage("If the account is eligible, a recovery code has been sent.");
    } catch {
      setRequested(true);
      setMessage("If the account is eligible, a recovery code has been sent.");
    } finally {
      setLoadingRequest(false);
    }
  }

  async function handleComplete(evt) {
    evt.preventDefault();
    setError("");
    setMessage("");

    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!code.trim()) {
      setError("Please enter the recovery code from your email.");
      return;
    }

    setLoadingComplete(true);
    try {
      const { data } = await axios.post(`${API}/auth/totp-recovery/complete`, {
        email: normalized,
        code: code.trim(),
      });
      setMessage(data?.detail || "Recovery request submitted.");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to complete recovery.");
    } finally {
      setLoadingComplete(false);
    }
  }

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-card" style={{ maxWidth: 520 }} aria-label="Admin TOTP Recovery">
        <header className="admin-auth-header">
          <img className="admin-flag" src="/assets/nepal-flag.png" alt="Nepal national flag" />
          <h1 className="admin-title">Recover Authenticator Access</h1>
          <p className="admin-subtitle">
            Admin recovery requires super-admin approval after code verification.
          </p>
        </header>

        {error && <div className="admin-error" role="alert">{error}</div>}
        {message && (
          <div
            className="admin-error"
            role="status"
            style={{ background: "#f0fdf4", color: "#166534", borderColor: "#86efac" }}
          >
            {message}
          </div>
        )}

        <form className="admin-form" onSubmit={handleRequest} noValidate>
          <div className="admin-field">
            <label className="admin-label" htmlFor="atrEmail">Registered Email Address</label>
            <input
              id="atrEmail"
              className="admin-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your verified email"
              autoComplete="email"
            />
          </div>
          <button className="admin-continue" type="submit" disabled={loadingRequest}>
            {loadingRequest ? "Sending…" : "Send Recovery Code"}
          </button>
        </form>

        {requested && (
          <form className="admin-form" onSubmit={handleComplete} noValidate style={{ marginTop: 14 }}>
            <div className="admin-field">
              <label className="admin-label" htmlFor="atrCode">Recovery Code</label>
              <input
                id="atrCode"
                className="admin-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code from email"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
            <button className="admin-continue" type="submit" disabled={loadingComplete}>
              {loadingComplete ? "Verifying…" : "Submit Recovery Request"}
            </button>
          </form>
        )}

        <div className="admin-footer">
          <Link to="/" style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 700 }}>
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
