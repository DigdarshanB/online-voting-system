/**
 * File: ManageVoters.jsx
 *
 * Purpose:
 *   Admin/super_admin page to review voter citizenship document submissions
 *   and approve or reject voter accounts.
 *
 * Access:
 *   - admin / super_admin: full UI
 *   - others: "Access denied" message (backend also enforces 403)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
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

// ── Table styles (consistent with ManageAdmins) ──────────────────

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

// ── Confirm Modal ────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "28px 32px",
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,.18)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 15, color: "var(--text,#0f172a)", marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            className="admin-continue"
            style={{ minWidth: 90, padding: "8px 20px" }}
            onClick={onConfirm}
          >
            Yes
          </button>
          <button
            className="admin-continue"
            style={{ minWidth: 90, padding: "8px 20px", background: "#64748b" }}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document preview — fetched via axios (auth header) ───────────

function DocumentPreview({ userId }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [err, setErr] = useState("");
  const prevUrl = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setObjectUrl(null);
    setErr("");

    axios
      .get(`${API}/admin/voters/${userId}/document`, {
        headers: authHeaders(),
        responseType: "blob",
      })
      .then(({ data }) => {
        if (cancelled) return;
        const url = URL.createObjectURL(data);
        prevUrl.current = url;
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setErr("Could not load document image.");
      });

    return () => {
      cancelled = true;
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    };
  }, [userId]);

  if (err) return <p style={{ color: "#991b1b", fontSize: 13 }}>{err}</p>;
  if (!objectUrl) return <p style={{ color: "#64748b", fontSize: 13 }}>Loading image…</p>;
  return (
    <img
      src={objectUrl}
      alt="Citizenship document"
      style={{
        maxWidth: "100%",
        maxHeight: 320,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        display: "block",
        marginTop: 8,
      }}
    />
  );
}

// ── Face photo preview — fetched via axios (auth header) ─────────

function FacePreview({ userId }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [err, setErr] = useState("");
  const prevUrl = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setObjectUrl(null);
    setErr("");

    axios
      .get(`${API}/admin/voters/${userId}/face`, {
        headers: authHeaders(),
        responseType: "blob",
      })
      .then(({ data }) => {
        if (cancelled) return;
        const url = URL.createObjectURL(data);
        prevUrl.current = url;
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setErr("No face photo uploaded.");
      });

    return () => {
      cancelled = true;
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    };
  }, [userId]);

  if (err) return <p style={{ color: "#991b1b", fontSize: 13 }}>{err}</p>;
  if (!objectUrl) return <p style={{ color: "#64748b", fontSize: 13 }}>Loading image…</p>;
  return (
    <img
      src={objectUrl}
      alt="Live face photo"
      style={{
        maxWidth: "100%",
        maxHeight: 320,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        display: "block",
        marginTop: 8,
      }}
    />
  );
}

// ── Review Panel ─────────────────────────────────────────────────

function ReviewPanel({ voter, onApprove, onReject, busy }) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirm, setConfirm] = useState(null); // { action: "approve"|"reject" }

  function handleApproveClick() {
    setConfirm({ action: "approve" });
  }

  function handleRejectClick() {
    if (!showRejectBox) {
      setShowRejectBox(true);
    } else if (rejectReason.trim()) {
      setConfirm({ action: "reject" });
    }
  }

  function handleConfirm() {
    const action = confirm.action;
    setConfirm(null);
    if (action === "approve") onApprove(voter.id);
    else onReject(voter.id, rejectReason.trim());
  }

  const hasDocument = !!voter.document_uploaded_at;
  const hasFace = !!voter.face_uploaded_at;

  return (
    <tr>
      <td colSpan={5} style={{ padding: "0 0 12px 0", background: "#f8fafc" }}>
        {confirm && (
          <ConfirmModal
            message={
              confirm.action === "approve"
                ? "Approve this voter account?"
                : `Reject with reason: "${rejectReason}"?`
            }
            onConfirm={handleConfirm}
            onCancel={() => setConfirm(null)}
          />
        )}

        <div
          style={{
            margin: "4px 0 0 0",
            padding: "16px 20px",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          {/* Voter details table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
            <tbody>
              {[
                ["Full Name", voter.full_name ?? "\u2014"],
                ["Citizenship # (raw)", voter.citizenship_no_raw ?? "\u2014"],
                ["Citizenship # (normalized)", voter.citizenship_no_normalized ?? "\u2014"],
                ["Phone", voter.phone_number ?? "\u2014"],
                ["Document Uploaded", fmtDate(voter.document_uploaded_at)],
                ["Face Photo Uploaded", fmtDate(voter.face_uploaded_at)],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ ...TD, fontWeight: 700, width: 220, color: "#475569" }}>{label}</td>
                  <td style={TD}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Side-by-side comparison: Document vs Face (stacks on mobile) */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#475569" }}>
                Citizenship Document:
              </p>
              <DocumentPreview userId={voter.id} />
            </div>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#475569" }}>
                Live Face Photo:
              </p>
              <FacePreview userId={voter.id} />
            </div>
          </div>

          {/* Review checklist */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#475569" }}>
              Review Checklist:
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13 }}>
              {[
                { label: "Citizenship document uploaded", ok: hasDocument },
                { label: "Live face photo uploaded", ok: hasFace },
                { label: "Full face clearly visible", ok: null },
                { label: "Both ears visible", ok: null },
                { label: "Document photo matches live photo", ok: null },
              ].map((item) => (
                <li
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 0",
                    color: item.ok === false ? "#991b1b" : "#334155",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: "2px solid",
                      borderColor:
                        item.ok === true
                          ? "#16a34a"
                          : item.ok === false
                          ? "#dc2626"
                          : "#cbd5e1",
                      background:
                        item.ok === true
                          ? "#f0fdf4"
                          : item.ok === false
                          ? "#fef2f2"
                          : "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {item.ok === true ? "\u2713" : item.ok === false ? "\u2717" : ""}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button
              className="admin-continue"
              style={{ padding: "8px 20px", background: "#16a34a" }}
              disabled={busy}
              onClick={handleApproveClick}
            >
              Approve
            </button>
            <button
              className="admin-continue"
              style={{ padding: "8px 20px", background: "#dc2626" }}
              disabled={busy}
              onClick={handleRejectClick}
            >
              {showRejectBox ? (rejectReason.trim() ? "Confirm Reject" : "Enter reason first") : "Reject"}
            </button>
          </div>

          {showRejectBox && (
            <textarea
              rows={3}
              placeholder="Reason for rejection\u2026"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                marginTop: 10,
                width: "100%",
                maxWidth: 480,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                padding: "8px 10px",
                fontSize: 13,
                resize: "vertical",
              }}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════

export default function ManageVoters() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [voters, setVoters] = useState([]);
  const [listErr, setListErr] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadVoters = useCallback(async () => {
    setListErr("");
    try {
      const { data } = await axios.get(`${API}/admin/voters/pending`, {
        headers: authHeaders(),
      });
      setVoters(data);
    } catch (err) {
      setListErr(err?.response?.data?.detail ?? "Failed to load pending voters.");
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        const { data } = await axios.get(`${API}/auth/me`, { headers: authHeaders() });
        setRole(data.role);
        if (data.role === "admin" || data.role === "super_admin") {
          loadVoters();
        }
      } catch {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("admin_mfa_ok");
        navigate("/", { replace: true });
      }
    }
    bootstrap();
  }, [navigate, loadVoters]);

  async function handleApprove(userId) {
    setBusy(true);
    setActionMsg("");
    try {
      await axios.post(`${API}/admin/voters/${userId}/approve`, {}, { headers: authHeaders() });
      setActionMsg("Voter approved successfully.");
      setExpandedId(null);
      await loadVoters();
    } catch (err) {
      setActionMsg(err?.response?.data?.detail ?? "Approve failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(userId, reason) {
    setBusy(true);
    setActionMsg("");
    try {
      await axios.post(
        `${API}/admin/voters/${userId}/reject`,
        { reason },
        { headers: authHeaders() }
      );
      setActionMsg("Voter rejected.");
      setExpandedId(null);
      await loadVoters();
    } catch (err) {
      setActionMsg(err?.response?.data?.detail ?? "Reject failed.");
    } finally {
      setBusy(false);
    }
  }

  // ── Access guard ─────────────────────────────────────────────

  if (role !== null && role !== "admin" && role !== "super_admin") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#991b1b", fontFamily: "sans-serif" }}>
        Access denied.
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="admin-auth-shell" style={{ alignItems: "flex-start" }}>
      <div
        className="admin-auth-card"
        style={{ maxWidth: 900, width: "100%", margin: "40px auto" }}
      >
        <header className="admin-auth-header" style={{ marginBottom: 8 }}>
          <img className="admin-flag" src="/assets/nepal-flag.png" alt="Nepal national flag" />
          <h1 className="admin-title">Voter Verification Queue</h1>
          <p className="admin-subtitle">Review citizenship documents and face photos, then approve or reject.</p>
        </header>

        {actionMsg && (
          <div
            className="admin-error"
            style={{
              background: actionMsg.toLowerCase().includes("fail") ||
                actionMsg.toLowerCase().includes("denied")
                ? undefined
                : "#f0fdf4",
              color: actionMsg.toLowerCase().includes("fail") ||
                actionMsg.toLowerCase().includes("denied")
                ? undefined
                : "#166534",
              borderColor: actionMsg.toLowerCase().includes("fail") ||
                actionMsg.toLowerCase().includes("denied")
                ? undefined
                : "#bbf7d0",
            }}
            role="status"
          >
            {actionMsg}
          </div>
        )}

        {listErr && (
          <div className="admin-error" role="alert">
            {listErr}
          </div>
        )}

        {voters.length === 0 && !listErr ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "32px 0", fontSize: 14 }}>
            No pending voter submissions.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-soft, #cbd5e1)" }}>
                  <th style={TH}>Name</th>
                  <th style={TH}>Citizenship #</th>
                  <th style={TH}>Phone</th>
                  <th style={TH}>Uploaded At</th>
                  <th style={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((v) => (
                  <React.Fragment key={v.id}>
                    <tr style={{ borderBottom: "1px solid var(--border-soft, #e2e8f0)" }}>
                      <td style={TD}>{v.full_name ?? "—"}</td>
                      <td style={TD}>{v.citizenship_no_normalized ?? "—"}</td>
                      <td style={TD}>{v.phone_number ?? "—"}</td>
                      <td style={TD}>{fmtDate(v.document_uploaded_at)}</td>
                      <td style={TD}>
                        <button
                          className="admin-continue"
                          style={{ padding: "5px 14px", fontSize: 12 }}
                          onClick={() =>
                            setExpandedId((prev) => (prev === v.id ? null : v.id))
                          }
                        >
                          {expandedId === v.id ? "Close" : "Review"}
                        </button>
                      </td>
                    </tr>

                    {expandedId === v.id && (
                      <ReviewPanel
                        voter={v}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        busy={busy}
                      />
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
