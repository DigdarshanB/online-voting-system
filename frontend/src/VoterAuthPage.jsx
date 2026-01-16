/**
 * VoterAuthPage.jsx
 *
 * Purpose:
 *   Render the voter authentication interface supporting login and registration modes.
 *
 * UI Objectives:
 *   - Use a lighter blue palette to avoid visually heavy tones.
 *   - Constrain input widths to prevent stretched appearance on wide screens.
 *   - Display the Nepal flag via an image asset to keep implementation defendable in vivas.
 *
 * Integration Contract:
 *   - Health check: GET {VITE_API_BASE_URL}/health
 *   - Voter login:  POST {VITE_API_BASE_URL}/auth/voter/login
 *   - Voter register: POST {VITE_API_BASE_URL}/auth/voter/register
 *
 * Notes:
 *   If your backend currently uses different endpoint paths, adjust the endpoint strings only.
 *   No UI rewrite is required to support endpoint changes.
 */

import { useEffect, useMemo, useState } from "react";

export default function VoterAuthPage() {
  const apiBaseUrl = useMemo(() => {
    /**
     * Purpose:
     *   Resolve the backend base URL from environment configuration.
     *
     * Output:
     *   A string URL used as the prefix for all backend requests.
     */
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  }, []);

  const portalConfig = useMemo(() => {
    return {
      portalLabel: "Voter portal",
      headline: "Online Voting System",
      subheadline: "Secure Voter Authentication",
      flagSrc: "/assets/nepal-flag.png",
      healthEndpoint: `${apiBaseUrl}/health`,
      loginEndpoint: `${apiBaseUrl}/auth/voter/login`,
      registerEndpoint: `${apiBaseUrl}/auth/voter/register`,
    };
  }, [apiBaseUrl]);

  const [backendStatus, setBackendStatus] = useState("unknown");
  const [mode, setMode] = useState("login");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [citizenshipId, setCitizenshipId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [formError, setFormError] = useState("");

  useEffect(() => {
    /**
     * Purpose:
     *   Verify backend availability and display a minimal status indicator.
     *
     * Output:
     *   Updates backendStatus to one of: "ok", "down".
     */
    let isMounted = true;

    async function checkHealth() {
      try {
        const response = await fetch(portalConfig.healthEndpoint);
        if (!isMounted) return;

        setBackendStatus(response.ok ? "ok" : "down");
      } catch (err) {
        if (!isMounted) return;
        setBackendStatus("down");
      }
    }

    checkHealth();
    return () => {
      isMounted = false;
    };
  }, [portalConfig.healthEndpoint]);

  async function handleSubmit(event) {
    /**
     * Purpose:
     *   Validate voter inputs and submit a login or registration request.
     *
     * Inputs:
     *   - mode: "login" or "register"
     *   - citizenshipId: User-provided citizenship identifier
     *   - password: User-provided password
     *   - confirmPassword: Registration-only confirmation
     *
     * Output:
     *   - On success: a JSON response is returned (e.g., token/session metadata).
     *   - On failure: a user-readable error is presented in the UI.
     *
     * Security Note:
     *   This UI does not enforce authorization. All privileged operations must be validated server-side.
     */
    event.preventDefault();
    setFormError("");

    if (!citizenshipId.trim()) {
      setFormError("Citizenship ID is required.");
      return;
    }
    if (!password) {
      setFormError("Password is required.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    const endpoint = mode === "login" ? portalConfig.loginEndpoint : portalConfig.registerEndpoint;

    const payload =
      mode === "login"
        ? { citizenship_id: citizenshipId, password }
        : { citizenship_id: citizenshipId, password, confirm_password: confirmPassword };

    setIsSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        /**
         * Purpose:
         *   Avoid exposing internal server details while still providing feedback.
         *   If the backend returns a plain message, it is displayed as-is.
         */
        const errorText = await response.text();
        setFormError(errorText || "Authentication failed.");
        return;
      }

      const result = await response.json();

      /**
       * Integration Step:
       *   Store tokens using the project’s chosen approach.
       *   For production-grade systems, httpOnly cookies are preferred over localStorage.
       */
      console.log("Voter authentication succeeded:", result);
    } catch (err) {
      setFormError("Network error occurred while submitting the request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusBadge =
    backendStatus === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : backendStatus === "down"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-blue-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Branding panel */}
          <aside className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white p-10">
            <div className="flex items-center gap-4">
              <img
                src={portalConfig.flagSrc}
                alt="Nepal national flag"
                className="h-20 w-auto drop-shadow-sm"
              />
              <div>
                <h1 className="text-2xl font-semibold leading-tight">{portalConfig.headline}</h1>
                <p className="text-white/90">{portalConfig.subheadline}</p>
              </div>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold bg-white/10 border-white/25">
              <span>Backend:</span>
              <span className="text-white">{backendStatus}</span>
            </div>

            <div className="mt-10 space-y-3 text-white/90">
              <p className="text-sm">
                Portal scope: <span className="font-medium text-white">{portalConfig.portalLabel}</span>
              </p>
              <p className="text-sm">
                This interface is restricted to voter authentication and voter account creation.
              </p>
            </div>
          </aside>

          {/* Form panel */}
          <section className="p-10">
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusBadge}`}>
                  Backend status: {backendStatus}
                </div>
              </div>

              <div className="flex gap-6 border-b border-slate-200 mb-8">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`pb-3 text-sm font-semibold ${
                    mode === "login" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-500"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`pb-3 text-sm font-semibold ${
                    mode === "register" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-500"
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Citizenship ID</label>
                  <input
                    value={citizenshipId}
                    onChange={(e) => setCitizenshipId(e.target.value)}
                    placeholder="Enter your citizenship ID"
                    className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    autoComplete="username"
                    inputMode="text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    type="password"
                    className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>

                {mode === "register" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      type="password"
                      className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                      autoComplete="new-password"
                    />
                  </div>
                )}

                {formError && (
                  <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
                    {formError}
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button type="button" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {mode === "login" ? "Login" : "Create account"}
                </button>

                <p className="text-xs text-slate-500 text-center">
                  Voter authentication interface.
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
