import React, { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  Shield, Camera, CameraOff, RefreshCw, X, AlertCircle, Lock,
  CheckCircle2, Clock, Fingerprint,
} from "lucide-react";
import apiClient from "../lib/apiClient";
import { VT } from "../lib/voterTokens";

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

/* ── User-facing phase mapping (presentation only) ─────────── */
const PHASES = [
  { key: "prepare", label: "Prepare" },
  { key: "camera",  label: "Camera" },
  { key: "verify",  label: "Liveness" },
  { key: "confirm", label: "Confirm" },
];

function getPhaseIndex(state) {
  if (state === "starting_session") return 0;
  if (state === "requesting_camera" || state === "attaching_stream") return 1;
  if (state === "camera_ready" || state === "running_challenge" || state === "capturing_frame") return 2;
  if (state === "submitting") return 3;
  return -1; // failure/locked states — hide indicator
}

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
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    for (const tid of timersRef.current) clearTimeout(tid);
    timersRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (landmarkerRef.current) {
      try { landmarkerRef.current.close(); } catch { /* ignore */ }
      landmarkerRef.current = null;
    }
  }

  function _setTimeout(fn, ms) {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }

  // ── Lifecycle effects ─────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      _stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      if (data.challenges) {
        data.challenges = data.challenges.filter((c) => SUPPORTED_CHALLENGES.has(c));
        if (data.challenges.length === 0) {
          data.challenges = ["blink"];
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

      setState("attaching_stream");
      setDebugStage("attaching_stream");

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

  // ── STEP 2b: Attach stream ────────────────────────────────────
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

    function onCanPlay() {
      video.removeEventListener("canplay", onCanPlay);
      if (!mountedRef.current) return;
      setDebugStage("video_ready");
      _loadLandmarkerThenReady(session);
    }

    video.addEventListener("canplay", onCanPlay);
    video.play().catch(() => {});
  }

  // ── STEP 3: Load MediaPipe ────────────────────────────────────
  async function _loadLandmarkerThenReady(session) {
    try {
      setDebugStage("loading_mediapipe");
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

  const showCamera =
    state === "attaching_stream" ||
    state === "camera_ready" ||
    state === "running_challenge" ||
    state === "capturing_frame";

  const phaseIdx = getPhaseIndex(state);
  const showPhases = phaseIdx >= 0;

  return (
    <>
      {/* Keyframes for spinner */}
      <style>{`@keyframes fvSpin { to { transform: rotate(360deg); } }`}</style>

      <div
        style={S.overlay}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fv-title"
        aria-describedby="fv-subtitle"
      >
        <div style={S.modal}>
          {/* ── Header ── */}
          <div style={S.header}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={S.shieldIcon}>
                <Shield size={22} color={VT.accent} strokeWidth={2.2} />
              </div>
              <div>
                <h2 id="fv-title" style={S.title}>Identity Verification</h2>
                <p id="fv-subtitle" style={S.subtitle}>
                  Live face check required to secure your ballot
                </p>
              </div>
            </div>
            {/* Close / cancel X button - only in non-critical states */}
            {(state === "starting_session" || state === "requesting_camera" || showCamera) && (
              <button onClick={handleCancel} style={S.closeBtn} aria-label="Cancel verification">
                <X size={18} />
              </button>
            )}
          </div>

          {/* ── Phase indicator ── */}
          {showPhases && (
            <div style={S.phaseBar}>
              {PHASES.map((p, i) => {
                const isActive = i === phaseIdx;
                const isDone = i < phaseIdx;
                return (
                  <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0, fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isDone ? VT.success : isActive ? VT.accent : VT.surfaceSubtle,
                      color: isDone || isActive ? "#fff" : VT.subtle,
                      transition: "all 0.25s ease",
                    }}>
                      {isDone ? <CheckCircle2 size={13} /> : i + 1}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: isActive ? 700 : 500,
                      color: isActive ? VT.text : isDone ? VT.success : VT.muted,
                      transition: "color 0.2s",
                    }}>
                      {p.label}
                    </span>
                    {i < PHASES.length - 1 && (
                      <div style={{
                        flex: 1, height: 2, borderRadius: 1, marginLeft: 4,
                        background: isDone ? VT.successBorder : VT.borderLight,
                        transition: "background 0.25s",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Body ── */}
          <div style={S.body}>
            {/* STARTING SESSION */}
            {state === "starting_session" && (
              <div style={S.centered}>
                <div style={S.spinnerWrap}>
                  <Fingerprint size={24} color={VT.accent} />
                </div>
                <p style={S.statusLabel}>Preparing secure verification…</p>
                <p style={S.statusHint}>Setting up your liveness session</p>
              </div>
            )}

            {/* REQUESTING CAMERA */}
            {state === "requesting_camera" && (
              <div style={S.centered}>
                <div style={S.spinnerWrap}>
                  <Camera size={24} color={VT.accent} />
                </div>
                <p style={S.statusLabel}>Requesting camera access…</p>
                <p style={S.statusHint}>
                  Please allow camera access when prompted by your browser.
                </p>
              </div>
            )}

            {/* CAMERA / CHALLENGE VIEW */}
            {showCamera && (
              <div style={{ width: "100%" }}>
                {/* Camera guidance banner */}
                <div style={S.cameraBanner}>
                  <Camera size={14} style={{ flexShrink: 0 }} />
                  Look at the camera and follow the on-screen instructions
                </div>

                {/* Challenge progress indicator */}
                {totalChallenges > 0 && state === "running_challenge" && (
                  <div style={S.challengeBar}>
                    {challenges.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1, height: 6, borderRadius: 3,
                          position: "relative", overflow: "hidden",
                          background: i < challengeIndex ? VT.success
                            : i === challengeIndex ? `${VT.accent}30`
                            : VT.surfaceSubtle,
                          transition: "background 0.3s",
                        }}
                      >
                        {i === challengeIndex && (
                          <div style={{
                            position: "absolute", left: 0, top: 0, bottom: 0,
                            width: `${challengeProgress}%`,
                            background: VT.accent, borderRadius: 3,
                            transition: "width 0.1s linear",
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Video container */}
                <div style={S.videoContainer}>
                  <video ref={videoRef} style={S.video} autoPlay playsInline muted />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  {/* Face oval guide */}
                  <div style={S.ovalGuide} />
                  {/* Stage label overlay */}
                  {state === "camera_ready" && (
                    <div style={S.cameraOverlayLabel}>
                      <CheckCircle2 size={14} /> Camera ready
                    </div>
                  )}
                </div>

                {/* Instruction text */}
                {instruction && (
                  <div style={S.instruction}>
                    {instruction}
                  </div>
                )}
              </div>
            )}

            {/* SUBMITTING */}
            {state === "submitting" && (
              <div style={S.centered}>
                <div style={S.spinnerWrap}>
                  <Fingerprint size={24} color={VT.accent} />
                </div>
                <p style={S.statusLabel}>Verifying your identity…</p>
                <p style={S.statusHint}>
                  Please wait. Do not close this window.
                </p>
              </div>
            )}

            {/* CHALLENGE FAILED */}
            {state === "challenge_failed" && (
              <div style={S.centered}>
                <div style={S.resultIcon(VT.errorBg, VT.errorBorder)}>
                  <AlertCircle size={28} color={VT.error} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: VT.error, marginBottom: 8 }}>
                  Verification Failed
                </h3>
                <p style={{ fontSize: 14, color: VT.muted, marginBottom: 6, textAlign: "center", lineHeight: 1.5, maxWidth: 360 }}>
                  {error || "Verification did not pass. You can try again."}
                </p>
                {failureInfo?.remaining_attempts != null && (
                  <div style={S.attemptsBadge}>
                    {failureInfo.remaining_attempts > 0
                      ? `${failureInfo.remaining_attempts} attempt${failureInfo.remaining_attempts !== 1 ? "s" : ""} remaining`
                      : "No attempts remaining"}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                  <button onClick={handleCancel} style={S.secondaryBtn}>
                    Cancel
                  </button>
                  {(!failureInfo || failureInfo.remaining_attempts > 0) && (
                    <button onClick={handleRetry} style={S.primaryBtn}>
                      <RefreshCw size={15} /> Try Again
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* LOCKED */}
            {state === "locked" && (
              <div style={S.centered}>
                <div style={S.resultIcon(VT.errorBg, VT.errorBorder)}>
                  <Lock size={28} color={VT.error} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: VT.error, marginBottom: 8 }}>
                  Temporarily Locked
                </h3>
                <p style={{ fontSize: 14, color: VT.muted, textAlign: "center", marginBottom: 14, lineHeight: 1.5, maxWidth: 360 }}>
                  Too many failed attempts. Voting is temporarily locked for this election.
                </p>
                {lockRemaining > 0 && (
                  <div style={S.lockBadge}>
                    <Clock size={14} />
                    Try again in approximately {lockMinutes} minute{lockMinutes !== 1 ? "s" : ""}
                  </div>
                )}
                <button onClick={handleCancel} style={{ ...S.secondaryBtn, marginTop: 22 }}>
                  Close
                </button>
              </div>
            )}
          </div>

          {/* ── Footer — cancel shown in active camera states ── */}
          {(showCamera || state === "starting_session" || state === "requesting_camera") && (
            <div style={S.footer}>
              <button onClick={handleCancel} style={S.secondaryBtn}>
                Cancel Verification
              </button>
            </div>
          )}
        </div>
      </div>
    </>
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

/* ══════════════════════════════════════════════════════════════════
   Styles
   ══════════════════════════════════════════════════════════════════ */
const S = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(15,23,42,0.6)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 2000, padding: 16,
  },
  modal: {
    background: VT.surface, borderRadius: VT.radius.xl,
    maxWidth: 540, width: "100%", maxHeight: "92vh", overflow: "auto",
    boxShadow: VT.shadow.xl,
    display: "flex", flexDirection: "column",
    animation: "ballotScaleIn 0.22s ease both",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: `1px solid ${VT.border}`,
    display: "flex", alignItems: "center", gap: 8,
  },
  shieldIcon: {
    width: 44, height: 44, borderRadius: VT.radius.md, flexShrink: 0,
    background: VT.accentLight, border: `1px solid ${VT.accent}20`,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  title: {
    fontSize: 18, fontWeight: 700, color: VT.text, margin: 0, lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 13, color: VT.muted, margin: "3px 0 0", lineHeight: 1.4,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: VT.radius.sm, border: `1px solid ${VT.borderLight}`,
    background: "transparent", color: VT.muted, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all 0.15s",
  },
  phaseBar: {
    display: "flex", alignItems: "center", gap: 4, padding: "12px 24px",
    borderBottom: `1px solid ${VT.borderLight}`, background: VT.surfaceAlt,
  },
  body: {
    padding: 24, flex: 1, minHeight: 200,
  },
  footer: {
    padding: "14px 24px 20px",
    borderTop: `1px solid ${VT.border}`,
    display: "flex", justifyContent: "flex-end",
  },
  centered: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "28px 0",
  },
  statusLabel: {
    fontSize: 15, color: VT.textSecondary, fontWeight: 600, marginTop: 18, marginBottom: 0,
  },
  statusHint: {
    fontSize: 13, color: VT.muted, marginTop: 6,
  },
  spinnerWrap: {
    width: 56, height: 56, borderRadius: "50%",
    border: `3px solid ${VT.border}`, borderTopColor: VT.accent,
    display: "flex", alignItems: "center", justifyContent: "center",
    animation: "fvSpin 0.8s linear infinite",
  },
  resultIcon: (bg, border) => ({
    width: 64, height: 64, borderRadius: "50%",
    background: bg, border: `2px solid ${border}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  }),
  primaryBtn: {
    padding: "11px 24px", borderRadius: VT.radius.md, fontSize: 14, fontWeight: 600,
    background: VT.accent, color: "#fff", border: "none", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 7,
    transition: "background 0.15s, transform 0.1s",
  },
  secondaryBtn: {
    padding: "11px 24px", borderRadius: VT.radius.md, fontSize: 14, fontWeight: 600,
    background: VT.surface, color: VT.textSecondary, border: `1px solid ${VT.border}`,
    cursor: "pointer", transition: "all 0.15s",
  },
  cameraBanner: {
    padding: "9px 14px", borderRadius: VT.radius.md, marginBottom: 12,
    fontSize: 13, fontWeight: 500, color: VT.accent,
    background: VT.accentLight, border: `1px solid ${VT.accent}20`,
    display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
  },
  challengeBar: {
    display: "flex", gap: 6, marginBottom: 12,
  },
  videoContainer: {
    position: "relative", width: "100%", aspectRatio: "4/3",
    borderRadius: VT.radius.lg, overflow: "hidden",
    background: "#0F172A", border: `2px solid ${VT.border}`,
  },
  video: {
    width: "100%", height: "100%", objectFit: "cover",
    transform: "scaleX(-1)",
  },
  ovalGuide: {
    position: "absolute", top: "8%", left: "18%", right: "18%", bottom: "8%",
    border: "2.5px dashed rgba(255,255,255,0.35)",
    borderRadius: "50%", pointerEvents: "none",
  },
  cameraOverlayLabel: {
    position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 20,
    background: "rgba(4,120,87,0.85)", color: "#fff",
    fontSize: 12, fontWeight: 600, backdropFilter: "blur(4px)",
  },
  instruction: {
    marginTop: 12, padding: "12px 18px",
    background: VT.surfaceAlt, border: `1px solid ${VT.borderLight}`,
    borderRadius: VT.radius.md, fontSize: 15, fontWeight: 600,
    color: VT.text, textAlign: "center",
  },
  attemptsBadge: {
    fontSize: 13, fontWeight: 600, color: VT.warn,
    background: VT.warnBg, border: `1px solid ${VT.warnBorder}`,
    padding: "6px 16px", borderRadius: VT.radius.sm, marginTop: 8,
  },
  lockBadge: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: VT.errorBg, border: `1px solid ${VT.errorBorder}`,
    borderRadius: VT.radius.md, padding: "10px 20px",
    fontSize: 14, fontWeight: 600, color: VT.error,
  },
};
