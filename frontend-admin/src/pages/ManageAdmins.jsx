/**
 * File: ManageAdmins.jsx
 *
 * Purpose:
 *   Unified super_admin page to manage the full admin lifecycle:
 *   A) Issue / revoke invites
 *   B) View / approve / reject / delete pending admin requests
 *   C) View active admins and disable (delete) an admin
 *
 * Access:
 *   - super_admin: full UI
 *   - others: "Access denied" (backend also enforces 403)
 */

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminAuthPage.css";

const API = "http://localhost:8000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}

// ── Helpers ──────────────────────────────────────────────────────

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

const INVITE_STATUS_STYLES = {
  ISSUED:  { background: "#dbeafe", color: "#1e40af" },
  USED:    { background: "#d1fae5", color: "#065f46" },
  REVOKED: { background: "#fee2e2", color: "#991b1b" },
  EXPIRED: { background: "#f1f5f9", color: "#475569" },
};

const ADMIN_STATUS_STYLES = {
  PENDING_MFA:      { background: "#fef3c7", color: "#92400e" },
  PENDING_APPROVAL: { background: "#dbeafe", color: "#1e40af" },
  ACTIVE:           { background: "#d1fae5", color: "#065f46" },
  REJECTED:         { background: "#fee2e2", color: "#991b1b" },
};

function StatusBadge({ status, palette }) {
  const styles = palette === "invite" ? INVITE_STATUS_STYLES : ADMIN_STATUS_STYLES;
  const style = styles[status] ?? { background: "#f1f5f9", color: "#475569" };
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

// ── Table styles (matches existing pages) ────────────────────────

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

const sectionTitle = {
  margin: 0,
  fontSize: 15,
  fontWeight: 900,
  color: "var(--text)",
};

const sectionWrap = {
  marginBottom: 32,
};

const divider = {
  border: "none",
  borderTop: "2px solid var(--border-soft)",
  margin: "28px 0",
};

// ══════════════════════════════════════════════════════════════════

export default function ManageAdmins() {
  const navigate = useNavigate();

  // Auth / role
  const [role, setRole] = useState(null);

  // Invite state
  const [invites, setInvites]         = useState([]);
  const [recipientId, setRecipientId] = useState("");
  const [creating, setCreating]       = useState(false);
  const [newCode, setNewCode]         = useState(null);
  const [copied, setCopied]           = useState(false);
  const [inviteFormErr, setInviteFormErr] = useState("");
  const [inviteListErr, setInviteListErr]           = useState("");
  const [inviteSearch, setInviteSearch]               = useState("");
  const [inviteStatusFilter, setInviteStatusFilter]   = useState("ALL");
  const [inviteShowAll, setInviteShowAll]             = useState(false);

  // Pending admins state
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [pendingErr, setPendingErr]       = useState("");

  // Active admins state
  const [activeAdmins, setActiveAdmins] = useState([]);
  const [activeErr, setActiveErr]       = useState("");

  // Shared action message
  const [actionMsg, setActionMsg] = useState("");

  // ── Loaders ──

  const loadInvites = useCallback(async () => {
    setInviteListErr("");
    try {
      const { data } = await axios.get(`${API}/admin/invites`, { headers: authHeaders() });
      setInvites(data);
    } catch {
      setInviteListErr("Failed to load invites.");
    }
  }, []);

  const loadPending = useCallback(async () => {
    setPendingErr("");
    try {
      const { data } = await axios.get(`${API}/admin/verifications/pending-admins`, { headers: authHeaders() });
      setPendingAdmins(data);
    } catch (err) {
      setPendingErr(err?.response?.data?.detail ?? "Failed to load pending admins.");
    }
  }, []);

  const loadActive = useCallback(async () => {
    setActiveErr("");
    try {
      const { data } = await axios.get(`${API}/admin/verifications/active-admins`, { headers: authHeaders() });
      setActiveAdmins(data);
    } catch (err) {
      setActiveErr(err?.response?.data?.detail ?? "Failed to load active admins.");
    }
  }, []);

  // ── Bootstrap ──

  useEffect(() => {
    async function bootstrap() {
      try {
        const { data } = await axios.get(`${API}/auth/me`, { headers: authHeaders() });
        setRole(data.role);
        if (data.role === "super_admin") {
          loadInvites();
          loadPending();
          loadActive();
        }
      } catch {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("admin_mfa_ok");
        navigate("/", { replace: true });
      }
    }
    bootstrap();
  }, [navigate, loadInvites, loadPending, loadActive]);

  // ═══════════════════════════════════════════════════════════════
  // Section A: Invites
  // ═══════════════════════════════════════════════════════════════

  async function handleCreateInvite(evt) {
    evt.preventDefault();
    setInviteFormErr("");
    setNewCode(null);
    const normalizedEmail = recipientId.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setInviteFormErr("Please enter a valid recipient email address.");
      return;
    }
    setCreating(true);
    try {
      const { data } = await axios.post(
        `${API}/admin/invites`,
        { recipient_identifier: normalizedEmail },
        { headers: authHeaders() },
      );
      setNewCode({ code: data.invite_code, activationUrl: data.activation_url, expiresAt: data.expires_at });
      setRecipientId("");
      await loadInvites();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setInviteFormErr(typeof detail === "string" ? detail : "Failed to create invite.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeInvite(id) {
    setInviteListErr("");
    try {
      await axios.post(`${API}/admin/invites/${id}/revoke`, {}, { headers: authHeaders() });
      await loadInvites();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setInviteListErr(typeof detail === "string" ? detail : "Failed to revoke invite.");
    }
  }

  async function handleDeleteInvite(id, recipient, status) {
    if (!window.confirm(
      `Delete invite ${id} for ${recipient} (status=${status})? This cannot be undone.`
    )) return;
    setInviteListErr("");
    try {
      await axios.delete(`${API}/admin/invites/${id}`, { headers: authHeaders() });
      await loadInvites();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setInviteListErr(typeof detail === "string" ? detail : "Failed to delete invite.");
    }
  }

  function handleCopy() {
    if (!newCode) return;
    const text = newCode.activationUrl || newCode.code;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Section B: Pending Admins
  // ═══════════════════════════════════════════════════════════════

  async function handleApprove(id, name) {
    setActionMsg("");
    try {
      await axios.post(`${API}/admin/verifications/${id}/approve`, {}, { headers: authHeaders() });
      setActionMsg(`✓ ${name ?? `Admin #${id}`} approved.`);
      loadPending();
      loadActive();
    } catch (err) {
      setActionMsg(`✗ Approve failed: ${err?.response?.data?.detail ?? "unknown error"}`);
    }
  }

  async function handleReject(id, name) {
    const reason = prompt(`Reason for rejecting ${name ?? `Admin #${id}`}:`);
    if (!reason) return;
    setActionMsg("");
    try {
      await axios.post(`${API}/admin/verifications/${id}/reject`, { reason }, { headers: authHeaders() });
      setActionMsg(`✓ ${name ?? `Admin #${id}`} rejected.`);
      loadPending();
    } catch (err) {
      setActionMsg(`✗ Reject failed: ${err?.response?.data?.detail ?? "unknown error"}`);
    }
  }

  async function handleDeletePending(id, citizenship) {
    if (!window.confirm(
      `Are you sure you want to delete this pending admin request for ${citizenship ?? `ID ${id}`}?`
    )) return;
    setActionMsg("");
    try {
      await axios.delete(`${API}/admin/verifications/${id}`, { headers: authHeaders() });
      setActionMsg(`✓ Pending request for ${citizenship ?? `ID ${id}`} removed.`);
      loadPending();
    } catch (err) {
      setActionMsg(`✗ Delete failed: ${err?.response?.data?.detail ?? "unknown error"}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Section C: Active Admins
  // ═══════════════════════════════════════════════════════════════

  async function handleDeleteActive(id, citizenship) {
    if (!window.confirm(
      `Are you sure you want to disable this ACTIVE admin (${citizenship ?? `ID ${id}`})? This will revoke access immediately.`
    )) return;
    setActionMsg("");
    try {
      await axios.delete(`${API}/admin/verifications/active-admins/${id}`, { headers: authHeaders() });
      setActionMsg(`✓ Admin ${citizenship ?? `ID ${id}`} disabled.`);
      loadActive();
    } catch (err) {
      setActionMsg(`✗ Disable failed: ${err?.response?.data?.detail ?? "unknown error"}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  // Loading
  if (role === null) {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card">
          <p style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (role !== "super_admin") {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card">
          <header className="admin-auth-header">
            <h1 className="admin-title">Access Denied</h1>
            <p className="admin-subtitle">Only super admins can manage admins.</p>
          </header>
          <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
            <button type="button" className="admin-continue" onClick={() => navigate("/dashboard")}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-card" style={{ maxWidth: 980 }}>
        <header className="admin-auth-header">
          <img className="admin-flag" src="/assets/nepal-flag.png" alt="Nepal national flag" />
          <h1 className="admin-title">Manage Admins</h1>
          <p className="admin-subtitle">Issue invites, review requests, and manage active admins.</p>
        </header>

        {/* ── Action message ── */}
        {actionMsg && (
          <div
            style={{
              background: actionMsg.startsWith("✓") ? "#f0fdf4" : "#fef2f2",
              border: `2px solid ${actionMsg.startsWith("✓") ? "#86efac" : "#fca5a5"}`,
              color: actionMsg.startsWith("✓") ? "#166534" : "#991b1b",
              borderRadius: 10,
              padding: "10px 16px",
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {actionMsg}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* Section A: Invites                                      */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section style={sectionWrap}>
          <h2 style={{ ...sectionTitle, fontSize: 16, marginBottom: 16 }}>Invites</h2>

          {/* Create invite form */}
          <form onSubmit={handleCreateInvite} className="admin-form" style={{ marginBottom: 16 }}>
            {inviteFormErr && <div className="admin-error" role="alert">{inviteFormErr}</div>}
            <div className="admin-field">
              <label className="admin-label" htmlFor="recipientId">
                Recipient Email
              </label>
              <input
                id="recipientId"
                className="admin-input"
                type="email"
                placeholder="admin@example.com"
                value={recipientId}
                onChange={(e) => { setRecipientId(e.target.value); setInviteFormErr(""); setNewCode(null); }}
                required
              />
            </div>
            <button type="submit" className="admin-continue" disabled={creating || !recipientId.trim()}>
              {creating ? "Creating…" : "Create Invite"}
            </button>
          </form>

          {/* New code banner */}
          {newCode && (
            <div
              style={{
                background: "#f0fdf4",
                border: "2px solid #86efac",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 16,
              }}
            >
              <p style={{ fontWeight: 900, color: "#166534", marginBottom: 10, fontSize: 13 }}>
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
                <button type="button" className="admin-mini-btn" onClick={handleCopy} style={{ minWidth: 70 }}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: "#15803d" }}>Expires: {fmtDate(newCode.expiresAt)}</p>
            </div>
          )}

          {/* ── Summary bar ── */}
          {invites.length > 0 && (() => {
            const counts = invites.reduce((acc, inv) => {
              acc[inv.status] = (acc[inv.status] || 0) + 1;
              return acc;
            }, {});
            return (
              <div style={{
                display: "flex",
                gap: 16,
                padding: "7px 12px",
                background: "#f8fafc",
                border: "1px solid var(--border-soft)",
                borderRadius: 8,
                fontSize: 12,
                marginBottom: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>Total: {invites.length}</span>
                {Object.entries(counts).map(([st, n]) => (
                  <span key={st} style={{ color: INVITE_STATUS_STYLES[st]?.color ?? "#475569" }}>
                    <b>{st}</b>: {n}
                  </span>
                ))}
              </div>
            );
          })()}

          {/* ── Search / filter toolbar ── */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search recipient…"
              value={inviteSearch}
              onChange={(e) => { setInviteSearch(e.target.value); setInviteShowAll(false); }}
              style={{
                flex: "1 1 160px",
                border: "1.5px solid var(--border-soft)",
                borderRadius: 7,
                padding: "5px 10px",
                fontSize: 13,
                outline: "none",
                color: "var(--text)",
              }}
            />
            <select
              value={inviteStatusFilter}
              onChange={(e) => { setInviteStatusFilter(e.target.value); setInviteShowAll(false); }}
              style={{
                border: "1.5px solid var(--border-soft)",
                borderRadius: 7,
                padding: "5px 10px",
                fontSize: 13,
                cursor: "pointer",
                background: "#fff",
                color: "var(--text)",
              }}
            >
              <option value="ALL">All statuses</option>
              <option value="ISSUED">ISSUED</option>
              <option value="USED">USED</option>
              <option value="REVOKED">REVOKED</option>
            </select>
            {(inviteSearch || inviteStatusFilter !== "ALL") && (
              <button
                type="button"
                className="admin-mini-btn"
                onClick={() => { setInviteSearch(""); setInviteStatusFilter("ALL"); setInviteShowAll(false); }}
              >
                Clear
              </button>
            )}
            <button type="button" className="admin-mini-btn" onClick={loadInvites} style={{ marginLeft: "auto" }}>
              Refresh
            </button>
          </div>

          {inviteListErr && <div className="admin-error" role="alert">{inviteListErr}</div>}

          {/* ── Filtered table with Show More ── */}
          {(() => {
            const filtered = invites.filter((inv) => {
              const matchSearch = !inviteSearch ||
                inv.recipient_identifier.toLowerCase().includes(inviteSearch.toLowerCase());
              const matchStatus = inviteStatusFilter === "ALL" || inv.status === inviteStatusFilter;
              return matchSearch && matchStatus;
            });
            const PAGE = 25;
            const visible = inviteShowAll ? filtered : filtered.slice(0, PAGE);

            if (filtered.length === 0) {
              return (
                <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                  {invites.length === 0 ? "No invites yet." : "No invites match the current filter."}
                </p>
              );
            }

            return (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "3px solid var(--border-strong)" }}>
                        <th style={TH}>ID</th>
                        <th style={TH}>Recipient</th>
                        <th style={TH}>Status</th>
                        <th style={TH}>Expires</th>
                        <th style={TH}>Created</th>
                        <th style={TH}>Used</th>
                        <th style={{ ...TH, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((inv) => (
                        <tr key={inv.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                          <td style={{ ...TD, color: "var(--muted)", fontSize: 12 }}>{inv.id}</td>
                          <td style={TD}>
                            <span
                              title={inv.recipient_identifier}
                              style={{
                                display: "inline-block",
                                maxWidth: 180,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                verticalAlign: "bottom",
                              }}
                            >
                              {inv.recipient_identifier}
                            </span>
                          </td>
                          <td style={TD}><StatusBadge status={inv.status} palette="invite" /></td>
                          <td style={TD}>{fmtDate(inv.expires_at)}</td>
                          <td style={TD}>{fmtDate(inv.created_at)}</td>
                          <td style={TD}>{inv.used_at ? fmtDate(inv.used_at) : "—"}</td>
                          <td style={{ ...TD, textAlign: "right", whiteSpace: "nowrap" }}>
                            {inv.status === "ISSUED" && (
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(inv.id)}
                                style={{
                                  border: "1.5px solid #d97706",
                                  background: "transparent",
                                  color: "#d97706",
                                  borderRadius: 6,
                                  padding: "4px 10px",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  fontSize: 12,
                                  marginRight: 6,
                                }}
                              >
                                Revoke
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteInvite(inv.id, inv.recipient_identifier, inv.status)}
                              style={{
                                border: "1.5px solid #dc2626",
                                background: "transparent",
                                color: "#dc2626",
                                borderRadius: 6,
                                padding: "4px 10px",
                                cursor: "pointer",
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length > PAGE && !inviteShowAll && (
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <button
                      type="button"
                      className="admin-mini-btn"
                      onClick={() => setInviteShowAll(true)}
                    >
                      Show all {filtered.length} invites
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </section>

        <hr style={divider} />

        {/* ═══════════════════════════════════════════════════════ */}
        {/* Section B: Pending Admin Requests                      */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section style={sectionWrap}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ ...sectionTitle, fontSize: 16 }}>Pending Admin Requests</h2>
            <button type="button" className="admin-mini-btn" onClick={loadPending}>Refresh</button>
          </div>
          {pendingErr && <div className="admin-error" role="alert">{pendingErr}</div>}
          {pendingAdmins.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              No pending admin requests.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "3px solid var(--border-strong)" }}>
                    <th style={TH}>Name</th>
                    <th style={TH}>Citizenship #</th>
                    <th style={TH}>Phone</th>
                    <th style={TH}>Status</th>
                    <th style={TH}>TOTP</th>
                    <th style={TH}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAdmins.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td style={{ ...TD, fontWeight: 700 }}>{a.full_name ?? "—"}</td>
                      <td style={TD}>{a.citizenship_no_normalized ?? "—"}</td>
                      <td style={TD}>{a.phone_number ?? "—"}</td>
                      <td style={TD}><StatusBadge status={a.status} palette="admin" /></td>
                      <td style={TD}>{a.totp_enabled_at ? fmtDate(a.totp_enabled_at) : "Not set"}</td>
                      <td style={{ ...TD, whiteSpace: "nowrap" }}>
                        {a.status === "PENDING_APPROVAL" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(a.id, a.full_name)}
                            style={{
                              border: "none",
                              background: "#d1fae5",
                              color: "#065f46",
                              borderRadius: 6,
                              padding: "5px 12px",
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: "pointer",
                              marginRight: 6,
                            }}
                          >
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleReject(a.id, a.full_name)}
                          style={{
                            border: "none",
                            background: "#fee2e2",
                            color: "#991b1b",
                            borderRadius: 6,
                            padding: "5px 12px",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            marginRight: 6,
                          }}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePending(a.id, a.citizenship_no_normalized)}
                          style={{
                            border: "none",
                            background: "#f1f5f9",
                            color: "#475569",
                            borderRadius: 6,
                            padding: "5px 12px",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <hr style={divider} />

        {/* ═══════════════════════════════════════════════════════ */}
        {/* Section C: Active Admins                               */}
        {/* ═══════════════════════════════════════════════════════ */}
        <section style={sectionWrap}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ ...sectionTitle, fontSize: 16 }}>Active Admins</h2>
            <button type="button" className="admin-mini-btn" onClick={loadActive}>Refresh</button>
          </div>
          <p style={{ color: "#b91c1c", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            Deleting an admin disables their access immediately.
          </p>
          {activeErr && <div className="admin-error" role="alert">{activeErr}</div>}
          {activeAdmins.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              No active admins.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "3px solid var(--border-strong)" }}>
                    <th style={TH}>Name</th>
                    <th style={TH}>Citizenship #</th>
                    <th style={TH}>Phone</th>
                    <th style={TH}>Approved</th>
                    <th style={TH}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdmins.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td style={{ ...TD, fontWeight: 700 }}>{a.full_name ?? "—"}</td>
                      <td style={TD}>{a.citizenship_no_normalized ?? "—"}</td>
                      <td style={TD}>{a.phone_number ?? "—"}</td>
                      <td style={TD}>{a.approved_at ? fmtDate(a.approved_at) : "—"}</td>
                      <td style={TD}>
                        <button
                          type="button"
                          onClick={() => handleDeleteActive(a.id, a.citizenship_no_normalized)}
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
                          Delete Admin
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button type="button" className="admin-mini-btn" onClick={() => navigate("/dashboard")}>
            ← Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
