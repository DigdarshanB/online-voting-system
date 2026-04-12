import React from "react";
import { T } from "../../../components/ui/tokens";
import { Check, X, Square } from "lucide-react";

export default function VerificationChecklist({ checklistItems }) {
  return (
    <div style={{
      background: T.infoBg,
      border: `1px solid ${T.infoBorder}`,
      borderRadius: T.radius.lg,
      padding: 18,
      marginBottom: 20,
    }}>
      <h4 style={{ 
        fontSize: 13, 
        fontWeight: 700, 
        color: T.info,
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 8
      }}>
        Verification Protocol
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checklistItems.map((item, index) => (
          <div key={index} style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 10,
            fontSize: 13,
            color: item.ok === false ? T.error : T.text,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: item.ok === true ? T.success : item.ok === false ? T.error : "#fff",
              border: `1.5px solid ${item.ok === null ? T.border : "transparent"}`,
              color: "#fff", flexShrink: 0
            }}>
              {item.ok === true && <Check size={14} strokeWidth={3} />}
              {item.ok === false && <X size={14} strokeWidth={3} />}
              {item.ok === null && <div style={{ width: 8, height: 8, borderRadius: 1, border: `1px solid ${T.muted}` }} />}
            </div>
            <span style={{ fontWeight: item.ok !== null ? 600 : 400 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
