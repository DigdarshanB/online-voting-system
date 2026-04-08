import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../features/auth/api/authApi";
import "./VoterAuthPage.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VoterForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(evt) {
    evt.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(trimmed);
    } catch {
      // Always show success — never leak whether the email exists.
    } finally {
      setLoading(false);
    }
    setSubmitted(true);
  }

  return (
    <main className="voter-auth-shell">
      <section
        className="voter-auth-card"
        style={{ maxWidth: 480 }}
        aria-label="Forgot Password"
      >
        <header className="voter-auth-header">
          <img
            className="voter-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />
          <h1 className="voter-title">Forgot Password</h1>
          <p className="voter-subtitle">
            Enter your registered email and we&apos;ll send you a reset code.
          </p>
        </header>

        {submitted ? (
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
              If an account with that email exists, a reset code has been sent.
              <br />
              <span style={{ fontWeight: 400, fontSize: 13, color: "#15803d" }}>
                Check your inbox (and spam folder). The code expires in 15&nbsp;minutes.
              </span>
            </div>

            <p
              style={{
                textAlign: "center",
                marginTop: 20,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--muted)",
              }}
            >
              Have your code?{" "}
              <Link
                to={`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                style={{ color: "var(--primary-blue)", fontWeight: 900 }}
              >
                Enter reset code &rarr;
              </Link>
            </p>

            <p style={{ textAlign: "center", marginTop: 10, fontSize: 13 }}>
              <Link
                to="/"
                style={{
                  color: "var(--muted)",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                &larr; Back to login
              </Link>
            </p>
          </div>
        ) : (
          <form className="voter-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="voter-error" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <div className="voter-field">
              <label className="voter-label" htmlFor="fpEmail">
                Registered Email Address
              </label>
              <input
                id="fpEmail"
                className="voter-input"
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <button className="voter-continue" type="submit" disabled={loading}>
              {loading ? "Sending\u2026" : "Send Reset Code"}
            </button>

            <footer className="voter-footer">
              <Link
                to="/"
                style={{
                  color: "var(--muted)",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                &larr; Back to login
              </Link>
            </footer>
          </form>
        )}
      </section>
    </main>
  );
}
