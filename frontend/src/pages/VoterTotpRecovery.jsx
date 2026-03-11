import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./VoterAuthPage.css";

const API = "http://localhost:8000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VoterTotpRecovery() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRequest(evt) {
    evt.preventDefault();
    setError("");
    setSuccess("");

    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoadingRequest(true);
    try {
      await axios.post(`${API}/auth/totp-recovery/request`, { email: normalized });
      setRequested(true);
      setSuccess("If the account is eligible, a recovery code has been sent.");
    } catch {
      setRequested(true);
      setSuccess("If the account is eligible, a recovery code has been sent.");
    } finally {
      setLoadingRequest(false);
    }
  }

  async function handleComplete(evt) {
    evt.preventDefault();
    setError("");
    setSuccess("");

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
      setSuccess(data?.detail || "TOTP reset completed.");
      setTimeout(() => navigate("/", { replace: true }), 3000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to complete recovery.");
    } finally {
      setLoadingComplete(false);
    }
  }

  return (
    <main className="voter-auth-shell">
      <section className="voter-auth-card" style={{ maxWidth: 520 }} aria-label="TOTP Recovery">
        <header className="voter-auth-header">
          <img className="voter-flag" src="/assets/nepal-flag.png" alt="Nepal national flag" />
          <h1 className="voter-title">Recover Authenticator Access</h1>
          <p className="voter-subtitle">Use your verified email to reset authenticator setup.</p>
        </header>

        {error && <div className="voter-error" role="alert">{error}</div>}
        {success && <div className="voter-success" role="status">{success}</div>}

        <form className="voter-form" onSubmit={handleRequest} noValidate>
          <div className="voter-field">
            <label className="voter-label" htmlFor="vtrEmail">Registered Email Address</label>
            <input
              id="vtrEmail"
              className="voter-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your verified email"
              autoComplete="email"
            />
          </div>
          <button className="voter-continue" type="submit" disabled={loadingRequest}>
            {loadingRequest ? "Sending…" : "Send Recovery Code"}
          </button>
        </form>

        {requested && (
          <form className="voter-form" onSubmit={handleComplete} noValidate style={{ marginTop: 14 }}>
            <div className="voter-field">
              <label className="voter-label" htmlFor="vtrCode">Recovery Code</label>
              <input
                id="vtrCode"
                className="voter-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code from email"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
            <button className="voter-continue" type="submit" disabled={loadingComplete}>
              {loadingComplete ? "Verifying…" : "Complete Recovery"}
            </button>
          </form>
        )}

        <footer className="voter-footer">
          <Link to="/" style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 700 }}>
            ← Back to login
          </Link>
        </footer>
      </section>
    </main>
  );
}
