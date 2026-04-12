/**
 * ToastContext.jsx — Global toast notification system.
 *
 * Usage:
 *   Wrap your app in <ToastProvider> (in main.jsx).
 *   const toast = useToast();
 *   toast.success("Saved!"); toast.error("Oops"); toast.info("FYI");
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { T } from "./tokens";
import { createPortal } from "react-dom";

const ToastCtx = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle, border: T.success, bg: T.successBg, color: T.success },
  error:   { icon: XCircle,    border: T.error,   bg: T.errorBg,   color: T.error },
  info:    { icon: Info,        border: T.accent,  bg: T.accentLight,color: T.accent },
};

const DURATION = 4000;

function ToastCard({ toast: t, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const v = VARIANTS[t.variant] || VARIANTS.info;
  const Icon = v.icon;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(t.id), 200);
  }, [t.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(), DURATION);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <div
      role="status"
      aria-atomic="true"
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        width: 340, padding: "12px 16px",
        background: T.surface,
        borderRadius: T.radius.lg,
        boxShadow: T.shadow.xl,
        borderLeft: `4px solid ${v.border}`,
        position: "relative",
        overflow: "hidden",
        animation: exiting
          ? "toastExit 200ms ease-in forwards"
          : "toastEnter 300ms ease-out forwards",
      }}
    >
      <Icon size={18} color={v.color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.45 }}>
        {t.message}
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 2,
          flexShrink: 0, display: "flex",
        }}
      >
        <X size={14} color={T.muted} />
      </button>
      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        background: v.border, opacity: 0.35,
        animation: `toastProgress ${DURATION}ms linear forwards`,
      }} />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, variant) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const api = useRef({
    success: (msg) => push(msg, "success"),
    error:   (msg) => push(msg, "error"),
    info:    (msg) => push(msg, "info"),
  });

  return (
    <ToastCtx.Provider value={api.current}>
      {children}
      {createPortal(
        <>
          <div style={{
            position: "fixed", bottom: 24, right: 24,
            display: "flex", flexDirection: "column-reverse", gap: 8,
            zIndex: 9999, pointerEvents: "none",
          }}>
            {toasts.map(t => (
              <div key={t.id} style={{ pointerEvents: "auto" }}>
                <ToastCard toast={t} onDismiss={dismiss} />
              </div>
            ))}
          </div>
          <style>{`
            @keyframes toastEnter {
              from { transform: translateX(120%); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
            @keyframes toastExit {
              from { transform: translateX(0);    opacity: 1; }
              to   { transform: translateX(120%); opacity: 0; }
            }
            @keyframes toastProgress {
              from { width: 100%; }
              to   { width: 0%; }
            }
          `}</style>
        </>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
