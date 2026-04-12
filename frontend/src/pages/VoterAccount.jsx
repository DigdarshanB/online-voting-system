/**
 * VoterAccount.jsx
 *
 * Account Centre page — redesigned with hero card, personal info grid,
 * security status pills, language toggle, and inline modals for
 * Change Password and TOTP Recovery.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCircle2,
  ShieldCheck,
  KeyRound,
  Mail,
  BadgeCheck,
  Smartphone,
  AlertCircle,
  ChevronRight,
  Phone,
  CreditCard,
  Calendar,
  Clock,
  X,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import { clearToken } from "../lib/authStorage";
import { fetchMe, changePassword, requestTotpRecovery, completeTotpRecovery } from "../features/auth/api/authApi";
import { extractError } from "../lib/token";
import { useLanguage } from "../lib/LanguageContext";

const PALETTE = {
  navy: "#173B72",
  accentBlue: "#2F6FED",
  mutedText: "#64748B",
  surface: "#FFFFFF",
  success: "#0F9F6E",
  nepalRed: "#D42C3A",
  warning: "#F59E0B",
  lightBlueBg: "#EAF2FF",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VoterAccount() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // "change-password" | "totp-recovery" | null

  useEffect(() => {
    fetchMe()
      .then((data) => setUser(data))
      .catch(() => setError(t("common.error")))
      .finally(() => setLoading(false));
  }, [t]);

  const closeModal = useCallback(() => setActiveModal(null), []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: PALETTE.mutedText, fontSize: 15, fontWeight: 500 }}>
        {t("common.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "32px", maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            background: "#FEF2F2",
            borderRadius: 10,
            border: "1px solid #FECACA",
            color: "#DC2626",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      </div>
    );
  }

  const initials = (user?.full_name || "V")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = user?.status === "ACTIVE";
  const lastLoginDisplay = user?.last_login_at
    ? new Date(user.last_login_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("common.not_available");

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 760, margin: "0 auto" }}>
      {/* ── Profile Hero Card ──────────────────────────────── */}
      <div
        style={{
          background: PALETTE.surface,
          borderRadius: 16,
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        {/* Gradient strip */}
        <div
          style={{
            height: 80,
            background: `linear-gradient(135deg, ${PALETTE.navy} 0%, ${PALETTE.accentBlue} 100%)`,
          }}
        />
        <div style={{ padding: "0 28px 24px", position: "relative" }}>
          {/* Avatar circle */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: PALETTE.lightBlueBg,
              border: "3px solid #FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              top: -28,
              marginBottom: -16,
              fontWeight: 800,
              fontSize: 20,
              color: PALETTE.accentBlue,
              letterSpacing: "-0.02em",
            }}
          >
            {initials}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: PALETTE.navy, letterSpacing: "-0.02em" }}>
              {user?.full_name || "Voter"}
            </h2>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                background: PALETTE.lightBlueBg,
                color: PALETTE.accentBlue,
              }}
            >
              {t("account.role_voter")}
            </span>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                background: isActive ? "#EAFBF4" : "#FEF2F2",
                color: isActive ? PALETTE.success : PALETTE.nepalRed,
              }}
            >
              {isActive ? t("account.status_chip.active") : t("account.status_chip.inactive")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Personal Information ───────────────────────────── */}
      <SectionHeading icon={<UserCircle2 size={16} />} text={t("account.personal_info")} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <InfoTile label={t("account.label.full_name")} value={user?.full_name || t("common.not_available")} icon={<UserCircle2 size={15} color={PALETTE.accentBlue} />} />
        <InfoTile label={t("account.label.email")} value={user?.email || t("common.not_available")} icon={<Mail size={15} color={PALETTE.accentBlue} />} />
        <InfoTile label={t("account.label.citizenship")} value={user?.citizenship_number || t("common.not_available")} icon={<CreditCard size={15} color={PALETTE.accentBlue} />} />
        <InfoTile label={t("account.label.phone")} value={user?.phone_number || t("common.not_available")} icon={<Phone size={15} color={PALETTE.accentBlue} />} />
        <InfoTile label={t("account.label.member_since")} value={user?.member_since || t("common.not_available")} icon={<Calendar size={15} color={PALETTE.accentBlue} />} />
        <InfoTile label={t("account.label.last_login")} value={lastLoginDisplay} icon={<Clock size={15} color={PALETTE.accentBlue} />} />
      </div>

      {/* ── Account Security Status ───────────────────────── */}
      <SectionHeading icon={<ShieldCheck size={16} />} text={t("account.label.status")} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <StatusPill
          label={t("account.label.email_verified")}
          ok={user?.email_verified}
          okText={t("account.status.verified")}
          notOkText={t("account.status.unverified")}
        />
        <StatusPill
          label={t("account.label.2fa")}
          ok={user?.totp_enabled}
          okText={t("account.status.enabled")}
          notOkText={t("account.status.not_setup")}
        />
      </div>

      {/* ── Language ──────────────────────────────────────── */}
      <SectionHeading icon={<Globe size={16} />} text={t("account.language")} />
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <LangButton active={language === "en"} onClick={() => setLanguage("en")} label={t("lang.english")} />
        <LangButton active={language === "ne"} onClick={() => setLanguage("ne")} label={t("lang.nepali")} />
      </div>

      {/* ── Security & Actions ────────────────────────────── */}
      <SectionHeading icon={<KeyRound size={16} />} text={t("account.security")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ActionTile
          icon={<KeyRound size={18} color={PALETTE.accentBlue} />}
          label={t("account.change_password")}
          description={t("account.change_password_desc")}
          onClick={() => setActiveModal("change-password")}
        />
        <ActionTile
          icon={<Smartphone size={18} color={PALETTE.accentBlue} />}
          label={t("account.totp_recovery")}
          description={t("account.totp_recovery_desc")}
          onClick={() => setActiveModal("totp-recovery")}
        />
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      {activeModal === "change-password" && (
        <ChangePasswordModal onClose={closeModal} navigate={navigate} t={t} />
      )}
      {activeModal === "totp-recovery" && (
        <TotpRecoveryModal onClose={closeModal} navigate={navigate} userEmail={user?.email || ""} t={t} />
      )}
    </div>
  );
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
        color: PALETTE.navy,
        marginBottom: 10,
        letterSpacing: "-0.01em",
      }}
    >
      {icon}
      {text}
    </h3>
  );
}

function InfoTile({ label, value, icon }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "#F8FAFC",
        borderRadius: 10,
        border: "1px solid #F1F5F9",
      }}
    >
      {icon}
      <div>
        <div
          style={{
            fontSize: 10.5,
            color: PALETTE.mutedText,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: PALETTE.navy, marginTop: 1, wordBreak: "break-word" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, ok, okText, notOkText }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 20,
        fontSize: 12.5,
        fontWeight: 700,
        background: ok ? "#EAFBF4" : "#FEF2F2",
        color: ok ? PALETTE.success : PALETTE.nepalRed,
        border: ok ? "1px solid #BBF7D0" : "1px solid #FECACA",
      }}
    >
      {ok ? "✓" : "!"} {label}: {ok ? okText : notOkText}
    </span>
  );
}

function LangButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 24px",
        borderRadius: 10,
        border: active ? `2px solid ${PALETTE.navy}` : "2px solid #E2E8F0",
        background: active ? PALETTE.navy : PALETTE.surface,
        color: active ? "#FFF" : PALETTE.mutedText,
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function ActionTile({ icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        background: PALETTE.surface,
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "inherit",
        textAlign: "left",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = PALETTE.accentBlue;
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(47,111,237,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E2E8F0";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: PALETTE.lightBlueBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: PALETTE.navy }}>{label}</div>
        <div style={{ fontSize: 12, color: PALETTE.mutedText, fontWeight: 500, marginTop: 1 }}>{description}</div>
      </div>
      <ChevronRight size={18} color={PALETTE.mutedText} style={{ flexShrink: 0 }} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Modal Wrapper
   ═══════════════════════════════════════════════════════════════ */

function ModalBackdrop({ children, onClose }) {
  const backdropRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#FFF",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
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
          <X size={16} color={PALETTE.mutedText} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Change Password Modal
   ═══════════════════════════════════════════════════════════════ */

function ChangePasswordModal({ onClose, navigate, t }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleShow(field) {
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    setError("");

    if (!form.currentPassword) {
      setError(t("cp.err.current_required"));
      return;
    }
    if (form.newPassword.length < 8) {
      setError(t("cp.err.min_length"));
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError(t("cp.err.mismatch"));
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setError(t("cp.err.same"));
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        current_password: form.currentPassword,
        new_password: form.newPassword,
        confirm_new_password: form.confirmNewPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        clearToken();
        navigate("/", { replace: true });
      }, 3000);
    } catch (err) {
      setError(extractError(err, t("cp.err.generic")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalBackdrop onClose={success ? () => {} : onClose}>
      <div style={{ padding: "28px 28px 24px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: PALETTE.navy }}>{t("cp.title")}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: PALETTE.mutedText, fontWeight: 500 }}>{t("cp.subtitle")}</p>

        {success ? (
          <div
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
            role="status"
          >
            <div style={{ fontSize: 26, marginBottom: 8 }}>&#10003;</div>
            {t("cp.success")}
            <br />
            <span style={{ fontWeight: 400, fontSize: 13, color: "#15803d" }}>{t("cp.success_sub")}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#DC2626",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}
            <PasswordField id="cpCurrent" label={t("cp.current")} placeholder={t("cp.current_placeholder")} value={form.currentPassword} onChange={(v) => update("currentPassword", v)} show={show.current} toggleShow={() => toggleShow("current")} autoComplete="current-password" autoFocus />
            <PasswordField id="cpNew" label={t("cp.new")} placeholder={t("cp.new_placeholder")} value={form.newPassword} onChange={(v) => update("newPassword", v)} show={show.new} toggleShow={() => toggleShow("new")} autoComplete="new-password" />
            <PasswordField id="cpConfirm" label={t("cp.confirm")} placeholder={t("cp.confirm_placeholder")} value={form.confirmNewPassword} onChange={(v) => update("confirmNewPassword", v)} show={show.confirm} toggleShow={() => toggleShow("confirm")} autoComplete="new-password" />

            <div
              style={{
                background: "#fffbeb",
                border: "1.5px solid #fde68a",
                borderLeft: "4px solid #f59e0b",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "#78350f",
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              {t("cp.warning")}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: PALETTE.navy,
                color: "#FFF",
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                fontFamily: "inherit",
              }}
            >
              {loading ? t("cp.saving") : t("cp.submit")}
            </button>
          </form>
        )}
      </div>
    </ModalBackdrop>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOTP Recovery Modal
   ═══════════════════════════════════════════════════════════════ */

function TotpRecoveryModal({ onClose, navigate, userEmail, t }) {
  const [email, setEmail] = useState(userEmail);
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRequest(evt) {
    evt.preventDefault();
    setError("");
    setSuccess("");

    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      setError(t("totp.err.invalid_email"));
      return;
    }

    setLoadingRequest(true);
    try {
      await requestTotpRecovery(normalized);
      setRequested(true);
      setSuccess(t("totp.sent_success"));
    } catch {
      setRequested(true);
      setSuccess(t("totp.sent_success"));
    } finally {
      setLoadingRequest(false);
    }
  }

  async function handleComplete(evt) {
    evt.preventDefault();
    setError("");
    setSuccess("");

    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      setError(t("totp.err.invalid_email"));
      return;
    }
    if (!code.trim()) {
      setError(t("totp.err.code_required"));
      return;
    }

    setLoadingComplete(true);
    try {
      const data = await completeTotpRecovery(normalized, code.trim());
      setSuccess(data?.detail || "TOTP reset completed.");
      setTimeout(() => navigate("/", { replace: true }), 3000);
    } catch (err) {
      setError(extractError(err, t("totp.err.generic")));
    } finally {
      setLoadingComplete(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ padding: "28px 28px 24px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: PALETTE.navy }}>{t("totp.title")}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: PALETTE.mutedText, fontWeight: 500 }}>{t("totp.subtitle")}</p>

        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#DC2626",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#f0fdf4",
              border: "1px solid #BBF7D0",
              color: "#166534",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleRequest} noValidate>
          <ModalField id="vtrEmail" label={t("totp.email_label")} type="email" value={email} onChange={setEmail} placeholder={t("totp.email_placeholder")} autoComplete="email" />
          <button
            type="submit"
            disabled={loadingRequest}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: PALETTE.navy,
              color: "#FFF",
              fontWeight: 700,
              fontSize: 14,
              cursor: loadingRequest ? "not-allowed" : "pointer",
              opacity: loadingRequest ? 0.7 : 1,
              fontFamily: "inherit",
              marginBottom: requested ? 14 : 0,
            }}
          >
            {loadingRequest ? t("totp.sending") : t("totp.send")}
          </button>
        </form>

        {requested && (
          <form onSubmit={handleComplete} noValidate>
            <ModalField
              id="vtrCode"
              label={t("totp.code_label")}
              type="text"
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("totp.code_placeholder")}
              inputMode="numeric"
              maxLength={6}
            />
            <button
              type="submit"
              disabled={loadingComplete}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: PALETTE.accentBlue,
                color: "#FFF",
                fontWeight: 700,
                fontSize: 14,
                cursor: loadingComplete ? "not-allowed" : "pointer",
                opacity: loadingComplete ? 0.7 : 1,
                fontFamily: "inherit",
              }}
            >
              {loadingComplete ? t("totp.verifying") : t("totp.complete")}
            </button>
          </form>
        )}
      </div>
    </ModalBackdrop>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Shared form helpers
   ═══════════════════════════════════════════════════════════════ */

function PasswordField({ id, label, placeholder, value, onChange, show, toggleShow, autoComplete, autoFocus }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: PALETTE.navy, marginBottom: 5 }}>
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
            border: "1.5px solid #E2E8F0",
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
          }}
        >
          {show ? <EyeOff size={16} color={PALETTE.mutedText} /> : <Eye size={16} color={PALETTE.mutedText} />}
        </button>
      </div>
    </div>
  );
}

function ModalField({ id, label, type, value, onChange, placeholder, autoComplete, inputMode, maxLength }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: PALETTE.navy, marginBottom: 5 }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1.5px solid #E2E8F0",
          fontSize: 14,
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
