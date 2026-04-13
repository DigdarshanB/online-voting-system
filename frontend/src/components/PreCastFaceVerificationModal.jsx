import React, { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import apiClient from "../lib/apiClient";

/**
 * Pre-cast face verification modal — MediaPipe challenge-response liveness.
 *
 * States: idle → starting_session → requesting_camera → attaching_stream →
 *         camera_ready → running_challenge → capturing_frame → submitting →
 *         (success callback) | challenge_failed | locked | cancelled
 *
 * Props:
 *   open            – boolean, show/hide modal
 *   electionId      – current election ID
 *   onVerified      – (verificationContextToken, capturedFrameBase64) => void
 *   onCancel        – () => void
 */

// ── Challenge detection thresholds ──────────────────────────────
const FACE_SIZE_MIN = 0.08;
const FACE_SIZE_MAX = 0.75;
const CHALLENGE_HOLD_MS = 600;
const CHALLENGE_TIMEOUT_MS = 15000;
const BLINK_EAR_THRESHOLD = 0.21;

// Stable set for this pass — nod excluded
const SUPPORTED_CHALLENGES = new Set(["blink", "turn_left", "turn_right", "smile"]);

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
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [debugStage, setDebugStage] = useState("idle");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const timersRef = useRef([]); // track all setTimeout ids
  const challengeStartRef = useRef(0);
  const holdStartRef = useRef(0);
  const mountedRef = useRef(true);

  // ── Full cleanup ──────────────────────────────────────────────
  function _stopAll() {
    // Cancel animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Clear all pending timers
    for (const tid of timersRef.current) clearTimeout(tid);
    timersRef.current = [];
    // Stop camera tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Detach video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Destroy MediaPipe instance
    if (landmarkerRef.current) {
      try { landmarkerRef.current.close(); } catch { /* ignore */ }
      landmarkerRef.current = null;
    }
  }

  /** Schedule a setTimeout and track its id for cleanup */
  function _setTimeout(fn, ms) {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }

  // ── Lifecycle effects ─────────────────────────────────────────

  // Mark mounted on mount, full cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      _stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start when modal opens (driven by parent `key` remount)
  useEffect(() => {
    if (open) {
      _startSession();
    }
    return () => {
      _stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── STEP 1: Start session ─────────────────────────────────────
  async function _startSession() {
    setState("starting_session");
    setDebugStage("starting_session");
    setError("");
    setFailureInfo(null);
    setLockInfo(null);
    setSessionData(null);
    setChallengeIndex(0);
    setChallengeProgress(0);
    setInstruction("");

    try {
      const res = await apiClient.post(
        `/voter/elections/${electionId}/face-session/start`,
        {}
      );
      if (!mountedRef.current) return;
      const data = res.data;

      if (data.locked_until) {
        setLockInfo(data);
        setState("locked");
        setDebugStage("locked");
        return;
      }
      if (data.cooldown_seconds) {
        setError(`Please wait ${data.cooldown_seconds} seconds before retrying.`);
        setState("challenge_failed");
        setDebugStage("cooldown");
        return;
      }

      // Filter challenges to supported set
      if (data.challenges) {
        data.challenges = data.challenges.filter((c) => SUPPORTED_CHALLENGES.has(c));
        if (data.challenges.length === 0) {
          data.challenges = ["blink"]; // guaranteed safe fallback
        }
      }

      setSessionData(data);
      _requestCamera(data);
    } catch (err) {
      if (!mountedRef.current) return;
      const resp = err?.response?.data;
      if (err?.response?.status === 429) {
        if (resp?.locked_until) {
          setLockInfo(resp);
          setState("locked");
          setDebugStage("locked");
        } else {
          setError(resp?.detail || "Too many attempts. Please wait.");
          setState("challenge_failed");
          setDebugStage("challenge_failed");
        }
      } else {
        setError(resp?.detail || "Failed to start face verification session.");
        setState("challenge_failed");
        setDebugStage("session_error");
      }
    }
  }

  // ── STEP 2: Request camera ────────────────────────────────────
  async function _requestCamera(session) {
    setState("requesting_camera");
    setDebugStage("requesting_camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setDebugStage("stream_acquired");

      // Transition to attaching_stream so the video element renders
      setState("attaching_stream");
      setDebugStage("attaching_stream");

      // Wait a tick for React to mount the <video> then attach
      _setTimeout(() => {
        if (!mountedRef.current) return;
        _attachStreamToVideo(session);
      }, 50);
    } catch {
      if (!mountedRef.current) return;
      setError("Camera access is required for identity verification. Please allow camera access and try again.");
      setState("challenge_failed");
      setDebugStage("camera_denied");
    }
  }

  // ── STEP 2b: Attach stream after video element is in DOM ──────
  function _attachStreamToVideo(session) {
    const video = videoRef.current;
    if (!video || !streamRef.current) {
      setError("Could not attach camera stream. Please try again.");
      setState("challenge_failed");
      setDebugStage("attach_failed");
      return;
    }

    video.srcObject = streamRef.current;
    setDebugStage("stream_attached");

    // Wait for the video to actually be ready to render frames
    function onCanPlay() {
      video.removeEventListener("canplay", onCanPlay);
      if (!mountedRef.current) return;
      setDebugStage("video_ready");
      // Now load MediaPipe, then go camera_ready
      _loadLandmarkerThenReady(session);
    }

    video.addEventListener("canplay", onCanPlay);

    // Also call play() — it returns a promise
    video.play().catch(() => {
      // Autoplay may fail silently on some browsers; canplay still fires
    });
  }

  // ── STEP 3: Load MediaPipe, then transition to camera_ready ───
  async function _loadLandmarkerThenReady(session) {
    try {
      setDebugStage("loading_mediapipe");
      // Always create a fresh instance (old one was destroyed on cleanup)
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      if (!mountedRef.current) return;
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 2,
        outputFaceBlendshapes: true,
      });
      if (!mountedRef.current) return;
      setDebugStage("mediapipe_ready");
      setState("camera_ready");
      setInstruction("Camera ready — starting challenge…");
      // Short pause to let user see their face, then begin
      _setTimeout(() => {
        if (mountedRef.current) _beginChallenges(session);
      }, 1200);
    } catch (e) {
      if (!mountedRef.current) return;
      setError("Failed to load face detection model. Please try again.");
      setState("challenge_failed");
      setDebugStage("mediapipe_error");
    }
  }

  // ── STEP 4: Run challenge loop ────────────────────────────────
  function _beginChallenges(session) {
    setChallengeIndex(0);
    setChallengeProgress(0);
    setState("running_challenge");
    setDebugStage("challenge_started");
    challengeStartRef.current = performance.now();
    holdStartRef.current = 0;
    _setInstructionForChallenge(session.challenges[0]);
    _detectionLoop(session, 0);
  }

  function _setInstructionForChallenge(action) {
    const map = {
      blink: "Please blink naturally",
      turn_left: "Slowly turn your head to the left",
      turn_right: "Slowly turn your head to the right",
      smile: "Please smile",
    };
    setInstruction(map[action] || "Follow the instruction");
  }

  function _detectionLoop(session, idx) {
    if (!mountedRef.current) return;
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => _detectionLoop(session, idx));
      return;
    }

    const now = performance.now();
    let result;
    try {
      result = landmarker.detectForVideo(video, now);
    } catch {
      rafRef.current = requestAnimationFrame(() => _detectionLoop(session, idx));
      return;
    }

    if (now - challengeStartRef.current > CHALLENGE_TIMEOUT_MS) {
      _stopAll();
      setError("Challenge timed out. Please try again with better lighting.");
      setState("challenge_failed");
      setDebugStage("challenge_timeout");
      return;
    }

    const faces = result.faceLandmarks || [];
    if (faces.length !== 1) {
      holdStartRef.current = 0;
      setChallengeProgress(0);
      setInstruction(
        faces.length === 0
          ? "Position your face in the frame"
          : "Only one face should be visible"
      );
      rafRef.current = requestAnimationFrame(() => _detectionLoop(session, idx));
      return;
    }

    const landmarks = faces[0];
    const xs = landmarks.map((p) => p.x);
    const ys = landmarks.map((p) => p.y);
    const bboxW = Math.max(...xs) - Math.min(...xs);
    const bboxH = Math.max(...ys) - Math.min(...ys);
    const faceArea = bboxW * bboxH;

    if (faceArea < FACE_SIZE_MIN) {
      holdStartRef.current = 0;
      setChallengeProgress(0);
      setInstruction("Move closer to the camera");
      rafRef.current = requestAnimationFrame(() => _detectionLoop(session, idx));
      return;
    }
    if (faceArea > FACE_SIZE_MAX) {
      holdStartRef.current = 0;
      setChallengeProgress(0);
      setInstruction("Move further from the camera");
      rafRef.current = requestAnimationFrame(() => _detectionLoop(session, idx));
      return;
    }

    const action = session.challenges[idx];
    const blendshapes = result.faceBlendshapes?.[0]?.categories || [];
    const bs = {};
    for (const c of blendshapes) bs[c.categoryName] = c.score;

    const detected = _detectAction(action, bs, landmarks);

    if (detected) {
      if (!holdStartRef.current) holdStartRef.current = now;
      const held = now - holdStartRef.current;
      setChallengeProgress(Math.min(100, (held / CHALLENGE_HOLD_MS) * 100));

      if (held >= CHALLENGE_HOLD_MS) {
        const nextIdx = idx + 1;
        if (nextIdx < session.challenges.length) {
          setChallengeIndex(nextIdx);
          setChallengeProgress(0);
          holdStartRef.current = 0;
          challengeStartRef.current = performance.now();
          _setInstructionForChallenge(session.challenges[nextIdx]);
          rafRef.current = requestAnimationFrame(() => _detectionLoop(session, nextIdx));
          return;
        } else {
          _captureAndSubmit(session);
          return;
        }
      }
    } else {
      holdStartRef.current = 0;
      setChallengeProgress(0);
      _setInstructionForChallenge(action);
    }

    rafRef.current = requestAnimationFrame(() => _detectionLoop(session, idx));
  }

  // ── Challenge detection helpers ───────────────────────────────
  function _detectAction(action, bs, landmarks) {
    switch (action) {
      case "blink": {
        const leftEAR = _eyeAspectRatio(landmarks, "left");
        const rightEAR = _eyeAspectRatio(landmarks, "right");
        return (leftEAR + rightEAR) / 2 < BLINK_EAR_THRESHOLD;
      }
      case "turn_left": {
        const noseX = landmarks[1]?.x || 0.5;
        return noseX > 0.58;
      }
      case "turn_right": {
        const noseX = landmarks[1]?.x || 0.5;
        return noseX < 0.42;
      }
      case "smile":
        return (bs["mouthSmileLeft"] || 0) > 0.4 && (bs["mouthSmileRight"] || 0) > 0.4;
      default:
        return false;
    }
  }

  function _eyeAspectRatio(landmarks, eye) {
    const idx =
      eye === "left"
        ? { top1: 159, bot1: 145, top2: 160, bot2: 144, outer: 33, inner: 133 }
        : { top1: 386, bot1: 374, top2: 387, bot2: 373, outer: 362, inner: 263 };
    const p = (i) => landmarks[i] || { x: 0, y: 0 };
    const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    const vert1 = dist(p(idx.top1), p(idx.bot1));
    const vert2 = dist(p(idx.top2), p(idx.bot2));
    const horiz = dist(p(idx.outer), p(idx.inner));
    if (horiz === 0) return 1;
    return (vert1 + vert2) / (2 * horiz);
  }

  // ── STEP 5: Capture frame ─────────────────────────────────────
  function _captureAndSubmit(session) {
    setState("capturing_frame");
    setDebugStage("capturing_frame");
    setInstruction("Hold still — capturing…");
    setChallengeProgress(100);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setError("Failed to capture frame. Please try again.");
      setState("challenge_failed");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = dataUrl.split(",")[1];

    _stopAll();

    _setTimeout(() => {
      if (!mountedRef.current) return;
      setState("submitting");
      setDebugStage("submitting");
      setInstruction("Verifying your identity…");
      onVerified(session.verification_context_token, base64);
    }, 300);
  }

  // ── Retry / Cancel ────────────────────────────────────────────
  function handleRetry() {
    _stopAll();
    setState("idle");
    setSessionData(null);
    setError("");
    setFailureInfo(null);
    setChallengeIndex(0);
    setChallengeProgress(0);
    setDebugStage("idle");
    _setTimeout(() => _startSession(), 100);
  }

  function handleCancel() {
    _stopAll();
    setState("cancelled");
    setDebugStage("cancelled");
    onCancel();
  }

  if (!open) return null;

  // ── Derived ───────────────────────────────────────────────────
  const lockRemaining = lockInfo?.locked_until
    ? Math.max(0, Math.ceil((new Date(lockInfo.locked_until).getTime() - Date.now()) / 1000))
    : 0;
  const lockMinutes = Math.ceil(lockRemaining / 60);

  const challenges = sessionData?.challenges || [];
  const totalChallenges = challenges.length;

  // Show the video container (always in DOM) for these states
  const showCamera =
    state === "attaching_stream" ||
    state === "camera_ready" ||
    state === "running_challenge" ||
    state === "capturing_frame";

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
                For vote security, complete a live face check.
              </p>
            </div>
          </div>
        </div>

        {/* ── Debug stage indicator ── */}
        <div style={debugBarStyle}>
          stage: <strong>{debugStage}</strong> &nbsp;|&nbsp; state: <strong>{state}</strong>
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

          {/* REQUESTING CAMERA */}
          {state === "requesting_camera" && (
            <div style={centeredStyle}>
              <div style={spinnerStyle} />
              <p style={statusText}>Requesting camera access…</p>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Please allow camera access when prompted.
              </p>
            </div>
          )}

          {/* CAMERA / CHALLENGE VIEW — video is in DOM for attaching_stream onward */}
          {showCamera && (
            <div style={{ width: "100%" }}>
              <div style={cameraBannerStyle}>
                Please look at the camera and follow the on-screen instructions.
              </div>

              {/* Challenge progress indicator */}
              {totalChallenges > 0 && state === "running_challenge" && (
                <div style={challengeBarOuter}>
                  {challenges.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        ...challengeBarStep,
                        background:
                          i < challengeIndex
                            ? "#16a34a"
                            : i === challengeIndex
                            ? "#2563eb"
                            : "#e2e8f0",
                      }}
                    >
                      {i === challengeIndex && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${challengeProgress}%`,
                            background: "#60a5fa",
                            borderRadius: 4,
                            transition: "width 0.1s linear",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Video container */}
              <div style={videoContainerStyle}>
                <video
                  ref={videoRef}
                  style={videoStyle}
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {/* Face oval guide */}
                <div style={ovalGuideStyle} />
              </div>

              {/* Instruction text */}
              {instruction && (
                <div style={instructionStyle}>
                  {instruction}
                </div>
              )}
            </div>
          )}

          {/* SUBMITTING */}
          {state === "submitting" && (
            <div style={centeredStyle}>
              <div style={spinnerStyle} />
              <p style={statusText}>Verifying your identity…</p>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Please wait, do not close this window.
              </p>
            </div>
          )}

          {/* CHALLENGE FAILED */}
          {state === "challenge_failed" && (
            <div style={centeredStyle}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>
                Verification Failed
              </h3>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 4, textAlign: "center" }}>
                {error || "Verification did not pass. You can try again."}
              </p>
              {failureInfo?.remaining_attempts != null && (
                <p style={attemptsStyle}>
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
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>
                Temporarily Locked
              </h3>
              <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 12 }}>
                Too many failed attempts. Voting is temporarily locked for this
                election.
              </p>
              {lockRemaining > 0 && (
                <div style={lockBadgeStyle}>
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

        {/* ── Footer — cancel shown in camera states ── */}
        {(showCamera || state === "starting_session" || state === "requesting_camera") && (
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

// Expose helper so parent can set failure info from verify-and-cast response
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

const debugBarStyle = {
  padding: "4px 24px",
  fontSize: 11,
  fontFamily: "monospace",
  color: "#64748b",
  background: "#f1f5f9",
  borderBottom: "1px solid #e2e8f0",
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

const cameraBannerStyle = {
  padding: "8px 12px",
  background: "#eff6ff",
  borderRadius: 8,
  marginBottom: 12,
  fontSize: 13,
  color: "#1e40af",
  textAlign: "center",
};

const challengeBarOuter = {
  display: "flex",
  gap: 6,
  marginBottom: 12,
};

const challengeBarStep = {
  flex: 1,
  height: 6,
  borderRadius: 4,
  position: "relative",
  overflow: "hidden",
  transition: "background 0.3s",
};

const videoContainerStyle = {
  position: "relative",
  width: "100%",
  aspectRatio: "4/3",
  borderRadius: 12,
  overflow: "hidden",
  background: "#0f172a",
};

const videoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transform: "scaleX(-1)",
};

const ovalGuideStyle = {
  position: "absolute",
  top: "10%",
  left: "20%",
  right: "20%",
  bottom: "10%",
  border: "3px dashed rgba(255,255,255,0.4)",
  borderRadius: "50%",
  pointerEvents: "none",
};

const instructionStyle = {
  marginTop: 12,
  padding: "10px 16px",
  background: "#f8fafc",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  color: "#1e293b",
  textAlign: "center",
};

const attemptsStyle = {
  fontSize: 13,
  color: "#92400e",
  background: "#fef3c7",
  padding: "6px 16px",
  borderRadius: 6,
  marginTop: 8,
};

const lockBadgeStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 600,
  color: "#991b1b",
};
