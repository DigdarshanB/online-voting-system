import React from "react";
import { Inbox } from "lucide-react";

/**
 * Empty state placeholder for tables / lists with no data.
 *
 * Props:
 *   icon    — Lucide icon component (default Inbox)
 *   title   — heading text
 *   message — descriptive text
 *   action  — optional React node (e.g. a button)
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = "No data",
  message = "",
  action = null,
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "48px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: "#F1F5F9",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
      }}>
        <Icon size={24} color="#94A3B8" strokeWidth={1.8} />
      </div>
      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#334155" }}>{title}</h4>
      {message && (
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748B", maxWidth: 320 }}>{message}</p>
      )}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}
