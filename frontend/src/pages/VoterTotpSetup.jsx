import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { extractError } from "../lib/token";
import { totpSetup, totpVerify } from "../features/verification/api/verificationApi";
import "./VoterAuthPage.css";

function extractSecret(uri) {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

// step: "idle" | "pending" | "scan" | "challenge" | "verifying" | "done"
export default function VoterTotpSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState("idle");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleGenerate() {
    setError("");
    setStep("pending");
    try {
      const data = await totpSetup();
      setOtpauthUri(data.otpauth_uri);
      setStep("scan");
    } catch (err) {
      if (err?.response?.status === 400) {
        setStep("challenge");
        setError("TOTP is already set up. Enter your 6-digit code to continue.");
      } else {
        setError(extractError(err, "Setup failed. Please try again."));
        setStep("idle");
      }
    }
  }

  async function handleVerify(evt) {
    evt.preventDefault();
    setError("");
    setStep("verifying");
    try {
      await totpVerify(code);
      setStep("done");
      navigate("/home");
    } catch (err) {
      setError(extractError(err, "Verification failed. Try again."));
      setStep(otpauthUri ? "scan" : "challenge");
    }
  }

  const secret = otpauthUri ? extractSecret(otpauthUri) : "";

  return (
    <main className="voter-auth-shell">
      <section className="voter-auth-card" aria-label="Authenticator Setup">
        <header className="voter-auth-header">
          <img className="voter-flag" src="/assets/nepal-flag.png" alt="Nepal national flag" />
          <h1 className="voter-title">Authenticator Setup</h1>
          <p className="voter-subtitle">Secure your account with Microsoft Authenticator</p>
        </header>

        {error && (
          <div className="voter-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div className="voter-form">

          {/* ── idle / pending ── */}
          {(step === "idle" || step === "pending") && (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <ol style={{ textAlign: "left", marginBottom: 20, lineHeight: 1.7, color: "var(--muted, #475569)", fontSize: 14 }}>
                <li>Install <strong>Microsoft Authenticator</strong> on your phone.</li>
                <li>Tap <strong>"+"</strong> → <strong>"Other (Google, Facebook…)"</strong>.</li>
                <li>Click <strong>Generate Setup</strong> below and scan the QR code.</li>
                <li>Enter the 6-digit code shown in the app to complete setup.</li>
              </ol>
              <button
                type="button"
                className="voter-continue"
                onClick={handleGenerate}
                disabled={step === "pending"}
              >
                {step === "pending" ? "Generating\u2026" : "Generate Authenticator Setup"}
              </button>
            </div>
          )}

          {/* ── scan ── */}
          {step === "scan" && (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: 13, marginBottom: 12, color: "var(--muted, #475569)" }}>
                Scan this QR code in Microsoft Authenticator (<strong>Add account → Other → Scan</strong>):
              </p>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <QRCodeSVG
                  value={otpauthUri}
                  size={200}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, display: "block", margin: "0 auto" }}
                />
              </div>
              {secret && (
                <>
                  <p style={{ fontSize: 12, marginBottom: 4, color: "var(--muted, #475569)" }}>
                    Can't scan? Enter this key manually in the app:
                  </p>
                  <div style={{
                    background: "#f1f5f9", borderRadius: 8, padding: "8px 12px",
                    fontFamily: "monospace", fontSize: 13, wordBreak: "break-all",
                    marginBottom: 16, border: "1px solid #e2e8f0"
                  }}>
                    {secret}
                  </div>
                </>
              )}
              <form onSubmit={handleVerify}>
                <div className="voter-field" style={{ marginBottom: 12 }}>
                  <label className="voter-label" htmlFor="totpCode">
                    6-digit code from the app
                  </label>
                  <input
                    id="totpCode"
                    className="voter-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    autoComplete="one-time-code"
                  />
                </div>
                <button
                  type="submit"
                  className="voter-continue"
                  disabled={code.length !== 6 || step === "verifying"}
                >
                  {step === "verifying" ? "Verifying\u2026" : "Verify & Continue"}
                </button>
              </form>
            </div>
          )}

          {/* ── challenge (TOTP already set up, just verify) ── */}
          {step === "challenge" && (
            <form onSubmit={handleVerify} style={{ padding: "16px 0" }}>
              <div className="voter-field" style={{ marginBottom: 12 }}>
                <label className="voter-label" htmlFor="totpCodeChallenge">
                  6-digit code from Microsoft Authenticator
                </label>
                <input
                  id="totpCodeChallenge"
                  className="voter-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoComplete="one-time-code"
                />
              </div>
              <button
                type="submit"
                className="voter-continue"
                disabled={code.length !== 6 || step === "verifying"}
              >
                {step === "verifying" ? "Verifying\u2026" : "Verify & Continue"}
              </button>
            </form>
          )}

          <footer className="voter-footer" style={{ marginTop: 16 }}>Secure Authentication System</footer>
        </div>
      </section>
    </main>
  );
}
