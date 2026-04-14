import React, { useState, useMemo } from "react";
import { T } from "../../../components/ui/tokens";
import { ClipboardList, ShieldCheck, ArrowLeft } from "lucide-react";
import VerificationQueueToolbar from "./VerificationQueueToolbar";
import VoterVerificationQueue from "./VoterVerificationQueue";
import VoterVerificationReviewPanel from "./VoterVerificationReviewPanel";
import VerificationEmptyState from "./VerificationEmptyState";

function ReviewPanelPlaceholder() {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius.xl,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "72px 48px",
      textAlign: "center",
      minHeight: 480,
      boxShadow: T.shadow.sm,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle dot-grid background */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `radial-gradient(${T.borderLight} 1px, transparent 1px)`,
        backgroundSize: "22px 22px",
        opacity: 0.65,
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Icon ring */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: `linear-gradient(145deg, ${T.accent}14, ${T.accent}06)`,
          border: `2px solid ${T.accent}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 22,
          boxShadow: `0 0 0 8px ${T.accent}06`,
        }}>
          <ShieldCheck size={30} color={T.accentMuted} strokeWidth={1.8} />
        </div>

        <h3 style={{
          fontSize: 15.5,
          fontWeight: 700,
          color: T.text,
          margin: "0 0 8px",
          letterSpacing: "-0.02em",
        }}>
          No submission selected
        </h3>
        <p style={{
          fontSize: 13,
          color: T.muted,
          maxWidth: 260,
          margin: "0 0 22px",
          lineHeight: 1.7,
        }}>
          Choose a submission from the queue to inspect artifacts and make an adjudication decision.
        </p>

        {/* Hint chip */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: T.radius.md,
          background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
          fontSize: 12, color: T.subtle, fontWeight: 500,
        }}>
          <ArrowLeft size={12} color={T.subtle} />
          Select a submission from the queue
        </div>
      </div>
    </div>
  );
}

export default function VerificationWorkbench({
  allItems,
  isLoading,
  selectedVoter,
  onSelectVoter,
  isBusy,
  onApprove,
  onReject,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const filteredItems = useMemo(() => {
    let list = [...(allItems || [])];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(v =>
        (v.full_name || "").toLowerCase().includes(q) ||
        (v.citizenship_no_normalized || "").includes(searchTerm)
      );
    }

    if (statusFilter === "missing") {
      list = list.filter(v => !v.document_uploaded_at || !v.face_uploaded_at);
    } else if (statusFilter !== "all") {
      list = list.filter(v => v.status === statusFilter);
    }

    if (sort === "newest") {
      list.sort((a, b) =>
        new Date(b.submitted_at || b.document_uploaded_at || 0) -
        new Date(a.submitted_at || a.document_uploaded_at || 0)
      );
    } else if (sort === "oldest") {
      list.sort((a, b) =>
        new Date(a.submitted_at || a.document_uploaded_at || 0) -
        new Date(b.submitted_at || b.document_uploaded_at || 0)
      );
    } else if (sort === "name") {
      list.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    }

    return list;
  }, [allItems, searchTerm, statusFilter, sort]);

  const queueBadgeColor =
    filteredItems.length === 0 ? T.muted :
    filteredItems.length > 10 ? T.error :
    T.accent;

  const hasFilters = searchTerm.trim() || statusFilter !== "all";

  return (
    <>
      <style>{`
        @media (max-width: 960px) {
          .vw-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="vw-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(360px, 420px) minmax(0, 1fr)",
          gap: T.space.xl,
          alignItems: "start",
        }}
      >
        {/* ── Left pane: queue ──────────────────────────── */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.xl,
          boxShadow: T.shadow.md,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Queue pane header */}
          <div style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: T.surfaceAlt,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: T.radius.sm,
              background: T.accentLight, display: "flex",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <ClipboardList size={14} color={T.accent} />
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>
                Verification Queue
              </span>
            </div>
            {!isLoading && (
              <span style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 700,
                background: filteredItems.length === 0 ? T.surfaceSubtle : `${queueBadgeColor}14`,
                color: filteredItems.length === 0 ? T.subtle : queueBadgeColor,
                padding: "3px 9px",
                borderRadius: 9999,
                border: `1px solid ${filteredItems.length === 0 ? T.borderLight : `${queueBadgeColor}30`}`,
                letterSpacing: "0.01em",
              }}>
                {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
              </span>
            )}
          </div>

          {/* Toolbar */}
          <VerificationQueueToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sort={sort}
            onSortChange={setSort}
          />

          {/* Queue body */}
          {isLoading || filteredItems.length > 0 ? (
            <VoterVerificationQueue
              items={filteredItems}
              isLoading={isLoading}
              selectedVoterId={selectedVoter?.id}
              onSelectVoter={onSelectVoter}
            />
          ) : (
            <VerificationEmptyState
              title={hasFilters ? "No matching submissions" : "Queue is clear"}
              description={
                hasFilters
                  ? "Try adjusting your search or filter criteria."
                  : "New identity submissions will appear here for review."
              }
            />
          )}
        </div>

        {/* ── Right pane: review detail ─────────────────── */}
        <div style={{
          position: "sticky",
          top: 20,
          maxHeight: "calc(100vh - 100px)",
        }}>
          {selectedVoter ? (
            <VoterVerificationReviewPanel
              voter={selectedVoter}
              isBusy={isBusy}
              onClose={() => onSelectVoter(null)}
              onApprove={onApprove}
              onReject={onReject}
            />
          ) : (
            <ReviewPanelPlaceholder />
          )}
        </div>
      </div>
    </>
  );
}
