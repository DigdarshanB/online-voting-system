/**
 * File: AdminAuthPage.jsx
 *
 * Purpose:
 *   Provide a dedicated administrator authentication interface (Login/Register)
 *   for the admin portal, separated from voter-facing functionality.
 *
 * Security Note:
 *   UI separation reduces accidental exposure; however, all administrative operations
 *   must be enforced using server-side authentication and role-based authorization.
 *
 * Implementation Summary:
 *   - Implements a two-tab layout (Login/Register) aligned with the wireframe.
 *   - Uses consistent field sizing and a single primary action button.
 *   - Uses a public static asset path for the national flag image.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import "./AdminAuthPage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Create a small axios instance so we can set a timeout and a single base URL.
const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PORTAL_TABS = {
  LOGIN: "login",
  ACTIVATE: "activate",
};

export default function AdminAuthPage() {
  /**
   * Purpose:
   *   Maintain UI state for tab selection and password visibility.
   */
  const [activeTab, setActiveTab] = useState(PORTAL_TABS.LOGIN);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* Loading flag to disable submit during in-flight requests. */
  const [loading, setLoading] = useState(false);

  /* Server-side error message. */
  const [serverError, setServerError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const fromActivation = location.state?.fromActivation === true;
  const [searchParams] = useSearchParams();

  /* Token from activation link URL (?tab=activate&token=...) */
  const [urlToken, setUrlToken] = useState("");

  /* On mount: auto-switch to Activate tab and capture token from URL. */
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const tokenParam = searchParams.get("token");
    if (tabParam === "activate") {
      setActiveTab(PORTAL_TABS.ACTIVATE);
    }
    if (tokenParam) {
      setUrlToken(tokenParam);
      setActiveTab(PORTAL_TABS.ACTIVATE);
    }
  }, [searchParams]);

  /**
   * Purpose:
   *   Maintain form inputs for both login and registration.
   *
   * Note:
   *   These fields are UI-only placeholders; backend integration should enforce
   *   password policy and admin onboarding constraints.
   */
  const [loginForm, setLoginForm] = useState({
    adminId: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    phoneNumber: "",
    adminId: "",
    password: "",
    confirmPassword: "",
  });

  const [activateForm, setActivateForm] = useState({
    invite_code: "",
    email: "",
    full_name: "",
    phone_number: "",
    citizenship_number: "",
    password: "",
  });

  /* Success message shown after a successful invite activation. */
  const [activateSuccess, setActivateSuccess] = useState("");

  const passwordMismatch = useMemo(() => {
    if (activeTab !== PORTAL_TABS.LOGIN) return false;
    return false;
  }, [activeTab]);

  function handleLoginChange(event) {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
    setServerError("");
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
    setServerError("");
  }

  function handleActivateChange(event) {
    const { name, value } = event.target;
    setActivateForm((prev) => ({ ...prev, [name]: value }));
    setServerError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setServerError("");
    setActivateSuccess("");
    setLoading(true);

    try {
      if (activeTab === PORTAL_TABS.LOGIN) {
        const { data } = await api.post("/auth/admin/login", {
          citizenship_number: loginForm.adminId,
          password: loginForm.password,
        });
        localStorage.setItem("access_token", data.access_token);
        // Mandatory MFA per login session: reset session flag and force TOTP step.
        sessionStorage.setItem("admin_mfa_ok", "0");
        navigate("/totp-setup");
      } else {
        if (!activateForm.email.trim()) {
          setServerError("Email is required.");
          setLoading(false);
          return;
        }
        if (!EMAIL_REGEX.test(activateForm.email.trim())) {
          setServerError("Please enter a valid email address.");
          setLoading(false);
          return;
        }
        // Build payload: prefer URL token, fall back to manual invite_code.
        const activatePayload = {
          email: activateForm.email.trim().toLowerCase(),
          full_name: activateForm.full_name,
          phone_number: activateForm.phone_number,
          citizenship_number: activateForm.citizenship_number,
          password: activateForm.password,
        };
        if (urlToken) {
          activatePayload.token = urlToken;
        } else {
          activatePayload.invite_code = activateForm.invite_code;
        }
        const { data } = await api.post("/auth/admin/activate", activatePayload);
        setActivateSuccess(
          `Account activated. Status: ${data.status ?? "PENDING_VERIFICATION"}`
        );
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      // Distinguish network timeouts/connection errors for clearer UX.
      if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
        setServerError("Login request timed out. Please check your connection or API URL.");
      } else if (err?.message === "Network Error") {
        setServerError("Cannot reach the server. Verify the backend is running and the URL is correct.");
      } else {
        setServerError(typeof detail === "string" ? detail : "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-card">
        <header className="admin-auth-header">
          {/* Static public asset path: frontend-admin/public/assets/nepal-flag.png */}
          <img
            className="admin-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />

          <h1 className="admin-title">Online Voting System</h1>
          <p className="admin-subtitle">Secure &amp; Transparent Elections</p>
        </header>

        {fromActivation && (
          <div
            style={{
              background: "#eff6ff",
              border: "2px solid #93c5fd",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
              color: "#1e40af",
              fontSize: 13,
              lineHeight: 1.5,
            }}
            role="status"
          >
            <strong>Account created!</strong> Log in below — you will be
            automatically guided to set up your MFA authenticator app.
          </div>
        )}

        <div className="admin-tabs" role="tablist" aria-label="Admin authentication tabs">
          <button
            type="button"
            className={`admin-tab ${activeTab === PORTAL_TABS.LOGIN ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === PORTAL_TABS.LOGIN}
            onClick={() => setActiveTab(PORTAL_TABS.LOGIN)}
          >
            Login
          </button>

          <button
            type="button"
            className={`admin-tab ${activeTab === PORTAL_TABS.ACTIVATE ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === PORTAL_TABS.ACTIVATE}
            onClick={() => {
              setActiveTab(PORTAL_TABS.ACTIVATE);
              setActivateSuccess("");
              setServerError("");
            }}
          >
            Activate Invite
          </button>
        </div>

        {serverError && (
          <div className="admin-error" role="alert">
            {serverError}
          </div>
        )}

        {activateSuccess && (
          <div className="admin-error" role="status" style={{ background: "#d1fae5", color: "#065f46", borderColor: "#6ee7b7" }}>
            {activateSuccess}
          </div>
        )}

        <form className="admin-form" onSubmit={handleSubmit}>
          {activeTab === PORTAL_TABS.LOGIN ? (
            <div className="admin-grid admin-grid-login">
              <div className="admin-field">
                <label className="admin-label" htmlFor="adminIdLogin">
                  Admin ID
                </label>
                <input
                  id="adminIdLogin"
                  className="admin-input"
                  name="adminId"
                  type="text"
                  value={loginForm.adminId}
                  onChange={handleLoginChange}
                  placeholder="Enter admin ID"
                  autoComplete="username"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="passwordLogin">
                  Password
                </label>

                <div className="admin-password-row">
                  <input
                    id="passwordLogin"
                    className="admin-input"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
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
            <div className="admin-grid">
              <div className="admin-field">
                <label className="admin-label" htmlFor="inviteCode">
                  Invite Code {urlToken && <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>(auto-filled from link)</span>}
                </label>
                <input
                  id="inviteCode"
                  className="admin-input"
                  name="invite_code"
                  type="text"
                  value={urlToken ? "(using activation link)" : activateForm.invite_code}
                  onChange={handleActivateChange}
                  placeholder="Enter invite code"
                  autoComplete="off"
                  disabled={!!urlToken}
                  style={urlToken ? { opacity: 0.6, fontStyle: "italic" } : undefined}
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="emailActivate">
                  Email Address
                </label>
                <input
                  id="emailActivate"
                  className="admin-input"
                  name="email"
                  type="email"
                  value={activateForm.email}
                  onChange={handleActivateChange}
                  placeholder="Enter email address"
                  autoComplete="email"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="fullNameActivate">
                  Full Name
                </label>
                <input
                  id="fullNameActivate"
                  className="admin-input"
                  name="full_name"
                  type="text"
                  value={activateForm.full_name}
                  onChange={handleActivateChange}
                  placeholder="Enter full name"
                  autoComplete="name"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="phoneActivate">
                  Phone Number
                </label>
                <input
                  id="phoneActivate"
                  className="admin-input"
                  name="phone_number"
                  type="tel"
                  value={activateForm.phone_number}
                  onChange={handleActivateChange}
                  placeholder="Enter phone number"
                  autoComplete="tel"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="citizenshipActivate">
                  Citizenship Number
                </label>
                <input
                  id="citizenshipActivate"
                  className="admin-input"
                  name="citizenship_number"
                  type="text"
                  value={activateForm.citizenship_number}
                  onChange={handleActivateChange}
                  placeholder="Enter citizenship number"
                  autoComplete="off"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="passwordActivate">
                  Password
                </label>
                <div className="admin-password-row">
                  <input
                    id="passwordActivate"
                    className="admin-input"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={activateForm.password}
                    onChange={handleActivateChange}
                    placeholder="Create password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="admin-empty-slot" aria-hidden="true" />
            </div>
          )}

          {false && (
            <div className="admin-grid admin-grid-register">
              <div className="admin-field">
                <label className="admin-label" htmlFor="fullNameRegister">
                  Full Name
                </label>
                <input
                  id="fullNameRegister"
                  className="admin-input"
                  name="fullName"
                  type="text"
                  value={registerForm.fullName}
                  onChange={handleRegisterChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="phoneRegister">
                  Phone Number
                </label>
                <input
                  id="phoneRegister"
                  className="admin-input"
                  name="phoneNumber"
                  type="tel"
                  value={registerForm.phoneNumber}
                  onChange={handleRegisterChange}
                  placeholder="Enter phone number"
                  autoComplete="tel"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="adminIdRegister">
                  Admin ID
                </label>
                <input
                  id="adminIdRegister"
                  className="admin-input"
                  name="adminId"
                  type="text"
                  value={registerForm.adminId}
                  onChange={handleRegisterChange}
                  placeholder="Enter admin ID"
                  autoComplete="username"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="passwordRegister">
                  Create Password
                </label>

                <div className="admin-password-row">
                  <input
                    id="passwordRegister"
                    className="admin-input"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    placeholder="Create password"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="confirmPasswordRegister">
                  Confirm Password
                </label>

                <div className="admin-password-row">
                  <input
                    id="confirmPasswordRegister"
                    className="admin-input"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={registerForm.confirmPassword}
                    onChange={handleRegisterChange}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Wireframe alignment: keep a symmetric grid even when the last row has one item. */}
              <div className="admin-empty-slot" aria-hidden="true" />
            </div>
          )}

          <button type="submit" className="admin-continue" disabled={loading}>
            {loading ? "Please wait…" : "Continue"}
          </button>

          <div className="admin-footer">Secure Authentication System</div>
        </form>
      </div>
    </div>
  );
}
