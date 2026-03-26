import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminAuthPage.css";
import "./PendingApprovalPage.css";

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

const statusPills = {
  PENDING_REVIEW: { text: "Pending Review", bg: "#e0ecff", color: "#0f3f93", border: "#bfdbfe" },
  ACTIVE: { text: "Approved", bg: "#d1fae5", color: "#065f46", border: "#bbf7d0" },
  REJECTED: { text: "Rejected", bg: "#fee2e2", color: "#991b1b", border: "#fecdd3" },
};

function StatusPill({ status }) {
  const style = statusPills[status] || { bg: "#e2e8f0", color: "#475569", border: "#e2e8f0", text: status };
  return (
    <span
      className="pending-pill"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border || style.bg}` }}
    >
      {style.text || status}
    </span>
  );
}

function DocPill({ hasDoc }) {
  return (
    <span className="pending-pill" style={{ background: hasDoc ? "#e9f8f1" : "#fff7ed", color: hasDoc ? "#166534" : "#9a3412" }}>
      {hasDoc ? "Document Uploaded" : "Document Missing"}
    </span>
  );
}

function FacePill({ hasFace }) {
  return (
    <span className="pending-pill" style={{ background: hasFace ? "#e0ecff" : "#fff1f2", color: hasFace ? "#1e40af" : "#9f1239" }}>
      {hasFace ? "Face Uploaded" : "Face Missing"}
    </span>
  );
}

function EmailPill({ verified }) {
  return (
    <span className="pending-pill" style={{ background: verified ? "#ecfdf3" : "#fff7ed", color: verified ? "#15803d" : "#92400e" }}>
      {verified ? "Email Verified" : "Email Not Verified"}
    </span>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="pending-summary-card">
      <p className="pending-summary-label">{label}</p>
      <p className="pending-summary-value">{value}</p>
      {hint && <p className="pending-summary-hint">{hint}</p>}
    </div>
  );
}

function EmptyState({ title, message, cta }) {
  return (
    <div className="pending-empty">
      <div className="pending-empty-icon">🗂️</div>
      <p className="pending-empty-title">{title}</p>
      <p className="pending-empty-sub">{message}</p>
      {cta}
    </div>
  );
}

function ConfirmModal({ title, body, confirmText, cancelText = "Cancel", onConfirm, onCancel, busy }) {
  return (
    <div className="pending-modal-backdrop" role="dialog" aria-modal="true">
      <div className="pending-modal">
        <h3 className="pending-modal-title">{title}</h3>
        <p className="pending-modal-body">{body}</p>
        <div className="pending-modal-actions">
          <button className="admin-continue" style={{ background: "#1e56c7" }} disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : confirmText}
          </button>
          <button className="admin-mini-btn" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  if (err) return (
    <div className="pending-preview-fallback">
      <div>📄</div>
      <p className="pending-preview-muted">{err}</p>
    </div>
  );
  if (!objectUrl) return <p className="pending-preview-muted">Loading image…</p>;
  return (
    <img
      src={objectUrl}
      alt="Citizenship document"
      className="pending-preview-img"
    />
  );
}

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

  if (err) return (
    <div className="pending-preview-fallback">
      <div>🖼️</div>
      <p className="pending-preview-muted">{err}</p>
    </div>
  );
  if (!objectUrl) return <p className="pending-preview-muted">Loading image…</p>;
  return (
    <img
      src={objectUrl}
      alt="Live face photo"
      className="pending-preview-img"
    />
  );
}

function DetailPanel({ voter, onClose, onApprove, onReject, toggleFollowUp, isFollowUp, busy }) {
  const [rejectReason, setRejectReason] = useState("");
  const [confirm, setConfirm] = useState(null);

  const hasDoc = Boolean(voter.document_uploaded_at);
  const hasFace = Boolean(voter.face_uploaded_at);

  function requestApprove() {
    setConfirm({ action: "approve" });
  }

  function requestReject() {
    if (!rejectReason.trim()) return;
    setConfirm({ action: "reject" });
  }

  function handleConfirm() {
    if (!confirm) return;
    const action = confirm.action;
    setConfirm(null);
    if (action === "approve") onApprove(voter.id);
    else onReject(voter.id, rejectReason.trim());
  }

  return (
    <div className="pending-drawer" role="dialog" aria-modal="true">
      {confirm && (
        <ConfirmModal
          title={confirm.action === "approve" ? "Approve voter?" : "Reject voter?"}
          body={
            confirm.action === "approve"
              ? "Approve this voter account after confirming documents and face match."
              : `Reject and notify with reason: "${rejectReason}"`
          }
          confirmText={confirm.action === "approve" ? "Approve" : "Reject"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}

      <div className="pending-drawer-header">
        <div>
          <p className="pending-drawer-kicker">Voter Detail</p>
          <h3 className="pending-drawer-title">{voter.full_name || "Unnamed Voter"}</h3>
          <div className="pending-drawer-pill-row">
            <StatusPill status={voter.status} />
            <DocPill hasDoc={hasDoc} />
            <FacePill hasFace={hasFace} />
            <EmailPill verified={voter.email_verified} />
          </div>
        </div>
        <button className="admin-mini-btn" onClick={onClose}>Close</button>
      </div>

      <div className="pending-info-grid">
        {[
          ["Citizenship ID", voter.citizenship_no_normalized || "—"],
          ["Email", voter.email || "—"],
          ["Phone", voter.phone_number || "—"],
          ["Submitted", fmtDate(voter.submitted_at)],
          ["Registration", fmtDate(voter.submitted_at)],
          ["Document Uploaded", fmtDate(voter.document_uploaded_at)],
          ["Face Uploaded", fmtDate(voter.face_uploaded_at)],
          ["Approved At", fmtDate(voter.approved_at)],
          ["Rejection Reason", voter.rejection_reason || "—"],
        ].map(([label, value]) => (
          <div key={label} className="pending-info-item">
            <p className="pending-info-label">{label}</p>
            <p className="pending-info-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="pending-preview-grid">
        <div>
          <p className="pending-preview-label">Citizenship Document</p>
          <DocumentPreview userId={voter.id} />
        </div>
        <div>
          <p className="pending-preview-label">Face Verification</p>
          <FacePreview userId={voter.id} />
        </div>
      </div>

      <div className="pending-actions">
        <button
          className="admin-continue"
          style={{ background: "#15803d" }}
          onClick={requestApprove}
          disabled={busy}
        >
          Approve
        </button>
        <button
          className="admin-continue"
          style={{ background: rejectReason.trim() ? "#dc2626" : "#475569" }}
          onClick={requestReject}
          disabled={busy || !rejectReason.trim()}
        >
          {rejectReason.trim() ? "Reject" : "Enter Reason to Reject"}
        </button>
        <button
          className="admin-mini-btn"
          style={{ background: isFollowUp ? "#1e3a8a" : undefined, color: isFollowUp ? "#fff" : undefined }}
          onClick={toggleFollowUp}
        >
          {isFollowUp ? "Marked for Follow-up" : "Mark for Follow-up"}
        </button>
      </div>

      <textarea
        className="pending-reject-box"
        rows={3}
        placeholder="Add rejection reason before rejecting…"
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        disabled={busy}
      />
    </div>
  );
}

export default function PendingApprovalPage() {
  const navigate = useNavigate();

  const [stage, setStage] = useState("booting"); // booting | waiting | denied | ready
  const [me, setMe] = useState(null);
  const [pending, setPending] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [emailFilter, setEmailFilter] = useState("ALL");
  const [docFilter, setDocFilter] = useState("ALL");
  const [faceFilter, setFaceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("PENDING_ONLY");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [banner, setBanner] = useState("");
  const [bannerTone, setBannerTone] = useState("info");
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [followUps, setFollowUps] = useState(() => new Set());

  const loadPending = useCallback(async () => {
    setLoadingList(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/admin/voters/pending`, { headers: authHeaders() });
      setPending(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load pending approvals.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true);
    setSelectedDetail(null);
    try {
      const { data } = await axios.get(`${API}/admin/voters/${id}`, { headers: authHeaders() });
      setSelectedDetail(data);
    } catch (err) {
      setBanner(err?.response?.data?.detail || "Could not load voter detail.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        const { data } = await axios.get(`${API}/auth/me`, { headers: authHeaders() });
        setMe(data);
        if (data.status === "PENDING_APPROVAL") {
          setStage("waiting");
          return;
        }
        if (data.role !== "admin" && data.role !== "super_admin") {
          setStage("denied");
          return;
        }
        setStage("ready");
        loadPending();
      } catch {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("admin_mfa_ok");
        navigate("/", { replace: true });
      }
    }
    bootstrap();
  }, [loadPending, navigate]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    }
  }, [selectedId, loadDetail]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pending.filter((v) => {
      const matches = term
        ? [
            v.full_name,
            v.email,
            v.citizenship_no_raw,
            v.citizenship_no_normalized,
            v.phone_number,
          ].some((field) => (field || "").toLowerCase().includes(term))
        : true;

      let statusOk = true;
      if (filter === "DOC_MISSING") statusOk = !v.document_uploaded_at;
      else if (filter === "FACE_MISSING") statusOk = v.document_uploaded_at && !v.face_uploaded_at;
      else if (filter === "EMAIL_UNVERIFIED") statusOk = !v.email_verified;
      else if (filter === "READY") statusOk = v.document_uploaded_at && v.face_uploaded_at;

      if (emailFilter === "VERIFIED") statusOk = statusOk && v.email_verified;
      else if (emailFilter === "UNVERIFIED") statusOk = statusOk && !v.email_verified;

      if (docFilter === "HAS_DOC") statusOk = statusOk && !!v.document_uploaded_at;
      else if (docFilter === "NO_DOC") statusOk = statusOk && !v.document_uploaded_at;

      if (faceFilter === "HAS_FACE") statusOk = statusOk && !!v.face_uploaded_at;
      else if (faceFilter === "NO_FACE") statusOk = statusOk && !v.face_uploaded_at;

      if (statusFilter === "PENDING_ONLY") statusOk = statusOk && v.status === "PENDING_REVIEW";
      else if (statusFilter === "ACTIVE_ONLY") statusOk = statusOk && v.status === "ACTIVE";
      else if (statusFilter === "REJECTED_ONLY") statusOk = statusOk && v.status === "REJECTED";

      return matches && statusOk;
    });
  }, [pending, search, filter, emailFilter, docFilter, faceFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const submittedA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const submittedB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      if (sortBy === "NEWEST") return submittedB - submittedA;
      if (sortBy === "OLDEST") return submittedA - submittedB;
      if (sortBy === "NAME") return (a.full_name || "").localeCompare(b.full_name || "");
      return 0;
    });
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, filter, emailFilter, docFilter, faceFilter, statusFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const recentCutoff = now - 24 * 60 * 60 * 1000;
    return {
      total: pending.length,
      docs: pending.filter((p) => p.document_uploaded_at).length,
      faces: pending.filter((p) => p.face_uploaded_at).length,
      recent: pending.filter((p) => p.submitted_at && new Date(p.submitted_at).getTime() >= recentCutoff).length,
    };
  }, [pending]);

  function closeDetail() {
    setSelectedId(null);
    setSelectedDetail(null);
    setDetailLoading(false);
  }

  function toggleFollowUp(id) {
    setFollowUps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApprove(id) {
    setConfirmAction(null);
    setActionBusy(true);
    setBanner("");
    setBannerTone("info");
    try {
      await axios.post(`${API}/admin/voters/${id}/approve`, {}, { headers: authHeaders() });
      setBannerTone("success");
      setBanner("Voter approved successfully.");
      closeDetail();
      await loadPending();
    } catch (err) {
      setBannerTone("error");
      setBanner(err?.response?.data?.detail || "Approve failed.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReject(id, reason) {
    setConfirmAction(null);
    setActionBusy(true);
    setBanner("");
    setBannerTone("info");
    try {
      await axios.post(
        `${API}/admin/voters/${id}/reject`,
        { reason },
        { headers: authHeaders() }
      );
      setBannerTone("success");
      setBanner("Voter rejected.");
      closeDetail();
      await loadPending();
    } catch (err) {
      setBannerTone("error");
      setBanner(err?.response?.data?.detail || "Reject failed.");
    } finally {
      setActionBusy(false);
    }
  }

  if (stage === "waiting") {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card" style={{ maxWidth: 520, textAlign: "center", margin: "40px auto" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
          <h2 className="pending-waiting-title">Awaiting Approval</h2>
          <p className="pending-waiting-sub">
            Your admin account is pending super-admin approval. We will notify you once you're cleared.
          </p>
          <button className="admin-continue" onClick={() => navigate("/", { replace: true })}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (stage === "denied") {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card" style={{ maxWidth: 520, textAlign: "center", margin: "40px auto" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
          <h2 className="pending-waiting-title">Access Denied</h2>
          <p className="pending-waiting-sub">
            Only admin or super admin users can review pending approvals.
          </p>
          <button className="admin-mini-btn" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (stage === "booting") {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card" style={{ maxWidth: 480, textAlign: "center", margin: "40px auto" }}>
          <p style={{ margin: 0, fontSize: 16, color: "#475569" }}>Loading approval queue…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-auth-shell" style={{ alignItems: "flex-start" }}>
      <div className="admin-auth-card pending-card">
        <header className="pending-header">
          <div>
            <p className="pending-kicker">Approval Queue</p>
            <h1 className="pending-title">Pending Approval</h1>
            <p className="pending-subtitle">Review new voter registrations, verify documents and face, then approve or reject.</p>
          </div>
          <div className="pending-header-actions">
            <button className="admin-mini-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
            <button className="admin-mini-btn" onClick={loadPending} disabled={loadingList}>Refresh</button>
          </div>
        </header>

        <div className="pending-summary-grid">
          <SummaryCard label="Total Pending" value={stats.total} hint="Awaiting admin decision" />
          <SummaryCard label="Awaiting Document Review" value={stats.docs} hint="Document uploaded" />
          <SummaryCard label="Awaiting Face Review" value={stats.faces} hint="Face photo uploaded" />
          <SummaryCard label="Recently Submitted" value={stats.recent} hint="Last 24 hours" />
        </div>

        <div className="pending-filters">
          <input
            className="pending-search"
            placeholder="Search name, email, citizenship, phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="pending-filter-row">
            <div className="pending-filter-group">
              <p className="pending-filter-label">Quick Filters</p>
              <div className="pending-filter-chips">
                {["ALL", "READY", "DOC_MISSING", "FACE_MISSING", "EMAIL_UNVERIFIED"].map((code) => (
                  <button
                    key={code}
                    className={`pending-chip ${filter === code ? "active" : ""}`}
                    onClick={() => setFilter(code)}
                  >
                    {code === "ALL" && "All"}
                    {code === "READY" && "Docs + Face ready"}
                    {code === "DOC_MISSING" && "Docs missing"}
                    {code === "FACE_MISSING" && "Face missing"}
                    {code === "EMAIL_UNVERIFIED" && "Email unverified"}
                  </button>
                ))}
              </div>
            </div>
            <div className="pending-select-row">
              <div className="pending-select">
                <label>Email</label>
                <select value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)}>
                  <option value="ALL">Any</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="UNVERIFIED">Unverified</option>
                </select>
              </div>
              <div className="pending-select">
                <label>Document</label>
                <select value={docFilter} onChange={(e) => setDocFilter(e.target.value)}>
                  <option value="ALL">Any</option>
                  <option value="HAS_DOC">Uploaded</option>
                  <option value="NO_DOC">Missing</option>
                </select>
              </div>
              <div className="pending-select">
                <label>Face</label>
                <select value={faceFilter} onChange={(e) => setFaceFilter(e.target.value)}>
                  <option value="ALL">Any</option>
                  <option value="HAS_FACE">Uploaded</option>
                  <option value="NO_FACE">Missing</option>
                </select>
              </div>
              <div className="pending-select">
                <label>Approval</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="PENDING_ONLY">Pending</option>
                  <option value="ACTIVE_ONLY">Active</option>
                  <option value="REJECTED_ONLY">Rejected</option>
                  <option value="ALL">Any</option>
                </select>
              </div>
              <div className="pending-select">
                <label>Sort</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="NEWEST">Newest submitted</option>
                  <option value="OLDEST">Oldest submitted</option>
                  <option value="NAME">Name</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {banner && (
          <div className={`pending-banner pending-banner-${bannerTone}`} role="status">{banner}</div>
        )}

        {error && (
          <div className="admin-error" role="alert">{error}</div>
        )}

        {loadingList ? (
          <div className="pending-skeleton-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="pending-skeleton-row" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            title="Nothing to review"
            message="No pending approvals match your filters right now."
            cta={<button className="admin-mini-btn" onClick={loadPending}>Refresh</button>}
          />
        ) : (
          <div className="pending-table-wrap">
            <table className="pending-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Citizenship ID</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((v) => {
                  const hasDoc = Boolean(v.document_uploaded_at);
                  const hasFace = Boolean(v.face_uploaded_at);
                  const followUp = followUps.has(v.id);
                  return (
                    <tr key={v.id} className={`pending-row ${followUp ? "follow-up" : ""}`}>
                      <td>
                        <div className="pending-name">{v.full_name || "—"}</div>
                        <div className="pending-sub">ID #{v.id}</div>
                      </td>
                      <td>
                        <div className="pending-strong">{v.citizenship_no_normalized || "—"}</div>
                        <div className="pending-sub">Raw: {v.citizenship_no_raw || "—"}</div>
                      </td>
                      <td>
                        <div className="pending-strong">{v.email || "—"}</div>
                        <EmailPill verified={v.email_verified} />
                      </td>
                      <td>{v.phone_number || "—"}</td>
                      <td>{fmtDate(v.submitted_at)}</td>
                      <td><StatusPill status={v.status} /></td>
                      <td>
                        <div className="pending-pill-row">
                          <DocPill hasDoc={hasDoc} />
                          <FacePill hasFace={hasFace} />
                        </div>
                      </td>
                      <td>
                        <div className="pending-actions-row">
                          <button
                            className="admin-mini-btn"
                            onClick={() => setSelectedId(v.id)}
                          >
                            View Details
                          </button>
                          <button
                            className="admin-mini-btn"
                            style={{ background: "#16a34a", color: "#fff" }}
                            onClick={() => setConfirmAction({ type: "approve", voter: v })}
                            disabled={!hasDoc || !hasFace}
                          >
                            Approve
                          </button>
                          <button
                            className="admin-mini-btn"
                            style={{ background: "#dc2626", color: "#fff" }}
                            onClick={() => setConfirmAction({ type: "reject", voter: v })}
                          >
                            Reject
                          </button>
                          <button
                            className="admin-mini-btn"
                            style={{ background: followUp ? "#1e3a8a" : undefined, color: followUp ? "#fff" : undefined }}
                            onClick={() => toggleFollowUp(v.id)}
                          >
                            {followUp ? "Follow-up" : "Mark Follow-up"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sorted.length > pageSize && (
              <div className="pending-pagination">
                <button
                  className="admin-mini-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <span className="pending-page-label">Page {currentPage} of {totalPages}</span>
                <button
                  className="admin-mini-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.type === "approve" ? "Approve voter?" : "Reject voter?"}
          body={
            confirmAction.type === "approve"
              ? `Approve ${confirmAction.voter.full_name || "this voter"}? Ensure documents and face match.`
              : `Reject ${confirmAction.voter.full_name || "this voter"}? You will choose a reason in the detail panel.`
          }
          confirmText={confirmAction.type === "approve" ? "Approve" : "Open detail to reject"}
          onConfirm={() => {
            setConfirmAction(null);
            if (confirmAction.type === "approve") {
              handleApprove(confirmAction.voter.id);
            } else {
              setSelectedId(confirmAction.voter.id);
            }
          }}
          onCancel={() => setConfirmAction(null)}
          busy={actionBusy}
        />
      )}

      {(selectedId && (selectedDetail || detailLoading)) && (
        <div className="pending-drawer-backdrop" onClick={closeDetail}>
          <div className="pending-drawer-shell" onClick={(e) => e.stopPropagation()}>
            {detailLoading && <div className="pending-drawer-loading">Loading detail…</div>}
            {selectedDetail && (
              <DetailPanel
                voter={selectedDetail}
                onClose={closeDetail}
                onApprove={handleApprove}
                onReject={handleReject}
                toggleFollowUp={() => toggleFollowUp(selectedDetail.id)}
                isFollowUp={followUps.has(selectedDetail.id)}
                busy={actionBusy}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
