import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, clearToken } from "../lib/authStorage";
import { extractError } from "../lib/token";
import { fetchMe } from "../features/auth/api/authApi";
import { uploadCitizenship } from "../features/verification/api/verificationApi";
import "./VoterAuthPage.css";
import "./VoterStatus.css";

const STATUS_CONFIG = {
  PENDING_DOCUMENT: {
    title: "Document Required",
    message: "Please upload your citizenship document to continue verification.",
    badgeClass: "vs-status-badge--info",
    icon: "\uD83D\uDCCB",
    action: "upload",
  },
  PENDING_FACE: {
    title: "Face Verification Required",
    message:
      "Your citizenship document has been uploaded. Please complete the face verification step to proceed.",
    badgeClass: "vs-status-badge--info",
    icon: "\uD83D\uDCCB",
    action: "face",
  },
  PENDING_REVIEW: {
    title: "Under Review",
    message:
      "Your documents and face photo have been submitted and are currently being reviewed by an administrator. This may take some time.",
    badgeClass: "vs-status-badge--info",
    icon: "\u231B",
    action: null,
  },
  ACTIVE: {
    title: "Verified",
    message: "Your account is verified. Redirecting\u2026",
    badgeClass: "vs-status-badge--success",
    icon: "\u2713",
    action: "home",
  },
  REJECTED: {
    title: "Verification Rejected",
    message: null,
    badgeClass: "vs-status-badge--error",
    icon: "\u2715",
    action: "reapply",
  },
  DISABLED: {
    title: "Account Disabled",
    message: "Your account has been disabled. Please contact support.",
    badgeClass: "vs-status-badge--error",
    icon: "\u26D4",
    action: null,
  },
};

const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — must match backend

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VoterStatus() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [meData, setMeData] = useState(null);
  const [error, setError] = useState("");

  // ── Upload state ──────────────────────────────────────────────
  //
  // selectedFile   The File object chosen by the user (not uploaded yet).
  // previewUrl     Object URL for local image preview — revoked on cleanup.
  // uploadStatus   "idle" | "uploading" | "done" | "error"
  // uploadMessage  Human-readable result text (success or error).
  //
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [validationError, setValidationError] = useState("");

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ── Load voter status on mount ────────────────────────────────
  const loadStatus = () => {
    if (!getToken()) {
      navigate("/");
      return;
    }
    setLoading(true);
    fetchMe()
      .then((data) => {
        if (data.status === "ACTIVE" && data.totp_enabled) {
          navigate("/dashboard");
          return;
        }
        if (data.status === "ACTIVE" && !data.totp_enabled) {
          navigate("/totp-setup");
          return;
        }
        if (data.status === "PENDING_FACE") {
          navigate("/face-verification");
          return;
        }
        setMeData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(extractError(err, "Failed to load status."));
        setLoading(false);
      });
  };

  useEffect(() => {
    loadStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── FILE SELECTION — stores file in state ONLY, no upload ─────
  //
  // IMPORTANT: This handler must never call the backend.
  // It exists solely to give the user a local preview and confirmation
  // step before they explicitly press "Upload Document".
  //
  function handleFileSelect(e) {
    const file = e.target.files?.[0];

    // Reset the input value so the same file can be re-selected later
    // (e.g. after a removal or error).
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!file) return;

    // Clear any previous state
    setValidationError("");
    setUploadStatus("idle");
    setUploadMessage("");

    // Client-side type validation — prevents obviously wrong files
    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError(
        `Unsupported file type: "${file.type}". Please select a JPEG or PNG image.`
      );
      return;
    }

    // Client-side size validation
    if (file.size > MAX_BYTES) {
      setValidationError(
        `File is too large (${formatBytes(file.size)}). Maximum allowed size is 5 MB.`
      );
      return;
    }

    // Generate a local preview URL (no network request)
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
  }

  // ── REMOVE SELECTION ─────────────────────────────────────────
  function clearSelectedFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadStatus("idle");
    setUploadMessage("");
    setValidationError("");
  }

  // ── UPLOAD — only runs when user explicitly clicks the button ─
  async function handleUpload() {
    if (!selectedFile) return;

    if (!getToken()) {
      navigate("/");
      return;
    }

    setUploadStatus("uploading");
    setUploadMessage("");

    try {
      await uploadCitizenship(selectedFile);

      // Clear the selected file after a successful upload
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(null);
      setPreviewUrl(null);

      setUploadStatus("done");
      setUploadMessage(
        "Document uploaded successfully! Redirecting to face verification\u2026"
      );
      setTimeout(() => navigate("/face-verification"), 1400);
    } catch (err) {
      setUploadStatus("error");
      // Keep `selectedFile` so the user can retry or change the file
      setUploadMessage(extractError(err, "Upload failed. Please try again."));
    }
  }

  // ── Loading / error full-screen states ───────────────────────
  if (loading) {
    return (
      <div className="voter-auth-shell">
        <div className="voter-auth-card vs-card">
          <p className="voter-label" style={{ textAlign: "center" }}>
            Loading&hellip;
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="voter-auth-shell">
        <div className="voter-auth-card vs-card">
          <p className="voter-error">{error}</p>
          <button className="voter-continue" onClick={() => navigate("/")}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[meData?.status] ?? {
    title: "Verification In Progress",
    message: "Your verification is being processed.",
    badgeClass: "vs-status-badge--info",
    icon: "\u231B",
    action: null,
  };

  const isUploading = uploadStatus === "uploading";
  const isUploadDone = uploadStatus === "done";

  return (
    <div className="voter-auth-shell">
      <div className="voter-auth-card vs-card">

        <h1 className="vs-page-title">Verification Status</h1>

        {/* ── Status badge ────────────────────────────────────── */}
        <div className={`vs-status-badge ${config.badgeClass}`}>
          <span className="vs-status-icon" aria-hidden="true">{config.icon}</span>
          <span>{config.title}</span>
        </div>

        {/* General status message */}
        {config.message && (
          <p className="vs-status-message">{config.message}</p>
        )}

        {/* ── REJECTED: show rejection reason ─────────────────── */}
        {meData?.status === "REJECTED" && (
          <div className="voter-error" style={{ marginBottom: 20, fontSize: 13 }}>
            <strong>Rejection reason:&nbsp;</strong>
            {meData.rejection_reason
              ? `"${meData.rejection_reason}"`
              : "No reason provided."}
          </div>
        )}

        {/* ── DOCUMENT UPLOAD SECTION ─────────────────────────── */}
        {(meData?.status === "PENDING_DOCUMENT" || meData?.status === "REJECTED") && (
          <>
            {/* Hidden native file input — opened programmatically only */}
            <input
              type="file"
              accept="image/jpeg,image/png"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileSelect}
              aria-hidden="true"
              tabIndex={-1}
            />

            {/* Safe-upload notice banner */}
            {!selectedFile && !isUploadDone && (
              <div className="vs-upload-notice" role="note">
                <span className="vs-notice-icon" aria-hidden="true">&#128275;</span>
                <span>
                  Please review the selected file before uploading. Your file will
                  not be sent until you click &ldquo;Upload Document&rdquo;.
                </span>
              </div>
            )}

            {/* Client-side validation error */}
            {validationError && (
              <div className="vs-msg vs-msg--error" role="alert">
                {validationError}
              </div>
            )}

            {/* Upload result messages */}
            {uploadMessage && (
              <div
                className={`vs-msg ${
                  uploadStatus === "done" ? "vs-msg--success" : "vs-msg--error"
                }`}
                role="alert"
                aria-live="polite"
              >
                {uploadMessage}
              </div>
            )}

            {/* ── STATE: no file selected → Choose File area ── */}
            {!selectedFile && !isUploadDone && (
              <button
                type="button"
                className="vs-choose-area"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choose citizenship document image"
              >
                <svg
                  className="vs-choose-icon"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M28 6H10a4 4 0 00-4 4v28a4 4 0 004 4h28a4 4 0 004-4V20L28 6z"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M28 6v14h14"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M24 32v-8M20 28l4-4 4 4"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="vs-choose-label">Choose File</p>
                <p className="vs-choose-hint">JPEG or PNG &bull; Maximum 5 MB</p>
              </button>
            )}

            {/* ── STATE: file selected → Review area ── */}
            {selectedFile && !isUploadDone && (
              <div className="vs-review-box" role="region" aria-label="Selected document review">

                {/* Image preview */}
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={`Preview of ${selectedFile.name}`}
                    className="vs-preview-img"
                  />
                )}

                {/* File details */}
                <div className="vs-file-details">
                  <span className="vs-file-icon" aria-hidden="true">&#128443;</span>
                  <div className="vs-file-info">
                    <p className="vs-file-name" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="vs-file-meta">
                      {selectedFile.type} &bull; {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                </div>

                {/* Confirmation note */}
                <div className="vs-confirm-note" role="note">
                  Please confirm this is the correct citizenship document before
                  uploading. Once submitted, you cannot change it without
                  administrator review.
                </div>

                {/* Change / Remove actions */}
                <div className="vs-review-actions">
                  <button
                    type="button"
                    className="vs-btn-change"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    className="vs-btn-remove"
                    onClick={clearSelectedFile}
                    disabled={isUploading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* ── Upload Document button ──
                Disabled until the user has selected a file.
                Only this button triggers the backend upload. ── */}
            {!isUploadDone && (
              <button
                type="button"
                className="vs-upload-btn"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                aria-label={isUploading ? "Uploading document" : "Upload Document"}
              >
                {isUploading ? (
                  <>
                    <span className="vs-btn-spinner" aria-hidden="true" />
                    Uploading&hellip;
                  </>
                ) : meData?.status === "REJECTED" ? (
                  "Re-upload Document"
                ) : (
                  "Upload Document"
                )}
              </button>
            )}
          </>
        )}

        {/* ── PENDING_FACE: navigate to face verification ──────── */}
        {meData?.status === "PENDING_FACE" && (
          <button
            className="voter-continue"
            type="button"
            onClick={() => navigate("/face-verification")}
          >
            Continue Face Verification
          </button>
        )}

        {/* ── Footer: sign out ─────────────────────────────────── */}
        {meData?.status !== "DISABLED" && (
          <div className="vs-footer">
            <button
              type="button"
              className="vs-signout-btn"
              onClick={() => {
                clearToken();
                navigate("/");
              }}
            >
              Sign out
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
