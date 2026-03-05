/**
 * File: SuperAdminInvitesPage.jsx
 *
 * Purpose:
 *   Allow super_admin to issue and revoke one-time admin invite codes from the
 *   portal — no Swagger required.
 *
 * Access:
 *   - super_admin: full UI (create + list + revoke)
 *   - admin: "Access denied" message (backend also enforces 403)
 */

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminAuthPage.css";

const API = "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_STYLES = {
  ISSUED:  { background: "#dbeafe", color: "#1e40af" },
  USED:    { background: "#d1fae5", color: "#065f46" },
  REVOKED: { background: "#fee2e2", color: "#991b1b" },
  EXPIRED: { background: "#f1f5f9", color: "#475569" },
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? { background: "#f1f5f9", color: "#475569" };
  return (
    <span
      style={{
        ...style,
        borderRadius: 6,
        padding: "3px 8px",
        fontWeight: 900,
        fontSize: 11,
        display: "inline-block",
      }}
    >
      {status}
    </span>
  );
}

const TH = {
  textAlign: "left",
  padding: "8px 12px",
  fontWeight: 900,
  color: "var(--text)",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const TD = {
  padding: "8px 12px",
  verticalAlign: "middle",
  color: "var(--text)",
  fontSize: 13,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function SuperAdminInvitesPage() {
  const navigate = useNavigate();

  // null = loading, string = role
  const [role, setRole]             = useState(null);
  const [invites, setInvites]       = useState([]);
  const [recipientId, setRecipientId] = useState("");
  const [creating, setCreating]     = useState(false);
  const [newCode, setNewCode]       = useState(null);   // { code, expiresAt }
  const [copied, setCopied]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [listError, setListError]   = useState("");

  // ── Load invite list ──
  const loadInvites = useCallback(async () => {
    setListError("");
    try {
      const { data } = await axios.get(`${API}/admin/invites`, {
        headers: authHeaders(),
      });
      setInvites(data);
    } catch {
      setListError("Failed to load invites. Try refreshing.");
    }
  }, []);

  // ── Bootstrap: verify token + get role ──
  useEffect(() => {
    async function bootstrap() {
      try {
        const { data } = await axios.get(`${API}/auth/me`, {
          headers: authHeaders(),
        });
        setRole(data.role);
        if (data.role === "super_admin") {
          loadInvites();
        }
      } catch {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("admin_mfa_ok");
        navigate("/", { replace: true });
      }
    }
    bootstrap();
  }, [navigate, loadInvites]);

  // ── Create invite ──
  async function handleCreate(evt) {
    evt.preventDefault();
    setFormError("");
    setNewCode(null);
    setCreating(true);
    try {
      const { data } = await axios.post(
        `${API}/admin/invites`,
        { recipient_identifier: recipientId.trim() },
        { headers: authHeaders() }
      );
      setNewCode({ code: data.invite_code, activationUrl: data.activation_url, expiresAt: data.expires_at });
      setRecipientId("");
      await loadInvites();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setFormError(typeof detail === "string" ? detail : "Failed to create invite.");
    } finally {
      setCreating(false);
    }
  }

  // ── Revoke invite ──
  async function handleRevoke(id) {
    setListError("");
    try {
      await axios.post(`${API}/admin/invites/${id}/revoke`, {}, {
        headers: authHeaders(),
      });
      await loadInvites();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setListError(typeof detail === "string" ? detail : "Failed to revoke invite.");
    }
  }

  // ── Copy invite code ──
  function handleCopy() {
    if (!newCode) return;
    const text = newCode.activationUrl || newCode.code;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Loading ──
  if (role === null) {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card">
          <p style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  // ── Access denied ──
  if (role !== "super_admin") {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card">
          <header className="admin-auth-header">
            <h1 className="admin-title">Access Denied</h1>
            <p className="admin-subtitle">
              Only super admins can manage invites.
            </p>
          </header>
          <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
            <button
              type="button"
              className="admin-continue"
              onClick={() => navigate("/dashboard")}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Super admin UI ──
  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-card">
        <header className="admin-auth-header">
          <img
            className="admin-flag"
            src="/assets/nepal-flag.png"
            alt="Nepal national flag"
          />
          <h1 className="admin-title">Admin Invites</h1>
          <p className="admin-subtitle">
            Issue and revoke one-time invite codes for new admins.
          </p>
        </header>

        {/* ── Create invite form ── */}
        <form onSubmit={handleCreate} className="admin-form" style={{ marginBottom: 24 }}>
          {formError && (
            <div className="admin-error" role="alert">
              {formError}
            </div>
          )}
          <div className="admin-field">
            <label className="admin-label" htmlFor="recipientId">
              Recipient Identifier
              <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>
                (citizenship no. or email)
              </span>
            </label>
            <input
              id="recipientId"
              className="admin-input"
              type="text"
              placeholder="e.g. 01-02-03-12345 or admin@example.com"
              value={recipientId}
              onChange={(e) => {
                setRecipientId(e.target.value);
                setFormError("");
                setNewCode(null);
              }}
              required
            />
          </div>
          <button
            type="submit"
            className="admin-continue"
            disabled={creating || !recipientId.trim()}
          >
            {creating ? "Creating…" : "Create Invite"}
          </button>
        </form>

        {/* ── New code banner (shown once) ── */}
        {newCode && (
          <div
            style={{
              background: "#f0fdf4",
              border: "2px solid #86efac",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 24,
            }}
          >
            <p
              style={{
                fontWeight: 900,
                color: "#166534",
                marginBottom: 10,
                fontSize: 13,
              }}
            >
              ✓ Invite created — share this link once. It will not be shown again.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <code
                style={{
                  flex: 1,
                  background: "#dcfce7",
                  border: "1px solid #86efac",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontFamily: "monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  wordBreak: "break-all",
                  userSelect: "all",
                }}
              >
                {newCode.activationUrl}
              </code>
              <button
                type="button"
                className="admin-mini-btn"
                onClick={handleCopy}
                style={{ minWidth: 70 }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: "#15803d" }}>
              Expires: {fmtDate(newCode.expiresAt)}
            </p>
          </div>
        )}

        {/* ── Invite list ── */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 900,
                color: "var(--text)",
              }}
            >
              All Invites
            </h2>
            <button
              type="button"
              className="admin-mini-btn"
              onClick={loadInvites}
            >
              Refresh
            </button>
          </div>

          {listError && (
            <div className="admin-error" role="alert">
              {listError}
            </div>
          )}

          {invites.length === 0 ? (
            <p
              style={{
                color: "var(--muted)",
                fontSize: 13,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              No invites yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
              >
                <thead>
                  <tr style={{ borderBottom: "3px solid var(--border-strong)" }}>
                    <th style={TH}>Recipient</th>
                    <th style={TH}>Status</th>
                    <th style={TH}>Expires</th>
                    <th style={TH}>Created</th>
                    <th style={TH}>Used</th>
                    <th style={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr
                      key={inv.id}
                      style={{ borderBottom: "1px solid var(--border-soft)" }}
                    >
                      <td style={TD}>{inv.recipient_identifier}</td>
                      <td style={TD}>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td style={TD}>{fmtDate(inv.expires_at)}</td>
                      <td style={TD}>{fmtDate(inv.created_at)}</td>
                      <td style={TD}>
                        {inv.used_at ? fmtDate(inv.used_at) : "—"}
                      </td>
                      <td style={TD}>
                        {inv.status === "ISSUED" && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.id)}
                            style={{
                              border: "2px solid #dc2626",
                              background: "transparent",
                              color: "#dc2626",
                              borderRadius: 6,
                              padding: "4px 10px",
                              cursor: "pointer",
                              fontWeight: 900,
                              fontSize: 12,
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            type="button"
            className="admin-mini-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
