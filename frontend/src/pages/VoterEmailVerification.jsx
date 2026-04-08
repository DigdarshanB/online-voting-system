import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getToken, clearToken } from "../lib/authStorage";
import { extractError } from "../lib/token";
import { fetchMe, verifyEmail, resendEmailVerification } from "../features/auth/api/authApi";
import "./VoterAuthPage.css";

const RESEND_COOLDOWN = 60;

/** Show the first 2 chars of the local part, mask the rest. */
function maskEmail(email) {
  if (!email) return "your email address";
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const shown = local.slice(0, Math.min(2, local.length));
  const masked = "*".repeat(Math.max(0, local.length - shown.length));
  return `${shown}${masked}@${domain}`;
}

/** Determine the next route based on /me data (same logic as login handler). */
function resolveNextRoute(me) {
  if (me.status === "ACTIVE" && me.totp_enabled) return "/home";
  if (me.status === "ACTIVE" && !me.totp_enabled) return "/totp-setup";
  if (me.status === "PENDING_FACE") return "/face-verification";
  return "/totp-setup";
}

// step: "bootstrap" | "idle" | "verifying" | "done"
export default function VoterEmailVerification() {
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
      await verifyEmail(token);
      const me = await fetchMe();
      setStep("done");
      setTimeout(() => navigate(resolveNextRoute(me), { replace: true }), 2500);
    } catch (err) {
      setError(extractError(err, "Verification failed. Please try again."));
      setInputToken("");
      setStep("idle");
    }
  }

  // Bootstrap: verify auth, check if already verified, auto-submit URL token.
  useEffect(() => {
    if (!getToken()) {
      navigate("/", { replace: true });
      return;
    }
    fetchMe()
      .then((data) => {
        if (data.email_verified) {
          navigate(resolveNextRoute(data), { replace: true });
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
        clearToken();
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
      await resendEmailVerification();
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
    <main className="voter-auth-shell">
      <section
        className="voter-auth-card"
        style={{ maxWidth: 520 }}
        aria-label="Email Verification"
      >
        <header className="voter-auth-header">
          <img
            className="voter-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />
          <h1 className="voter-title">Verify Your Email</h1>
          <p className="voter-subtitle">
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
            {step === "bootstrap" ? "Loading\u2026" : "Verifying your email\u2026"}
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
                Redirecting to your next step\u2026
              </span>
            </div>
          </div>
        )}

        {/* ── Idle: main form ── */}
        {step === "idle" && (
          <div className="voter-form">
            {error && (
              <div className="voter-error" role="alert" aria-live="polite">
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
              <div className="voter-field">
                <label className="voter-label" htmlFor="vevToken">
                  Verification token (paste from email)
                </label>
                <input
                  id="vevToken"
                  className="voter-input"
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
                className="voter-continue"
                disabled={!inputToken.trim()}
              >
                Verify Email
              </button>
            </form>

            <button
              type="button"
              className="voter-mini-btn"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              style={{ width: "100%" }}
            >
              {resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : "Resend verification email"}
            </button>

            <footer className="voter-footer">Secure Authentication System</footer>
          </div>
        )}
      </section>
    </main>
  );
}
