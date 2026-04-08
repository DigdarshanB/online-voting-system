import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { extractError } from "../lib/token";
import {
  registrationTotpSetup,
  registrationTotpVerify,
  getRegistrationStatus,
  uploadRegistrationDocument,
  uploadRegistrationFace,
} from "../features/auth/api/authApi";
import "./VoterAuthPage.css";
import "./VoterFaceVerification.css";

function extractSecret(uri) {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

/**
 * Multi-step registration verification flow (unauthenticated).
 *
 * Steps:
 *   PENDING_TOTP     → set up authenticator app (QR code + verify)
 *   PENDING_DOCUMENT → upload citizenship document
 *   PENDING_FACE     → live camera face capture
 *   PENDING_REVIEW   → waiting for admin approval
 *   APPROVED         → redirect to login
 *   REJECTED         → show rejection reason
 */
export default function VoterRegistrationVerify() {
  const navigate = useNavigate();
  const regId = localStorage.getItem("pending_registration_id");

  const [step, setStep] = useState("loading");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // TOTP setup
  const [totpStep, setTotpStep] = useState("idle"); // idle | pending | scan | verifying
  const [otpauthUri, setOtpauthUri] = useState("");
  const [totpCode, setTotpCode] = useState("");

  // File upload (document only)
  const fileInputRef = useRef(null);

  // ── Live camera capture for face step ──────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState("off");
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [cameraError, setCameraError] = useState("");

  // ── Cleanup camera stream on unmount ──────────────────────
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ── Camera callback ref ───────────────────────────────────
  const attachStream = useCallback(
    (videoEl) => {
      videoRef.current = videoEl;
      if (videoEl && streamRef.current && videoEl.srcObject !== streamRef.current) {
        videoEl.srcObject = streamRef.current;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cameraState]
  );

  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraState("opening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setCameraState("off");
      if (err.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "NotReadableError") {
        setCameraError("No camera found or camera is in use by another app.");
      } else {
        setCameraError(`Could not access camera: ${err.message}`);
      }
    }
  }, []);

  const handleVideoPlaying = useCallback(() => {
    const v = videoRef.current;
    if (v && v.videoWidth > 0 && v.videoHeight > 0) setCameraState("ready");
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("off");
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) { setCameraError("Camera not ready yet."); return; }
    canvas.width = vw; canvas.height = vh;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vw, vh);
    canvas.toBlob((blob) => {
      if (!blob || blob.size < 1000) { setCameraError("Capture failed. Please try again."); return; }
      setCapturedImage(URL.createObjectURL(blob));
      setCapturedBlob(blob);
      setCameraState("captured");
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      if (videoRef.current) videoRef.current.srcObject = null;
    }, "image/jpeg", 0.92);
  }, []);

  const retakePhoto = useCallback(() => {
    if (capturedImage) URL.revokeObjectURL(capturedImage);
    setCapturedImage(null); setCapturedBlob(null); setCameraError(""); startCamera();
  }, [startCamera, capturedImage]);

  // ── Status refresh ─────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    if (!regId) { navigate("/", { replace: true }); return; }
    try {
      const data = await getRegistrationStatus(regId);
      setStep(data.status);
      if (data.status === "APPROVED") {
        localStorage.removeItem("pending_registration_id");
      }
    } catch {
      navigate("/", { replace: true });
    }
  }, [regId, navigate]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  // ── TOTP: generate QR ─────────────────────────────────────
  async function handleTotpGenerate() {
    setError("");
    setTotpStep("pending");
    try {
      const data = await registrationTotpSetup(Number(regId));
      setOtpauthUri(data.otpauth_uri);
      setTotpStep("scan");
    } catch (err) {
      setError(extractError(err, "Setup failed. Please try again."));
      setTotpStep("idle");
    }
  }

  // ── TOTP: verify code ─────────────────────────────────────
  async function handleTotpVerify(e) {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setError("");
    setTotpStep("verifying");
    try {
      await registrationTotpVerify(Number(regId), totpCode);
      setSuccess("Authenticator verified! Proceeding to document upload...");
      setTimeout(() => { setSuccess(""); refreshStatus(); }, 1500);
    } catch (err) {
      setError(extractError(err, "Invalid code. Please try again."));
      setTotpStep("scan");
    }
  }

  // ── Document upload ────────────────────────────────────────
  async function handleDocUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(""); setLoading(true);
    try {
      await uploadRegistrationDocument(Number(regId), file);
      setSuccess("Document uploaded! Proceeding to face verification...");
      setTimeout(() => { setSuccess(""); refreshStatus(); }, 1500);
    } catch (err) {
      setError(extractError(err, "Upload failed. Please try again."));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Face capture submission ────────────────────────────────
  async function handleFaceSubmit() {
    if (!capturedBlob) return;
    setError(""); setLoading(true);
    try {
      await uploadRegistrationFace(Number(regId), capturedBlob);
      setSuccess("Face photo submitted! Your registration is now under review.");
      stopCamera();
      setTimeout(() => { setSuccess(""); refreshStatus(); }, 2000);
    } catch (err) {
      setError(extractError(err, "Upload failed. Please try again."));
    } finally { setLoading(false); }
  }

  // ── Derived ────────────────────────────────────────────────
  const secret = otpauthUri ? extractSecret(otpauthUri) : "";
  const STEP_LABELS = ["Authenticator", "Document", "Face", "Review"];
  const STEP_KEYS = ["PENDING_TOTP", "PENDING_DOCUMENT", "PENDING_FACE", "PENDING_REVIEW"];
  const currentIndex = STEP_KEYS.indexOf(step);

  // ── Render ─────────────────────────────────────────────────
  return (
    <main className="voter-auth-shell">
      <canvas ref={canvasRef} style={{ display: "none" }} aria-hidden="true" />

      <section
        className="voter-auth-card"
        style={{ maxWidth: step === "PENDING_FACE" ? 900 : step === "PENDING_TOTP" ? 580 : 540 }}
        aria-label="Registration Verification"
      >
        <header className="voter-auth-header">
          <img className="voter-flag" src="/assets/nepal-flag.png" alt="Nepal national flag" />
          <h1 className="voter-title">Complete Registration</h1>
          <p className="voter-subtitle">
            {step === "PENDING_TOTP" && "Set up your authenticator app"}
            {step === "PENDING_DOCUMENT" && "Upload your citizenship document"}
            {step === "PENDING_FACE" && "Take a live face photo"}
            {step === "PENDING_REVIEW" && "Awaiting admin review"}
            {step === "APPROVED" && "Registration approved!"}
            {step === "REJECTED" && "Registration rejected"}
            {step === "loading" && "Loading..."}
          </p>
        </header>

        {/* Progress indicator */}
        {currentIndex >= 0 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "12px 0 20px" }}>
            {STEP_LABELS.map((label, i) => {
              const isDone = i < currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={label} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", margin: "0 auto 5px",
                    background: isDone ? "#22c55e" : isCurrent ? "#2563eb" : "#e2e8f0",
                    color: isDone || isCurrent ? "#fff" : "#94a3b8",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800,
                    boxShadow: isCurrent ? "0 2px 10px rgba(37,99,235,0.35)" : "none",
                    transition: "all 0.3s ease",
                  }}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: isCurrent ? 800 : 500,
                    color: isCurrent ? "#1e3a8a" : isDone ? "#16a34a" : "#94a3b8",
                    letterSpacing: "0.2px",
                  }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {error && <div className="voter-error" role="alert" aria-live="polite">{error}</div>}
        {success && <div className="voter-success" role="status" aria-live="polite">{success}</div>}

        {/* ════════════════════════════════════════════════════
            Step 1: TOTP Authenticator Setup
            ════════════════════════════════════════════════════ */}
        {step === "PENDING_TOTP" && (
          <div className="voter-form">

            {/* Idle — instructions + generate button */}
            {(totpStep === "idle" || totpStep === "pending") && (
              <div style={{ padding: "8px 0" }}>
                <div style={{
                  background: "linear-gradient(135deg, #eff6ff 0%, #f0f4ff 100%)",
                  border: "1.5px solid #c5d2f8",
                  borderLeft: "4px solid #2563eb",
                  borderRadius: 12,
                  padding: "18px 18px 16px",
                  marginBottom: 20,
                }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 10 }}>
                    🔐 Secure your account with an Authenticator App
                  </p>
                  <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.65, marginBottom: 12 }}>
                    You'll use this app to verify your identity each time you log in.
                    This protects your vote even if someone knows your password.
                  </p>
                  <ol style={{
                    fontSize: 13, color: "#475569", lineHeight: 1.8, margin: 0,
                    paddingLeft: 20,
                  }}>
                    <li>Install <strong>Microsoft Authenticator</strong> on your phone</li>
                    <li>Tap <strong>"+"</strong> → <strong>"Other account"</strong></li>
                    <li>Click <strong>Generate QR Code</strong> below and scan it</li>
                    <li>Enter the 6-digit code shown in the app</li>
                  </ol>
                </div>

                <button
                  type="button"
                  className="voter-continue"
                  onClick={handleTotpGenerate}
                  disabled={totpStep === "pending"}
                  style={{ width: "100%" }}
                >
                  {totpStep === "pending" ? "Generating…" : "Generate QR Code"}
                </button>
              </div>
            )}

            {/* Scan — QR code + manual key + verify input */}
            {(totpStep === "scan" || totpStep === "verifying") && (
              <div style={{ padding: "4px 0" }}>
                {/* QR section */}
                <div style={{
                  background: "#ffffff",
                  border: "2px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "20px 16px",
                  textAlign: "center",
                  marginBottom: 16,
                }}>
                  <p style={{ fontSize: 13, color: "#475569", marginBottom: 14, fontWeight: 600 }}>
                    Scan this QR code with Microsoft Authenticator
                  </p>
                  <div style={{
                    display: "inline-block",
                    padding: 12,
                    background: "#fff",
                    border: "2px solid #f1f5f9",
                    borderRadius: 12,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                  }}>
                    <QRCodeSVG
                      value={otpauthUri}
                      size={200}
                      level="M"
                      style={{ display: "block" }}
                    />
                  </div>

                  {secret && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>
                        Can't scan? Enter this key manually:
                      </p>
                      <div style={{
                        background: "#f8fafc",
                        border: "1.5px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontFamily: "monospace",
                        fontSize: 13,
                        wordBreak: "break-all",
                        userSelect: "all",
                        color: "#334155",
                        letterSpacing: "0.5px",
                      }}>
                        {secret}
                      </div>
                    </div>
                  )}
                </div>

                {/* Verify code input */}
                <form onSubmit={handleTotpVerify} style={{ display: "grid", gap: 12 }}>
                  <div className="voter-field">
                    <label className="voter-label" htmlFor="regTotpCode">
                      Enter the 6-digit code from your app
                    </label>
                    <input
                      id="regTotpCode"
                      className="voter-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                      autoComplete="one-time-code"
                      style={{
                        textAlign: "center",
                        fontSize: 22,
                        fontWeight: 800,
                        letterSpacing: "6px",
                        fontFamily: "monospace",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="voter-continue"
                    disabled={totpCode.length !== 6 || totpStep === "verifying"}
                    style={{ width: "100%" }}
                  >
                    {totpStep === "verifying" ? "Verifying…" : "Verify & Continue"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Step 2: Document Upload
            ════════════════════════════════════════════════════ */}
        {step === "PENDING_DOCUMENT" && (
          <div className="voter-form" style={{ textAlign: "center" }}>
            <div style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #f0f4ff 100%)",
              border: "1.5px solid #c5d2f8", borderLeft: "4px solid #2563eb",
              borderRadius: 12, padding: "16px 18px", fontSize: 13.5, fontWeight: 600,
              color: "#1e3a8a", lineHeight: 1.65, marginBottom: 18, textAlign: "left",
            }}>
              Upload a clear photo of your <strong>citizenship document</strong>.
              <span style={{ display: "block", fontSize: 12, color: "#475569", fontWeight: 500, marginTop: 4 }}>
                Accepted formats: JPEG, PNG (max 5 MB)
              </span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={handleDocUpload} />
            <button type="button" className="voter-continue" disabled={loading}
              onClick={() => fileInputRef.current?.click()}>
              {loading ? "Uploading..." : "Upload Citizenship Document"}
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Step 3: Live Face Capture
            ════════════════════════════════════════════════════ */}
        {step === "PENDING_FACE" && (
          <div className="voter-form">
            {cameraError && (
              <div className="voter-error" role="alert" aria-live="polite">{cameraError}</div>
            )}

            <div className="fv-body">
              <div className="fv-camera-col">
                <div className={`fv-camera-box fv-camera-box--${cameraState}`}>
                  {cameraState === "off" && (
                    <div className="fv-camera-placeholder">
                      <svg className="fv-camera-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <rect x="4" y="13" width="40" height="28" rx="5" stroke="currentColor" strokeWidth="2.4" />
                        <circle cx="24" cy="27" r="8.5" stroke="currentColor" strokeWidth="2.4" />
                        <circle cx="24" cy="27" r="3.5" fill="currentColor" />
                        <path d="M17 13l2.5-5.5h9L31 13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="38" cy="19" r="2" fill="currentColor" />
                      </svg>
                      <p className="fv-placeholder-label">Camera preview will appear here</p>
                      <p className="fv-placeholder-hint">Click &ldquo;Open Camera&rdquo; below to begin</p>
                    </div>
                  )}
                  {(cameraState === "opening" || cameraState === "ready") && (
                    <>
                      <video ref={attachStream} autoPlay playsInline muted onPlaying={handleVideoPlaying} className="fv-video" />
                      {cameraState === "ready" && (
                        <>
                          <div className="fv-guide-overlay" aria-hidden="true"><div className="fv-guide-oval" /></div>
                          <div className="fv-live-badge" aria-hidden="true"><span className="fv-live-dot" />Live</div>
                        </>
                      )}
                      {cameraState === "opening" && (
                        <div className="fv-camera-loader">
                          <div className="fv-spinner-ring" />
                          <p className="fv-loader-text">Requesting camera access&hellip;</p>
                        </div>
                      )}
                    </>
                  )}
                  {cameraState === "captured" && capturedImage && (
                    <>
                      <img src={capturedImage} alt="Captured face" className="fv-captured-preview" />
                      <div className="fv-captured-badge" aria-live="polite">
                        <span className="fv-captured-check" aria-hidden="true">&#10003;</span>
                        Photo captured
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="fv-info-col">
                <div className="fv-requirement-banner" role="note">
                  <p className="fv-requirement-text">Make sure your full face and both ears are visible.</p>
                </div>
                <div className="fv-instructions-card">
                  <p className="fv-instructions-title">Photo requirements</p>
                  <ul className="fv-instruction-list">
                    <li className="fv-instruction-item">Look straight at the camera</li>
                    <li className="fv-instruction-item">Both ears must be fully visible</li>
                    <li className="fv-instruction-item">Use good, even lighting — avoid shadows</li>
                    <li className="fv-instruction-item">Plain background preferred</li>
                    <li className="fv-instruction-item">No hat, mask, or sunglasses</li>
                    <li className="fv-instruction-item">Only one person in the frame</li>
                  </ul>
                </div>
                <div className="fv-security-note" role="note">
                  <span className="fv-security-icon" aria-hidden="true">&#128274;</span>
                  <span>A live camera photo is required. File uploads are not accepted.</span>
                </div>
              </div>
            </div>

            <div className="fv-actions">
              {cameraState === "off" && (
                <button type="button" className="fv-btn fv-btn--primary" onClick={startCamera}>Open Camera</button>
              )}
              {cameraState === "opening" && (
                <button type="button" className="fv-btn fv-btn--primary" disabled>
                  <span className="fv-btn-inner-spinner" aria-hidden="true" />Opening Camera&hellip;
                </button>
              )}
              {cameraState === "ready" && (
                <button type="button" className="fv-btn fv-btn--success" onClick={capturePhoto}>Capture Photo</button>
              )}
              {cameraState === "captured" && capturedImage && (
                <div className="fv-action-row">
                  <button type="button" className="fv-btn fv-btn--muted" onClick={retakePhoto} disabled={loading}>Retake</button>
                  <button type="button" className="fv-btn fv-btn--primary" onClick={handleFaceSubmit} disabled={loading}>
                    {loading ? "Submitting…" : "Submit Photo"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Step 4: Pending Review
            ════════════════════════════════════════════════════ */}
        {step === "PENDING_REVIEW" && (
          <div className="voter-form" style={{ textAlign: "center" }}>
            <div style={{
              background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
              border: "2px solid #fbbf24", borderRadius: 14,
              padding: "28px 24px", color: "#92400e",
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
              <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Your registration is under review</p>
              <p style={{ fontWeight: 400, fontSize: 13, color: "#a16207", lineHeight: 1.6 }}>
                An administrator will verify your documents and face photo.
                Once approved, you can log in with your citizenship ID, password, and authenticator code.
              </p>
            </div>
            <button type="button" className="voter-mini-btn" style={{ marginTop: 18 }}
              onClick={() => { localStorage.removeItem("pending_registration_id"); navigate("/"); }}>
              Return to Login
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Approved
            ════════════════════════════════════════════════════ */}
        {step === "APPROVED" && (
          <div className="voter-form" style={{ textAlign: "center" }}>
            <div style={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
              border: "2px solid #86efac", borderRadius: 14,
              padding: "28px 24px", color: "#166534",
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Registration Approved!</p>
              <p style={{ fontWeight: 400, fontSize: 13, color: "#15803d", lineHeight: 1.6 }}>
                Your voter account has been created. Log in with your citizenship ID, password,
                and 6-digit code from Microsoft Authenticator.
              </p>
            </div>
            <button type="button" className="voter-continue" style={{ marginTop: 18 }}
              onClick={() => navigate("/")}>
              Go to Login
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            Rejected
            ════════════════════════════════════════════════════ */}
        {step === "REJECTED" && (
          <div className="voter-form" style={{ textAlign: "center" }}>
            <div style={{
              background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
              border: "2px solid #fca5a5", borderRadius: 14,
              padding: "28px 24px", color: "#991b1b",
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>❌</div>
              <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Registration Rejected</p>
              <p style={{ fontWeight: 400, fontSize: 13, color: "#b91c1c", lineHeight: 1.6 }}>
                Your registration was not approved. You may submit a new registration with correct documents.
              </p>
            </div>
            <button type="button" className="voter-continue" style={{ marginTop: 18 }}
              onClick={() => { localStorage.removeItem("pending_registration_id"); navigate("/"); }}>
              Return to Registration
            </button>
          </div>
        )}

        <footer className="voter-footer" style={{ marginTop: 20 }}>Secure Authentication System</footer>
      </section>
    </main>
  );
}
