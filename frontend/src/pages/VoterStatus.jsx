import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./VoterAuthPage.css";

const STATUS_CONFIG = {
  PENDING_DOCUMENT: {
    title: "Document Required",
    message: "Please upload your citizenship document to continue verification.",
    action: "upload",
    actionLabel: "Upload Document",
  },
  PENDING_REVIEW: {
    title: "Under Review",
    message:
      "Your documents have been submitted and are currently being reviewed by an administrator. This may take some time.",
    action: null,
  },
  ACTIVE: {
    title: "Verified",
    message: "Your account is verified. Redirecting…",
    action: "home",
  },
  REJECTED: {
    title: "Verification Rejected",
    message: null, // shown separately with rejection_reason
    action: "reapply",
    actionLabel: "Re-upload Document",
  },
  DISABLED: {
    title: "Account Disabled",
    message: "Your account has been disabled. Please contact support.",
    action: null,
  },
};

export default function VoterStatus() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [meData, setMeData] = useState(null);
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle | uploading | done | error
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef(null);

  const fetchMe = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/");
      return;
    }
    setLoading(true);
    axios
      .get("http://localhost:8000/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        if (data.status === "ACTIVE" && data.totp_enabled) {
          navigate("/home");
          return;
        }
        if (data.status === "ACTIVE" && !data.totp_enabled) {
          navigate("/totp-setup");
          return;
        }
        setMeData(data);
        setLoading(false);
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load status.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("access_token");
    if (!token) { navigate("/"); return; }

    setUploadStatus("uploading");
    setUploadMessage("");
    const form = new FormData();
    form.append("file", file);
    try {
      await axios.post("http://localhost:8000/verification/citizenship/upload", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUploadStatus("done");
      setUploadMessage("Document uploaded successfully! Awaiting admin review.");
      fetchMe();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setUploadStatus("error");
      setUploadMessage(typeof detail === "string" ? detail : "Upload failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="voter-auth-shell">
        <div className="voter-auth-card">
          <p className="voter-label" style={{ textAlign: "center" }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="voter-auth-shell">
        <div className="voter-auth-card">
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
    action: null,
  };

  return (
    <div className="voter-auth-shell">
      <div className="voter-auth-card">
        <h1 className="voter-auth-title">Verification Status</h1>

        <div
          className={
            meData?.status === "REJECTED" || meData?.status === "DISABLED"
              ? "voter-error"
              : meData?.status === "ACTIVE"
              ? "voter-success"
              : "voter-status-info"
          }
          style={{
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            background:
              meData?.status === "REJECTED" || meData?.status === "DISABLED"
                ? undefined
                : meData?.status === "ACTIVE"
                ? undefined
                : "#f0f4ff",
            color:
              meData?.status === "REJECTED" || meData?.status === "DISABLED"
                ? undefined
                : meData?.status === "ACTIVE"
                ? undefined
                : "#3a4a8a",
            border:
              meData?.status === "REJECTED" || meData?.status === "DISABLED"
                ? undefined
                : meData?.status === "ACTIVE"
                ? undefined
                : "1px solid #c0ccff",
          }}
        >
          <strong>{config.title}</strong>
        </div>

        {config.message && (
          <p className="voter-label" style={{ marginBottom: "12px" }}>
            {config.message}
          </p>
        )}

        {meData?.status === "REJECTED" && (
          <>
            <p className="voter-label" style={{ marginBottom: "8px" }}>
              Your verification was rejected for the following reason:
            </p>
            {meData.rejection_reason ? (
              <p
                className="voter-error"
                style={{ fontStyle: "italic", marginBottom: "16px" }}
              >
                "{meData.rejection_reason}"
              </p>
            ) : (
              <p
                className="voter-label"
                style={{ fontStyle: "italic", marginBottom: "16px" }}
              >
                No reason provided.
              </p>
            )}
          </>
        )}

        {(meData?.status === "PENDING_DOCUMENT" || meData?.status === "REJECTED") && (
          <>
            <input
              type="file"
              accept="image/jpeg,image/png"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            {uploadStatus === "done" && (
              <p className="voter-success" style={{ marginBottom: "12px" }}>
                {uploadMessage}
              </p>
            )}
            {uploadStatus === "error" && (
              <p className="voter-error" style={{ marginBottom: "12px" }}>
                {uploadMessage}
              </p>
            )}
            <button
              className="voter-continue"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus === "uploading"}
            >
              {uploadStatus === "uploading"
                ? "Uploading…"
                : meData?.status === "REJECTED"
                ? "Re-upload Document"
                : "Upload Document"}
            </button>
          </>
        )}

        {meData?.status !== "DISABLED" && (
          <p className="voter-footer" style={{ marginTop: "16px" }}>
            <button
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "0.85rem",
                textDecoration: "underline",
                padding: 0,
              }}
              onClick={() => {
                localStorage.removeItem("access_token");
                navigate("/");
              }}
            >
              Sign out
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
