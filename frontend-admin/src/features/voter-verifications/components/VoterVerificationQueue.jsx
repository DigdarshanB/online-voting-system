import React from "react";
import { T } from "../../../components/ui/tokens";
import { FileText, Camera, Loader2, ChevronRight } from "lucide-react";
import StatusPill from "./StatusPill";

/* ── Avatar initials ─────────────────────────────────────── */
const AVATAR_COLORS = [
  { fg: "#2563EB", bg: "#EBF2FF", border: "#BFDBFE" },
  { fg: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { fg: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  { fg: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { fg: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC" },
  { fg: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
];

function AvatarInitials({ name }) {
  const parts = (name || "?").split(" ").filter(Boolean);
  const initials = parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const palette = AVATAR_COLORS[(name || "").length % AVATAR_COLORS.length];
  return (
    <div style={{
      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: palette.bg, border: `1.5px solid ${palette.border}`,
      color: palette.fg, fontSize: 12.5, fontWeight: 800,
      letterSpacing: "0.02em",
    }}>
      {initials}
    </div>
  );
}

/* ── Artifact chip ───────────────────────────────────────── */
function ArtifactChip({ type, present }) {
  const Icon = type === "document" ? FileText : Camera;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 7px", borderRadius: 9999, fontSize: 10,
      fontWeight: 600, whiteSpace: "nowrap",
      background: present ? T.successBg : T.errorBg,
      color: present ? T.success : T.error,
      border: `1px solid ${present ? T.successBorder : T.errorBorder}`,
    }}>
      <Icon size={9} />
      {type === "document" ? "Doc" : "Face"}
    </span>
  );
}

/* ── Individual queue row ────────────────────────────────── */
function TriageRow({ voter, isSelected, onClick }) {
  const date = voter.submitted_at || voter.document_uploaded_at;
  const dateStr = date
    ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        borderBottom: `1px solid ${T.borderLight}`,
        background: isSelected ? T.accentLight : "transparent",
        borderLeft: `3px solid ${isSelected ? T.accent : "transparent"}`,
        cursor: "pointer",
        transition: T.transitionFast,
        outline: "none",
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.surfaceAlt; }}
      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? T.accentLight : "transparent"; }}
      onFocus={e => { if (!isSelected) e.currentTarget.style.background = T.surfaceAlt; }}
      onBlur={e => { e.currentTarget.style.background = isSelected ? T.accentLight : "transparent"; }}
    >
      {/* Avatar */}
      <AvatarInitials name={voter.full_name} />

      {/* Identity block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: T.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: 2,
        }}>
          {voter.full_name || "—"}
        </div>
        <div style={{
          fontSize: 11.5, color: T.muted, fontWeight: 400,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: 4,
        }}>
          {voter.email}
        </div>
        <code style={{
          display: "inline-block",
          fontSize: 10, fontFamily: "monospace",
          background: T.surfaceSubtle, color: T.textSecondary,
          padding: "1px 6px", borderRadius: T.radius.sm,
          border: `1px solid ${T.borderLight}`, letterSpacing: "0.4px",
        }}>
          {voter.citizenship_no_normalized || voter.citizenship_no_raw || "—"}
        </code>
      </div>

      {/* Right metadata column */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-end",
        gap: 5, flexShrink: 0,
      }}>
        <StatusPill status={voter.status} />
        <div style={{ display: "flex", gap: 4 }}>
          <ArtifactChip type="document" present={!!voter.document_uploaded_at} />
          <ArtifactChip type="face" present={!!voter.face_uploaded_at} />
        </div>
        <div style={{ fontSize: 10.5, color: T.subtle, fontWeight: 400 }}>
          {dateStr}
        </div>
      </div>

      {/* Chevron indicator */}
      <ChevronRight
        size={14}
        color={isSelected ? T.accent : T.subtle}
        style={{ flexShrink: 0, transition: T.transitionFast }}
      />
    </div>
  );
}

/* ── Queue list ──────────────────────────────────────────── */
export default function VoterVerificationQueue({
  items,
  isLoading,
  onSelectVoter,
  selectedVoterId,
}) {
  if (isLoading) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <Loader2
          size={20}
          color={T.accent}
          style={{ animation: "spin 1s linear infinite", marginBottom: 10 }}
        />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.muted }}>
          Loading verification queue…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 320px)" }}>
      {items.map(voter => (
        <TriageRow
          key={voter.id}
          voter={voter}
          isSelected={selectedVoterId === voter.id}
          onClick={() => onSelectVoter(voter)}
        />
      ))}
    </div>
  );
}

