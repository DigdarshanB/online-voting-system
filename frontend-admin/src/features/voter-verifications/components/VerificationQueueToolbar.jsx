import React from "react";
import { T } from "../../../components/ui/tokens";
import { Search, ChevronDown } from "lucide-react";

const STATUS_FILTERS = [
  { value: "all", label: "All Submissions" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "missing", label: "Missing Artifacts" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ACTIVE", label: "Approved" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
];

const selectStyle = {
  padding: "7px 30px 7px 10px",
  borderRadius: T.radius.md,
  border: `1.5px solid ${T.border}`,
  fontSize: 12.5,
  outline: "none",
  background: T.surface,
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  color: T.text,
  fontWeight: 500,
  transition: T.transition,
};

export default function VerificationQueueToolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sort,
  onSortChange,
}) {
  return (
    <div style={{
      padding: "10px 16px",
      borderBottom: `1px solid ${T.borderLight}`,
      display: "flex",
      gap: 8,
      alignItems: "center",
      background: T.surface,
      flexWrap: "wrap",
    }}>
      {/* Search */}
      <div style={{ position: "relative", flex: "1 1 160px", minWidth: 140 }}>
        <Search
          size={13}
          style={{
            position: "absolute", left: 9, top: "50%",
            transform: "translateY(-50%)", color: T.muted,
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          placeholder="Search name or ID…"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          style={{
            width: "100%",
            padding: "7px 10px 7px 28px",
            borderRadius: T.radius.md,
            border: `1.5px solid ${T.border}`,
            fontSize: 12.5,
            outline: "none",
            transition: T.transition,
            background: T.surface,
            boxSizing: "border-box",
            color: T.text,
          }}
          onFocus={e => {
            e.target.style.borderColor = T.accent;
            e.target.style.boxShadow = T.focusRing;
          }}
          onBlur={e => {
            e.target.style.borderColor = T.border;
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Status filter */}
      <div style={{ position: "relative" }}>
        <select
          value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value)}
          style={selectStyle}
        >
          {STATUS_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <ChevronDown
          size={12}
          style={{
            position: "absolute", right: 8, top: "50%",
            transform: "translateY(-50%)", color: T.muted, pointerEvents: "none",
          }}
        />
      </div>

      {/* Sort */}
      <div style={{ position: "relative" }}>
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          style={selectStyle}
        >
          {SORT_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <ChevronDown
          size={12}
          style={{
            position: "absolute", right: 8, top: "50%",
            transform: "translateY(-50%)", color: T.muted, pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
