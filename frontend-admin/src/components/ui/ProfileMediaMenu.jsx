import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil, Upload, Trash2, Eye, X, Loader2, Image as ImageIcon } from "lucide-react";
import { T } from "./tokens";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Compact media tile with pencil-icon trigger → portal-rendered popover menu.
 * Supports circle (profile photos) and square (party symbols) shapes.
 */
export default function ProfileMediaMenu({
  currentUrl,
  onUpload,
  onRemove,
  uploading = false,
  size = 40,
  shape = "circle",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState(null);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  const borderRadius = shape === "circle" ? "50%" : T.radius.md;

  const openMenu = () => {
    if (disabled || uploading) return;
    if (open) { setOpen(false); setPos(null); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mH = 160, mW = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipped = spaceBelow < mH + 12 && rect.top > mH + 12;
    let left = rect.left + rect.width / 2 - mW / 2;
    if (left < 8) left = 8;
    if (left + mW > window.innerWidth - 8) left = window.innerWidth - mW - 8;
    setPos({
      top: flipped ? undefined : rect.bottom + 6,
      bottom: flipped ? window.innerHeight - rect.top + 6 : undefined,
      left,
      flipped,
    });
    setOpen(true);
  };

  // Outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Escape + arrow-key navigation
  useEffect(() => {
    if (!open && !preview) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPreview(false);
        btnRef.current?.focus();
      }
      if (!open) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const els = menuRef.current ? [...menuRef.current.querySelectorAll('[role="menuitem"]')] : [];
        const cur = els.indexOf(document.activeElement);
        const next = Math.max(0, Math.min(els.length - 1, cur + dir));
        els[next]?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, preview]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) { setError("Only JPG, PNG, or WebP allowed"); return; }
    if (file.size > MAX_FILE_SIZE) { setError("Max 2 MB"); return; }
    setOpen(false);
    onUpload(file);
  };

  const handleRemove = () => { setOpen(false); onRemove?.(); };

  return (
    <>
      {/* Trigger */}
      <button
        ref={btnRef}
        onClick={openMenu}
        disabled={disabled || uploading}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Edit photo"
        style={{
          position: "relative", width: size, height: size, borderRadius,
          border: `2px solid ${currentUrl ? T.borderLight : T.border}`,
          background: currentUrl ? T.surface : T.surfaceAlt,
          overflow: "hidden", cursor: disabled ? "default" : "pointer",
          padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
          transition: T.transition, flexShrink: 0,
        }}
      >
        {uploading ? (
          <Loader2 size={16} color={T.muted} style={{ animation: "adminSpin 0.8s linear infinite" }} />
        ) : currentUrl ? (
          <img src={currentUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <ImageIcon size={16} color={T.subtle} />
        )}
        {!uploading && !disabled && (
          <span style={{
            position: "absolute", bottom: -1, right: -1,
            width: 18, height: 18, borderRadius: "50%",
            background: T.accent, display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${T.surface}`, transition: T.transitionFast,
          }}>
            <Pencil size={9} color="#fff" strokeWidth={2.5} />
          </span>
        )}
      </button>

      {/* Portal-rendered popover menu */}
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: pos.top, bottom: pos.bottom, left: pos.left,
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg, boxShadow: T.shadow.lg,
            padding: "6px 0", minWidth: 180, zIndex: 10000,
            animation: "pmMenuIn 0.15s ease",
            transformOrigin: pos.flipped ? "bottom center" : "top center",
          }}
        >
          <MenuBtn icon={Upload} label={currentUrl ? "Change photo" : "Upload photo"} onClick={() => inputRef.current?.click()} />
          {currentUrl && (
            <>
              <MenuBtn icon={Eye} label="Preview" onClick={() => { setOpen(false); setPreview(true); }} />
              <div style={{ height: 1, background: T.borderLight, margin: "4px 0" }} />
              <MenuBtn icon={Trash2} label="Remove" color={T.error} onClick={handleRemove} />
            </>
          )}
          {error && <div style={{ padding: "6px 14px", fontSize: 11, color: T.error, fontWeight: 600 }}>{error}</div>}
        </div>,
        document.body,
      )}

      <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(",")} onChange={handleFile} style={{ display: "none" }} />

      {/* Preview overlay */}
      {preview && currentUrl && createPortal(
        <div
          onClick={() => setPreview(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 10001,
            background: "rgba(15,23,42,0.65)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pmFadeIn 0.15s ease",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
            <img src={currentUrl} alt="Preview" style={{
              maxWidth: "min(90vw, 480px)", maxHeight: "70vh",
              borderRadius: T.radius.xl, boxShadow: T.shadow.xl,
            }} />
            <button
              onClick={() => setPreview(false)}
              style={{
                position: "absolute", top: -12, right: -12,
                width: 32, height: 32, borderRadius: "50%",
                border: "none", background: T.surface, boxShadow: T.shadow.md,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <X size={16} color={T.text} />
            </button>
          </div>
        </div>,
        document.body,
      )}

      <style>{`
        @keyframes pmMenuIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pmFadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </>
  );
}

function MenuBtn({ icon, label, onClick, color }) {
  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "8px 14px", border: "none", background: "transparent",
        fontSize: 13, fontWeight: 600, color: color || T.text,
        cursor: "pointer", textAlign: "left", transition: T.transitionFast, outline: "none",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      onFocus={e => { e.currentTarget.style.background = T.surfaceAlt; }}
      onBlur={e => { e.currentTarget.style.background = "transparent"; }}
    >
      {React.createElement(icon, { size: 14, strokeWidth: 2 })}
      {label}
    </button>
  );
}
