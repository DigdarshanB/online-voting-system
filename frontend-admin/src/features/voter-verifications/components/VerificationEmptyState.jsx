import React from "react";
import { T } from "../../../components/ui/tokens";
import { CheckCircle2 } from "lucide-react";

export default function VerificationEmptyState({
  title = "Queue is clear",
  description = "All submissions have been reviewed. New identity requests will appear here.",
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "56px 32px",
      textAlign: "center",
    }}>
      {/* Outer ring */}
      <div style={{
        position: "relative",
        width: 72, height: 72,
        marginBottom: 20,
      }}>
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          background: `${T.success}12`,
          border: `1.5px solid ${T.success}30`,
        }} />
        <div style={{
          position: "absolute", inset: 10,
          borderRadius: "50%",
          background: T.successBg,
          border: `1.5px solid ${T.successBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircle2 size={22} color={T.success} strokeWidth={2} />
        </div>
      </div>

      <p style={{
        fontSize: 14,
        fontWeight: 700,
        color: T.text,
        margin: "0 0 6px",
        letterSpacing: "-0.01em",
      }}>
        {title}
      </p>
      <p style={{
        fontSize: 12.5,
        color: T.muted,
        maxWidth: 220,
        margin: 0,
        lineHeight: 1.65,
        fontWeight: 400,
      }}>
        {description}
      </p>
    </div>
  );
}
