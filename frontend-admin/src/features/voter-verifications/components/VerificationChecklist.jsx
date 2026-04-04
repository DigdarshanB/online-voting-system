import React from "react";
import { tokens } from "./tokens";
import { Check, X, Square } from "lucide-react";

export default function VerificationChecklist({ checklistItems }) {
  return (
    <div style={{
      background: tokens.status.info.background,
      border: `1px solid ${tokens.status.info.border}`,
      borderRadius: tokens.borderRadius.medium,
      padding: tokens.spacing.lg,
      marginBottom: tokens.spacing.xl,
    }}>
      <h4 style={{ 
        fontSize: tokens.fontSizes.sm, 
        fontWeight: 600, 
        color: tokens.status.info.text,
        marginBottom: tokens.spacing.md,
        display: "flex",
        alignItems: "center",
        gap: 8
      }}>
        Verification Protocol
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.sm }}>
        {checklistItems.map((item, index) => (
          <div key={index} style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: tokens.spacing.md,
            fontSize: tokens.fontSizes.sm,
            color: item.ok === false ? tokens.colors.danger : tokens.text.primary,
          }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: item.ok === true ? tokens.colors.success : item.ok === false ? tokens.colors.danger : "#fff",
              border: `1.5px solid ${item.ok === null ? tokens.colors.border : "transparent"}`,
              color: "#fff",
              flexShrink: 0
            }}>
              {item.ok === true && <Check size={14} strokeWidth={3} />}
              {item.ok === false && <X size={14} strokeWidth={3} />}
              {item.ok === null && <div style={{ width: 8, height: 8, borderRadius: 1, border: `1px solid ${tokens.text.muted}` }} />}
            </div>
            <span style={{ fontWeight: item.ok !== null ? 600 : 400 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
