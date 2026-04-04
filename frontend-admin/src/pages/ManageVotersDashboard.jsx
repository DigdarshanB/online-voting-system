import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./AdminAuthPage.css";
import "./ManageVotersDashboard.css";

const API = "http://localhost:8000";

const STATUS_CLASS = {
  Pending: "badge badge-pending",
  Approved: "badge badge-approved",
  Rejected: "badge badge-rejected",
  Suspended: "badge badge-suspended",
  Verified: "badge badge-verified",
  Unverified: "badge badge-unverified",
  Voted: "badge badge-voted",
  "Not Voted": "badge badge-not-voted",
  Active: "badge badge-active",
  Disabled: "badge badge-suspended",
};

const APPROVAL_LABELS = {
  PENDING_REVIEW: "Pending",
  ACTIVE: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  DISABLED: "Suspended",
};

function Badge({ label }) {
  const cls = STATUS_CLASS[label] || "badge";
  return <span className={cls}>{label}</span>;
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

function ActionMenu({ voterId, onAction }) {
  const [open, setOpen] = useState(false);

  function handleSelect(action) {
    onAction(action, voterId);
    setOpen(false);
  }

  return (
    <div className="action-menu">
      <button className="ghost-button action-trigger" onClick={() => setOpen((v) => !v)}>
        Actions ▾
      </button>
      {open && (
        <div className="action-menu__panel">
          {[
            "View details",
            "Approve",
            "Reject",
            "Suspend",
            "Reactivate",
            "Deactivate",
            "Resend verification",
            "Reset password",
            "Reset TOTP",
            "Edit info",
            "Delete voter",
          ].map((label) => (
            <button
              key={label}
              className={label === "Delete voter" ? "delete-action" : undefined}
              onClick={() => handleSelect(label)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <div className="toast-title">{toast.title}</div>
          {toast.body && <div className="toast-body">{toast.body}</div>}
          <button className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ dialog, onCancel, onConfirm, onReasonChange, onPhraseChange }) {
  if (!dialog) return null;
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className={`confirm-card ${dialog.destructive ? "confirm-card-danger" : ""}`}>
        <div className="confirm-header">
          <h3>{dialog.title}</h3>
          <button className="icon-button" onClick={onCancel} aria-label="Close dialog">
            ×
          </button>
        </div>
        <p className="confirm-body">{dialog.body}</p>
        {dialog.destructive && <p className="confirm-warning">This action is intentionally protected and cannot be undone.</p>}
        {dialog.requireReason && (
          <div className="field">
            <label>Reason</label>
            <textarea
              rows={3}
              value={dialog.reason || ""}
              placeholder={dialog.reasonPlaceholder || "Add a short note for the audit log"}
              onChange={(e) => onReasonChange(e.target.value)}
            />
          </div>
        )}
        {dialog.requirePhrase && (
          <div className="field">
            <label>Type DELETE to confirm</label>
            <input
              value={dialog.confirmationText || ""}
              placeholder="DELETE"
              onChange={(e) => onPhraseChange(e.target.value)}
            />
          </div>
        )}
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onCancel} disabled={dialog.submitting}>
            Cancel
          </button>
          <button
            className="primary-button"
            onClick={onConfirm}
            disabled={
              dialog.submitting ||
              (dialog.requireReason && !dialog.reason) ||
              (dialog.requirePhrase && (dialog.confirmationText || "").trim().toUpperCase() !== "DELETE")
            }
          >
            {dialog.submitting ? "Working…" : dialog.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  detail,
  loading,
  error,
  docPreview,
  facePreview,
  onClose,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onDeactivate,
  onDelete,
  onResendVerification,
  onResetPassword,
  onResetTotp,
  onEditStart,
  editing,
  editDraft,
  setEditDraft,
  onSaveEdit,
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="drawer">
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Voter details</p>
            <h2>{detail?.full_name || "Loading"}</h2>
            <p className="drawer-sub">Review identity, verification, and account status.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close panel">
            ×
          </button>
        </div>

        {loading && (
          <div className="panel-loading">
            <div className="spinner" />
            <p>Fetching voter details…</p>
          </div>
        )}

        {error && !loading && <div className="panel-error">{error}</div>}

        {!loading && detail && (
          <div className="drawer-body">
            <div className="status-row">
              <Badge label={APPROVAL_LABELS[detail.status] || detail.status} />
              <Badge label={detail.account_status === "SUSPENDED" ? "Suspended" : "Active"} />
              <Badge label={detail.email_verified ? "Verified" : "Unverified"} />
              <Badge label={detail.face_uploaded_at ? "Verified" : "Unverified"} />
              <Badge label={detail.voting_status} />
            </div>

            <div className="info-grid">
              <div className="info-card">
                <h4>Profile</h4>
                <div className="field-row"><span>ID</span><strong>{detail.id}</strong></div>
                <div className="field-row"><span>Full name</span><strong>{detail.full_name || "—"}</strong></div>
                <div className="field-row"><span>Citizenship</span><strong>{detail.citizenship_no_normalized || detail.citizenship_no_raw || "—"}</strong></div>
                <div className="field-row"><span>Email</span><strong>{detail.email || "—"}</strong></div>
                <div className="field-row"><span>Phone</span><strong>{detail.phone_number || "—"}</strong></div>
                <div className="field-row"><span>Registered</span><strong>{fmtDate(detail.created_at)}</strong></div>
              </div>

              <div className="info-card">
                <h4>Verification</h4>
                <div className="field-row"><span>Email verification</span><strong>{detail.email_verified ? "Verified" : "Pending"}</strong></div>
                <div className="field-row"><span>Email verified at</span><strong>{fmtDate(detail.email_verified_at)}</strong></div>
                <div className="field-row"><span>Face upload</span><strong>{detail.face_uploaded_at ? "Provided" : "Missing"}</strong></div>
                <div className="field-row"><span>Document upload</span><strong>{detail.document_uploaded_at ? "Provided" : "Missing"}</strong></div>
                <div className="field-row"><span>Approval</span><strong>{detail.approved_at ? fmtDate(detail.approved_at) : "Not approved"}</strong></div>
                <div className="field-row"><span>Rejection note</span><strong>{detail.rejection_reason || "—"}</strong></div>
              </div>

              <div className="info-card">
                <h4>Voting</h4>
                <div className="field-row"><span>Status</span><strong>{detail.voting_status}</strong></div>
                <div className="field-row"><span>Votes cast</span><strong>{detail.vote_count}</strong></div>
              </div>
            </div>

            <div className="preview-grid">
              <div className="preview-card">
                <div className="preview-header">
                  <h4>Citizenship document</h4>
                  <Badge label={detail.document_uploaded_at ? "Provided" : "Missing"} />
                </div>
                {docPreview ? (
                  <img src={docPreview} alt="Citizenship document" className="preview-image" />
                ) : (
                  <div className="preview-empty">No document available</div>
                )}
              </div>

              <div className="preview-card">
                <div className="preview-header">
                  <h4>Face verification</h4>
                  <Badge label={detail.face_uploaded_at ? "Provided" : "Missing"} />
                </div>
                {facePreview ? (
                  <img src={facePreview} alt="Face verification" className="preview-image" />
                ) : (
                  <div className="preview-empty">No face image available</div>
                )}
              </div>
            </div>

            <div className="action-bar">
              <div className="action-bar__left">
                <button className="ghost-button" onClick={() => onEditStart(detail)}>
                  Edit basic info
                </button>
                <button className="ghost-button" onClick={() => onResendVerification(detail)}>
                  Resend verification
                </button>
                <button className="ghost-button" onClick={() => onResetPassword(detail)}>
                  Send reset password
                </button>
                <button className="ghost-button" onClick={() => onResetTotp(detail)}>
                  Reset TOTP
                </button>
              </div>
              <div className="action-bar__right">
                <button className="ghost-button" onClick={() => onSuspend(detail)}>
                  Suspend
                </button>
                <button className="ghost-button" onClick={() => onDeactivate(detail)}>
                  Deactivate
                </button>
                <button className="ghost-button" onClick={() => onReactivate(detail)}>
                  Reactivate
                </button>
                <button className="ghost-button" onClick={() => onDelete(detail)}>
                  Delete voter
                </button>
                <button className="ghost-button" onClick={() => onReject(detail)}>
                  Reject
                </button>
                <button className="primary-button" onClick={() => onApprove(detail)}>
                  Approve
                </button>
              </div>
            </div>

            {editing && (
              <div className="edit-card">
                <div className="edit-header">
                  <div>
                    <h4>Edit voter</h4>
                    <p>Only safe profile fields are editable.</p>
                  </div>
                </div>
                <div className="edit-grid">
                  <label className="field">
                    <span>Full name</span>
                    <input
                      value={editDraft.full_name}
                      onChange={(e) => setEditDraft((d) => ({ ...d, full_name: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={editDraft.email}
                      onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Phone</span>
                    <input
                      value={editDraft.phone_number}
                      onChange={(e) => setEditDraft((d) => ({ ...d, phone_number: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="edit-actions">
                  <button className="ghost-button" onClick={() => onEditStart(null)}>
                    Cancel
                  </button>
                  <button className="primary-button" onClick={onSaveEdit}>
                    Save changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManageVotersDashboard() {
  const [search, setSearch] = useState("");
  const [approval, setApproval] = useState("all");
  const [emailStatus, setEmailStatus] = useState("all");
  const [faceStatus, setFaceStatus] = useState("all");
  const [voteStatus, setVoteStatus] = useState("all");
  const [accountStatus, setAccountStatus] = useState("all");
  const [sortKey, setSortKey] = useState("registeredAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [serverPage, setServerPage] = useState(1);
  const [serverPageSize, setServerPageSize] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [docPreview, setDocPreview] = useState(null);
  const [facePreview, setFacePreview] = useState(null);

  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({ full_name: "", email: "", phone_number: "" });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDialog, setBulkDialog] = useState(null);

  const pushToast = useCallback((title, tone = "success", body = "") => {
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, tone, body }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const handleDismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const revokePreviews = useCallback(() => {
    if (docPreview) URL.revokeObjectURL(docPreview);
    if (facePreview) URL.revokeObjectURL(facePreview);
    setDocPreview(null);
    setFacePreview(null);
  }, [docPreview, facePreview]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((v) => next.has(v.id));
      if (allSelected) {
        items.forEach((v) => next.delete(v.id));
      } else {
        items.forEach((v) => next.add(v.id));
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (approval !== "all") params.set("approval_status", approval);
        if (emailStatus !== "all") params.set("email_status", emailStatus);
        if (faceStatus !== "all") params.set("face_status", faceStatus);
        if (voteStatus !== "all") params.set("voting_status", voteStatus);
        if (accountStatus !== "all") {
          const accountMap = {
            Active: "ACTIVE",
            Suspended: "SUSPENDED",
            Disabled: "DISABLED",
            Rejected: "REJECTED",
            Pending: "PENDING_REVIEW",
          };
          params.set("account_status", accountMap[accountStatus] || accountStatus);
        }
        params.set("sort", sortKey === "registeredAt" ? (sortDir === "asc" ? "oldest" : "newest") : sortKey);
        params.set("order", sortDir);
        params.set("page", String(page));
        params.set("page_size", String(pageSize));

        const token = localStorage.getItem("access_token");
        const { data } = await axios.get(`${API}/admin/voters?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;
        const mapped = (data.items || []).map((v) => {
          const approvalLabel = APPROVAL_LABELS[v.status] || v.status || "Pending";
          const accountLabel =
            v.status === "SUSPENDED" || v.status === "DISABLED"
              ? "Suspended"
              : v.status === "REJECTED"
              ? "Rejected"
              : v.status === "PENDING_REVIEW"
              ? "Pending"
              : "Active";
          return {
            id: v.id,
            name: v.full_name || "—",
            citizenshipId: v.citizenship_no_normalized || v.citizenship_no_raw || "—",
            email: v.email || "—",
            phone: v.phone_number || "—",
            registeredAt: v.created_at,
            approvalStatus: approvalLabel,
            emailVerified: Boolean(v.email_verified),
            faceVerified: Boolean(v.face_verified),
            votingStatus: v.voting_status || "Not Voted",
            accountStatus: accountLabel,
          };
        });
        const resolvedPage = Number(data.page) || page;
        const resolvedPageSize = Number(data.page_size) || pageSize;
        if (resolvedPage !== page) {
          setPage(resolvedPage);
        }
        if ((data.total || 0) > 0 && mapped.length === 0 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
          return;
        }
        setServerPage(resolvedPage);
        setServerPageSize(resolvedPageSize);
        setItems(mapped);
        setTotal(data.total || 0);
        setSelectedIds((prev) => {
          const next = new Set();
          mapped.forEach((v) => {
            if (prev.has(v.id)) next.add(v.id);
          });
          return next;
        });
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || "Failed to load voters.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [search, approval, emailStatus, faceStatus, voteStatus, accountStatus, sortKey, sortDir, page, pageSize, refreshTick]);

  const totalPages = Math.max(1, Math.ceil(total / serverPageSize));
  const currentPage = Math.min(serverPage, totalPages);

  const visiblePages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (currentPage >= totalPages - 3) return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages];
  }, [currentPage, totalPages]);

  const rangeStart = total === 0 ? 0 : (currentPage - 1) * serverPageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(currentPage * serverPageSize, total);

  const stats = useMemo(() => {
    const pending = items.filter((v) => v.approvalStatus === "Pending").length;
    const approved = items.filter((v) => v.approvalStatus === "Approved").length;
    const rejected = items.filter((v) => v.approvalStatus === "Rejected").length;
    const suspended = items.filter((v) => v.accountStatus === "Suspended").length;
    return [
      { label: "Total voters", value: total, tone: "primary" },
      { label: "Pending review", value: pending, tone: "amber" },
      { label: "Approved", value: approved, tone: "success" },
      { label: "Rejected", value: rejected, tone: "danger" },
      { label: "Suspended", value: suspended, tone: "indigo" },
    ];
  }, [items, total]);

  const selectedCount = selectedIds.size;
  const allOnPageSelected = items.length > 0 && items.every((v) => selectedIds.has(v.id));

  const loadDetails = useCallback(
    async (voterId, opts = {}) => {
      setDetailId(voterId);
      setDetail(null);
      setDetailError("");
      setDetailLoading(true);
      revokePreviews();
      try {
        const token = localStorage.getItem("access_token");
        const { data } = await axios.get(`${API}/admin/voters/${voterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const previewTasks = [];
        if (data.citizenship_image_available) {
          previewTasks.push(
            axios
              .get(`${API}/admin/voters/${voterId}/document`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
              })
              .then((res) => URL.createObjectURL(res.data))
              .catch(() => null)
          );
        } else {
          previewTasks.push(Promise.resolve(null));
        }

        if (data.face_image_available) {
          previewTasks.push(
            axios
              .get(`${API}/admin/voters/${voterId}/face`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
              })
              .then((res) => URL.createObjectURL(res.data))
              .catch(() => null)
          );
        } else {
          previewTasks.push(Promise.resolve(null));
        }

        const [docUrl, faceUrl] = await Promise.all(previewTasks);
        setDocPreview(docUrl);
        setFacePreview(faceUrl);
        setDetail(data);
        if (opts.startEdit) {
          setEditing(true);
          setEditDraft({
            full_name: data.full_name || "",
            email: data.email || "",
            phone_number: data.phone_number || "",
          });
        }
      } catch (err) {
        setDetailError(err?.response?.data?.detail || "Unable to fetch voter details.");
      } finally {
        setDetailLoading(false);
      }
    },
    [revokePreviews]
  );

  const closeDetails = useCallback(() => {
    setDetailId(null);
    setDetail(null);
    setDetailError("");
    setDetailLoading(false);
    setEditing(false);
    revokePreviews();
  }, [revokePreviews]);

  function handleAction(label, voterId) {
    if (label === "View details") {
      loadDetails(voterId);
      return;
    }
    if (label === "Edit info") {
      loadDetails(voterId, { startEdit: true });
      return;
    }
    const actionMap = {
      Approve: "approve",
      Reject: "reject",
      Suspend: "suspend",
      Reactivate: "reactivate",
      Deactivate: "deactivate",
      "Delete voter": "delete",
      "Resend verification": "resendVerification",
      "Reset password": "resetPassword",
      "Reset TOTP": "resetTotp",
    };

    const titleBase = {
      Approve: "Approve voter",
      Reject: "Reject voter",
      Suspend: "Suspend voter",
      Reactivate: "Reactivate voter",
      Deactivate: "Deactivate voter",
      "Delete voter": "Delete voter",
      "Resend verification": "Resend verification email",
      "Reset password": "Send password reset",
      "Reset TOTP": "Reset TOTP",
    }[label];

    const bodyBase = {
      Approve: "Approve this voter after verifying identity and documents?",
      Reject: "Reject this voter and record the reason.",
      Suspend: "Suspend this voter account. They will not be able to sign in until reactivated.",
      Reactivate: "Reactivate this voter and restore access?",
      Deactivate: "Deactivate (suspend) this voter. Access will be blocked until reactivated.",
      "Delete voter": "Delete this voter safely. Voted accounts are never hard-deleted; the account is disabled to preserve audit integrity.",
      "Resend verification": "Send a fresh verification email to this voter?",
      "Reset password": "Send a password reset code to this voter?",
      "Reset TOTP": "Reset the user's TOTP so they must re-enroll.",
    }[label];

    setDialog({
      title: titleBase,
      body: bodyBase,
      action: actionMap[label],
      voterId,
      confirmLabel: label,
      requireReason: label === "Reject",
      requirePhrase: label === "Delete voter",
      confirmationText: "",
      destructive: label === "Delete voter",
      reason: "",
      submitting: false,
    });
  }

  function handleRefresh() {
    setRefreshTick((t) => t + 1);
  }

  function handleResetFilters() {
    setSearch("");
    setApproval("all");
    setEmailStatus("all");
    setFaceStatus("all");
    setVoteStatus("all");
    setAccountStatus("all");
    setSortKey("registeredAt");
    setSortDir("desc");
    setPage(1);
  }

  async function runAction(kind, voterId, payload = {}) {
    const token = localStorage.getItem("access_token");
    const endpoints = {
      approve: `${API}/admin/voters/${voterId}/approve`,
      reject: `${API}/admin/voters/${voterId}/reject`,
      suspend: `${API}/admin/voters/${voterId}/suspend`,
      reactivate: `${API}/admin/voters/${voterId}/reactivate`,
      edit: `${API}/admin/voters/${voterId}`,
      deactivate: `${API}/admin/voters/${voterId}/deactivate`,
      delete: `${API}/admin/voters/${voterId}/delete`,
      resendVerification: `${API}/admin/voters/${voterId}/resend-verification`,
      resetPassword: `${API}/admin/voters/${voterId}/reset-password`,
      resetTotp: `${API}/admin/voters/${voterId}/reset-totp`,
    };

    const method = kind === "edit" ? "patch" : "post";
    const url = endpoints[kind];
    const { data } = await axios[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
    pushToast(data?.detail || `${kind[0].toUpperCase()}${kind.slice(1)} successful`, "success");
    handleRefresh();
    if (detailId === voterId) {
      await loadDetails(voterId);
    }
  }

  async function handleDialogConfirm() {
    if (!dialog) return;
    setDialog((d) => ({ ...d, submitting: true }));
    try {
      const payload = {};
      if (dialog.reason) payload.reason = dialog.reason;
      if (dialog.requirePhrase) payload.confirmation_text = dialog.confirmationText || "";
      await runAction(dialog.action, dialog.voterId, payload);
      setDialog(null);
    } catch (err) {
      pushToast("Action failed", "danger", err?.response?.data?.detail || "Unexpected error");
      setDialog((d) => (d ? { ...d, submitting: false } : d));
    }
  }

  function handleDialogReason(value) {
    setDialog((d) => (d ? { ...d, reason: value } : d));
  }

  function handleDialogPhrase(value) {
    setDialog((d) => (d ? { ...d, confirmationText: value } : d));
  }

  const startEdit = useCallback(
    (data) => {
      if (!data) {
        setEditing(false);
        return;
      }
      setEditing(true);
      setEditDraft({
        full_name: data.full_name || "",
        email: data.email || "",
        phone_number: data.phone_number || "",
      });
    },
    []
  );

  async function saveEdit() {
    if (!detailId) return;
    try {
      await runAction("edit", detailId, editDraft);
      setEditing(false);
    } catch (err) {
      pushToast("Update failed", "danger", err?.response?.data?.detail || "Unable to update voter");
    }
  }

  function openBulkDialog(action) {
    const labelMap = {
      approve: "Bulk approve",
      reject: "Bulk reject",
      suspend: "Bulk suspend",
      reactivate: "Bulk reactivate",
      deactivate: "Bulk deactivate",
    };
    const bodyMap = {
      approve: "Approve selected voters? All required documents must already be present.",
      reject: "Reject selected voters and record the reason?",
      suspend: "Suspend selected voters. They will lose access until reactivated.",
      reactivate: "Reactivate selected voters and restore access?",
      deactivate: "Deactivate (suspend) selected voters. Access will be blocked.",
    };
    setBulkDialog({
      action,
      title: labelMap[action],
      body: bodyMap[action],
      reason: "",
      requireReason: action === "reject",
      submitting: false,
    });
  }

  async function confirmBulkAction() {
    if (!bulkDialog) return;
    setBulkDialog((d) => ({ ...d, submitting: true }));
    const token = localStorage.getItem("access_token");
    try {
      const payload = {
        user_ids: Array.from(selectedIds),
        action: bulkDialog.action,
        reason: bulkDialog.reason,
      };
      const { data } = await axios.post(`${API}/admin/voters/bulk/actions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const successCount = data?.successes?.length || 0;
      const failureCount = data?.failures?.length || 0;
      pushToast(`${bulkDialog.title} complete`, failureCount ? "danger" : "success", `${successCount} succeeded, ${failureCount} failed`);
      setSelectedIds(new Set());
      handleRefresh();
    } catch (err) {
      pushToast("Bulk action failed", "danger", err?.response?.data?.detail || "Unexpected error");
      setBulkDialog((d) => (d ? { ...d, submitting: false } : d));
    }
  }

  return (
    <div className="manage-voters-page">
      <div className="manage-voters-container">
        <div className="page-header card-surface">
          <div>
            <p className="eyebrow">Voter operations</p>
            <h1>Manage Voters</h1>
            <p className="subtitle">Review, verify, and manage voter accounts.</p>
          </div>
          <div className="header-actions">
            <button className="ghost-button" onClick={handleRefresh}>
              Refresh
            </button>
          </div>
        </div>

        <div className="stats-grid">
          {stats.map((card) => (
            <div key={card.label} className={`stat-card tone-${card.tone}`}>
              <p className="stat-label">{card.label}</p>
              <p className="stat-value">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="toolbar card-surface">
          <div className="toolbar-head">
            <div>
              <p className="toolbar-kicker">Search & Filters</p>
              <p className="toolbar-sub">Refine voter data by approval, verification, status, and timeline.</p>
            </div>
            <button className="ghost-button" onClick={handleResetFilters}>
              Reset Filters
            </button>
          </div>

          <div className="search-box">
            <input
              type="search"
              placeholder="Search name, email, or citizenship ID"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="filters">
            <label>
              Approval
              <select
                value={approval}
                onChange={(e) => {
                  setApproval(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </label>
            <label>
              Email
              <select
                value={emailStatus}
                onChange={(e) => {
                  setEmailStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </label>
            <label>
              Face
              <select
                value={faceStatus}
                onChange={(e) => {
                  setFaceStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </label>
            <label>
              Voting
              <select
                value={voteStatus}
                onChange={(e) => {
                  setVoteStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="Voted">Voted</option>
                <option value="Not Voted">Not Voted</option>
              </select>
            </label>
            <label>
              Account
              <select
                value={accountStatus}
                onChange={(e) => {
                  setAccountStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Rejected">Rejected</option>
                <option value="Pending">Pending</option>
              </select>
            </label>
            <label>
              Sort
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="registeredAt">Registration date</option>
                <option value="name">Name</option>
              </select>
            </label>
            <label>
              Order
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
          </div>
        </div>

      {selectedCount > 0 && (
        <div className="bulk-bar">
          <div className="bulk-meta">{selectedCount} selected</div>
          <div className="bulk-actions">
            <button className="ghost-button" onClick={() => openBulkDialog("approve")}>
              Bulk approve
            </button>
            <button className="ghost-button" onClick={() => openBulkDialog("reject")}>
              Bulk reject
            </button>
            <button className="ghost-button" onClick={() => openBulkDialog("suspend")}>
              Bulk suspend
            </button>
            <button className="ghost-button" onClick={() => openBulkDialog("reactivate")}>
              Bulk reactivate
            </button>
            <button className="ghost-button" onClick={() => openBulkDialog("deactivate")}>
              Bulk deactivate
            </button>
          </div>
        </div>
      )}

      <div className="table-card card-surface">
        {loading && (
          <div className="table-loading">
            <div className="spinner" />
            <p>Loading voters… please wait</p>
          </div>
        )}
        <div className="desktop-table-wrap">
          <table className="voters-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} />
                </th>
                <th>Voter</th>
                <th>Citizenship ID</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Voting Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 &&
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="skeleton-row">
                    <td colSpan={8}>
                      <div className="skeleton-line" />
                    </td>
                  </tr>
                ))}
              {error ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    <div className="empty-state">
                      <p className="empty-title">Could not load voters</p>
                      <p className="empty-subtitle">{error}</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    <div className="empty-state">
                      <p className="empty-title">No voters match your filters</p>
                      <p className="empty-subtitle">Adjust filters or refresh once data is connected.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => toggleSelect(v.id)}
                        aria-label="Select voter"
                      />
                    </td>
                    <td>
                      <div className="cell-primary">{v.name}</div>
                      <div className="cell-sub">{v.email}</div>
                      <div className="cell-sub">ID #{v.id} · {v.phone}</div>
                    </td>
                    <td>{v.citizenshipId}</td>
                    <td>
                      <div className="pill-stack">
                        <Badge label={v.approvalStatus} />
                        <Badge label={v.accountStatus} />
                      </div>
                    </td>
                    <td>
                      <div className="pill-stack">
                        <Badge label={v.emailVerified ? "Verified" : "Unverified"} />
                        <Badge label={v.faceVerified ? "Verified" : "Unverified"} />
                      </div>
                    </td>
                    <td><Badge label={v.votingStatus} /></td>
                    <td>{fmtDate(v.registeredAt)}</td>
                    <td>
                      <ActionMenu voterId={v.id} onAction={handleAction} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-voters-list">
          {error ? (
            <div className="empty-cell">
              <div className="empty-state">
                <p className="empty-title">Could not load voters</p>
                <p className="empty-subtitle">{error}</p>
              </div>
            </div>
          ) : items.length === 0 && !loading ? (
            <div className="empty-cell">
              <div className="empty-state">
                <p className="empty-title">No voters match your filters</p>
                <p className="empty-subtitle">Adjust filters or refresh once data is connected.</p>
              </div>
            </div>
          ) : (
            items.map((v) => (
              <article key={`mobile-${v.id}`} className="voter-mobile-card">
                <div className="voter-mobile-top">
                  <label className="mobile-select">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.id)}
                      onChange={() => toggleSelect(v.id)}
                      aria-label="Select voter"
                    />
                    <span>Select</span>
                  </label>
                  <ActionMenu voterId={v.id} onAction={handleAction} />
                </div>

                <div className="voter-mobile-name">{v.name}</div>
                <div className="voter-mobile-meta">ID #{v.id} · {v.citizenshipId}</div>
                <div className="voter-mobile-meta">{v.email}</div>
                <div className="voter-mobile-meta">{v.phone}</div>

                <div className="voter-mobile-section">
                  <span className="mobile-label">Status</span>
                  <div className="pill-stack">
                    <Badge label={v.approvalStatus} />
                    <Badge label={v.accountStatus} />
                  </div>
                </div>

                <div className="voter-mobile-section">
                  <span className="mobile-label">Verification</span>
                  <div className="pill-stack">
                    <Badge label={v.emailVerified ? "Verified" : "Unverified"} />
                    <Badge label={v.faceVerified ? "Verified" : "Unverified"} />
                  </div>
                </div>

                <div className="voter-mobile-bottom">
                  <Badge label={v.votingStatus} />
                  <span>{fmtDate(v.registeredAt)}</span>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="table-footer">
          <div className="footer-meta">
            Showing {rangeStart}-{rangeEnd} of {total} voters
          </div>
          <div className="pagination-area">
            <label className="page-size-control">
              Rows
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={20}>20</option>
                <option value={40}>40</option>
              </select>
            </label>
            <button
              className="ghost-button"
              disabled={currentPage === 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <div className="pagination">
              {visiblePages.map((pageItem, idx) =>
                pageItem === "…" ? (
                  <span key={`dots-${idx}`} className="page-dots">…</span>
                ) : (
                  <button
                    key={pageItem}
                    className={`page-number ${pageItem === currentPage ? "active" : ""}`}
                    onClick={() => setPage(pageItem)}
                    disabled={loading}
                  >
                    {pageItem}
                  </button>
                )
              )}
            </div>
            <button
              className="ghost-button"
              disabled={currentPage === totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
            <span className="page-indicator">Page {currentPage} of {totalPages}</span>
          </div>
        </div>
      </div>

      {detailId && (
        <DetailPanel
          detail={detail}
          loading={detailLoading}
          error={detailError}
          docPreview={docPreview}
          facePreview={facePreview}
          onClose={closeDetails}
          onApprove={() => handleAction("Approve", detailId)}
          onReject={() => handleAction("Reject", detailId)}
          onSuspend={() => handleAction("Suspend", detailId)}
          onReactivate={() => handleAction("Reactivate", detailId)}
          onDeactivate={() => handleAction("Deactivate", detailId)}
          onDelete={() => handleAction("Delete voter", detailId)}
          onResendVerification={() => handleAction("Resend verification", detailId)}
          onResetPassword={() => handleAction("Reset password", detailId)}
          onResetTotp={() => handleAction("Reset TOTP", detailId)}
          onEditStart={(data) => startEdit(data || detail)}
          editing={editing}
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          onSaveEdit={saveEdit}
        />
      )}

      <ConfirmDialog
        dialog={dialog}
        onCancel={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
        onReasonChange={handleDialogReason}
        onPhraseChange={handleDialogPhrase}
      />
      <ConfirmDialog dialog={bulkDialog} onCancel={() => setBulkDialog(null)} onConfirm={confirmBulkAction} onReasonChange={(value) => setBulkDialog((d) => (d ? { ...d, reason: value } : d))} />
      <ToastStack toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    </div>
  );
}
