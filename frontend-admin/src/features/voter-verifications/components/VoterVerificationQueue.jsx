import React from "react";
import { T } from "../../../components/ui/tokens";
import { ArrowRight, FileText, Camera, Loader2 } from "lucide-react";
import StatusPill from "./StatusPill";

function ArtifactChip({ label, present }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 9999,
      fontSize: 10.5,
      fontWeight: 600,
      background: present ? T.successBg : T.errorBg,
      color: present ? T.success : T.error,
      border: `1px solid ${present ? T.successBorder : T.errorBorder}`,
      whiteSpace: "nowrap",
    }}>
      {present
        ? (label === "document" ? <FileText size={10} /> : <Camera size={10} />)
        : (label === "document" ? <FileText size={10} /> : <Camera size={10} />)
      }
      {label === "document" ? "Document" : "Face"} {present ? "uploaded" : "missing"}
    </span>
  );
}

function TriageRow({ voter, isSelected, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1.1fr 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 18px",
        borderBottom: `1px solid ${T.borderLight}`,
        background: isSelected ? T.accentLight : T.surface,
        cursor: "pointer",
        transition: T.transitionFast,
        outline: "none",
        borderLeft: isSelected ? `3px solid ${T.accent}` : "3px solid transparent",
      }}
      onMouseEnter={e => {
        if (!isSelected) e.currentTarget.style.background = T.surfaceAlt;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isSelected ? T.accentLight : T.surface;
      }}
    >
      {/* Identity block */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: T.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {voter.full_name}
        </div>
        <div style={{
          fontSize: 11.5,
          color: T.muted,
          marginTop: 2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {voter.email}
        </div>
        <code style={{
          display: "inline-block",
          marginTop: 4,
          fontSize: 10.5,
          fontFamily: "monospace",
          background: T.surfaceAlt,
          color: T.textSecondary,
          padding: "1px 6px",
          borderRadius: T.radius.sm,
          border: `1px solid ${T.borderLight}`,
          letterSpacing: "0.5px",
        }}>
          {voter.citizenship_no_normalized}
        </code>
      </div>

      {/* Metadata + artifact chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>
          {voter.submitted_at || voter.document_uploaded_at
            ? new Date(voter.submitted_at || voter.document_uploaded_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })
            : "—"
          }
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <ArtifactChip label="document" present={!!voter.document_uploaded_at} />
          <ArtifactChip label="face" present={!!voter.face_uploaded_at} />
        </div>
      </div>

      {/* Status pill */}
      <div>
        <StatusPill status={voter.status} />
      </div>

      {/* CTA */}
      <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "7px 14px",
          borderRadius: T.radius.md,
          background: isSelected ? T.accent : T.surface,
          color: isSelected ? "#fff" : T.accent,
          border: `1.5px solid ${T.accent}`,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          transition: T.transitionFast,
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => {
          if (!isSelected) {
            e.currentTarget.style.background = T.accentLight;
          }
        }}
        onMouseLeave={e => {
          if (!isSelected) {
            e.currentTarget.style.background = T.surface;
          }
        }}
      >
        Review <ArrowRight size={12} />
      </button>
    </div>
  );
}

export default function VoterVerificationQueue({
  items,
  isLoading,
  onSelectVoter,
  selectedVoterId,
}) {
  if (isLoading) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: T.muted }}>
        <Loader2
          size={22}
          style={{ animation: "spin 1s linear infinite", marginBottom: 10 }}
          color={T.accent}
        />
        <div style={{ fontSize: 13, fontWeight: 600 }}>Loading verification queue…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}>
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
