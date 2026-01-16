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
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    /**
     * Purpose:
     *   Prevent submission when passwords do not match (register tab).
     *
     * Expected Outcome:
     *   A user-friendly block that avoids sending inconsistent input to the backend.
     */
    if (activeTab === PORTAL_TABS.REGISTER && passwordMismatch) {
      return;
    }

    /**
     * Placeholder:
     *   Replace with backend integration (e.g., POST /admin/auth/login or /admin/auth/register).
     *   The server must enforce identity verification and role-based access checks.
     */
    // console.log({ activeTab, loginForm, registerForm });
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
            className={`admin-tab ${activeTab === PORTAL_TABS.REGISTER ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === PORTAL_TABS.REGISTER}
            onClick={() => setActiveTab(PORTAL_TABS.REGISTER)}
          >
            Register
          </button>
        </div>

        {activeTab === PORTAL_TABS.REGISTER && passwordMismatch && (
          <div className="admin-error" role="alert">
            Password and confirm password must match.
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

          <button type="submit" className="admin-continue">
            Continue
          </button>

          <div className="admin-footer">Secure Authentication System</div>
        </form>
      </div>
    </div>
  );
}
