import React, { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXT_LABEL = "JPG, PNG, or WebP";

/**
 * Reusable image upload field with preview, replace, and remove.
 *
 * Props:
 *   currentUrl   — existing image URL or null
 *   onUpload     — async (file: File) => void — called with selected file
 *   onRemove     — async () => void — called when user removes image (optional)
 *   uploading    — boolean loading state
 *   label        — field label (default "Image")
 *   shape        — "square" | "circle" (default "square")
 *   size         — preview size in px (default 80)
 *   disabled     — disable controls
 */
export default function ImageUpload({
  currentUrl,
  onUpload,
  onRemove,
  uploading = false,
  label = "Image",
  shape = "square",
  size = 80,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    setError(null);
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Only ${ALLOWED_EXT_LABEL} files are allowed.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be under 2 MB.");
      return;
    }
    onUpload(file);
  };

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const borderRadius = shape === "circle" ? "50%" : 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{label}</span>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Preview / Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={disabled ? undefined : onDrop}
          onClick={() => { if (!disabled && !uploading) inputRef.current?.click(); }}
          style={{
            width: size, height: size, borderRadius,
            border: dragOver ? "2px dashed #2F6FED" : currentUrl ? "1px solid #DCE3EC" : "2px dashed #CBD5E1",
            background: dragOver ? "#EFF6FF" : currentUrl ? "#F8FAFC" : "#F8FAFC",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", cursor: disabled ? "default" : "pointer",
            transition: "all 0.15s", position: "relative", flexShrink: 0,
          }}
        >
          {uploading ? (
            <Loader2 size={22} color="#64748B" style={{ animation: "spin 1s linear infinite" }} />
          ) : currentUrl ? (
            <img
              src={currentUrl}
              alt={label}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <ImageIcon size={20} color="#94A3B8" />
              <span style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600 }}>Upload</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={() => { if (!disabled && !uploading) inputRef.current?.click(); }}
            disabled={disabled || uploading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 7, border: "1px solid #DCE3EC",
              background: "#FFFFFF", color: "#475569", fontSize: 12, fontWeight: 600,
              cursor: disabled || uploading ? "not-allowed" : "pointer",
              transition: "all 0.15s", opacity: disabled ? 0.5 : 1,
            }}
          >
            <Upload size={13} />
            {currentUrl ? "Replace" : "Choose file"}
          </button>
          {currentUrl && onRemove && (
            <button
              onClick={() => { if (!disabled && !uploading) onRemove(); }}
              disabled={disabled || uploading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 7, border: "none",
                background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600,
                cursor: disabled || uploading ? "not-allowed" : "pointer",
                transition: "all 0.15s", opacity: disabled ? 0.5 : 1,
              }}
            >
              <X size={13} />
              Remove
            </button>
          )}
          <span style={{ fontSize: 10, color: "#94A3B8" }}>
            {ALLOWED_EXT_LABEL}, max 2 MB
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={onInputChange}
          style={{ display: "none" }}
        />
      </div>

      {error && (
        <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>{error}</span>
      )}
    </div>
  );
}
