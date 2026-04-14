import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { setToken } from "../lib/authStorage";
import { verifyLoginMfa } from "../features/auth/api/authApi";
import { extractError } from "../lib/token";
import OtpInput from "../components/OtpInput";
import "./VoterAuthPage.css";

export default function VoterLoginMfa() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("mfa_token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    setMfaToken(token);
  }, [navigate]);

  async function handleVerify(evt) {
    evt.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await verifyLoginMfa(mfaToken, code);
      // MFA succeeded – store the real access token
      sessionStorage.removeItem("mfa_token");
      setToken(data.access_token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string" && detail.includes("expired")) {
        // MFA challenge expired – send back to login
        sessionStorage.removeItem("mfa_token");
        setError("Session expired. Please log in again.");
        setTimeout(() => navigate("/", { replace: true }), 2000);
      } else {
        setError(
          typeof detail === "string" && detail
            ? detail
            : extractError(err, "Verification failed. Please try again.")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (!mfaToken) return null;

  return (
    <main className="voter-auth-shell">
      <section className="voter-auth-card" aria-label="Authenticator Verification">
        <header className="voter-auth-header">
          <img className="voter-flag" src="/assets/nepal-flag.png" alt="Nepal national flag" />
          <h1 className="voter-title">Authenticator Verification</h1>
          <p className="voter-subtitle">Enter the code from your authenticator app to continue</p>
        </header>

        {error && (
          <div className="voter-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form className="voter-form" onSubmit={handleVerify}>
          <div className="voter-field" style={{ marginBottom: 12, textAlign: "center" }}>
            <label className="voter-label" style={{ display: "block", textAlign: "center", marginBottom: 10 }}>
              6-digit code from Microsoft Authenticator
            </label>
            <OtpInput
              value={code}
              onChange={(val) => { setCode(val); setError(""); }}
              autoFocus
              disabled={loading}
              hasError={!!error}
              ariaLabel="Authenticator verification code"
            />
          </div>
          <button
            type="submit"
            className="voter-continue"
            disabled={code.length !== 6 || loading}
          >
            {loading ? "Verifying\u2026" : "Verify & Login"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/totp-recovery" style={{ fontSize: 13, color: "var(--primary, #1e40af)" }}>
            Lost access to authenticator?
          </Link>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <Link to="/" style={{ fontSize: 13, color: "var(--muted, #475569)" }}>
            ← Back to Login
          </Link>
        </div>

        <footer className="voter-footer" style={{ marginTop: 16 }}>Secure Authentication System</footer>
      </section>
    </main>
  );
}
