/**
 * AccountCenterPage — Manage profile, security, and sessions.
 * Wired to live /auth/me API with inline change-password modal.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  LockKeyhole,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  Clock,
  UserCircle2,
  KeyRound,
  AlertCircle,
  Activity,
  Eye,
  EyeOff,
  ChevronRight,
  X,
  BadgeCheck,
  Hash,
} from "lucide-react";
import { isMfaVerified, clearToken, clearMfaVerified } from "../lib/auth";
import { getMe } from "../features/admin-management/api/adminManagementApi";
import apiClient from "../lib/apiClient";

const P = {
  primary: "#173B72",
  accent: "#2F6FED",
  success: "#0F9F6E",
  successBg: "#EAFBF4",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  warning: "#F59E0B",
  warningBg: "#FFFBEB",
  border: "#DCE3EC",
  textMain: "#0F172A",
  textMuted: "#64748B",
  surface: "#FFFFFF",
  bg: "#F5F7FB",
  lightBlue: "#EAF2FF",
};

/* ── Helpers ─────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRole(role) {
  if (!role) return "Admin";
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColors(status) {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE") return { bg: "#EAFBF4", color: P.success, border: "#BBF7D0" };
  if (s === "PENDING") return { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" };
  return { bg: P.dangerBg, color: P.danger, border: "#FECACA" };
}

function calcStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
function strengthLabel(s) {
  if (s <= 1) return { label: "Weak", color: P.danger };
  if (s <= 3) return { label: "Fair", color: P.warning };
  return { label: "Strong", color: P.success };
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════ */

function SectionHeading({ icon, text }) {
  return (
    <h3
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 14,
        fontWeight: 700,
        color: P.primary,
        marginBottom: 12,
        letterSpacing: "-0.01em",
      }}
    >
      {icon}
      {text}
    </h3>
  );
}

function InfoTile({ label, value, icon }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        background: P.surface,
        borderRadius: 10,
        border: `1px solid ${hov ? P.accent : P.border}`,
        borderLeft: `3px solid ${hov ? P.accent : P.border}`,
        transition: "all 0.18s ease",
        transform: hov ? "translateY(-1px)" : "none",
        boxShadow: hov
          ? "0 4px 14px rgba(47,111,237,0.08)"
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ flexShrink: 0, display: "flex" }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10.5,
            color: P.textMuted,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: P.textMain,
            wordBreak: "break-word",
          }}
        >
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

function StatusPillRow({ label, ok, okText, notOkText, isWarn, warnText }) {
  let bg, color, border, prefix;
  if (ok) {
    bg = "#EAFBF4"; color = P.success; border = "#BBF7D0"; prefix = "✓";
  } else if (isWarn) {
    bg = P.warningBg; color = "#B45309"; border = "#FDE68A"; prefix = "!";
  } else {
    bg = P.dangerBg; color = P.danger; border = "#FECACA"; prefix = "!";
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ minWidth: 160, fontSize: 13, fontWeight: 600, color: P.textMuted }}>{label}</span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 14px",
          borderRadius: 20,
          fontSize: 12.5,
          fontWeight: 700,
          background: bg,
          color,
          border: `1px solid ${border}`,
        }}
      >
        {prefix} {ok ? okText : isWarn ? warnText : notOkText}
      </span>
    </div>
  );
}

function ActionTile({ icon, label, description, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderRadius: 12,
        border: `1px solid ${hov ? P.accent : P.border}`,
        borderLeft: hov ? `3px solid ${P.accent}` : "3px solid transparent",
        background: P.surface,
        cursor: "pointer",
        transition: "all 0.18s ease",
        fontFamily: "inherit",
        textAlign: "left",
        width: "100%",
        boxShadow: hov
          ? "0 2px 12px rgba(47,111,237,0.08)"
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: P.lightBlue,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: P.primary }}>{label}</div>
        <div style={{ fontSize: 12, color: P.textMuted, fontWeight: 500, marginTop: 1 }}>{description}</div>
      </div>
      <ChevronRight size={18} color={P.textMuted} style={{ flexShrink: 0 }} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Modal plumbing
   ═══════════════════════════════════════════════════════════════ */

function ModalBackdrop({ children, onClose }) {
  const backdropRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
        animation: "acFadeIn 0.15s ease",
      }}
    >
      <div
        style={{
          background: P.surface,
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          animation: "acScaleIn 0.18s ease",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: "#F1F5F9",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <X size={16} color={P.textMuted} />
        </button>
        {children}
      </div>
    </div>
  );
}

function PasswordField({ id, label, placeholder, value, onChange, show, toggleShow, autoComplete, autoFocus }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: P.primary, marginBottom: 5 }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          style={{
            width: "100%",
            padding: "10px 42px 10px 12px",
            borderRadius: 8,
            border: `1.5px solid ${P.border}`,
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={toggleShow}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            color: P.textMuted,
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function StrengthBar({ password }) {
  const score = calcStrength(password);
  const { label, color } = strengthLabel(score);
  const pct = (score / 5) * 100;
  return (
    <div style={{ marginBottom: 14, marginTop: -6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: P.textMuted }}>Password strength</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "#E2E8F0", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 2,
            transition: "width 0.3s ease, background 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Change Password Modal
   ═══════════════════════════════════════════════════════════════ */

function ChangePasswordModal({ onClose, navigate }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field, value) { setForm((p) => ({ ...p, [field]: value })); }
  function toggleShow(field) { setShow((p) => ({ ...p, [field]: !p[field] })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.currentPassword) { setError("Please enter your current password."); return; }
    if (form.newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (form.newPassword !== form.confirmNewPassword) { setError("New passwords do not match."); return; }
    if (form.newPassword === form.currentPassword) { setError("New password must differ from the current password."); return; }

    setLoading(true);
    try {
      await apiClient.post("/auth/change-password", {
        current_password: form.currentPassword,
        new_password: form.newPassword,
        confirm_new_password: form.confirmNewPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        clearToken();
        clearMfaVerified();
        navigate("/", { replace: true });
      }, 3000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalBackdrop onClose={success ? () => {} : onClose}>
      <div style={{ padding: "28px 28px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: P.lightBlue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LockKeyhole size={18} color={P.accent} />
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: P.primary }}>
            Change Password
          </h2>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: P.textMuted, fontWeight: 500 }}>
          Update your administrator password. You will be signed out immediately.
        </p>

        {success ? (
          <div
            role="status"
            style={{
              background: "#f0fdf4",
              border: "2px solid #86efac",
              borderRadius: 12,
              padding: "18px 20px",
              color: "#166534",
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.7,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 8 }}>&#10003;</div>
            Password changed successfully.
            <br />
            <span style={{ fontWeight: 400, fontSize: 13, color: "#15803d" }}>
              Signing you out in 3 seconds…
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: P.dangerBg,
                  border: "1px solid #FECACA",
                  color: P.danger,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}
            <PasswordField
              id="acpCurrent"
              label="Current Password"
              placeholder="Enter current password"
              value={form.currentPassword}
              onChange={(v) => update("currentPassword", v)}
              show={show.current}
              toggleShow={() => toggleShow("current")}
              autoComplete="current-password"
              autoFocus
            />
            <PasswordField
              id="acpNew"
              label="New Password"
              placeholder="At least 8 characters"
              value={form.newPassword}
              onChange={(v) => update("newPassword", v)}
              show={show.new}
              toggleShow={() => toggleShow("new")}
              autoComplete="new-password"
            />
            {form.newPassword && <StrengthBar password={form.newPassword} />}
            <PasswordField
              id="acpConfirm"
              label="Confirm New Password"
              placeholder="Repeat new password"
              value={form.confirmNewPassword}
              onChange={(v) => update("confirmNewPassword", v)}
              show={show.confirm}
              toggleShow={() => toggleShow("confirm")}
              autoComplete="new-password"
            />
            <div
              style={{
                background: P.warningBg,
                border: "1.5px solid #FDE68A",
                borderLeft: `4px solid ${P.warning}`,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "#78350F",
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              Changing your password will terminate this session immediately.
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: P.primary,
                color: "#FFF",
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                fontFamily: "inherit",
              }}
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </ModalBackdrop>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════ */

export default function AccountCenterPage() {
  const navigate = useNavigate();
  const mfaOk = isMfaVerified();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => { if (!cancelled) { setUser(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setLoadError("Failed to load account data. Please try again."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [retryKey]);

  const closeModal = useCallback(() => setActiveModal(null), []);

  /* Loading skeleton */
  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }} role="status">
        <div
          style={{
            height: 100,
            borderRadius: 16,
            background: "linear-gradient(135deg, #173B72 0%, #2F6FED 100%)",
            marginBottom: 48,
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 64,
                borderRadius: 10,
                background: "#F1F5F9",
                animation: "acPulse 1.4s ease-in-out infinite alternate",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* Error state */
  if (loadError) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            background: P.dangerBg,
            borderRadius: 10,
            border: "1px solid #FECACA",
            color: P.danger,
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 16,
          }}
        >
          <AlertCircle size={18} />
          {loadError}
        </div>
        <button
          onClick={() => { setLoadError(null); setLoading(true); setRetryKey((k) => k + 1); }}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: P.primary,
            color: "#FFF",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const initials = (user?.full_name || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sCols = statusColors(user?.status);
  const approvedSince = user?.approved_at
    ? `Administrator since ${fmtDate(user.approved_at)}`
    : null;

  return (
    <>
      <style>{`
        @keyframes acFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes acScaleIn { from { transform: scale(0.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes acPulse { from { opacity: 0.6 } to { opacity: 1 } }
        @media (max-width: 700px) {
          .ac-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 64px" }}>

        {/* ── Profile Hero ───────────────────────────────────── */}
        <div
          style={{
            background: P.surface,
            borderRadius: 16,
            border: `1px solid ${P.border}`,
            overflow: "hidden",
            marginBottom: 32,
            boxShadow: "0 4px 24px rgba(23,59,114,0.12)",
          }}
        >
          {/* Gradient banner */}
          <div
            style={{
              height: 100,
              background: "linear-gradient(135deg, #173B72 0%, #2F6FED 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Diagonal texture overlay */}
            <svg
              width="100%"
              height="100%"
              style={{ position: "absolute", inset: 0, opacity: 0.06 }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="diag" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="16" stroke="#fff" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#diag)" />
            </svg>
          </div>

          <div style={{ padding: "0 32px 28px", position: "relative" }}>
            {/* Avatar overlapping banner */}
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: P.lightBlue,
                border: "4px solid #FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                top: -48,
                marginBottom: -28,
                fontWeight: 800,
                fontSize: 32,
                color: P.accent,
                letterSpacing: "-0.02em",
                boxShadow: "0 4px 20px rgba(23,59,114,0.18)",
              }}
            >
              {initials}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  color: P.primary,
                  letterSpacing: "-0.02em",
                }}
              >
                {user?.full_name || "Administrator"}
              </h2>
              {/* Role badge */}
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  background: P.lightBlue,
                  color: P.accent,
                }}
              >
                {formatRole(user?.role)}
              </span>
              {/* Status badge */}
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  background: sCols.bg,
                  color: sCols.color,
                  border: `1px solid ${sCols.border}`,
                }}
              >
                {(user?.status || "UNKNOWN").charAt(0) + (user?.status || "").slice(1).toLowerCase()}
              </span>
            </div>

            {approvedSince && (
              <div style={{ fontSize: 12.5, color: P.textMuted, fontWeight: 500, marginTop: 4 }}>
                {approvedSince}
              </div>
            )}
          </div>
        </div>

        {/* ── Two-column grid ────────────────────────────────── */}
        <div
          className="ac-two-col"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {/* ── Left: Account Details ─────────────────────── */}
          <section>
            <SectionHeading icon={<UserCircle2 size={16} />} text="Account Details" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <InfoTile
                label="Admin ID"
                value={user?.id ? `#${user.id}` : "—"}
                icon={<Hash size={16} color={P.accent} />}
              />
              <InfoTile
                label="Full Name"
                value={user?.full_name}
                icon={<UserCircle2 size={16} color={P.accent} />}
              />
              <InfoTile
                label="Email Address"
                value={user?.email}
                icon={<Mail size={16} color={P.accent} />}
              />
              <InfoTile
                label="Phone Number"
                value={user?.phone_number}
                icon={<Phone size={16} color={P.accent} />}
              />
              <InfoTile
                label="Citizenship Number"
                value={user?.citizenship_number}
                icon={<CreditCard size={16} color={P.accent} />}
              />
              <InfoTile
                label="Member Since"
                value={fmtDate(user?.member_since)}
                icon={<Calendar size={16} color={P.accent} />}
              />
              <InfoTile
                label="Approved At"
                value={fmtDate(user?.approved_at)}
                icon={<BadgeCheck size={16} color={P.accent} />}
              />
            </div>
          </section>

          {/* ── Right: Security & Access ──────────────────── */}
          <section>
            <SectionHeading icon={<ShieldCheck size={16} />} text="Security & Access" />
            <div
              style={{
                background: P.surface,
                borderRadius: 14,
                border: `1px solid ${P.border}`,
                padding: "20px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                marginBottom: 24,
              }}
            >
              <StatusPillRow
                label="Email Verified"
                ok={user?.email_verified}
                okText="Verified"
                notOkText="Not Verified"
              />
              <StatusPillRow
                label="Two-Factor Auth"
                ok={user?.totp_enabled}
                okText="Enabled"
                notOkText="Not Configured"
                isWarn={!user?.totp_enabled}
                warnText="Not Configured"
              />
              <StatusPillRow
                label="MFA Session"
                ok={mfaOk}
                okText="Verified this session"
                notOkText="Session not verified"
              />
              <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ minWidth: 160, fontSize: 13, fontWeight: 600, color: P.textMuted }}>
                    Last Login
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: P.textMain }}>
                    {fmtDateTime(user?.last_login_at)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ minWidth: 160, fontSize: 13, fontWeight: 600, color: P.textMuted }}>
                    Account Status
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 14px",
                      borderRadius: 20,
                      fontSize: 12.5,
                      fontWeight: 700,
                      background: sCols.bg,
                      color: sCols.color,
                      border: `1px solid ${sCols.border}`,
                    }}
                  >
                    {user?.status || "—"}
                  </span>
                </div>
              </div>
            </div>

            <SectionHeading icon={<KeyRound size={16} />} text="Security Actions" />
            <ActionTile
              icon={<LockKeyhole size={18} color={P.accent} />}
              label="Change Password"
              description="Update your login credential. Session will end immediately."
              onClick={() => setActiveModal("change-password")}
            />
          </section>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {activeModal === "change-password" && (
        <ChangePasswordModal onClose={closeModal} navigate={navigate} />
      )}
    </>
  );
}
