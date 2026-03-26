import React, { useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./VoterAuthPage.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * File: VoterAuthPage.jsx
 *
 * Purpose:
 *   Provide the voter authentication interface (Login/Register) following the submitted wireframe.
 *
 * Scope:
 *   - UI-only implementation for authentication pages.
 *   - Backend integration (API requests) should be inserted into the marked placeholders.
 *
 * Security Note:
 *   UI separation does not provide security. All authorization and access control must be enforced
 *   by the backend for every sensitive operation.
 */
export default function VoterAuthPage() {
  /* Authentication mode state used to switch wireframe panels. */
  const [mode, setMode] = useState("login");

  /* Password visibility toggles for improved UX without changing submission logic. */
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);

  /* Login form state matching the wireframe intent (Citizenship ID + Password). */
  const [loginForm, setLoginForm] = useState({
    citizenshipId: "",
    password: "",
  });

  /* Register form state matching the wireframe fields and placement. */
  const [registerForm, setRegisterForm] = useState({
    email: "",
    fullName: "",
    phoneNumber: "",
    citizenshipId: "",
    password: "",
    confirmPassword: "",
  });

  /* UI-level error messaging for immediate feedback (does not replace server validation). */
  const [formError, setFormError] = useState("");

  /* Loading flag to disable submit during in-flight requests. */
  const [loading, setLoading] = useState(false);

  /* Document upload state (shown after login). */
  const [uploadStatus, setUploadStatus] = useState(""); // "" | "uploading" | "success" | "error"
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  /* Public asset reference; do not import from /public using relative paths. */
  const nepalFlagUrl = useMemo(() => "/assets/nepal-flag.png", []);

  /**
   * Purpose:
   *   Update a single field in the login form state.
   */
  function updateLoginField(fieldName, value) {
    setLoginForm((prev) => ({ ...prev, [fieldName]: value }));
  }

  /**
   * Purpose:
   *   Update a single field in the registration form state.
   */
  function updateRegisterField(fieldName, value) {
    setRegisterForm((prev) => ({ ...prev, [fieldName]: value }));
  }

  /**
   * Purpose:
   *   Perform minimal client-side checks to prevent empty submissions.
   *
   * Expected Outcome:
   *   Returns an empty string when inputs are acceptable; otherwise returns an error message.
   */
  function validateCurrentMode() {
    setFormError("");

    if (mode === "login") {
      if (!loginForm.citizenshipId.trim()) return "Citizenship ID is required.";
      if (!loginForm.password) return "Password is required.";
      return "";
    }

    if (!registerForm.fullName.trim()) return "Full name is required.";
    if (!registerForm.email.trim()) return "Email is required.";
    if (!EMAIL_REGEX.test(registerForm.email.trim())) return "Please enter a valid email address.";
    if (!registerForm.phoneNumber.trim()) return "Phone number is required.";
    if (!registerForm.citizenshipId.trim()) return "Citizenship ID is required.";
    if (!registerForm.password) return "Create password is required.";
    if (registerForm.password.length < 8) return "Password must be at least 8 characters.";
    if (registerForm.confirmPassword !== registerForm.password) return "Passwords do not match.";
    return "";
  }

  /**
   * Purpose:
   *   Normalize API errors into a user-friendly string, including FastAPI validation payloads.
   */
  function getApiErrorMessage(error) {
    const detail = error?.response?.data?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const joined = detail
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null;
          const msg = typeof item.msg === "string" ? item.msg : null;
          if (field && msg) return `${field}: ${msg}`;
          return msg;
        })
        .filter(Boolean)
        .join("; ");

      if (joined) return joined;
    }

    const message = error?.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (!error?.response) {
      return "Cannot reach backend API. Please confirm the server is running.";
    }

    return `Request failed (${error.response.status}). Please try again.`;
  }

  /**
   * Purpose:
   *   Handle citizenship document upload after login.
   */
  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus("uploading");
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("access_token");
      await axios.post(
        "http://localhost:8000/verification/citizenship/upload",
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUploadStatus("success");
      setUploadMessage("Document uploaded successfully.");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setUploadStatus("error");
      setUploadMessage(
        typeof detail === "string" ? detail : "Upload failed. Please try again."
      );
    } finally {
      // Reset file input so the same file can be re-selected after an error.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /**
   * Purpose:
   *   Handle form submission for the active mode.
   */
  async function handleSubmit(event) {
    event.preventDefault();

    const errorMessage = validateCurrentMode();
    if (errorMessage) {
      setFormError(errorMessage);
      return;
    }

    setFormError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { data } = await axios.post("http://localhost:8000/auth/login", {
          citizenship_number: loginForm.citizenshipId,
          password: loginForm.password,
        });
        localStorage.setItem("access_token", data.access_token);
        const { data: me } = await axios.get("http://localhost:8000/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (!me.email_verified) {
          navigate("/verify-email");
        } else if (me.status === "ACTIVE" && me.totp_enabled) {
          navigate("/home");
        } else if (me.status === "ACTIVE" && !me.totp_enabled) {
          navigate("/totp-setup");
        } else if (me.status === "PENDING_FACE") {
          navigate("/face-verification");
        } else {
          navigate("/status");
        }
      } else {
        await axios.post("http://localhost:8000/auth/register", {
          email: registerForm.email.trim().toLowerCase(),
          full_name: registerForm.fullName,
          phone_number: registerForm.phoneNumber,
          citizenship_number: registerForm.citizenshipId,
          password: registerForm.password,
        });
        setMode("login");
      }
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="voter-auth-shell">
      <section className="voter-auth-card" aria-label="Voter Authentication">
        <header className="voter-auth-header">
          <img className="voter-flag" src={nepalFlagUrl} alt="Nepal national flag" />
          <h1 className="voter-title">Online Voting System</h1>
          <p className="voter-subtitle">Secure &amp; Transparent Elections</p>
        </header>

        <div className="voter-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`voter-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setFormError("");
              setMode("login");
            }}
          >
            Login
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={`voter-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setFormError("");
              setMode("register");
            }}
          >
            Register
          </button>
        </div>

        {formError ? (
          <div className="voter-error" role="alert" aria-live="polite">
            {formError}
          </div>
        ) : null}

        {uploadMessage ? (
          <div
            className={uploadStatus === "success" ? "voter-success" : "voter-error"}
            role="alert"
            aria-live="polite"
          >
            {uploadMessage}
          </div>
        ) : null}

        <form className="voter-form" onSubmit={handleSubmit} noValidate>
          {mode === "upload" ? (
            <div className="voter-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="voter-field" style={{ textAlign: "center" }}>
                <p className="voter-label" style={{ marginBottom: "1rem" }}>
                  Upload your citizenship document image to verify your identity.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className="voter-continue"
                  disabled={uploadStatus === "uploading"}
                  onClick={() => fileInputRef.current.click()}
                  style={{ marginBottom: "0.75rem" }}
                >
                  {uploadStatus === "uploading" ? "Uploading\u2026" : "Upload Document"}
                </button>
                <br />
                <button
                  type="button"
                  className="voter-mini-btn"
                  onClick={() => navigate("/totp-setup")}
                >
                  {uploadStatus === "success" ? "Continue to Setup →" : "Skip for now"}
                </button>
              </div>
            </div>
          ) : mode === "login" ? (
            <div className="voter-grid voter-grid-login">
              <div className="voter-field">
                <label className="voter-label" htmlFor="loginCitizenship">
                  Citizenship ID
                </label>
                <input
                  id="loginCitizenship"
                  className="voter-input"
                  type="text"
                  placeholder="Enter citizenship ID"
                  value={loginForm.citizenshipId}
                  onChange={(e) => updateLoginField("citizenshipId", e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="voter-field">
                <label className="voter-label" htmlFor="loginPassword">
                  Password
                </label>

                <div className="voter-password-row">
                  <input
                    id="loginPassword"
                    className="voter-input"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={loginForm.password}
                    onChange={(e) => updateLoginField("password", e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="voter-mini-btn"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    aria-label="Toggle password visibility"
                  >
                    {showLoginPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: "right", marginTop: -6 }}>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-blue)", textDecoration: "none" }}
                >
                  Forgot password?
                </Link>
                <span style={{ margin: "0 8px", color: "var(--muted)", fontWeight: 700 }}>·</span>
                <Link
                  to="/totp-recovery"
                  style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-blue)", textDecoration: "none" }}
                >
                  Lost authenticator?
                </Link>
              </div>
            </div>
          ) : (
            <div className="voter-grid voter-grid-register">
              <div className="voter-field">
                <label className="voter-label" htmlFor="regFullName">
                  Full Name
                </label>
                <input
                  id="regFullName"
                  className="voter-input"
                  type="text"
                  placeholder="Enter your full name"
                  value={registerForm.fullName}
                  onChange={(e) => updateRegisterField("fullName", e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="voter-field">
                <label className="voter-label" htmlFor="regEmail">
                  Email Address
                </label>
                <input
                  id="regEmail"
                  className="voter-input"
                  type="email"
                  placeholder="Enter your email"
                  value={registerForm.email}
                  onChange={(e) => updateRegisterField("email", e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="voter-field">
                <label className="voter-label" htmlFor="regPhone">
                  Phone Number
                </label>
                <input
                  id="regPhone"
                  className="voter-input"
                  type="tel"
                  placeholder="Enter phone number"
                  value={registerForm.phoneNumber}
                  onChange={(e) => updateRegisterField("phoneNumber", e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="voter-field">
                <label className="voter-label" htmlFor="regCitizenship">
                  Citizenship ID
                </label>
                <input
                  id="regCitizenship"
                  className="voter-input"
                  type="text"
                  placeholder="Enter citizenship ID"
                  value={registerForm.citizenshipId}
                  onChange={(e) => updateRegisterField("citizenshipId", e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="voter-field">
                <label className="voter-label" htmlFor="regPassword">
                  Create Password
                </label>

                <div className="voter-password-row">
                  <input
                    id="regPassword"
                    className="voter-input"
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="Create password"
                    value={registerForm.password}
                    onChange={(e) => updateRegisterField("password", e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="voter-mini-btn"
                    onClick={() => setShowRegisterPassword((v) => !v)}
                    aria-label="Toggle password visibility"
                  >
                    {showRegisterPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="voter-field">
                <label className="voter-label" htmlFor="regConfirm">
                  Confirm Password
                </label>

                <div className="voter-password-row">
                  <input
                    id="regConfirm"
                    className="voter-input"
                    type={showRegisterConfirm ? "text" : "password"}
                    placeholder="Confirm password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => updateRegisterField("confirmPassword", e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="voter-mini-btn"
                    onClick={() => setShowRegisterConfirm((v) => !v)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showRegisterConfirm ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode !== "upload" && (
            <button className="voter-continue" type="submit" disabled={loading}>
              {loading ? "Please wait\u2026" : "Continue"}
            </button>
          )}
          <footer className="voter-footer">Secure Authentication System</footer>
        </form>
      </section>
    </main>
  );
}
