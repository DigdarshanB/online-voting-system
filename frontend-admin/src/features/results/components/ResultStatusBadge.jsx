import React from "react";

const STATUS_BADGES = {
  POLLING_CLOSED: { bg: "#FFFBEB", color: "#D97706", label: "Polling Closed" },
  COUNTING:       { bg: "#FFF7ED", color: "#EA580C", label: "Counting" },
  FINALIZED:      { bg: "#ECFDF5", color: "#047857", label: "Finalized" },
  ARCHIVED:       { bg: "#F3F4F6", color: "#6B7280", label: "Archived" },
};

const COUNT_STATUS_BADGES = {
  PENDING:   { bg: "#F1F5F9", color: "#475569", label: "Pending" },
  RUNNING:   { bg: "#FFF7ED", color: "#EA580C", label: "Running" },
  COMPLETED: { bg: "#ECFDF5", color: "#059669", label: "Completed" },
  FAILED:    { bg: "#FEF2F2", color: "#DC2626", label: "Failed" },
};

export function StatusBadge({ status, map = STATUS_BADGES }) {
  const s = map[status] || { bg: "#F1F5F9", color: "#475569", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "4px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 700, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

export function CountStatusBadge({ status }) {
  return <StatusBadge status={status} map={COUNT_STATUS_BADGES} />;
}

export { STATUS_BADGES, COUNT_STATUS_BADGES };
