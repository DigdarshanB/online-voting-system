/**
 * File: PendingAdmins.jsx
 *
 * Purpose:
 *   Allow super_admin to view, approve, reject, or delete pending admin
 *   accounts (PENDING_MFA / PENDING_APPROVAL).
 *
 * Access:
 *   - super_admin: full UI (table + actions)
 *   - others: "Access denied" (backend also enforces 403)
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
  PENDING_MFA:      { background: "#fef3c7", color: "#92400e" },
  PENDING_APPROVAL: { background: "#dbeafe", color: "#1e40af" },
  ACTIVE:           { background: "#d1fae5", color: "#065f46" },
  REJECTED:         { background: "#fee2e2", color: "#991b1b" },
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

// ── Shared inline styles ────────────────────────────────────────

const shell = {
  minHeight: "100vh",
  padding: "40px 24px",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  background: "linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 100%)",
};

const card = {
  maxWidth: 960,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 14,
  border: "3px solid #1e56c7",
  padding: "28px 32px",
};

const heading = {
  fontSize: 22,
  fontWeight: 900,
  color: "#1e3a5f",
  marginBottom: 4,
};

const subtitle = {
  fontSize: 13,
  color: "#64748b",
  marginBottom: 24,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid #e2e8f0",
  fontWeight: 800,
  color: "#334155",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "middle",
};

const btnBase = {
  border: "none",
  borderRadius: 6,
  padding: "5px 12px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  marginRight: 6,
};

const btnApprove = { ...btnBase, background: "#d1fae5", color: "#065f46" };
const btnReject = { ...btnBase, background: "#fee2e2", color: "#991b1b" };
const btnDelete = { ...btnBase, background: "#f1f5f9", color: "#475569" };

// ══════════════════════════════════════════════════════════════════

export default function PendingAdmins() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setError("");
    try {
      const { data } = await axios.get(
        `${API}/admin/verifications/pending-admins`,
        { headers: authHeaders() }
      );
      setAdmins(data);
    } catch (err) {
      if (err?.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setError(err?.response?.data?.detail ?? "Failed to load pending admins");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  async function handleApprove(id, name) {
    setActionMsg("");
    try {
      await axios.post(
        `${API}/admin/verifications/${id}/approve`,
        {},
        { headers: authHeaders() }
      );
      setActionMsg(`✓ ${name ?? `Admin #${id}`} approved.`);
      fetchAdmins();
    } catch (err) {
      setActionMsg(`✗ Approve failed: ${err?.response?.data?.detail ?? "unknown error"}`);
    }
  }

  async function handleReject(id, name) {
    const reason = prompt(`Reason for rejecting ${name ?? `Admin #${id}`}:`);
    if (!reason) return;
    setActionMsg("");
    try {
      await axios.post(
        `${API}/admin/verifications/${id}/reject`,
        { reason },
        { headers: authHeaders() }
      );
      setActionMsg(`✓ ${name ?? `Admin #${id}`} rejected.`);
      fetchAdmins();
    } catch (err) {
      setActionMsg(`✗ Reject failed: ${err?.response?.data?.detail ?? "unknown error"}`);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete pending request for ${name ?? `Admin #${id}`}? This cannot be undone.`)) return;
    setActionMsg("");
    try {
      await axios.delete(
        `${API}/admin/verifications/${id}`,
        { headers: authHeaders() }
      );
      setActionMsg(`✓ ${name ?? `Admin #${id}`} removed.`);
      fetchAdmins();
    } catch (err) {
      setActionMsg(`✗ Delete failed: ${err?.response?.data?.detail ?? "unknown error"}`);
    }
  }

  if (accessDenied) {
    return (
      <div style={shell}>
        <div style={{ ...card, textAlign: "center", padding: 48 }}>
          <h1 style={{ color: "#991b1b", fontSize: 20, marginBottom: 12 }}>Access Denied</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            Only super administrators can manage pending admin requests.
          </p>
          <button
            className="admin-mini-btn"
            style={{ marginTop: 20 }}
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h1 style={heading}>Pending Admin Requests</h1>
            <p style={subtitle}>
              Admins who have activated an invite and are awaiting MFA setup or your approval.
            </p>
          </div>
          <button
            className="admin-mini-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
        </div>

        {actionMsg && (
          <div
            style={{
              background: actionMsg.startsWith("✓") ? "#d1fae5" : "#fee2e2",
              color: actionMsg.startsWith("✓") ? "#065f46" : "#991b1b",
              border: `2px solid ${actionMsg.startsWith("✓") ? "#86efac" : "#fca5a5"}`,
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

        {error && (
          <div className="admin-error" role="alert">{error}</div>
        )}

        {loading ? (
          <p style={{ textAlign: "center", padding: 32, color: "#64748b" }}>Loading…</p>
        ) : admins.length === 0 ? (
          <p style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
            No pending admin requests.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Citizenship #</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>TOTP</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td style={tdStyle}>{a.id}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{a.full_name ?? "—"}</td>
                    <td style={tdStyle}>{a.phone_number ?? "—"}</td>
                    <td style={tdStyle}>{a.citizenship_no_normalized ?? "—"}</td>
                    <td style={tdStyle}><StatusBadge status={a.status} /></td>
                    <td style={tdStyle}>{a.totp_enabled_at ? fmtDate(a.totp_enabled_at) : "Not set"}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      {a.status === "PENDING_APPROVAL" && (
                        <button style={btnApprove} onClick={() => handleApprove(a.id, a.full_name)}>
                          Approve
                        </button>
                      )}
                      <button style={btnReject} onClick={() => handleReject(a.id, a.full_name)}>
                        Reject
                      </button>
                      <button style={btnDelete} onClick={() => handleDelete(a.id, a.full_name)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
