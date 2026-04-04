import React, { useState } from "react";
import { Copy, Check, X, ShieldCheck } from "lucide-react";

const PALETTE = {
  primary: "#173B72",
  accent: "#2F6FED",
  success: "#0F9F6E",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textMuted: "#64748B",
  surface: "#FFFFFF",
};

export default function AdminActivationCodeModal({ inviteData, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!inviteData) return null;

  const handleCopy = () => {
    const textToCopy = inviteData.activationUrl || inviteData.code;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20
      }}
    >
      <div
        style={{
          background: PALETTE.surface,
          borderRadius: 20,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
          position: "relative"
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: PALETTE.textMuted,
            cursor: "pointer",
            padding: 4,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <X size={20} />
        </button>

        <div style={{ padding: "32px 32px 0", textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#ECFDF5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: PALETTE.success
            }}
          >
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: PALETTE.textMain }}>Invite Created</h2>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: PALETTE.textMuted, lineHeight: 1.5 }}>
            Share this activation link with the new administrator. It will not be shown again for security reasons.
          </p>
        </div>

        <div style={{ padding: 32 }}>
          <div
            style={{
              background: "#F8FAFC",
              border: `1px solid ${PALETTE.border}`,
              borderRadius: 12,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: PALETTE.textMuted, textTransform: "uppercase", letterSpacing: "0.025em" }}>
                Activation URL
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: "transparent",
                  border: "none",
                  color: copied ? PALETTE.success : PALETTE.accent,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                {copied ? (
                  <>
                    <Check size={14} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy Link
                  </>
                )}
              </button>
            </div>
            <code
              style={{
                display: "block",
                padding: "12px",
                background: "#FFF",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                fontSize: 13,
                color: PALETTE.textMain,
                wordBreak: "break-all",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                lineHeight: 1.4
              }}
            >
              {inviteData.activationUrl || inviteData.code}
            </code>
          </div>

          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: PALETTE.textMuted }}>Recipient Email:</span>
              <span style={{ fontWeight: 600, color: PALETTE.textMain }}>{inviteData.email}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: PALETTE.textMuted }}>Expires At:</span>
              <span style={{ fontWeight: 600, color: PALETTE.textMain }}>
                {new Date(inviteData.expiresAt).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              marginTop: 32,
              padding: "14px",
              background: PALETTE.primary,
              color: "#FFF",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              transition: "transform 0.1s"
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
