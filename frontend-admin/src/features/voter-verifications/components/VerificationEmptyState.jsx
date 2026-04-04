import React from "react";
import { tokens } from "./tokens";
import { Inbox } from "lucide-react";

export default function VerificationEmptyState({ title = "No pending voter submissions", description = "New identity submissions will appear here for review." }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: tokens.spacing.xxxl,
      background: tokens.cardBackground,
      border: `1px dashed ${tokens.cardBorder}`,
      borderRadius: tokens.borderRadius.medium,
      textAlign: "center",
    }}>
      <div style={{
        background: `${tokens.colors.secondary}10`,
        color: tokens.colors.secondary,
        padding: tokens.spacing.xl,
        borderRadius: tokens.borderRadius.full,
        marginBottom: tokens.spacing.lg,
      }}>
        <Inbox size={48} />
      </div>
      <h3 style={{ 
        fontSize: tokens.fontSizes.lg, 
        fontWeight: 600, 
        color: tokens.text.primary,
        marginBottom: tokens.spacing.xs
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: tokens.fontSizes.base, 
        color: tokens.text.secondary,
        maxWidth: "280px"
      }}>
        {description}
      </p>
    </div>
  );
}
