import React from "react";
import { T } from "../../../components/ui/tokens";
import { Inbox } from "lucide-react";

export default function VerificationEmptyState({ title = "No pending voter submissions", description = "New identity submissions will appear here for review." }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 48,
      background: T.surface,
      border: `1px dashed ${T.border}`,
      borderRadius: T.radius.xl,
      textAlign: "center",
    }}>
      <div style={{
        background: `${T.muted}10`,
        color: T.muted,
        padding: 24,
        borderRadius: 9999,
        marginBottom: 16,
      }}>
        <Inbox size={48} />
      </div>
      <h3 style={{ 
        fontSize: 17, 
        fontWeight: 700, 
        color: T.text,
        marginBottom: 4,
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: 14, 
        color: T.muted,
        maxWidth: 280,
      }}>
        {description}
      </p>
    </div>
  );
}
