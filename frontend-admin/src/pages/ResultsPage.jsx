import React, { useState, useCallback, useEffect } from "react";
import {
  BarChart3, ChevronRight, Loader2, AlertTriangle, CheckCircle2,
  Lock, Play, Award, Users, TrendingUp, ShieldAlert, RefreshCw,
} from "lucide-react";
import useElectionsForResults from "../features/results/hooks/useResults";
import {
  listCountRuns, createCountRun, executeCountRun,
  getResultSummary, getFptpResults, getPrResults,
  finalizeCountRun, lockCountRun,
  getProvincialSummary, getPrElectedMembers,
  getLocalSummary,
} from "../features/results/api/resultsApi";
import { T } from "../components/ui/tokens";
import {
  PageContainer, AdminKeyframes, AdminPortalHero, AdminHeroChip, AdminPageHeader, ADMIN_HERO_TINTS,
} from "../components/ui/AdminUI";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/* ── Palette (matches project convention) ── */
const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF", bg: "#F5F7FB",
  border: "#DCE3EC", text: "#0F172A", muted: "#64748B",
  success: "#059669", successBg: "#ECFDF5", error: "#DC2626", errorBg: "#FEF2F2",
  warnBg: "#FFFBEB", warn: "#D97706", purple: "#7C3AED", purpleBg: "#F5F3FF",
  orange: "#EA580C", orangeBg: "#FFF7ED",
};

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

function StatusBadge({ status, map = STATUS_BADGES }) {
  const s = map[status] || { bg: "#F1F5F9", color: "#475569", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 8,
      fontSize: 12, fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

function formatDt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function ResultsPage() {
  const { elections, loading, error, reload } = useElectionsForResults();
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const clearMessages = () => { setActionError(null); setActionSuccess(null); };

  return (
    <PageContainer>
      <AdminKeyframes />
      <AdminPageHeader
        icon={BarChart3}
        title="Election Results"
        subtitle="Ballot counting, tallying, and result certification"
        action={
          <button
            onClick={reload}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
              borderRadius: 10, border: `1px solid ${P.border}`, background: P.surface,
              color: P.muted, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
      <AdminPortalHero
        eyebrow="Results Centre"
        title="Ballot Count & Result Engine"
        subtitle="Initiate count runs, review FPTP tallies and PR seat allocations, lock certified results, and finalize election outcomes."
        gradient={`linear-gradient(135deg, ${T.navy}, ${T.accent})`}
        rightContent={
          <div className="admin-hero-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <AdminHeroChip label={`${elections.length} election${elections.length !== 1 ? 's' : ''}`} tint="info" />
          </div>
        }
      />

      {/* Global messages */}
      {actionError && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: P.errorBg, color: P.error, marginBottom: 16, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} /> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: P.successBg, color: P.success, marginBottom: 16, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} /> {actionSuccess}
        </div>
      )}

      {/* Loading / Error / Empty */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: P.muted }}>
          <Loader2 size={24} className="animate-spin" /> Loading elections…
        </div>
      )}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: 48, color: P.error }}>{error}</div>
      )}
      {!loading && !error && elections.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: P.muted }}>
          No elections are ready for counting or already have results.
        </div>
      )}

      {/* Election cards */}
      {!loading && elections.map((e) => (
        <ElectionResultCard
          key={e.id}
          election={e}
          expanded={expandedId === e.id}
          onToggle={() => { clearMessages(); setExpandedId(expandedId === e.id ? null : e.id); }}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          actionError={actionError}
          setActionError={setActionError}
          actionSuccess={actionSuccess}
          setActionSuccess={setActionSuccess}
          clearMessages={clearMessages}
        />
      ))}
    </PageContainer>
  );
}

/* ══════════════════════════════════════════════════════════════
   ELECTION RESULT CARD
   ══════════════════════════════════════════════════════════════ */
function ElectionResultCard({
  election, expanded, onToggle,
  actionLoading, setActionLoading,
  setActionError, setActionSuccess, clearMessages,
}) {
  const [countRuns, setCountRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [fptpRows, setFptpRows] = useState([]);
  const [prRows, setPrRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [provincialSummary, setProvincialSummary] = useState(null);
  const [prElectedMembers, setPrElectedMembers] = useState([]);
  const [localSummary, setLocalSummary] = useState(null);

  const isProvincial = election.government_level === "PROVINCIAL";
  const isLocal = election.government_level === "LOCAL";

  // Load count runs when expanded
  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const runs = await listCountRuns(election.id);
        if (!cancelled) {
          setCountRuns(runs);
          if (runs.length > 0) setSelectedRunId(runs[0].id);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [expanded, election.id]);

  // Load results when a run is selected
  useEffect(() => {
    if (!selectedRunId) return;
    let cancelled = false;
    (async () => {
      try {
        const promises = [
          getResultSummary(selectedRunId),
          getFptpResults(selectedRunId),
          getPrResults(selectedRunId),
        ];
        const [s, f, p] = await Promise.all(promises);
        if (!cancelled) { setSummary(s); setFptpRows(f); setPrRows(p); }

        // Provincial-specific data
        if (isProvincial && !cancelled) {
          try {
            const [ps, em] = await Promise.all([
              getProvincialSummary(selectedRunId),
              getPrElectedMembers(selectedRunId),
            ]);
            if (!cancelled) { setProvincialSummary(ps); setPrElectedMembers(Array.isArray(em) ? em : []); }
          } catch {
            if (!cancelled) { setProvincialSummary(null); setPrElectedMembers([]); }
          }
        }

        // Local-specific data
        if (isLocal && !cancelled) {
          try {
            const ls = await getLocalSummary(selectedRunId);
            if (!cancelled) setLocalSummary(ls);
          } catch {
            if (!cancelled) setLocalSummary(null);
          }
        }
      } catch {
        /* results may not exist yet */
        if (!cancelled) { setSummary(null); setFptpRows([]); setPrRows([]); setProvincialSummary(null); setPrElectedMembers([]); setLocalSummary(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedRunId, isProvincial, isLocal]);

  const handleInitiate = async () => {
    clearMessages();
    setActionLoading(`init-${election.id}`);
    try {
      const run = await createCountRun(election.id);
      setActionSuccess("Count run created. Click Execute to start ballot counting.");
      setCountRuns((prev) => [run, ...prev]);
      setSelectedRunId(run.id);
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to initiate count");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecute = async (runId) => {
    clearMessages();
    setActionLoading(`exec-${runId}`);
    try {
      const run = await executeCountRun(runId);
      setActionSuccess("Count completed successfully.");
      setCountRuns((prev) => prev.map((r) => (r.id === runId ? run : r)));
      setSelectedRunId(runId);
      // refresh results
      const [s, f, p] = await Promise.all([
        getResultSummary(runId), getFptpResults(runId), getPrResults(runId),
      ]);
      setSummary(s); setFptpRows(f); setPrRows(p);
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Count execution failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async (runId) => {
    clearMessages();
    setActionLoading(`fin-${runId}`);
    try {
      const run = await finalizeCountRun(runId);
      setActionSuccess("Count finalized. Election results are now official.");
      setCountRuns((prev) => prev.map((r) => (r.id === runId ? run : r)));
      const s = await getResultSummary(runId);
      setSummary(s);
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Finalization failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLock = async (runId) => {
    clearMessages();
    setActionLoading(`lock-${runId}`);
    try {
      const run = await lockCountRun(runId);
      setActionSuccess("Count run locked — no further mutations allowed.");
      setCountRuns((prev) => prev.map((r) => (r.id === runId ? run : r)));
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Lock failed");
    } finally {
      setActionLoading(null);
    }
  };

  const cardStyle = {
    background: P.surface, borderRadius: 14, border: `1px solid ${P.border}`,
    marginBottom: 16, overflow: "hidden", transition: "box-shadow .2s",
    boxShadow: expanded ? "0 4px 20px rgba(15,23,42,.08)" : "none",
  };

  return (
    <div style={cardStyle}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", padding: "18px 24px",
          cursor: "pointer", gap: 12,
        }}
      >
        <ChevronRight
          size={18} color={P.muted}
          style={{ transform: expanded ? "rotate(90deg)" : "none", transition: ".2s" }}
        />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, color: P.text, fontSize: 15 }}>{election.title}</span>
          {election.government_level === "PROVINCIAL" && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: P.purpleBg, color: P.purple }}>Provincial</span>
          )}
          {election.government_level === "LOCAL" && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: P.orangeBg, color: P.orange }}>Local</span>
          )}
        </div>
        <StatusBadge status={election.status} />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 24px 24px", borderTop: `1px solid ${P.border}` }}>
          {detailLoading && (
            <div style={{ padding: 24, textAlign: "center", color: P.muted }}>
              <Loader2 size={20} className="animate-spin" /> Loading count data…
            </div>
          )}

          {!detailLoading && (
            <>
              {/* Count run controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 16, flexWrap: "wrap" }}>
                {["POLLING_CLOSED", "COUNTING"].includes(election.status) && (
                  <button
                    disabled={!!actionLoading}
                    onClick={handleInitiate}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 16px", borderRadius: 10, border: "none",
                      background: P.accent, color: "#fff", fontSize: 13,
                      fontWeight: 600, cursor: "pointer", opacity: actionLoading ? 0.7 : 1,
                    }}
                  >
                    {actionLoading === `init-${election.id}` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    New Count Run
                  </button>
                )}
                {countRuns.length > 0 && (
                  <select
                    value={selectedRunId || ""}
                    onChange={(e) => setSelectedRunId(Number(e.target.value))}
                    style={{
                      padding: "8px 12px", borderRadius: 10, border: `1px solid ${P.border}`,
                      fontSize: 13, color: P.text, background: P.surface,
                    }}
                  >
                    {countRuns.map((r) => {
                      const statusLabel = r.status.charAt(0) + r.status.slice(1).toLowerCase();
                      const tags = [statusLabel, r.is_final && "Final", r.is_locked && "Locked"].filter(Boolean);
                      return (
                        <option key={r.id} value={r.id}>
                          Run #{r.id} — {tags.join(" · ")}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Selected run actions */}
              {selectedRunId && (() => {
                const run = countRuns.find((r) => r.id === selectedRunId);
                if (!run) return null;
                return (
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    {run.status === "PENDING" && (
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleExecute(run.id)}
                        style={actionBtnStyle(P.orange, actionLoading)}
                      >
                        {actionLoading === `exec-${run.id}` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Execute Count
                      </button>
                    )}
                    {run.status === "COMPLETED" && !run.is_final && (
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleFinalize(run.id)}
                        style={actionBtnStyle(P.success, actionLoading)}
                      >
                        {actionLoading === `fin-${run.id}` ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                        Finalize
                      </button>
                    )}
                    {["COMPLETED", "FAILED"].includes(run.status) && !run.is_locked && (
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleLock(run.id)}
                        style={actionBtnStyle("#475569", actionLoading)}
                      >
                        {actionLoading === `lock-${run.id}` ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                        Lock
                      </button>
                    )}
                    <StatusBadge status={run.status} map={COUNT_STATUS_BADGES} />
                    {run.is_final && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: P.success }}>
                        <CheckCircle2 size={14} /> Final
                      </span>
                    )}
                    {run.is_locked && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: P.muted }}>
                        <Lock size={14} /> Locked
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Summary cards */}
              {summary && <SummaryCards summary={summary} isLocal={isLocal} />}

              {/* Adjudication warnings */}
              {summary && (summary.fptp.adjudication_required > 0 || (!isLocal && summary.pr.adjudication_required > 0)) && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, background: P.warnBg,
                  color: P.warn, marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <ShieldAlert size={16} />
                  <span>
                    <strong>Adjudication required:</strong>
                    {summary.fptp.adjudication_required > 0 && ` ${summary.fptp.adjudication_required} ${isLocal ? "contest" : "FPTP"} tie(s).`}
                    {!isLocal && summary.pr.adjudication_required > 0 && ` PR seat-boundary quotient tie.`}
                    {" "}Finalization is blocked until resolved.
                  </span>
                </div>
              )}

              {/* Vacancy / unfilled-seats info banner */}
              {summary && (() => {
                const fptpUnfilled = isLocal
                  ? (summary.fptp.seats_unfilled || 0)
                  : (summary.fptp.contests_without_winner || 0);
                const prUnfilled = !isLocal ? (summary.pr.seats_unfilled || 0) : 0;
                const hasVacancies = fptpUnfilled > 0 || prUnfilled > 0;
                if (!hasVacancies) return null;
                return (
                  <div style={{
                    padding: "12px 16px", borderRadius: 10, background: "#EFF6FF",
                    color: "#1E40AF", marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                    border: "1px solid #BFDBFE",
                  }}>
                    <AlertTriangle size={16} />
                    <span>
                      <strong>This election contains unfilled seats.</strong>
                      {isLocal && fptpUnfilled > 0 && ` ${fptpUnfilled} seat(s) across ${summary.fptp.contests_with_vacancies || 0} contest(s) have no winner declared.`}
                      {!isLocal && fptpUnfilled > 0 && ` ${fptpUnfilled} FPTP contest(s) have no declared winner.`}
                      {prUnfilled > 0 && ` ${prUnfilled} PR seat(s) remain unfilled.`}
                      {" "}Finalization will preserve current winners and mark remaining seats as unfilled.
                    </span>
                  </div>
                );
              })()}

              {/* Local-specific sections */}
              {isLocal && localSummary && <LocalResultSection localSummary={localSummary} />}

              {/* FPTP Results Table (hidden for local — shown in LocalResultSection) */}
              {!isLocal && fptpRows.length > 0 && <FptpResultsTable rows={fptpRows} />}

              {/* PR Results Table */}
              {!isLocal && prRows.length > 0 && <PrResultsTable rows={prRows} />}

              {/* Provincial-specific sections */}
              {isProvincial && provincialSummary && <ProvincialSummarySection summary={provincialSummary} />}
              {isProvincial && prElectedMembers.length > 0 && <PrElectedMembersTable members={prElectedMembers} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── action button helper ── */
function actionBtnStyle(color, actionLoading) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 14px", borderRadius: 8, border: "none",
    background: color, color: "#fff", fontSize: 13,
    fontWeight: 600, cursor: "pointer", opacity: actionLoading ? 0.7 : 1,
  };
}

/* ══════════════════════════════════════════════════════════════
   SUMMARY CARDS
   ══════════════════════════════════════════════════════════════ */
function SummaryCards({ summary, isLocal = false }) {
  const cards = isLocal ? [
    { icon: Users, label: "Ballots Counted", value: summary.total_ballots_counted ?? "—", color: P.accent },
    { icon: Award, label: "Contests", value: summary.fptp.total_contests ?? "—", color: P.navy },
    { icon: CheckCircle2, label: "Seats Filled", value: `${summary.fptp.seats_filled ?? summary.fptp.winners_declared} / ${summary.fptp.total_seats ?? summary.fptp.total_contests}`, color: P.success },
    { icon: AlertTriangle, label: "Seats Unfilled", value: summary.fptp.seats_unfilled ?? 0, color: (summary.fptp.seats_unfilled || 0) > 0 ? P.warn : P.muted },
    { icon: ShieldAlert, label: "Adjudication", value: summary.fptp.adjudication_required ?? 0, color: summary.fptp.adjudication_required > 0 ? P.warn : P.muted },
  ] : [
    { icon: Users, label: "Ballots Counted", value: summary.total_ballots_counted ?? "—", color: P.accent },
    { icon: Award, label: "FPTP Winners", value: `${summary.fptp.winners_declared} / ${summary.fptp.total_contests}`, color: (summary.fptp.contests_without_winner || 0) > 0 ? P.warn : P.success },
    { icon: TrendingUp, label: "PR Seats Filled", value: `${summary.pr.seats_allocated} / ${summary.pr.total_seats ?? "—"}`, color: (summary.pr.seats_unfilled || 0) > 0 ? P.warn : P.purple },
    { icon: BarChart3, label: "PR Qualified", value: `${summary.pr.parties_qualified} parties`, color: P.orange },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          background: P.bg, borderRadius: 12, padding: "16px 18px",
          border: `1px solid ${P.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <c.icon size={16} color={c.color} />
            <span style={{ fontSize: 12, color: P.muted, fontWeight: 600 }}>{c.label}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: P.text }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FPTP RESULTS TABLE
   ══════════════════════════════════════════════════════════════ */
function FptpResultsTable({ rows }) {
  // Group by contest
  const contests = {};
  for (const r of rows) {
    if (!contests[r.contest_id]) contests[r.contest_id] = [];
    contests[r.contest_id].push(r);
  }

  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: P.muted, borderBottom: `2px solid ${P.border}`, background: P.bg,
  };
  const tdStyle = { padding: "10px 14px", fontSize: 13, color: P.text, borderBottom: `1px solid ${P.border}` };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Award size={18} color={P.navy} /> FPTP Constituency Results
      </h3>
      {Object.entries(contests).map(([contestId, cRows]) => (
        <div key={contestId} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: P.navy, marginBottom: 6 }}>
            Contest #{contestId}
          </div>
          <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${P.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Rank</th>
                  <th style={thStyle}>Candidate</th>
                  <th style={thStyle}>Party</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Votes</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {cRows.map((r) => (
                  <tr key={r.id} style={{
                    background: r.is_winner ? "#F0FDF4" : r.requires_adjudication ? "#FFFBEB" : "transparent",
                  }}>
                    <td style={tdStyle}>{r.rank}</td>
                    <td style={{ ...tdStyle, fontWeight: r.is_winner ? 700 : 400 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {r.candidate_photo_path ? (
                          <img
                            src={`${API_BASE}/${r.candidate_photo_path}`}
                            alt=""
                            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${P.border}` }}
                          />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: P.bg, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: P.muted }}>
                            {r.candidate_name?.[0] || "?"}
                          </div>
                        )}
                        {r.candidate_name}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {r.party_symbol_path && (
                          <img
                            src={`${API_BASE}/${r.party_symbol_path}`}
                            alt=""
                            style={{ width: 20, height: 20, objectFit: "contain" }}
                          />
                        )}
                        {r.party_name || "Independent"}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                      {r.vote_count.toLocaleString()}
                    </td>
                    <td style={tdStyle}>
                      {r.is_winner && (
                        <span style={{ color: P.success, fontWeight: 600, fontSize: 12 }}>
                          ✓ Winner
                        </span>
                      )}
                      {r.requires_adjudication && (
                        <span style={{ color: P.warn, fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <AlertTriangle size={12} /> Tie — Adjudication Required
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PR RESULTS TABLE
   ══════════════════════════════════════════════════════════════ */
function PrResultsTable({ rows }) {
  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: P.muted, borderBottom: `2px solid ${P.border}`, background: P.bg,
  };
  const tdStyle = { padding: "10px 14px", fontSize: 13, color: P.text, borderBottom: `1px solid ${P.border}` };

  const sorted = [...rows].sort((a, b) => b.allocated_seats - a.allocated_seats || b.valid_votes - a.valid_votes);

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <TrendingUp size={18} color={P.navy} /> Proportional Representation Results
      </h3>
      <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${P.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Party</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Votes</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Vote Share</th>
              <th style={thStyle}>Threshold</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Seats</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} style={{
                background: r.requires_adjudication ? "#FFFBEB" : !r.meets_threshold ? "#F9FAFB" : "transparent",
              }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {r.party_symbol_path && (
                          <img
                            src={`${API_BASE}/${r.party_symbol_path}`}
                            alt=""
                            style={{ width: 22, height: 22, objectFit: "contain" }}
                          />
                        )}
                        {r.party_name}
                      </div>
                    </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{r.valid_votes.toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{r.vote_share_pct.toFixed(2)}%</td>
                <td style={tdStyle}>
                  {r.meets_threshold ? (
                    <span style={{ color: P.success, fontWeight: 600, fontSize: 12 }}>✓ Qualified</span>
                  ) : (
                    <span style={{ color: P.muted, fontSize: 12 }}>Below 3%</span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontSize: 16 }}>
                  {r.allocated_seats}
                </td>
                <td style={tdStyle}>
                  {r.requires_adjudication && (
                    <span style={{ color: P.warn, fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={12} /> Boundary Tie
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   PROVINCIAL SUMMARY SECTION
   ══════════════════════════════════════════════════════════════ */
function ProvincialSummarySection({ summary }) {
  if (!summary) return null;
  const cards = [
    { label: "Province", value: summary.province_name || summary.province_code || "—", color: P.purple },
    { label: "Total Seats", value: summary.total_seats ?? "—", color: P.navy },
    { label: "FPTP Seats", value: summary.fptp_seats ?? "—", color: P.accent },
    { label: "PR Seats", value: summary.pr_seats ?? "—", color: P.orange },
    { label: "Assembly Formed", value: summary.assembly_formed ? "Yes" : "No", color: summary.assembly_formed ? P.success : P.muted },
  ].filter(c => c.value !== "—" || c.label === "Province");

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Award size={18} color={P.purple} /> Provincial Assembly Summary
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: P.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${P.border}` }}>
            <div style={{ fontSize: 11, color: P.muted, fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   PR ELECTED MEMBERS TABLE
   ══════════════════════════════════════════════════════════════ */
function PrElectedMembersTable({ members }) {
  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: P.muted, borderBottom: `2px solid ${P.border}`, background: P.bg,
  };
  const tdStyle = { padding: "10px 14px", fontSize: 13, color: P.text, borderBottom: `1px solid ${P.border}` };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Users size={18} color={P.purple} /> PR Elected Members ({members.length})
      </h3>
      <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${P.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Pos</th>
              <th style={thStyle}>Candidate</th>
              <th style={thStyle}>Party</th>
              <th style={thStyle}>Gender</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.id || i} style={{ background: i % 2 === 0 ? "transparent" : P.bg }}>
                <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 700, color: P.accent }}>{m.list_position ?? i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {m.candidate_photo_path ? (
                      <img src={`${API_BASE}/${m.candidate_photo_path}`} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${P.border}` }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: P.bg, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: P.muted }}>
                        {(m.candidate_name || "?")[0]}
                      </div>
                    )}
                    {m.candidate_name || `#${m.candidate_id}`}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {m.party_symbol_path && <img src={`${API_BASE}/${m.party_symbol_path}`} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                    {m.party_name || "Independent"}
                  </div>
                </td>
                <td style={{ ...tdStyle, fontSize: 12, color: P.muted }}>{m.gender || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   LOCAL RESULT SECTION
   ══════════════════════════════════════════════════════════════ */
function LocalResultSection({ localSummary }) {
  if (!localSummary) return null;

  const { head_results = [], ward_results = [], local_summary } = localSummary;

  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: P.muted, borderBottom: `2px solid ${P.border}`, background: P.bg,
  };
  const tdStyle = { padding: "10px 14px", fontSize: 13, color: P.text, borderBottom: `1px solid ${P.border}` };

  /* shared table for a single contest */
  const ContestTable = ({ contest }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: P.navy, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        {contest.contest_title || contest.contest_type}
        {contest.area_name && <span style={{ fontWeight: 400, color: P.muted }}> — {contest.area_name}</span>}
        <span style={{ fontSize: 11, color: P.muted, marginLeft: "auto" }}>
          {contest.seat_count > 1 ? `${contest.seat_count} seats` : "1 seat"}
        </span>
      </div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${P.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Candidate</th>
              <th style={thStyle}>Party</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Votes</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(contest.candidates || []).map((c, i) => (
              <tr key={c.nomination_id || i} style={{
                background: c.is_winner ? "#F0FDF4" : c.requires_adjudication ? "#FFFBEB" : "transparent",
              }}>
                <td style={tdStyle}>{c.rank}</td>
                <td style={{ ...tdStyle, fontWeight: c.is_winner ? 700 : 400 }}>{c.candidate_name}</td>
                <td style={tdStyle}>{c.party_name || "Independent"}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{c.vote_count.toLocaleString()}</td>
                <td style={tdStyle}>
                  {c.is_winner && <span style={{ color: P.success, fontWeight: 600, fontSize: 12 }}>✓ Winner</span>}
                  {c.requires_adjudication && (
                    <span style={{ color: P.warn, fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={12} /> Tie
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Local summary totals */}
      {local_summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Contests", value: local_summary.total_direct_contests, color: P.navy },
            { label: "Total Seats", value: local_summary.total_seats, color: P.accent },
            { label: "Seats Filled", value: local_summary.seats_filled, color: P.success },
            { label: "Adjudication", value: local_summary.adjudication_required, color: local_summary.adjudication_required > 0 ? P.warn : P.muted },
            { label: "Wards Counted", value: local_summary.wards_counted, color: P.purple },
          ].map((c, i) => (
            <div key={i} style={{ background: P.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 11, color: P.muted, fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value ?? "—"}</div>
            </div>
          ))}
        </div>
      )}

      {/* Head contests (Mayor, Deputy Mayor) */}
      {head_results.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={18} color={P.orange} /> Head Positions
          </h3>
          {head_results.map((contest) => (
            <ContestTable key={contest.contest_id} contest={contest} />
          ))}
        </div>
      )}

      {/* Ward results */}
      {ward_results.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={18} color={P.purple} /> Ward Results
          </h3>
          {ward_results.map((ward) => (
            <div key={ward.area_id} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: P.navy, marginBottom: 10,
                padding: "8px 14px", background: P.bg, borderRadius: 8, border: `1px solid ${P.border}`,
              }}>
                {ward.ward_name || `Ward ${ward.ward_number}`}
              </div>
              {(ward.contests || []).map((contest) => (
                <ContestTable key={contest.contest_id} contest={contest} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
