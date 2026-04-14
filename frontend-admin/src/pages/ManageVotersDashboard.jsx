import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Users, UserCheck, UserX, Clock, Shield, Search, Filter, RefreshCw,
  ChevronDown, ChevronLeft, ChevronRight, Eye, Edit3, Trash2, Mail,
  KeyRound, Lock, MoreVertical, X, AlertTriangle, CheckCircle2, XCircle,
  UserMinus, UserPlus, RotateCcw, FileText, Camera, Ban,
} from "lucide-react";
import { T } from "../components/ui/tokens";
import {
  PageContainer, AdminKeyframes, AdminPortalHero, AdminHeroChip, ADMIN_HERO_TINTS,
} from "../components/ui/AdminUI";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* ── Badge colour map ────────────────────────────────────────── */
const BADGE_STYLES = {
  Pending:    { bg: "#FFF7ED", color: "#D97706", border: "#FFEDD5" },
  Approved:   { bg: "#ECFDF5", color: "#059669", border: "#D1FAE5" },
  Rejected:   { bg: "#FEF2F2", color: "#DC2626", border: "#FEE2E2" },
  Suspended:  { bg: "#F1F5F9", color: "#475569", border: "#E2E8F0" },
  Verified:   { bg: "#EBF2FF", color: "#2563EB", border: "#DBEAFE" },
  Unverified: { bg: "#FEF2F2", color: "#DC2626", border: "#FEE2E2" },
  Voted:      { bg: "#ECFDF5", color: "#059669", border: "#D1FAE5" },
  "Not Voted":{ bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0" },
  Active:     { bg: "#F0FDF4", color: "#16A34A", border: "#DCFCE7" },
  Disabled:   { bg: "#F1F5F9", color: "#475569", border: "#E2E8F0" },
};

const APPROVAL_LABELS = {
  PENDING_REVIEW: "Pending",
  ACTIVE: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  DISABLED: "Suspended",
};

/* ── Shared mini-components ──────────────────────────────────── */
function Badge({ label }) {
  const s = BADGE_STYLES[label] || { bg: T.surfaceAlt, color: T.muted, border: T.border };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 10px",
      borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{label}</span>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

/* ── Avatar initials ─────────────────────────────────────────── */
const AVATAR_COLORS = ["#2563EB","#7C3AED","#059669","#EA580C","#DC2626","#0891B2","#D97706"];
function AvatarCircle({ name }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const idx = (name || "").length % AVATAR_COLORS.length;
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%", display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
      background: `${AVATAR_COLORS[idx]}14`, color: AVATAR_COLORS[idx],
      fontSize: 12, fontWeight: 800, letterSpacing: "0.03em",
      border: `1.5px solid ${AVATAR_COLORS[idx]}30`,
    }}>{initials}</div>
  );
}

/* ── Action menu (three-dot) ─────────────────────────────────── */
const ACTION_ITEMS = [
  { label: "View details", icon: Eye },
  { label: "Approve", icon: CheckCircle2 },
  { label: "Reject", icon: XCircle },
  { label: "Suspend", icon: Ban },
  { label: "Reactivate", icon: UserPlus },
  { label: "Deactivate", icon: UserMinus },
  { label: "Resend verification", icon: Mail },
  { label: "Reset password", icon: KeyRound },
  { label: "Reset TOTP", icon: RotateCcw },
  { label: "Edit info", icon: Edit3 },
  { label: "Delete voter", icon: Trash2, danger: true },
];

const ACTION_MENU_ITEM_HEIGHT = 34; // approx px per item

function ActionMenu({ voterId, onAction }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const approxMenuHeight = ACTION_ITEMS.length * ACTION_MENU_ITEM_HEIGHT + 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < approxMenuHeight && rect.top > approxMenuHeight;
    setMenuPos({
      right: window.innerWidth - rect.right,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div style={{ display: "inline-block" }}>
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          border: `1px solid ${T.border}`, background: T.surface, borderRadius: T.radius.md,
          width: 32, height: 32, cursor: "pointer", display: "inline-flex",
          alignItems: "center", justifyContent: "center", transition: T.transition,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
        onMouseLeave={e => { e.currentTarget.style.background = T.surface; }}
      ><MoreVertical size={15} color={T.muted} /></button>
      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            right: menuPos.right,
            ...(menuPos.top !== undefined ? { top: menuPos.top } : {}),
            ...(menuPos.bottom !== undefined ? { bottom: menuPos.bottom } : {}),
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg,
            minWidth: 190,
            boxShadow: T.shadow.xl,
            zIndex: 9999,
            padding: 4,
            animation: "fadeIn 0.14s ease",
          }}
        >
          {ACTION_ITEMS.map(({ label, icon: Icon, danger }) => (
            <button key={label}
              onMouseDown={(e) => { e.preventDefault(); onAction(label, voterId); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "8px 10px", border: "none",
                background: "transparent", fontSize: 12.5, fontWeight: 600,
                color: danger ? T.error : T.text, borderRadius: T.radius.sm,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                transition: T.transitionFast,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = danger ? T.errorBg : T.surfaceAlt; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Toast stack ──────────────────────────────────────────── */
function ToastStack({ toasts, onDismiss }) {
  const TOAST_ACCENTS = { success: T.success, danger: T.error, info: T.accent };
  return (
    <div style={{
      position: "fixed", right: 16, bottom: 16, display: "flex",
      flexDirection: "column", gap: 8, zIndex: 9999,
    }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{
          background: "#0F172A", color: "#E2E8F0", padding: "12px 40px 12px 14px",
          borderRadius: T.radius.lg, boxShadow: T.shadow.xl,
          border: `1px solid rgba(226,232,240,0.18)`,
          borderLeft: `4px solid ${TOAST_ACCENTS[toast.tone] || T.accent}`,
          minWidth: 260, position: "relative",
          animation: "slideUpFade 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}>
          <div style={{ fontWeight: 800, fontSize: 13.5 }}>{toast.title}</div>
          {toast.body && <div style={{ marginTop: 4, color: "#CBD5E1", fontSize: 12.5 }}>{toast.body}</div>}
          <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss"
            style={{
              position: "absolute", top: 8, right: 8, background: "transparent",
              color: "#E2E8F0", border: "none", fontSize: 16, cursor: "pointer", padding: 2,
            }}>×</button>
        </div>
      ))}
    </div>
  );
}

/* ── Confirm dialog ──────────────────────────────────────── */
function ConfirmDialog({ dialog, onCancel, onConfirm, onReasonChange, onPhraseChange }) {
  if (!dialog) return null;
  const inputStyle = {
    border: `1.5px solid ${T.border}`, borderRadius: T.radius.md,
    padding: "10px 12px", fontSize: 14, background: T.surface, width: "100%",
    transition: T.transition, outline: "none",
  };
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 5000, padding: 20, backdropFilter: "blur(4px)",
    }} role="dialog" aria-modal="true">
      <div style={{
        background: T.surface, borderRadius: T.radius.xl, padding: "20px 22px",
        width: "min(480px, 96vw)", boxShadow: T.shadow.xl,
        border: `2px solid ${dialog.destructive ? T.errorBorder : T.border}`,
        animation: "fadeIn 0.2s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>{dialog.title}</h3>
          <button onClick={onCancel} aria-label="Close dialog" style={{
            border: "none", background: T.surfaceAlt, width: 30, height: 30,
            borderRadius: T.radius.sm, cursor: "pointer", display: "inline-flex",
            alignItems: "center", justifyContent: "center",
          }}><X size={15} color={T.muted} /></button>
        </div>
        <p style={{ margin: "0 0 10px", color: T.textSecondary, fontSize: 14, lineHeight: 1.5 }}>{dialog.body}</p>
        {dialog.destructive && (
          <p style={{
            margin: "0 0 12px", padding: "10px 12px", borderRadius: T.radius.md,
            background: T.errorBg, color: "#991B1B", fontSize: 13, fontWeight: 700,
            border: `1px solid ${T.errorBorder}`,
          }}>This action is intentionally protected and cannot be undone.</p>
        )}
        {dialog.requireReason && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Reason</label>
            <textarea rows={3} value={dialog.reason || ""} onChange={(e) => onReasonChange(e.target.value)}
              placeholder={dialog.reasonPlaceholder || "Add a short note for the audit log"}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = T.focusRing; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }} />
          </div>
        )}
        {dialog.requirePhrase && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Type DELETE to confirm</label>
            <input value={dialog.confirmationText || ""} placeholder="DELETE"
              onChange={(e) => onPhraseChange(e.target.value)} style={inputStyle}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = T.focusRing; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button onClick={onCancel} disabled={dialog.submitting} style={{
            border: `1px solid ${T.border}`, background: T.surface, borderRadius: T.radius.md,
            padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            color: T.text, transition: T.transition,
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={
            dialog.submitting ||
            (dialog.requireReason && !dialog.reason) ||
            (dialog.requirePhrase && (dialog.confirmationText || "").trim().toUpperCase() !== "DELETE")
          } style={{
            border: "none", background: dialog.destructive ? T.error : T.accent,
            color: "#fff", borderRadius: T.radius.md, padding: "9px 18px",
            fontSize: 13, fontWeight: 700, cursor: "pointer", transition: T.transition,
            opacity: dialog.submitting ? 0.6 : 1, boxShadow: T.shadow.md,
          }}>{dialog.submitting ? "Working…" : dialog.confirmLabel || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Detail drawer (slide-in panel) ───────────────────────── */
function DetailPanel({
  detail, loading, error, docPreview, facePreview,
  onClose, onApprove, onReject, onSuspend, onReactivate, onDeactivate,
  onDelete, onResendVerification, onResetPassword, onResetTotp,
  onEditStart, editing, editDraft, setEditDraft, onSaveEdit,
}) {
  const inputStyle = {
    border: `1.5px solid ${T.border}`, borderRadius: T.radius.md,
    padding: "10px 12px", fontSize: 14, background: T.surface, width: "100%",
    transition: T.transition, outline: "none",
  };
  const iconBtn = (Icon, label, onClick, color = T.textSecondary) => (
    <button key={label} onClick={() => onClick(detail)} title={label}
      style={{
        border: `1px solid ${T.border}`, background: T.surface,
        borderRadius: T.radius.md, padding: "7px 12px", fontSize: 12,
        fontWeight: 600, color, cursor: "pointer", display: "inline-flex",
        alignItems: "center", gap: 6, transition: T.transition,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
      onMouseLeave={e => { e.currentTarget.style.background = T.surface; }}
    ><Icon size={14} />{label}</button>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 5000, padding: 20, backdropFilter: "blur(4px)",
    }} role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "min(1200px, 94vw)", background: T.bg, borderRadius: 20,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
        maxHeight: "94vh", display: "flex", flexDirection: "column",
        border: `1px solid ${T.border}`, overflow: "hidden",
        animation: "drawerIn 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "18px 22px 14px", borderBottom: `1px solid ${T.border}`, background: T.surface,
        }}>
          <div>
            <p style={{
              textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700,
              fontSize: 11, color: T.accent, margin: "0 0 4px",
            }}>Administrative Control</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 2px" }}>
              {detail?.full_name || "Voter Profile"}
            </h2>
            <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
              Comprehensive identity and verification record.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close panel" style={{
            border: "none", background: T.surfaceAlt, width: 34, height: 34,
            borderRadius: T.radius.md, cursor: "pointer", display: "inline-flex",
            alignItems: "center", justifyContent: "center",
          }}><X size={16} color={T.muted} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && (
            <div style={{
              background: T.surface, padding: 32, borderRadius: T.radius.lg,
              border: `1px solid ${T.border}`, textAlign: "center",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", margin: "0 auto 10px",
                border: `3px solid ${T.border}`, borderTopColor: T.accent,
                animation: "spin 0.9s linear infinite",
              }} />
              <p style={{ margin: 0, color: T.muted, fontWeight: 600 }}>Fetching voter details…</p>
            </div>
          )}

          {error && !loading && (
            <div style={{
              background: T.errorBg, padding: 16, borderRadius: T.radius.lg,
              border: `1px solid ${T.errorBorder}`, color: T.error, fontWeight: 600,
            }}>{error}</div>
          )}

          {!loading && detail && (<>
            {/* Status badges row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Badge label={APPROVAL_LABELS[detail.status] || detail.status} />
              <Badge label={detail.account_status === "SUSPENDED" ? "Suspended" : "Active"} />
              <Badge label={detail.email_verified ? "Verified" : "Unverified"} />
              <Badge label={detail.face_uploaded_at ? "Verified" : "Unverified"} />
              <Badge label={detail.voting_status} />
            </div>

            {/* Info cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              {[
                {
                  title: "Profile", icon: Users, fields: [
                    ["ID", detail.id],
                    ["Full name", detail.full_name || "—"],
                    ["Citizenship", detail.citizenship_no_normalized || detail.citizenship_no_raw || "—"],
                    ["Email", detail.email || "—"],
                    ["Phone", detail.phone_number || "—"],
                    ["Registered", fmtDate(detail.created_at)],
                  ],
                },
                {
                  title: "Verification", icon: Shield, fields: [
                    ["Email verification", detail.email_verified ? "Verified" : "Pending"],
                    ["Email verified at", fmtDate(detail.email_verified_at)],
                    ["Face upload", detail.face_uploaded_at ? "Provided" : "Missing"],
                    ["Document upload", detail.document_uploaded_at ? "Provided" : "Missing"],
                    ["Approval", detail.approved_at ? fmtDate(detail.approved_at) : "Not approved"],
                    ["Rejection note", detail.rejection_reason || "—"],
                  ],
                },
                {
                  title: "Voting", icon: CheckCircle2, fields: [
                    ["Status", detail.voting_status],
                    ["Votes cast", detail.vote_count],
                  ],
                },
              ].map(({ title, icon: Icon, fields }) => (
                <div key={title} style={{
                  background: T.surface, borderRadius: T.radius.lg, padding: "16px 18px",
                  border: `1px solid ${T.border}`, boxShadow: T.shadow.sm,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: T.radius.sm, background: T.accentLight,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}><Icon size={14} color={T.accent} /></div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text }}>{title}</h4>
                  </div>
                  {fields.map(([lbl, val], i) => (
                    <div key={lbl} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      gap: 10, padding: "7px 0", fontSize: 13.5,
                      borderBottom: i < fields.length - 1 ? `1px dashed ${T.borderLight}` : "none",
                    }}>
                      <span style={{ color: T.muted, fontWeight: 500 }}>{lbl}</span>
                      <strong style={{ color: T.text, fontWeight: 700, textAlign: "right" }}>{val}</strong>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Document previews */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              {[
                { title: "Citizenship document", preview: docPreview, provided: !!detail.document_uploaded_at, icon: FileText },
                { title: "Face verification", preview: facePreview, provided: !!detail.face_uploaded_at, icon: Camera },
              ].map(({ title, preview, provided, icon: Icon }) => (
                <div key={title} style={{
                  background: T.surfaceAlt, borderRadius: T.radius.lg, padding: 16,
                  border: `1px solid ${T.border}`, minHeight: 240,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon size={15} color={T.muted} />
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{title}</h4>
                    </div>
                    <Badge label={provided ? "Provided" : "Missing"} />
                  </div>
                  {preview ? (
                    <img src={preview} alt={title} style={{
                      width: "100%", borderRadius: T.radius.md, objectFit: "contain",
                      background: T.surface, maxHeight: 280, border: `1px solid ${T.border}`,
                    }} />
                  ) : (
                    <div style={{
                      background: T.surface, border: `2px dashed ${T.border}`,
                      borderRadius: T.radius.md, padding: 24, textAlign: "center",
                      color: T.muted, fontSize: 13,
                    }}>No {title.toLowerCase()} available</div>
                  )}
                </div>
              ))}
            </div>

            {/* Action bar */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {iconBtn(Edit3, "Edit", onEditStart)}
                {iconBtn(Mail, "Resend Email", onResendVerification)}
                {iconBtn(KeyRound, "Reset PW", onResetPassword)}
                {iconBtn(RotateCcw, "Reset TOTP", onResetTotp)}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {iconBtn(XCircle, "Reject", onReject, T.error)}
                <button onClick={() => onApprove(detail)} style={{
                  border: "none", background: T.accent, color: "#fff",
                  borderRadius: T.radius.md, padding: "9px 18px", fontSize: 13,
                  fontWeight: 700, cursor: "pointer", display: "inline-flex",
                  alignItems: "center", gap: 6, transition: T.transition, boxShadow: T.shadow.md,
                }}><CheckCircle2 size={14} />Approve Voter</button>
              </div>
            </div>

            {/* Edit card */}
            {editing && (
              <div style={{
                background: T.surface, borderRadius: T.radius.lg,
                border: `2px solid ${T.border}`, padding: "16px 18px",
                boxShadow: T.shadow.md,
              }}>
                <div style={{ marginBottom: 14 }}>
                  <h4 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 800, color: T.text }}>Edit voter</h4>
                  <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Only safe profile fields are editable.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  {[
                    { label: "Full name", key: "full_name", type: "text" },
                    { label: "Email", key: "email", type: "email" },
                    { label: "Phone", key: "phone_number", type: "text" },
                  ].map(({ label, key, type }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
                      <input type={type} value={editDraft[key]}
                        onChange={(e) => setEditDraft((d) => ({ ...d, [key]: e.target.value }))}
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = T.focusRing; }}
                        onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                  <button onClick={() => onEditStart(null)} style={{
                    border: `1px solid ${T.border}`, background: T.surface,
                    borderRadius: T.radius.md, padding: "8px 16px", fontSize: 13,
                    fontWeight: 700, cursor: "pointer", color: T.text,
                  }}>Cancel</button>
                  <button onClick={onSaveEdit} style={{
                    border: "none", background: T.accent, color: "#fff",
                    borderRadius: T.radius.md, padding: "8px 18px", fontSize: 13,
                    fontWeight: 700, cursor: "pointer", boxShadow: T.shadow.md,
                  }}>Save changes</button>
                </div>
              </div>
            )}
          </>)}
        </div>
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

  // ── Pending registrations ──────────────────────────────────
  const [pendingRegs, setPendingRegs] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const fetchPendingRegs = useCallback(async () => {
    setPendingLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await axios.get(`${API}/admin/voters/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingRegs(data || []);
    } catch {
      setPendingRegs([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => { fetchPendingRegs(); }, [fetchPendingRegs]);

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
      { label: "Pending registrations", value: pendingRegs.length, tone: "amber" },
      { label: "Approved", value: approved, tone: "success" },
      { label: "Rejected", value: rejected, tone: "danger" },
      { label: "Suspended", value: suspended, tone: "indigo" },
    ];
  }, [items, total, pendingRegs]);

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
    fetchPendingRegs();
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
    fetchPendingRegs();
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

  /* ── KPI config ──────────────────────────────────────────── */
  const KPI = [
    { label: "Total Voters", value: total, icon: Users, accent: T.navy, bg: "#EBF2FF" },
    { label: "Pending Registrations", value: pendingRegs.length, icon: Clock, accent: "#D97706", bg: "#FFFBEB" },
    { label: "Approved", value: stats[2]?.value ?? 0, icon: UserCheck, accent: T.success, bg: T.successBg },
    { label: "Rejected", value: stats[3]?.value ?? 0, icon: UserX, accent: T.error, bg: T.errorBg },
    { label: "Suspended", value: stats[4]?.value ?? 0, icon: Ban, accent: T.accent, bg: T.accentLight },
  ];

  /* ── Filter chip config ────────────────────────────────── */
  const APPROVAL_CHIPS = [
    { label: "All", value: "all" },
    { label: "Pending", value: "Pending" },
    { label: "Approved", value: "Approved" },
    { label: "Rejected", value: "Rejected" },
  ];

  return (
    <PageContainer>
      <AdminKeyframes />
      <style>{`
        @keyframes drawerIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUpFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="admin-page-enter" style={{ width: "min(1260px, 100%)", margin: "0 auto", padding: "0 0 40px" }}>
        {/* ── Portal Hero ──────────────────────────────────── */}
        <AdminPortalHero
          eyebrow="Voter Registry"
          title="Voter Lifecycle Administration"
          subtitle="Comprehensive voter management — search records, review approval status, manage account lifecycle, and perform bulk administrative operations across the entire voter registry."
          rightContent={<>
            <AdminHeroChip label={`${total.toLocaleString()} Total`} tint={ADMIN_HERO_TINTS.info} />
            {pendingRegs.length > 0 && (
              <AdminHeroChip label={`${pendingRegs.length} Pending`} tint={ADMIN_HERO_TINTS.warn} />
            )}
          </>}
        />

        {/* ── KPI strip ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button onClick={handleRefresh} style={{
            border: `1px solid ${T.border}`, background: T.surface,
            borderRadius: T.radius.md, padding: "8px 14px", fontSize: 13,
            fontWeight: 600, cursor: "pointer", color: T.textSecondary,
            display: "inline-flex", alignItems: "center", gap: 7,
            transition: T.transition, boxShadow: T.shadow.sm,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.boxShadow = T.shadow.md; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = T.shadow.sm; }}
          ><RefreshCw size={14} />Refresh Data</button>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14, marginBottom: 22,
        }}>
          {KPI.map(({ label, value, icon: Icon, accent, bg }) => (
            <div key={label} style={{
              background: T.surface, borderRadius: T.radius.lg, padding: "16px 18px",
              border: `1px solid ${T.border}`, borderLeft: `4px solid ${accent}`,
              boxShadow: T.shadow.sm, display: "flex", alignItems: "center", gap: 14,
              transition: T.transition,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center",
                background: bg, flexShrink: 0,
              }}><Icon size={18} color={accent} /></div>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase",
                  letterSpacing: "0.04em", marginBottom: 2,
                }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>
                  {value.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Pending registrations ──────────────────────────── */}
        {pendingRegs.length > 0 && (
          <div style={{
            background: T.surface, borderRadius: T.radius.xl,
            border: `1px solid #FDE68A`, marginBottom: 22, overflow: "hidden",
            boxShadow: T.shadow.sm,
          }}>
            <div style={{
              background: "#FFFBEB", padding: "14px 20px", display: "flex",
              justifyContent: "space-between", alignItems: "center",
              borderBottom: "1px solid #FDE68A",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", background: "#FEF3C7",
                }}><Clock size={16} color="#D97706" /></div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#92400E" }}>Pending Registrations</span>
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 700,
                    background: "#FDE68A", color: "#92400E",
                    padding: "2px 8px", borderRadius: 999,
                  }}>{pendingRegs.length}</span>
                </div>
              </div>
              <button onClick={fetchPendingRegs} disabled={pendingLoading} style={{
                border: `1px solid #FDE68A`, background: "#FFFBEB",
                borderRadius: T.radius.md, padding: "6px 12px", fontSize: 12,
                fontWeight: 700, cursor: "pointer", color: "#92400E",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}><RefreshCw size={12} />{pendingLoading ? "Loading…" : "Refresh"}</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    {["Voter", "Citizenship ID", "Documents", "Submitted", "Status", "Actions"].map(h => (
                      <th key={h} style={{
                        background: T.surfaceAlt, color: T.muted, fontSize: 11, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.05em", padding: "10px 16px",
                        borderBottom: `1px solid ${T.border}`, textAlign: h === "Actions" ? "right" : "left",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingRegs.map((reg) => (
                    <tr key={`pending-${reg.id}`}>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderLight}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <AvatarCircle name={reg.full_name} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text }}>{reg.full_name}</div>
                            <div style={{ fontSize: 12, color: T.muted }}>{reg.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderLight}` }}>
                        <code style={{
                          background: T.surfaceAlt, padding: "2px 8px", borderRadius: T.radius.sm,
                          fontSize: 12, fontWeight: 600, color: T.textSecondary,
                          border: `1px solid ${T.borderLight}`,
                        }}>{reg.citizenship_no_normalized || reg.citizenship_no_raw || "—"}</code>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderLight}` }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          <Badge label={reg.document_uploaded_at ? "Verified" : "Unverified"} />
                          <Badge label={reg.face_uploaded_at ? "Verified" : "Unverified"} />
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderLight}`, fontSize: 13, color: T.textSecondary }}>{fmtDate(reg.submitted_at)}</td>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderLight}` }}><Badge label="Pending" /></td>
                      <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderLight}`, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => loadDetails(reg.id)} style={{
                            border: `1px solid ${T.border}`, background: T.surface,
                            borderRadius: T.radius.sm, padding: "5px 10px", fontSize: 12,
                            fontWeight: 600, cursor: "pointer", color: T.textSecondary,
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}><Eye size={12} />Review</button>
                          {reg.document_uploaded_at && reg.face_uploaded_at && (
                            <button onClick={() => handleAction("Approve", reg.id)} style={{
                              border: "none", background: T.accent, color: "#fff",
                              borderRadius: T.radius.sm, padding: "5px 10px", fontSize: 12,
                              fontWeight: 600, cursor: "pointer",
                            }}>Approve</button>
                          )}
                          <button onClick={() => handleAction("Reject", reg.id)} style={{
                            border: `1px solid ${T.errorBorder}`, background: T.errorBg,
                            borderRadius: T.radius.sm, padding: "5px 10px", fontSize: 12,
                            fontWeight: 600, cursor: "pointer", color: T.error,
                          }}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Search & filter bar ────────────────────────────── */}
        <div style={{
          background: T.surface, borderRadius: T.radius.xl, padding: 20,
          border: `1px solid ${T.border}`, boxShadow: T.shadow.sm,
          marginBottom: 22, display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
              <Search size={16} color={T.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="search"
                placeholder="Search by name, email, or citizenship ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: "100%", padding: "11px 12px 11px 38px",
                  borderRadius: T.radius.md, border: `1.5px solid ${T.border}`,
                  background: T.surfaceAlt, fontSize: 14, outline: "none",
                  transition: T.transition,
                }}
                onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = T.focusRing; e.target.style.background = T.surface; }}
                onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; e.target.style.background = T.surfaceAlt; }}
              />
            </div>
            <button onClick={handleResetFilters} style={{
              border: `1px solid ${T.border}`, background: T.surface,
              borderRadius: T.radius.md, padding: "9px 14px", fontSize: 13,
              fontWeight: 600, cursor: "pointer", color: T.muted,
              display: "inline-flex", alignItems: "center", gap: 6,
              transition: T.transition,
            }}><Filter size={13} />Reset Filters</button>
          </div>

          {/* Approval status chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginRight: 4 }}>Status</span>
            {APPROVAL_CHIPS.map(c => {
              const active = approval === c.value;
              return (
                <button key={c.value} onClick={() => { setApproval(c.value); setPage(1); }}
                  style={{
                    border: `1.5px solid ${active ? T.accent : T.border}`,
                    background: active ? T.accentLight : T.surface,
                    color: active ? T.accent : T.textSecondary,
                    borderRadius: 999, padding: "5px 14px", fontSize: 12.5,
                    fontWeight: 700, cursor: "pointer", transition: T.transition,
                  }}>{c.label}</button>
              );
            })}
          </div>

          {/* Additional filters row */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 14,
            borderTop: `1px solid ${T.borderLight}`, paddingTop: 14,
          }}>
            {[
              { label: "Identity", value: faceStatus, setter: setFaceStatus, opts: [["all","Face Status"],["verified","Verified"],["unverified","Unverified"]] },
              { label: "Email", value: emailStatus, setter: setEmailStatus, opts: [["all","Email Status"],["verified","Verified"],["unverified","Unverified"]] },
              { label: "Account", value: accountStatus, setter: setAccountStatus, opts: [["all","Account Status"],["Active","Active"],["Suspended","Suspended"],["Rejected","Rejected"],["Pending","Pending"]] },
              { label: "Sort By", value: sortKey, setter: setSortKey, opts: [["registeredAt","Registration Date"],["name","Full Name"]] },
            ].map(({ label, value, setter, opts }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
                <select value={value} onChange={(e) => { setter(e.target.value); if (label !== "Sort By") setPage(1); }}
                  style={{
                    border: `1.5px solid ${T.border}`, borderRadius: T.radius.md,
                    padding: "8px 12px", background: T.surface, fontSize: 13,
                    color: T.text, fontWeight: 600, cursor: "pointer", outline: "none",
                    transition: T.transition,
                  }}
                  onFocus={e => { e.target.style.borderColor = T.accent; }}
                  onBlur={e => { e.target.style.borderColor = T.border; }}
                >
                  {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

      {/* ── Bulk action bar ──────────────────────────────────── */}
      {selectedCount > 0 && (
        <div style={{
          background: T.navy, color: "#fff", padding: "12px 18px",
          borderRadius: T.radius.lg, display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 16, marginBottom: 16,
          boxShadow: "0 4px 14px rgba(23,59,114,0.2)",
        }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{selectedCount} selected</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["approve","reject","suspend","reactivate","deactivate"].map(a => (
              <button key={a} onClick={() => openBulkDialog(a)} style={{
                border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.1)",
                borderRadius: T.radius.md, padding: "6px 13px", fontSize: 12,
                fontWeight: 700, color: "#fff", cursor: "pointer", transition: T.transition,
                textTransform: "capitalize",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              >Bulk {a}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Data table card ─────────────────────────────────── */}
      <div style={{
        background: T.surface, borderRadius: T.radius.xl, position: "relative",
        border: `1px solid ${T.border}`, boxShadow: T.shadow.sm, overflow: "hidden",
      }}>
        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(255,255,255,0.88)",
            display: "flex", flexDirection: "column", gap: 10,
            alignItems: "center", justifyContent: "center", zIndex: 5,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `3px solid ${T.border}`, borderTopColor: T.accent,
              animation: "spin 0.9s linear infinite",
            }} />
            <p style={{ margin: 0, color: T.muted, fontWeight: 600, fontSize: 13 }}>Loading voters… please wait</p>
          </div>
        )}

        {/* Desktop table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 44, paddingLeft: 16 }}>
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage}
                    style={{ width: 16, height: 16, accentColor: T.accent, cursor: "pointer" }} />
                </th>
                {["Voter", "Citizenship ID", "Status", "Verification", "Voting", "Registered", "Actions"].map(h => (
                  <th key={h} style={{ ...thStyle, textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 &&
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`}>
                    <td colSpan={8} style={{ padding: "14px 16px", borderBottom: `1px solid ${T.borderLight}` }}>
                      <div style={{
                        height: 14, borderRadius: T.radius.sm,
                        background: `linear-gradient(90deg, ${T.border} 0%, ${T.surfaceAlt} 50%, ${T.border} 100%)`,
                        backgroundSize: "200% 100%", animation: "shimmer 1.2s ease-in-out infinite",
                      }} />
                    </td>
                  </tr>
                ))}
              {error ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: "center" }}>
                    <div style={{
                      display: "inline-block", padding: "20px 28px", borderRadius: T.radius.lg,
                      border: `2px dashed ${T.border}`, background: T.surface,
                    }}>
                      <AlertTriangle size={24} color={T.error} style={{ marginBottom: 8 }} />
                      <p style={{ margin: "0 0 4px", fontWeight: 800, color: T.text }}>Could not load voters</p>
                      <p style={{ margin: 0, color: T.muted, fontSize: 13 }}>{error}</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: "center" }}>
                    <div style={{
                      display: "inline-block", padding: "20px 28px", borderRadius: T.radius.lg,
                      border: `2px dashed ${T.border}`, background: T.surface,
                    }}>
                      <Users size={24} color={T.muted} style={{ marginBottom: 8 }} />
                      <p style={{ margin: "0 0 4px", fontWeight: 800, color: T.text }}>No voters match your filters</p>
                      <p style={{ margin: 0, color: T.muted, fontSize: 13 }}>Adjust filters or refresh once data is connected.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((v, idx) => (
                  <tr key={v.id} style={{
                    background: idx % 2 === 0 ? T.surface : T.surfaceAlt,
                    transition: T.transitionFast,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#F0F4FF"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? T.surface : T.surfaceAlt; }}
                  >
                    <td style={{ ...tdStyle, paddingLeft: 16 }}>
                      <input type="checkbox" checked={selectedIds.has(v.id)}
                        onChange={() => toggleSelect(v.id)} aria-label="Select voter"
                        style={{ width: 16, height: 16, accentColor: T.accent, cursor: "pointer" }} />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <AvatarCircle name={v.name} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text }}>{v.name}</div>
                          <div style={{ fontSize: 12, color: T.muted }}>{v.email}</div>
                          <div style={{ fontSize: 11, color: T.subtle }}>ID #{v.id} · {v.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <code style={{
                        background: T.surfaceAlt, padding: "2px 8px", borderRadius: T.radius.sm,
                        fontSize: 12, fontWeight: 600, color: T.textSecondary,
                        border: `1px solid ${T.borderLight}`,
                      }}>{v.citizenshipId}</code>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        <Badge label={v.approvalStatus} />
                        <Badge label={v.accountStatus} />
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        <Badge label={v.emailVerified ? "Verified" : "Unverified"} />
                        <Badge label={v.faceVerified ? "Verified" : "Unverified"} />
                      </div>
                    </td>
                    <td style={tdStyle}><Badge label={v.votingStatus} /></td>
                    <td style={{ ...tdStyle, fontSize: 13, color: T.textSecondary }}>{fmtDate(v.registeredAt)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <ActionMenu voterId={v.id} onAction={handleAction} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Premium pagination footer ────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 18px", borderTop: `1px solid ${T.borderLight}`,
          background: T.surfaceAlt, flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ color: T.muted, fontSize: 12.5, fontWeight: 700 }}>
            Showing {rangeStart}–{rangeEnd} of {total} voters
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.muted, fontSize: 12, fontWeight: 700 }}>
              Rows
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={{
                  border: `1.5px solid ${T.border}`, borderRadius: T.radius.sm,
                  background: T.surface, padding: "5px 8px", fontSize: 13,
                  fontWeight: 700, color: T.text, cursor: "pointer", outline: "none",
                }}>
                {[8, 12, 20, 40].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button disabled={currentPage === 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ ...pageBtnStyle, opacity: currentPage === 1 ? 0.4 : 1 }}>
              <ChevronLeft size={14} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {visiblePages.map((pageItem, idx) =>
                pageItem === "…" ? (
                  <span key={`dots-${idx}`} style={{ color: T.muted, fontWeight: 700, padding: "0 3px" }}>…</span>
                ) : (
                  <button key={pageItem} onClick={() => setPage(pageItem)} disabled={loading}
                    style={{
                      ...pageBtnStyle,
                      background: pageItem === currentPage ? T.accent : T.surface,
                      color: pageItem === currentPage ? "#fff" : T.text,
                      borderColor: pageItem === currentPage ? T.accent : T.border,
                    }}>{pageItem}</button>
                )
              )}
            </div>
            <button disabled={currentPage === totalPages || loading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ ...pageBtnStyle, opacity: currentPage === totalPages ? 0.4 : 1 }}>
              <ChevronRight size={14} />
            </button>
            <span style={{ fontWeight: 700, color: T.text, fontSize: 12.5 }}>
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>
      </div>

      {/* ── Detail panel ────────────────────────────────────── */}
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

      <ConfirmDialog dialog={dialog} onCancel={() => setDialog(null)} onConfirm={handleDialogConfirm}
        onReasonChange={handleDialogReason} onPhraseChange={handleDialogPhrase} />
      <ConfirmDialog dialog={bulkDialog} onCancel={() => setBulkDialog(null)} onConfirm={confirmBulkAction}
        onReasonChange={(value) => setBulkDialog((d) => (d ? { ...d, reason: value } : d))} />
      <ToastStack toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    </PageContainer>
  );
}

/* ── Shared table styles ─────────────────────────────────────── */
const thStyle = {
  background: T.surfaceAlt, color: T.muted, fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.05em", padding: "11px 16px",
  borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 5,
  whiteSpace: "nowrap",
};
const tdStyle = {
  padding: "14px 16px", borderBottom: `1px solid ${T.borderLight}`,
  fontSize: 13.5, verticalAlign: "middle", color: T.text,
};
const pageBtnStyle = {
  border: `1.5px solid ${T.border}`, background: T.surface,
  color: T.text, minWidth: 30, height: 30, borderRadius: T.radius.sm,
  fontSize: 13, fontWeight: 800, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  transition: T.transitionFast,
};
