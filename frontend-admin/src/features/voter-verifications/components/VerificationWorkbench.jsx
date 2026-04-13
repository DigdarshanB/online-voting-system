import React, { useState, useMemo } from "react";
import { T } from "../../../components/ui/tokens";
import { ClipboardList, ShieldCheck } from "lucide-react";
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
      padding: "64px 48px",
      textAlign: "center",
      minHeight: 400,
      boxShadow: T.shadow.sm,
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: `${T.accent}0d`,
        border: `1.5px solid ${T.accent}22`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
        color: T.accentMuted,
      }}>
        <ShieldCheck size={30} />
      </div>
      <h3 style={{
        fontSize: 15,
        fontWeight: 700,
        color: T.text,
        margin: "0 0 8px",
        letterSpacing: "-0.01em",
      }}>
        No submission selected
      </h3>
      <p style={{
        fontSize: 13,
        color: T.muted,
        maxWidth: 280,
        margin: 0,
        lineHeight: 1.65,
      }}>
        Select a submission from the queue to begin artifact review and adjudication.
      </p>
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
            padding: "13px 18px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: T.surfaceAlt,
          }}>
            <ClipboardList size={14} color={T.accent} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>
              Verification Queue
            </span>
            {!isLoading && (
              <span style={{
                marginLeft: "auto",
                fontSize: 10.5,
                fontWeight: 700,
                background: `${queueBadgeColor}18`,
                color: queueBadgeColor,
                padding: "2px 8px",
                borderRadius: 9999,
                border: `1px solid ${queueBadgeColor}28`,
              }}>
                {filteredItems.length} {filteredItems.length === 1 ? "submission" : "submissions"}
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
              title={hasFilters ? "No matching submissions" : "No pending submissions"}
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
