import React from "react";
import { T } from "../../../components/ui/tokens";
import { Inbox } from "lucide-react";

export default function VerificationEmptyState({
  title = "No pending submissions",
  description = "New identity submissions will appear here for review.",
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      textAlign: "center",
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: `${T.muted}10`,
        color: T.subtle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
      }}>
        <Inbox size={24} />
      </div>
      <p style={{
        fontSize: 13.5,
        fontWeight: 700,
        color: T.textSecondary,
        margin: "0 0 4px",
      }}>
        {title}
      </p>
      <p style={{
        fontSize: 12.5,
        color: T.muted,
        maxWidth: 240,
        margin: 0,
        lineHeight: 1.6,
      }}>
        {description}
      </p>
    </div>
  );
}
