import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./AdminAuthPage.css";

const API = "http://localhost:8000";
const RESEND_COOLDOWN = 60;

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("access_token")}` };
}

/** Show the first 2 chars of the local part, mask the rest. */
function maskEmail(email) {
  if (!email) return "your email address";
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const shown = local.slice(0, Math.min(2, local.length));
  const masked = "*".repeat(Math.max(0, local.length - shown.length));
  return `${shown}${masked}@${domain}`;
}

// step: "bootstrap" | "idle" | "verifying" | "done"
export default function AdminEmailVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get("token") ?? "";

  const [step, setStep] = useState("bootstrap");
  const [email, setEmail] = useState("");
  const [inputToken, setInputToken] = useState(urlToken);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cdRef = useRef(null);

  // Cleanup cooldown interval on unmount.
  useEffect(() => () => clearInterval(cdRef.current), []);

  async function doVerify(token) {
    setError("");
    setStep("verifying");
    try {
      await axios.post(
        `${API}/auth/verify-email`,
        { token },
        { headers: authHeaders() }
      );
      setStep("done");
      setTimeout(() => navigate("/totp-setup", { replace: true }), 2500);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Verification failed. Please try again."
      );
      setInputToken("");
      setStep("idle");
    }
  }

  // Bootstrap: verify auth, check if already verified, auto-submit URL token.
  useEffect(() => {
    const jwt = localStorage.getItem("access_token");
    if (!jwt) {
      navigate("/", { replace: true });
      return;
    }
    axios
      .get(`${API}/auth/me`, { headers: authHeaders() })
      .then(({ data }) => {
        if (data.email_verified) {
          navigate("/totp-setup", { replace: true });
          return;
        }
        setEmail(data.email ?? "");
        if (urlToken) {
          doVerify(urlToken);
        } else {
          setStep("idle");
        }
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("admin_mfa_ok");
        navigate("/", { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(evt) {
    evt.preventDefault();
    const t = inputToken.trim();
    if (!t) {
      setError("Please paste the token from your verification email.");
      return;
    }
    doVerify(t);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    try {
      await axios.post(
        `${API}/auth/resend-email-verification`,
        {},
        { headers: authHeaders() }
      );
    } catch {
      // Generic safe response — display nothing on error.
    }
    let secs = RESEND_COOLDOWN;
    setResendCooldown(secs);
    clearInterval(cdRef.current);
    cdRef.current = setInterval(() => {
      secs -= 1;
      setResendCooldown(secs);
      if (secs <= 0) clearInterval(cdRef.current);
    }, 1000);
  }

  return (
    <div className="admin-auth-shell">
      <div
        className="admin-auth-card"
        style={{ maxWidth: 520 }}
        aria-label="Email Verification"
      >
        <header className="admin-auth-header">
          <img
            className="admin-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />
          <h1 className="admin-title">Verify Your Email</h1>
          <p className="admin-subtitle">
            {email
              ? `We sent a link to ${maskEmail(email)}`
              : "Checking your account\u2026"}
          </p>
        </header>

        {/* ── Loading / Auto-verifying spinner ── */}
        {(step === "bootstrap" || step === "verifying") && (
          <p
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "var(--muted)",
              fontWeight: 700,
            }}
          >
            {step === "bootstrap"
              ? "Loading\u2026"
              : "Verifying your email\u2026"}
          </p>
        )}

        {/* ── Success ── */}
        {step === "done" && (
          <div style={{ padding: "8px 0 28px" }}>
            <div
              style={{
                background: "#f0fdf4",
                border: "2px solid #86efac",
                borderRadius: 12,
                padding: "16px 20px",
                color: "#166534",
                fontWeight: 800,
                fontSize: 14,
                textAlign: "center",
              }}
              role="status"
            >
              &#10003; Email verified successfully!
              <br />
              <span style={{ fontWeight: 400, fontSize: 13 }}>
                Redirecting to authenticator setup\u2026
              </span>
            </div>
          </div>
        )}

        {/* ── Idle: main form ── */}
        {step === "idle" && (
          <div className="admin-form">
            {error && (
              <div className="admin-error" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            {/* Info banner */}
            <div
              style={{
                background: "#f0f4ff",
                border: "1.5px solid #c5d2f8",
                borderLeft: "4px solid var(--primary-blue)",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 13.5,
                fontWeight: 600,
                color: "#1e3a8a",
                lineHeight: 1.65,
              }}
            >
              <strong>Check your inbox.</strong> We sent a verification link to{" "}
              <strong>{email ? maskEmail(email) : "your email"}</strong>. Click
              the link in the email, or paste the token below.
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "grid", gap: 12 }}
              noValidate
            >
              <div className="admin-field">
                <label className="admin-label" htmlFor="aevToken">
                  Verification token (paste from email)
                </label>
                <input
                  id="aevToken"
                  className="admin-input"
                  type="text"
                  placeholder="Paste the token from your email"
                  value={inputToken}
                  onChange={(e) => {
                    setInputToken(e.target.value);
                    setError("");
                  }}
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              <button
                type="submit"
                className="admin-continue"
                disabled={!inputToken.trim()}
              >
                Verify Email
              </button>
            </form>

            <button
              type="button"
              className="admin-mini-btn"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              style={{ width: "100%" }}
            >
              {resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : "Resend verification email"}
            </button>

            <div className="admin-footer">
              Online Voting System &mdash; Admin Portal
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
