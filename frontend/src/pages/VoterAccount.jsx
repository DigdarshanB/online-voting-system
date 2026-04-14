/**
 * VoterAccount.jsx
 *
 * Account Centre — enhanced with hero card, personal info grid,
 * security status pills, language toggle, and inline modals.
 * Phase 6 polish: larger hero, pulse animations, strength meter,
 * sliding lang toggle, Download My Data action, modal animations.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Download,
  Camera,
  Hash,
  LockKeyhole,
} from "lucide-react";
import { clearToken } from "../lib/authStorage";
import { fetchMe, changePassword, requestTotpRecovery, completeTotpRecovery } from "../features/auth/api/authApi";
import { extractError } from "../lib/token";
import { useLanguage } from "../lib/LanguageContext";
import {
  VoterPageContainer,
  VoterKeyframes,
  PortalHero,
  HeroChip,
  HERO_TINTS,
} from "../components/VoterUI";
import { VT } from "../lib/voterTokens";

const PALETTE = {
  navy: "#173B72",
  accentBlue: "#2F6FED",
  mutedText: "#64748B",
  surface: "#FFFFFF",
  success: "#0F9F6E",
  nepalRed: "#D42C3A",
  warning: "#F59E0B",
  lightBlueBg: "#EAF2FF",
  border: "#E2E8F0",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Helpers ────────────────────────────────────────────────── */

function maskCitizenship(cn) {
  if (!cn) return null;
  const s = String(cn).replace(/\s/g, "");
  if (s.length <= 4) return s;
  return "\u2022\u2022\u2022\u2022 " + s.slice(-4);
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
  if (s <= 1) return { label: "Weak", color: "#DC2626" };
  if (s <= 3) return { label: "Fair", color: PALETTE.warning };
  return { label: "Strong", color: PALETTE.success };
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════ */

function SectionHeading({ icon, text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingBottom: 14,
        marginBottom: 18,
        borderBottom: `1.5px solid ${PALETTE.border}`,
      }}
    >
      <div
        style={{
          width: 30, height: 30,
          borderRadius: 8,
          background: PALETTE.lightBlueBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {React.cloneElement(icon, { size: 15, color: PALETTE.accentBlue, strokeWidth: 2.2 })}
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 700,
          color: PALETTE.navy,
          letterSpacing: "-0.01em",
        }}
      >
        {text}
      </h3>
    </div>
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
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        background: hov ? "#F0F6FF" : "#F8FAFC",
        borderRadius: VT.radius.lg,
        border: `1.5px solid ${hov ? PALETTE.accentBlue + "40" : "#EEF2F8"}`,
        transition: "all 0.18s ease",
        transform: hov ? "translateY(-1px)" : "none",
        boxShadow: hov ? "0 4px 14px rgba(47,111,237,0.08)" : "none",
        minHeight: 68,
      }}
    >
      <div
        style={{
          width: 34, height: 34, borderRadius: 9,
          background: PALETTE.lightBlueBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 1,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10.5,
            color: PALETTE.mutedText,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: PALETTE.navy,
            wordBreak: "break-word",
            lineHeight: 1.35,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, ok, okText, notOkText }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: VT.radius.lg,
        background: ok ? "#F0FDF8" : "#FEF9F9",
        border: `1.5px solid ${ok ? "#A7F3D0" : "#FECACA"}`,
        flex: "1 1 200px",
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: ok ? "#D1FAE5" : "#FEE2E2",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {ok
          ? <BadgeCheck size={16} color={PALETTE.success} strokeWidth={2.2} />
          : <AlertCircle size={16} color={PALETTE.nepalRed} strokeWidth={2.2} />
        }
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.mutedText, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 1 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: ok ? PALETTE.success : PALETTE.nepalRed }}>
          {ok ? okText : notOkText}
        </div>
      </div>
    </div>
  );
}

/* Sliding language toggle */
function LangToggle({ language, onChange }) {
  const isNepali = language === "ne";
  return (
    <div
      onClick={() => onChange(isNepali ? "en" : "ne")}
      role="switch"
      aria-checked={isNepali}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(isNepali ? "en" : "ne"); } }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        padding: 3,
        borderRadius: 32,
        background: "#F1F5F9",
        border: `1.5px solid ${PALETTE.border}`,
        cursor: "pointer",
        position: "relative",
        width: 184,
        userSelect: "none",
        outline: "none",
      }}
    >
      {/* Thumb */}
      <span
        style={{
          position: "absolute",
          top: 3,
          left: isNepali ? "calc(50% + 3px)" : 3,
          width: "calc(50% - 6px)",
          bottom: 3,
          borderRadius: 28,
          background: PALETTE.navy,
          transition: "left 0.22s cubic-bezier(.4,0,.2,1)",
          zIndex: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          fontSize: 13,
          fontWeight: 700,
          color: !isNepali ? "#FFF" : PALETTE.mutedText,
          padding: "7px 0",
          transition: "color 0.22s ease",
        }}
      >
        English
      </span>
      <span
        style={{
          flex: 1,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          fontSize: 13,
          fontWeight: 700,
          color: isNepali ? "#FFF" : PALETTE.mutedText,
          padding: "7px 0",
          transition: "color 0.22s ease",
        }}
      >
        {"\u0928\u0947\u092a\u093e\u0932\u0940"}
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
        border: `1px solid ${hov ? PALETTE.accentBlue : PALETTE.border}`,
        borderLeft: hov ? `3px solid ${PALETTE.accentBlue}` : "3px solid transparent",
        background: PALETTE.surface,
        cursor: "pointer",
        transition: "all 0.18s ease",
        fontFamily: "inherit",
        textAlign: "left",
        width: "100%",
        boxShadow: hov ? "0 2px 12px rgba(47,111,237,0.08)" : "none",
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
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleBackdropClick = (e) => { if (e.target === backdropRef.current) onClose(); };

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
        animation: "vaFadeIn 0.15s ease",
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
          animation: "vaScaleIn 0.18s ease",
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

function StrengthBar({ password }) {
  const score = calcStrength(password);
  const { label, color } = strengthLabel(score);
  const pct = (score / 5) * 100;
  return (
    <div style={{ marginBottom: 14, marginTop: -6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: PALETTE.mutedText }}>Password strength</span>
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

function ChangePasswordModal({ onClose, navigate, t }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field, value) { setForm((prev) => ({ ...prev, [field]: value })); }
  function toggleShow(field) { setShow((prev) => ({ ...prev, [field]: !prev[field] })); }

  async function handleSubmit(evt) {
    evt.preventDefault();
    setError("");

    if (!form.currentPassword) { setError(t("cp.err.current_required")); return; }
    if (form.newPassword.length < 8) { setError(t("cp.err.min_length")); return; }
    if (form.newPassword !== form.confirmNewPassword) { setError(t("cp.err.mismatch")); return; }
    if (form.newPassword === form.currentPassword) { setError(t("cp.err.same")); return; }

    setLoading(true);
    try {
      await changePassword({
        current_password: form.currentPassword,
        new_password: form.newPassword,
        confirm_new_password: form.confirmNewPassword,
      });
      setSuccess(true);
      setTimeout(() => { clearToken(); navigate("/", { replace: true }); }, 3000);
    } catch (err) {
      setError(extractError(err, t("cp.err.generic")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalBackdrop onClose={success ? () => {} : onClose}>
      <div style={{ padding: "28px 28px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: PALETTE.lightBlueBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LockKeyhole size={18} color={PALETTE.accentBlue} />
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: PALETTE.navy }}>{t("cp.title")}</h2>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: PALETTE.mutedText, fontWeight: 500 }}>{t("cp.subtitle")}</p>

        {success ? (
          <div
            style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 12, padding: "18px 20px", color: "#166534", fontWeight: 700, fontSize: 14, lineHeight: 1.7, textAlign: "center" }}
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
              <div role="alert" style={{ padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                {error}
              </div>
            )}
            <PasswordField id="cpCurrent" label={t("cp.current")} placeholder={t("cp.current_placeholder")} value={form.currentPassword} onChange={(v) => update("currentPassword", v)} show={show.current} toggleShow={() => toggleShow("current")} autoComplete="current-password" autoFocus />
            <PasswordField id="cpNew" label={t("cp.new")} placeholder={t("cp.new_placeholder")} value={form.newPassword} onChange={(v) => update("newPassword", v)} show={show.new} toggleShow={() => toggleShow("new")} autoComplete="new-password" />
            {form.newPassword && <StrengthBar password={form.newPassword} />}
            <PasswordField id="cpConfirm" label={t("cp.confirm")} placeholder={t("cp.confirm_placeholder")} value={form.confirmNewPassword} onChange={(v) => update("confirmNewPassword", v)} show={show.confirm} toggleShow={() => toggleShow("confirm")} autoComplete="new-password" />

            <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderLeft: "4px solid #f59e0b", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#78350f", lineHeight: 1.55, marginBottom: 16 }}>
              {t("cp.warning")}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: PALETTE.navy, color: "#FFF", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}
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
    if (!EMAIL_REGEX.test(normalized)) { setError(t("totp.err.invalid_email")); return; }
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
    if (!EMAIL_REGEX.test(normalized)) { setError(t("totp.err.invalid_email")); return; }
    if (!code.trim()) { setError(t("totp.err.code_required")); return; }
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: PALETTE.lightBlueBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={18} color={PALETTE.accentBlue} />
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: PALETTE.navy }}>{t("totp.title")}</h2>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: PALETTE.mutedText, fontWeight: 500 }}>{t("totp.subtitle")}</p>

        {error && (
          <div role="alert" style={{ padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            {error}
          </div>
        )}
        {success && (
          <div role="status" style={{ padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #BBF7D0", color: "#166534", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleRequest} noValidate>
          <ModalField id="vtrEmail" label={t("totp.email_label")} type="email" value={email} onChange={setEmail} placeholder={t("totp.email_placeholder")} autoComplete="email" />
          <button
            type="submit"
            disabled={loadingRequest}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: PALETTE.navy, color: "#FFF", fontWeight: 700, fontSize: 14, cursor: loadingRequest ? "not-allowed" : "pointer", opacity: loadingRequest ? 0.7 : 1, fontFamily: "inherit", marginBottom: requested ? 14 : 0 }}
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
              style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: PALETTE.accentBlue, color: "#FFF", fontWeight: 700, fontSize: 14, cursor: loadingComplete ? "not-allowed" : "pointer", opacity: loadingComplete ? 0.7 : 1, fontFamily: "inherit" }}
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
          style={{ width: "100%", padding: "10px 42px 10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
        />
        <button
          type="button"
          onClick={toggleShow}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
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
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Toast
   ═══════════════════════════════════════════════════════════════ */

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        background: PALETTE.navy,
        color: "#FFF",
        padding: "12px 24px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        zIndex: 2000,
        animation: "vaFadeIn 0.2s ease",
      }}
    >
      {message}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Page: VoterAccount
   ═══════════════════════════════════════════════════════════════ */

export default function VoterAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeModal, setActiveModal] = useState(
    () => location.state?.openModal || null,
  );
  const [toast, setToast] = useState(null);

  /* Clear navigation state so a browser refresh won't reopen the modal */
  useEffect(() => {
    if (location.state?.openModal) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMe()
      .then((data) => setUser(data))
      .catch(() => setError(t("common.error")))
      .finally(() => setLoading(false));
  }, [t]);

  const closeModal = useCallback(() => setActiveModal(null), []);

  if (loading) {
    return (
      <VoterPageContainer>
        <VoterKeyframes />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="voter-skeleton" style={{ height: 140, borderRadius: VT.radius.xl }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="voter-skeleton" style={{ height: 68, borderRadius: VT.radius.lg }} />
            ))}
          </div>
        </div>
      </VoterPageContainer>
    );
  }

  if (error) {
    return (
      <VoterPageContainer>
        <VoterKeyframes />
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 20px",
            background: "#FEF2F2", borderRadius: VT.radius.lg,
            border: "1px solid #FECACA", color: "#DC2626", fontSize: 14, fontWeight: 500,
          }}
          role="alert"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      </VoterPageContainer>
    );
  }

  const initials = (user?.full_name || "V")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = user?.status === "ACTIVE";
  const maskedCitizenship = maskCitizenship(user?.citizenship_number);
  const lastLoginDisplay = user?.last_login_at
    ? new Date(user.last_login_at).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : t("common.not_available");

  return (
    <>
      <style>{`
        @keyframes vaFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vaScaleIn { from { transform: scale(0.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes vaDotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(15,159,110,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(15,159,110,0); }
        }
        @media (max-width: 640px) {
          .va-info-grid { grid-template-columns: 1fr !important; }
          .va-security-row { flex-direction: column !important; }
        }
      `}</style>

      <VoterPageContainer>
        <VoterKeyframes />

        {/* ── Hero ──────────────────────────────────────────────── */}
        <PortalHero
          eyebrow="Election Commission Nepal"
          title={`Welcome, ${user?.full_name?.split(" ")[0] || "Voter"}`}
          subtitle="Your secure voter profile, verification status, and account settings — all in one place."
          rightContent={
            <>
              <HeroChip
                label={isActive ? t("account.status_chip.active") : t("account.status_chip.inactive")}
                tint={isActive ? HERO_TINTS.success : { bg: "rgba(220,44,58,0.18)", text: "#FCA5A5", border: "rgba(220,44,58,0.35)" }}
              />
              <HeroChip label={t("account.role_voter")} tint={HERO_TINTS.default} />
              {user?.id && <HeroChip label={`ID #${user.id}`} tint={HERO_TINTS.default} />}
            </>
          }
        />

        {/* ── Account Overview / Profile identity card ──────────── */}
        <div
          style={{
            background: PALETTE.surface,
            border: `1.5px solid ${PALETTE.border}`,
            borderRadius: VT.radius.xl,
            padding: "24px 28px",
            boxShadow: VT.shadow.md,
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 68, height: 68, borderRadius: "50%",
                background: PALETTE.lightBlueBg,
                border: `2.5px solid ${PALETTE.accentBlue}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 24, color: PALETTE.accentBlue,
                letterSpacing: "-0.02em",
                boxShadow: "0 2px 12px rgba(47,111,237,0.15)",
              }}
            >
              {initials}
            </div>
            {isActive && (
              <span
                style={{
                  position: "absolute", bottom: 2, right: 2,
                  width: 14, height: 14, borderRadius: "50%",
                  background: PALETTE.success,
                  border: "2.5px solid #FFF",
                  animation: "vaDotPulse 2s ease-in-out infinite",
                }}
              />
            )}
          </div>

          {/* Identity */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: PALETTE.navy, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {user?.full_name || "Voter"}
            </div>
            <div style={{ fontSize: 13, color: PALETTE.mutedText, fontWeight: 500, marginTop: 3 }}>
              {user?.email}
            </div>
            {maskedCitizenship && (
              <div style={{ fontSize: 12, color: PALETTE.mutedText, fontWeight: 600, marginTop: 4, letterSpacing: "0.02em" }}>
                Citizenship: {maskedCitizenship}
              </div>
            )}
          </div>

          {/* Status chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", background: PALETTE.lightBlueBg, color: PALETTE.accentBlue }}>
              {t("account.role_voter")}
            </span>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", background: isActive ? "#D1FAE5" : "#FEE2E2", color: isActive ? PALETTE.success : PALETTE.nepalRed }}>
              {isActive ? t("account.status_chip.active") : t("account.status_chip.inactive")}
            </span>
          </div>
        </div>

        {/* ── Two-column layout for info + security ─────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 480px), 1fr))",
            gap: 24,
            marginBottom: 24,
            alignItems: "start",
          }}
        >
          {/* Personal Information card */}
          <div
            style={{
              background: PALETTE.surface,
              border: `1.5px solid ${PALETTE.border}`,
              borderRadius: VT.radius.xl,
              padding: "22px 24px 24px",
              boxShadow: VT.shadow.sm,
            }}
          >
            <SectionHeading icon={<UserCircle2 />} text={t("account.personal_info")} />
            <div
              className="va-info-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <InfoTile label={t("account.label.full_name")} value={user?.full_name || t("common.not_available")} icon={<UserCircle2 size={16} color={PALETTE.accentBlue} />} />
              <InfoTile label={t("account.label.email")} value={user?.email || t("common.not_available")} icon={<Mail size={16} color={PALETTE.accentBlue} />} />
              <InfoTile label={t("account.label.citizenship")} value={maskedCitizenship || t("common.not_available")} icon={<CreditCard size={16} color={PALETTE.accentBlue} />} />
              <InfoTile label={t("account.label.phone")} value={user?.phone_number || t("common.not_available")} icon={<Phone size={16} color={PALETTE.accentBlue} />} />
              <InfoTile label={t("account.label.member_since")} value={user?.member_since || t("common.not_available")} icon={<Calendar size={16} color={PALETTE.accentBlue} />} />
              <InfoTile label={t("account.label.last_login")} value={lastLoginDisplay} icon={<Clock size={16} color={PALETTE.accentBlue} />} />
              <InfoTile
                label="Face ID"
                value={user?.face_uploaded ? "Uploaded ✓" : "Pending upload"}
                icon={<Camera size={16} color={user?.face_uploaded ? PALETTE.success : PALETTE.warning} />}
              />
            </div>
          </div>

          {/* Security & Verification card */}
          <div
            style={{
              background: PALETTE.surface,
              border: `1.5px solid ${PALETTE.border}`,
              borderRadius: VT.radius.xl,
              padding: "22px 24px 24px",
              boxShadow: VT.shadow.sm,
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            <SectionHeading icon={<ShieldCheck />} text={t("account.label.status")} />
            <div className="va-security-row" style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
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

            {/* Language */}
            <SectionHeading icon={<Globe />} text={t("account.language")} />
            <div style={{ marginBottom: 6 }}>
              <LangToggle language={language} onChange={setLanguage} />
              <p style={{ fontSize: 12, color: PALETTE.mutedText, marginTop: 10, marginBottom: 0, lineHeight: 1.5, fontWeight: 500 }}>
                Select your preferred display language for the voter portal.
              </p>
            </div>
          </div>
        </div>

        {/* ── Security Actions card ─────────────────────────────── */}
        <div
          style={{
            background: PALETTE.surface,
            border: `1.5px solid ${PALETTE.border}`,
            borderRadius: VT.radius.xl,
            padding: "22px 24px 24px",
            boxShadow: VT.shadow.sm,
            marginBottom: 8,
          }}
        >
          <SectionHeading icon={<KeyRound />} text={t("account.security")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
            <ActionTile
              icon={<Download size={18} color={PALETTE.accentBlue} />}
              label="Download My Data"
              description="Export a copy of your account information and voting history"
              onClick={() => setToast("Coming Soon — this feature is under development.")}
            />
          </div>
        </div>
      </VoterPageContainer>

      {/* ── Modals ────────────────────────────────────────── */}
      {activeModal === "change-password" && (
        <ChangePasswordModal onClose={closeModal} navigate={navigate} t={t} />
      )}
      {activeModal === "totp-recovery" && (
        <TotpRecoveryModal onClose={closeModal} navigate={navigate} userEmail={user?.email || ""} t={t} />
      )}

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
