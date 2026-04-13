import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaceLivenessDetector } from "@aws-amplify/ui-react-liveness";
import { Amplify } from "aws-amplify";
import apiClient from "../lib/apiClient";

/**
 * Pre-cast face verification modal.
 *
 * States: idle → starting_session → camera_ready → verifying_live_face →
 *         processing_result → (success callback) | verification_failed | locked | cancelled
 *
 * Props:
 *   open            – boolean, show/hide modal
 *   electionId      – current election ID
 *   onVerified      – (verificationContextToken: string) => void
 *   onCancel        – () => void
 */
export default function PreCastFaceVerificationModal({
  open,
  electionId,
  onVerified,
  onCancel,
}) {
  const [state, setState] = useState("idle");
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState("");
  const [failureInfo, setFailureInfo] = useState(null);
  const [lockInfo, setLockInfo] = useState(null);
  const amplifyConfigured = useRef(false);

  // Reset state when modal is opened
  useEffect(() => {
    if (open) {
      setState("idle");
      setSessionData(null);
      setError("");
      setFailureInfo(null);
      setLockInfo(null);
    }
  }, [open]);

  // Auto-start session when modal opens
  useEffect(() => {
    if (open && state === "idle") {
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startSession() {
    setState("starting_session");
    setError("");
    setFailureInfo(null);
    try {
      const res = await apiClient.post(
        `/voter/elections/${electionId}/face-session/start`,
        {}
      );
      const data = res.data;

      // Check for locked / cooldown responses (429)
      if (data.locked_until) {
        setLockInfo(data);
        setState("locked");
        return;
      }
      if (data.cooldown_seconds) {
        setError(
          `Please wait ${data.cooldown_seconds} seconds before retrying.`
        );
        setState("verification_failed");
        return;
      }

      // Configure Amplify for FaceLivenessDetector
      if (!amplifyConfigured.current && data.credentials && data.region) {
        Amplify.configure({
          Auth: {
            Cognito: {
              identityPoolId: "us-east-1:00000000-0000-0000-0000-000000000000",
              region: data.region,
            },
          },
        });
        amplifyConfigured.current = true;
      }

      setSessionData(data);
      setState("camera_ready");
    } catch (err) {
      const resp = err?.response?.data;
      if (err?.response?.status === 429) {
        if (resp?.locked_until) {
          setLockInfo(resp);
          setState("locked");
        } else {
          setError(resp?.detail || "Too many attempts. Please wait.");
          setState("verification_failed");
        }
      } else {
        setError(resp?.detail || "Failed to start face verification session.");
        setState("verification_failed");
      }
    }
  }

  const handleAnalysisComplete = useCallback(async () => {
    setState("processing_result");
    // The liveness challenge is done client-side.
    // The parent will use the verification_context_token to call verify-and-cast.
    if (sessionData?.verification_context_token) {
      onVerified(sessionData.verification_context_token);
    }
  }, [sessionData, onVerified]);

  const handleLivenessError = useCallback(
    (err) => {
      console.error("Liveness error:", err);
      setError(
        "Face verification challenge failed. Please ensure good lighting and try again."
      );
      setState("verification_failed");
    },
    []
  );

  function handleRetry() {
    setState("idle");
    setSessionData(null);
    setError("");
    setFailureInfo(null);
    // Re-trigger session start
    setTimeout(() => startSession(), 100);
  }

  function handleCancel() {
    setState("cancelled");
    onCancel();
  }

  if (!open) return null;

  // ── Time remaining for lock ────────────────────────────
  const lockRemaining = lockInfo?.locked_until
    ? Math.max(
        0,
        Math.ceil(
          (new Date(lockInfo.locked_until).getTime() - Date.now()) / 1000
        )
      )
    : 0;
  const lockMinutes = Math.ceil(lockRemaining / 60);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* ── Header ── */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={shieldIconStyle}>🛡️</div>
            <div>
              <h2 style={titleStyle}>Identity Verification</h2>
              <p style={subtitleStyle}>
                A live camera check is required to verify your identity before
                casting your vote.
              </p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={bodyStyle}>
          {/* STARTING SESSION */}
          {state === "starting_session" && (
            <div style={centeredStyle}>
              <div style={spinnerStyle} />
              <p style={statusText}>Preparing secure verification…</p>
            </div>
          )}

          {/* CAMERA READY / LIVENESS CHALLENGE */}
          {(state === "camera_ready" || state === "verifying_live_face") &&
            sessionData && (
              <div style={{ width: "100%", minHeight: 400 }}>
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#eff6ff",
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 13,
                    color: "#1e40af",
                    textAlign: "center",
                  }}
                >
                  Follow the on-screen instructions. Keep your face centered and
                  well-lit.
                </div>
                <FaceLivenessDetector
                  sessionId={sessionData.provider_session_id}
                  region={sessionData.region}
                  onAnalysisComplete={handleAnalysisComplete}
                  onError={handleLivenessError}
                  config={{
                    credentialProvider: async () => ({
                      accessKeyId: sessionData.credentials.access_key_id,
                      secretAccessKey: sessionData.credentials.secret_access_key,
                      sessionToken: sessionData.credentials.session_token,
                    }),
                  }}
                />
              </div>
            )}

          {/* PROCESSING RESULT */}
          {state === "processing_result" && (
            <div style={centeredStyle}>
              <div style={spinnerStyle} />
              <p style={statusText}>Verifying your identity…</p>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Please wait, do not close this window.
              </p>
            </div>
          )}

          {/* VERIFICATION FAILED */}
          {state === "verification_failed" && (
            <div style={centeredStyle}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
              <h3
                style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}
              >
                Verification Failed
              </h3>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 4, textAlign: "center" }}>
                {error || "Face verification did not pass. Please try again."}
              </p>
              {failureInfo?.remaining_attempts != null && (
                <p
                  style={{
                    fontSize: 13,
                    color: "#92400e",
                    background: "#fef3c7",
                    padding: "6px 16px",
                    borderRadius: 6,
                    marginTop: 8,
                  }}
                >
                  {failureInfo.remaining_attempts > 0
                    ? `${failureInfo.remaining_attempts} attempt${failureInfo.remaining_attempts !== 1 ? "s" : ""} remaining`
                    : "No attempts remaining"}
                </p>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={handleCancel} style={secondaryBtnStyle}>
                  Cancel
                </button>
                {(!failureInfo || failureInfo.remaining_attempts > 0) && (
                  <button onClick={handleRetry} style={primaryBtnStyle}>
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* LOCKED */}
          {state === "locked" && (
            <div style={centeredStyle}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#dc2626",
                  marginBottom: 8,
                }}
              >
                Temporarily Locked
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                Face verification has been temporarily locked for this election
                due to multiple failed attempts.
              </p>
              {lockRemaining > 0 && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#991b1b",
                  }}
                >
                  Try again in approximately {lockMinutes} minute
                  {lockMinutes !== 1 ? "s" : ""}
                </div>
              )}
              <button
                onClick={handleCancel}
                style={{ ...secondaryBtnStyle, marginTop: 20 }}
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* ── Footer — cancel shown only in camera states ── */}
        {(state === "camera_ready" || state === "starting_session") && (
          <div style={footerStyle}>
            <button onClick={handleCancel} style={secondaryBtnStyle}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Expose a helper so parent can set failure info from verify-and-cast response
PreCastFaceVerificationModal.parseVerifyError = function (responseData) {
  if (responseData?.reason_code === "FACE_LOCKED") {
    return { type: "locked", data: responseData };
  }
  if (responseData?.reason_code) {
    return { type: "failure", data: responseData };
  }
  return { type: "error", data: responseData };
};

/* ── Styles ── */

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
  backdropFilter: "blur(4px)",
};

const modalStyle = {
  background: "#fff",
  borderRadius: 16,
  maxWidth: 560,
  width: "94%",
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
  display: "flex",
  flexDirection: "column",
};

const headerStyle = {
  padding: "20px 24px 16px",
  borderBottom: "1px solid #e2e8f0",
};

const shieldIconStyle = {
  fontSize: 28,
  lineHeight: 1,
};

const titleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: "#1e293b",
  margin: 0,
};

const subtitleStyle = {
  fontSize: 13,
  color: "#64748b",
  margin: "4px 0 0",
};

const bodyStyle = {
  padding: 24,
  flex: 1,
  minHeight: 200,
};

const footerStyle = {
  padding: "12px 24px 20px",
  borderTop: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "flex-end",
};

const centeredStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 0",
};

const statusText = {
  fontSize: 15,
  color: "#475569",
  fontWeight: 500,
  marginTop: 16,
};

const spinnerStyle = {
  width: 40,
  height: 40,
  border: "4px solid #e2e8f0",
  borderTopColor: "#2563eb",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const primaryBtnStyle = {
  padding: "10px 24px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

const secondaryBtnStyle = {
  padding: "10px 24px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  background: "#fff",
  color: "#64748b",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
};
