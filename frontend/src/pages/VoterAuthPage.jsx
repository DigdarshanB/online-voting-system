import React, { useMemo, useState } from "react";
import "./VoterAuthPage.css";

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
    fullName: "",
    phoneNumber: "",
    citizenshipId: "",
    password: "",
    confirmPassword: "",
  });

  /* UI-level error messaging for immediate feedback (does not replace server validation). */
  const [formError, setFormError] = useState("");

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
    if (!registerForm.phoneNumber.trim()) return "Phone number is required.";
    if (!registerForm.citizenshipId.trim()) return "Citizenship ID is required.";
    if (!registerForm.password) return "Create password is required.";
    if (registerForm.password.length < 8) return "Password must be at least 8 characters.";
    if (registerForm.confirmPassword !== registerForm.password) return "Passwords do not match.";
    return "";
  }

  /**
   * Purpose:
   *   Handle form submission for the active mode.
   *
   * Integration Point:
   *   Insert API calls in the placeholders without changing the UI layout.
   */
  function handleSubmit(event) {
    event.preventDefault();

    const errorMessage = validateCurrentMode();
    if (errorMessage) {
      setFormError(errorMessage);
      return;
    }

    if (mode === "login") {
      /*
       * TODO (Integration):
       *   POST to voter login endpoint.
       *   Example payload: { citizenshipId, password }
       */
    } else {
      /*
       * TODO (Integration):
       *   POST to voter registration endpoint.
       *   Example payload: { fullName, phoneNumber, citizenshipId, password }
       */
    }

    setFormError("");
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

        <form className="voter-form" onSubmit={handleSubmit} noValidate>
          {mode === "login" ? (
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

              {/* Wireframe placement: confirm password appears as a right-column field on the next row. */}
              <div className="voter-field voter-empty-slot" aria-hidden="true" />

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

          <button className="voter-continue" type="submit">
            Continue
          </button>

          <footer className="voter-footer">Secure Authentication System</footer>
        </form>
      </section>
    </main>
  );
}
