import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, clearToken } from "../lib/authStorage";
import { extractError } from "../lib/token";
import { fetchMe } from "../features/auth/api/authApi";
import { uploadFace } from "../features/verification/api/verificationApi";
import "./VoterAuthPage.css";
import "./VoterFaceVerification.css";

/**
 * Camera states:
 *   "off"       – camera not started
 *   "opening"   – getUserMedia called, waiting for stream
 *   "ready"     – stream attached AND video is playing real frames
 *   "captured"  – a photo has been captured from the live feed
 */

export default function VoterFaceVerification() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // "off" | "opening" | "ready" | "captured"
  const [cameraState, setCameraState] = useState("off");
  const [capturedImage, setCapturedImage] = useState(null); // object URL for preview
  const [capturedBlob, setCapturedBlob] = useState(null);   // Blob ready for upload
  const [cameraError, setCameraError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ type: "", text: "" });

  // ── Auth check on mount ────────────────────────────────────
  useEffect(() => {
    if (!getToken()) {
      navigate("/");
      return;
    }
    fetchMe()
      .then((data) => {
        if (data.status === "ACTIVE" && data.totp_enabled) {
          navigate("/dashboard");
        } else if (data.status === "PENDING_REVIEW") {
          navigate("/status");
        } else if (data.status === "PENDING_DOCUMENT") {
          navigate("/status");
        }
        // PENDING_FACE is the expected state — stay on this page
      })
      .catch(() => {
        clearToken();
        navigate("/");
      });
  }, [navigate]);

  // ── Cleanup camera on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── KEY FIX: callback ref that re-runs when cameraState changes ──
  // The <video> only exists in the DOM when isCameraLive is true. Using a
  // callback ref ensures srcObject is attached whenever the element mounts,
  // regardless of whether getCameraState changed before or after React rendered.
  const attachStream = useCallback(
    (videoEl) => {
      videoRef.current = videoEl;
      if (videoEl && streamRef.current && videoEl.srcObject !== streamRef.current) {
        videoEl.srcObject = streamRef.current;
        console.log("[FaceVerify] Stream attached to video element");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cameraState]
  );

  // ── Open camera ───────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraState("opening");
    console.log("[FaceVerify] Requesting camera access...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      console.log("[FaceVerify] Got media stream, tracks:", stream.getTracks().length);

      // If the video element already exists in the DOM, attach immediately.
      // If not yet mounted, the attachStream callback ref will handle it.
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log("[FaceVerify] Stream attached to existing video element");
      }
    } catch (err) {
      console.error("[FaceVerify] Camera access error:", err.name, err.message);
      setCameraState("off");
      if (err.name === "NotAllowedError") {
        setCameraError(
          "Camera permission denied. Please allow camera access in your browser settings."
        );
      } else if (err.name === "NotFoundError" || err.name === "NotReadableError") {
        setCameraError("No camera found or camera is in use by another app.");
      } else {
        setCameraError(`Could not access camera: ${err.message}`);
      }
    }
  }, []);

  // ── Called when the <video> starts delivering real frames ──
  const handleVideoPlaying = useCallback(() => {
    const v = videoRef.current;
    console.log(
      "[FaceVerify] Video playing event — videoWidth:",
      v?.videoWidth,
      "videoHeight:",
      v?.videoHeight,
      "readyState:",
      v?.readyState
    );
    if (v && v.videoWidth > 0 && v.videoHeight > 0) {
      setCameraState("ready");
      console.log("[FaceVerify] Camera READY with real frames");
    }
  }, []);

  // ── Stop camera ───────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState("off");
    console.log("[FaceVerify] Camera stopped");
  }, []);

  // ── Capture a frame from the live video ──────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      console.warn("[FaceVerify] capturePhoto: video or canvas ref missing");
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    console.log("[FaceVerify] Capturing — videoWidth:", vw, "videoHeight:", vh);

    if (!vw || !vh) {
      console.warn("[FaceVerify] Cannot capture: video dimensions are 0");
      setCameraError("Camera not ready yet. Please wait a moment and try again.");
      return;
    }

    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");

    // Mirror horizontally to match the mirrored preview (natural selfie)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vw, vh);

    // toBlob is more reliable than toDataURL for camera captures
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size < 1000) {
          console.error("[FaceVerify] Capture produced empty/tiny blob:", blob?.size);
          setCameraError("Capture failed — image was blank. Please try again.");
          return;
        }
        console.log("[FaceVerify] Capture OK — blob size:", blob.size, "type:", blob.type);

        const url = URL.createObjectURL(blob);
        setCapturedImage(url);
        setCapturedBlob(blob);
        setCameraState("captured");

        // Stop camera tracks after a successful capture
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      },
      "image/jpeg",
      0.92
    );
  }, []);

  // ── Discard capture and reopen camera ────────────────────
  const retakePhoto = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage); // release object URL memory
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    setUploadMsg({ type: "", text: "" });
    startCamera();
  }, [startCamera, capturedImage]);

  // ── Submit captured photo to backend ─────────────────────
  const submitPhoto = useCallback(async () => {
    if (!capturedBlob) {
      console.warn("[FaceVerify] submitPhoto called with no blob");
      return;
    }

    console.log(
      "[FaceVerify] Submitting — blob size:",
      capturedBlob.size,
      "type:",
      capturedBlob.type
    );

    if (capturedBlob.size < 1000) {
      setUploadMsg({ type: "error", text: "Captured image appears empty. Please retake." });
      return;
    }

    setUploading(true);
    setUploadMsg({ type: "", text: "" });

    try {
      const resp = await uploadFace(capturedBlob);

      console.log("[FaceVerify] Upload success:", resp);
      setUploadMsg({ type: "success", text: "Face photo submitted successfully!" });
      setTimeout(() => navigate("/status"), 1500);
    } catch (err) {
      const status = err?.response?.status;
      console.error("[FaceVerify] Upload failed — status:", status);
      setUploadMsg({
        type: "error",
        text: extractError(err, "Upload failed. Please try again."),
      });
    } finally {
      setUploading(false);
    }
  }, [capturedBlob, navigate]);

  // ── Derived ───────────────────────────────────────────────
  const isCameraLive = cameraState === "opening" || cameraState === "ready";

  const CAMERA_STATUS = {
    off:      { dot: "fv-status-dot--off",      label: "Camera off" },
    opening:  { dot: "fv-status-dot--opening",  label: "Requesting camera access\u2026" },
    ready:    { dot: "fv-status-dot--ready",     label: "Position your face within the oval" },
    captured: { dot: "fv-status-dot--captured",  label: "Photo captured \u2014 ready to submit" },
  };

  const INSTRUCTIONS = [
    "Look straight at the camera",
    "Both ears must be fully visible",
    "Use good, even lighting — avoid shadows on your face",
    "Plain background preferred",
    "No hat, mask, or sunglasses",
    "Only one person in the frame",
  ];

  return (
    <main className="voter-auth-shell">
      {/* Hidden canvas used only for frame capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} aria-hidden="true" />

      <section className="voter-auth-card fv-card" aria-label="Face Verification">

        {/* ── Page header ─────────────────────────────────── */}
        <header className="fv-header">
          <div className="fv-header-identity">
            <img
              className="voter-flag fv-flag"
              src="/assets/nepal-flag.png"
              alt="Nepal national flag"
            />
            <div>
              <h1 className="fv-title">Face Verification</h1>
              <p className="fv-subtitle">Take a live photo to complete voter verification</p>
            </div>
          </div>

          <div className="fv-header-meta">
            <span className="fv-step-badge">Step 2 of 2</span>
            <span className="fv-trust-note">
              Your image is used only for identity verification
            </span>
          </div>
        </header>

        {/* ── Inline alerts ────────────────────────────────── */}
        {cameraError && (
          <div className="voter-error fv-alert" role="alert" aria-live="polite">
            {cameraError}
          </div>
        )}
        {uploadMsg.text && (
          <div
            className={`${uploadMsg.type === "success" ? "voter-success" : "voter-error"} fv-alert`}
            role="alert"
            aria-live="polite"
          >
            {uploadMsg.text}
          </div>
        )}

        {/* ── Two-column body ──────────────────────────────── */}
        <div className="fv-body">

          {/* ── LEFT: camera column ── */}
          <div className="fv-camera-col">
            <div className={`fv-camera-box fv-camera-box--${cameraState}`}>

              {/* State: OFF — placeholder */}
              {cameraState === "off" && (
                <div className="fv-camera-placeholder">
                  <svg
                    className="fv-camera-icon"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
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

              {/* State: LIVE (opening + ready) — video always rendered so stream can attach */}
              {isCameraLive && (
                <>
                  <video
                    ref={attachStream}
                    autoPlay
                    playsInline
                    muted
                    onPlaying={handleVideoPlaying}
                    onLoadedMetadata={() => {
                      const v = videoRef.current;
                      console.log(
                        "[FaceVerify] loadedmetadata — videoWidth:",
                        v?.videoWidth,
                        "videoHeight:",
                        v?.videoHeight
                      );
                    }}
                    className="fv-video"
                  />

                  {/* Oval guide overlay — shown only when frames are live */}
                  {cameraState === "ready" && (
                    <>
                      <div className="fv-guide-overlay" aria-hidden="true">
                        <div className="fv-guide-oval" />
                      </div>
                      <div className="fv-live-badge" aria-hidden="true">
                        <span className="fv-live-dot" />
                        Live
                      </div>
                    </>
                  )}

                  {/* Loading overlay while waiting for first frame */}
                  {cameraState === "opening" && (
                    <div className="fv-camera-loader">
                      <div className="fv-spinner-ring" />
                      <p className="fv-loader-text">Requesting camera access&hellip;</p>
                    </div>
                  )}
                </>
              )}

              {/* State: CAPTURED — preview image with confirmation badge */}
              {cameraState === "captured" && capturedImage && (
                <>
                  <img
                    src={capturedImage}
                    alt="Captured face photo"
                    className="fv-captured-preview"
                  />
                  <div className="fv-captured-badge" aria-live="polite">
                    <span className="fv-captured-check" aria-hidden="true">&#10003;</span>
                    Photo captured
                  </div>
                </>
              )}

            </div>

            {/* Camera state caption */}
            <p className="fv-camera-status" aria-live="polite">
              <span
                className={`fv-status-dot ${CAMERA_STATUS[cameraState].dot}`}
                aria-hidden="true"
              />
              {CAMERA_STATUS[cameraState].label}
            </p>
          </div>

          {/* ── RIGHT: instructions column ── */}
          <div className="fv-info-col">

            {/* Primary face requirement — visually prominent */}
            <div className="fv-requirement-banner" role="note">
              <p className="fv-requirement-text">
                Make sure your full face and both ears are visible.
              </p>
            </div>

            {/* Detailed checklist */}
            <div className="fv-instructions-card">
              <p className="fv-instructions-title">Photo requirements</p>
              <ul className="fv-instruction-list">
                {INSTRUCTIONS.map((item) => (
                  <li key={item} className="fv-instruction-item">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust / security note */}
            <div className="fv-security-note" role="note">
              <span className="fv-security-icon" aria-hidden="true">&#128274;</span>
              <span>
                All photos are encrypted in transit and stored securely. Used
                exclusively for identity verification purposes.
              </span>
            </div>

          </div>
        </div>

        {/* ── Action buttons ───────────────────────────────── */}
        <div className="fv-actions">

          {cameraState === "off" && (
            <button
              type="button"
              className="fv-btn fv-btn--primary"
              onClick={startCamera}
            >
              Open Camera
            </button>
          )}

          {cameraState === "opening" && (
            <button type="button" className="fv-btn fv-btn--primary" disabled>
              <span className="fv-btn-inner-spinner" aria-hidden="true" />
              Opening Camera&hellip;
            </button>
          )}

          {cameraState === "ready" && (
            <button
              type="button"
              className="fv-btn fv-btn--success"
              onClick={capturePhoto}
            >
              Capture Photo
            </button>
          )}

          {cameraState === "captured" && capturedImage && (
            <div className="fv-action-row">
              <button
                type="button"
                className="fv-btn fv-btn--muted"
                onClick={retakePhoto}
                disabled={uploading}
              >
                Retake Photo
              </button>
              <button
                type="button"
                className="fv-btn fv-btn--primary"
                onClick={submitPhoto}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <span className="fv-btn-inner-spinner" aria-hidden="true" />
                    Submitting&hellip;
                  </>
                ) : (
                  "Submit Verification Photo"
                )}
              </button>
            </div>
          )}

        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer className="fv-footer">
          <span>Secure Authentication System</span>
          <button
            type="button"
            className="fv-signout-btn"
            onClick={() => {
              stopCamera();
              clearToken();
              navigate("/");
            }}
          >
            Sign out
          </button>
        </footer>

      </section>
    </main>
  );
}
