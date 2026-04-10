import React, { useRef, useState, useEffect } from "react";
import { Pencil, Upload, Trash2, Eye, X, Loader2, Image as ImageIcon } from "lucide-react";
import { T } from "./tokens";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Compact profile image tile with pencil-icon overlay that opens a popover menu.
 * Replaces the full ImageUpload component inside table rows.
 */
export default function ProfileMediaMenu({
  currentUrl,
  onUpload,
  onRemove,
  uploading = false,
  size = 40,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const btnRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open && !preview) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPreview(false);
        btnRef.current?.focus();
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
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, or WebP allowed");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Max 2 MB");
      return;
    }
    setOpen(false);
    onUpload(file);
  };

  const handleRemove = () => {
    setOpen(false);
    onRemove?.();
  };

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-flex" }}>
      {/* Image tile + pencil trigger */}
      <button
        ref={btnRef}
        onClick={() => { if (!disabled && !uploading) setOpen(!open); }}
        disabled={disabled || uploading}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Edit profile photo"
        style={{
          position: "relative", width: size, height: size, borderRadius: "50%",
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
        {/* Pencil overlay */}
        {!uploading && !disabled && (
          <span style={{
            position: "absolute", bottom: -1, right: -1,
            width: 18, height: 18, borderRadius: "50%",
            background: T.accent, display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${T.surface}`,
            transition: T.transitionFast,
          }}>
            <Pencil size={9} color="#fff" strokeWidth={2.5} />
          </span>
        )}
      </button>

      {/* Popover menu */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: size + 6, left: "50%", transform: "translateX(-50%)",
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg, boxShadow: T.shadow.lg,
            padding: "6px 0", minWidth: 180, zIndex: 100,
            animation: "pmMenuIn 0.15s ease",
          }}
        >
          <MenuItem
            icon={Upload} label={currentUrl ? "Change photo" : "Upload photo"}
            onClick={() => inputRef.current?.click()}
          />
          {currentUrl && (
            <>
              <MenuItem icon={Eye} label="Preview" onClick={() => { setOpen(false); setPreview(true); }} />
              <div style={{ height: 1, background: T.borderLight, margin: "4px 0" }} />
              <MenuItem icon={Trash2} label="Remove photo" color={T.error} onClick={handleRemove} />
            </>
          )}
          {error && (
            <div style={{ padding: "6px 14px", fontSize: 11, color: T.error, fontWeight: 600 }}>{error}</div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {/* Preview overlay */}
      {preview && currentUrl && (
        <div
          onClick={() => setPreview(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(15,23,42,0.65)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pmFadeIn 0.15s ease",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
            <img
              src={currentUrl} alt="Preview"
              style={{
                maxWidth: "min(90vw, 480px)", maxHeight: "70vh",
                borderRadius: T.radius.xl, boxShadow: T.shadow.xl,
              }}
            />
            <button
              onClick={() => setPreview(false)}
              style={{
                position: "absolute", top: -12, right: -12,
                width: 32, height: 32, borderRadius: "50%",
                border: "none", background: T.surface, boxShadow: T.shadow.md,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={16} color={T.text} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pmMenuIn { from { opacity:0; transform:translateX(-50%) translateY(-4px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes pmFadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, color }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "8px 14px", border: "none", background: "transparent",
        fontSize: 13, fontWeight: 600, color: color || T.text,
        cursor: "pointer", textAlign: "left", transition: T.transitionFast,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </button>
  );
}
