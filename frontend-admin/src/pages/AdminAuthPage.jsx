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

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminAuthPage.css";

const PORTAL_TABS = {
  LOGIN: "login",
  REGISTER: "register",
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

  /**
   * Purpose:
   *   Provide a simple client-side mismatch check to improve usability.
   *
   * Security Note:
   *   Client-side checks are not a security control; server-side validation is required.
   */
  const passwordMismatch = useMemo(() => {
    if (activeTab !== PORTAL_TABS.REGISTER) return false;
    if (!registerForm.password || !registerForm.confirmPassword) return false;
    return registerForm.password !== registerForm.confirmPassword;
  }, [activeTab, registerForm.password, registerForm.confirmPassword]);

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

  async function handleSubmit(event) {
    event.preventDefault();

    if (activeTab === PORTAL_TABS.REGISTER && passwordMismatch) {
      return;
    }

    setServerError("");
    setLoading(true);

    try {
      if (activeTab === PORTAL_TABS.LOGIN) {
        const { data } = await axios.post("http://localhost:8000/auth/login", {
          citizenship_number: loginForm.adminId,
          password: loginForm.password,
        });
        localStorage.setItem("access_token", data.access_token);
        navigate("/dashboard");
      } else {
        await axios.post("http://localhost:8000/auth/register", {
          full_name: registerForm.fullName,
          phone_number: registerForm.phoneNumber,
          citizenship_number: registerForm.adminId,
          password: registerForm.password,
        });
        setActiveTab(PORTAL_TABS.LOGIN);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setServerError(typeof detail === "string" ? detail : "Something went wrong. Please try again.");
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
            className="admin-tab"
            role="tab"
            aria-selected={false}
            disabled
            title="Admins are provisioned by the Election Commission"
          >
            Register
          </button>
        </div>

        {serverError && (
          <div className="admin-error" role="alert">
            {serverError}
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
            </div>
          ) : (
            <div className="admin-grid">
              <p className="admin-label" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "1.5rem 0" }}>
                Admins are provisioned by the Election Commission.
              </p>
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
