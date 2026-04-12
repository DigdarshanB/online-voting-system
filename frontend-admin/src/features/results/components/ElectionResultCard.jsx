import React, { useState, useCallback, useEffect } from "react";
import {
  ChevronRight, ChevronDown, Loader2, AlertTriangle, CheckCircle2,
  Lock, Play, Award, Users, TrendingUp, ShieldAlert, BarChart3,
} from "lucide-react";
import {
  listCountRuns, createCountRun, executeCountRun,
  getResultSummary, getFptpResults, getPrResults,
  finalizeCountRun, lockCountRun,
  getProvincialSummary, getPrElectedMembers,
  getLocalSummary,
} from "../api/resultsApi";
import { StatusBadge, CountStatusBadge } from "./ResultStatusBadge";
import { FptpResultsTable, PrResultsTable, ProvincialSummarySection, PrElectedMembersTable, LocalResultSection } from "./ResultsTable";
import CountRunPanel from "./CountRunPanel";

const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF", bg: "#F5F7FB",
  border: "#DCE3EC", text: "#0F172A", muted: "#64748B",
  success: "#059669", successBg: "#ECFDF5", error: "#DC2626", errorBg: "#FEF2F2",
  warnBg: "#FFFBEB", warn: "#D97706", purple: "#7C3AED", purpleBg: "#F5F3FF",
  orange: "#EA580C", orangeBg: "#FFF7ED",
};

/* Shimmer skeleton */
function SkeletonRows({ count = 3 }) {
  return (
    <div style={{ padding: 24 }}>
      <style>{`
        @keyframes resultShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          height: 18, borderRadius: 8, marginBottom: 12,
          background: "linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%)",
          backgroundSize: "200% 100%",
          animation: "resultShimmer 1.5s infinite",
          width: `${70 + Math.random() * 30}%`,
        }} />
      ))}
    </div>
  );
}

export default function ElectionResultCard({
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
      } catch { /* ignore */ }
      finally { if (!cancelled) setDetailLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [expanded, election.id]);

  useEffect(() => {
    if (!selectedRunId) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, f, p] = await Promise.all([
          getResultSummary(selectedRunId),
          getFptpResults(selectedRunId),
          getPrResults(selectedRunId),
        ]);
        if (!cancelled) { setSummary(s); setFptpRows(f); setPrRows(p); }
        if (isProvincial && !cancelled) {
          try {
            const [ps, em] = await Promise.all([
              getProvincialSummary(selectedRunId),
              getPrElectedMembers(selectedRunId),
            ]);
            if (!cancelled) { setProvincialSummary(ps); setPrElectedMembers(Array.isArray(em) ? em : []); }
          } catch { if (!cancelled) { setProvincialSummary(null); setPrElectedMembers([]); } }
        }
        if (isLocal && !cancelled) {
          try {
            const ls = await getLocalSummary(selectedRunId);
            if (!cancelled) setLocalSummary(ls);
          } catch { if (!cancelled) setLocalSummary(null); }
        }
      } catch {
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
    } finally { setActionLoading(null); }
  };

  const handleExecute = async (runId) => {
    clearMessages();
    setActionLoading(`exec-${runId}`);
    try {
      const run = await executeCountRun(runId);
      setActionSuccess("Count completed successfully.");
      setCountRuns((prev) => prev.map((r) => (r.id === runId ? run : r)));
      setSelectedRunId(runId);
      const [s, f, p] = await Promise.all([
        getResultSummary(runId), getFptpResults(runId), getPrResults(runId),
      ]);
      setSummary(s); setFptpRows(f); setPrRows(p);
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Count execution failed");
    } finally { setActionLoading(null); }
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
    } finally { setActionLoading(null); }
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
    } finally { setActionLoading(null); }
  };

  const levelColor = isLocal ? P.orange : isProvincial ? P.purple : P.accent;
  const statusBorderColor = election.status === "FINALIZED" ? P.success : election.status === "COUNTING" ? P.orange : P.warn;

  /* Summary KPI cards */
  const summaryCards = summary ? (isLocal ? [
    { icon: Users, label: "Ballots Counted", value: summary.total_ballots_counted ?? "—", color: P.accent },
    { icon: Award, label: "Contests", value: summary.fptp.total_contests ?? "—", color: P.navy },
    { icon: CheckCircle2, label: "Winners Declared", value: `${summary.fptp.winners_declared} / ${summary.fptp.total_seats ?? summary.fptp.total_contests}`, color: P.success },
    { icon: ShieldAlert, label: "Adjudication", value: summary.fptp.adjudication_required ?? 0, color: summary.fptp.adjudication_required > 0 ? P.warn : P.muted },
  ] : [
    { icon: Users, label: "Ballots Counted", value: summary.total_ballots_counted ?? "—", color: P.accent },
    { icon: Award, label: "FPTP Winners", value: `${summary.fptp.winners_declared} / ${summary.fptp.total_contests}`, color: P.success },
    { icon: TrendingUp, label: "PR Seats", value: `${summary.pr.seats_allocated} / ${summary.pr.total_seats ?? "—"}`, color: P.purple },
    { icon: BarChart3, label: "PR Qualified", value: `${summary.pr.parties_qualified} parties`, color: P.orange },
  ]) : [];

  return (
    <div style={{
      background: P.surface, borderRadius: 14, border: `1px solid ${P.border}`,
      borderLeft: `4px solid ${statusBorderColor}`,
      marginBottom: 16, overflow: "hidden", transition: "all 0.2s ease",
      boxShadow: expanded ? "0 6px 24px rgba(15,23,42,0.10)" : "0 2px 10px rgba(15,23,42,0.04)",
    }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", padding: "18px 24px",
          cursor: "pointer", gap: 12, transition: "background 0.15s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {expanded ? <ChevronDown size={18} color={P.muted} /> : <ChevronRight size={18} color={P.muted} />}
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, color: P.text, fontSize: 16 }}>{election.title}</span>
          {isProvincial && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: P.purpleBg, color: P.purple }}>Provincial</span>
          )}
          {isLocal && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: P.orangeBg, color: P.orange }}>Local</span>
          )}
          <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>
            {election.start_date && `${new Date(election.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            {election.constituency_count && ` · ${election.constituency_count} constituencies`}
          </div>
        </div>
        <StatusBadge status={election.status} />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 24px 24px", borderTop: `1px solid ${P.border}` }}>
          {detailLoading ? (
            <SkeletonRows count={5} />
          ) : (
            <>
              <CountRunPanel
                election={election}
                countRuns={countRuns}
                selectedRunId={selectedRunId}
                setSelectedRunId={setSelectedRunId}
                actionLoading={actionLoading}
                onInitiate={handleInitiate}
                onExecute={handleExecute}
                onFinalize={handleFinalize}
                onLock={handleLock}
              />

              {/* Summary KPI */}
              {summaryCards.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20, marginTop: 4 }}>
                  {summaryCards.map((c, i) => (
                    <div key={i} style={{
                      background: P.surface, borderRadius: 14, padding: "16px 20px",
                      border: `1px solid ${P.border}`, borderLeft: `3px solid ${c.color}`,
                      transition: "all 0.2s ease",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${c.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <c.icon size={18} color={c.color} />
                        </div>
                        <span style={{ fontSize: 11, color: P.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: P.text }}>{c.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Adjudication warnings */}
              {summary && (summary.fptp.adjudication_required > 0 || (!isLocal && summary.pr.adjudication_required > 0)) && (
                <div style={{
                  padding: "14px 18px", borderRadius: 12, background: P.warnBg, border: "1.5px solid #FCD34D",
                  color: P.warn, marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <ShieldAlert size={18} />
                  <span>
                    <strong>Adjudication required:</strong>
                    {summary.fptp.adjudication_required > 0 && ` ${summary.fptp.adjudication_required} ${isLocal ? "contest" : "FPTP"} tie(s).`}
                    {!isLocal && summary.pr.adjudication_required > 0 && ` PR seat-boundary quotient tie.`}
                    {" "}Finalization is blocked until resolved.
                  </span>
                </div>
              )}

              {isLocal && localSummary && <LocalResultSection localSummary={localSummary} />}
              {!isLocal && fptpRows.length > 0 && <FptpResultsTable rows={fptpRows} />}
              {!isLocal && prRows.length > 0 && <PrResultsTable rows={prRows} />}
              {isProvincial && provincialSummary && <ProvincialSummarySection summary={provincialSummary} />}
              {isProvincial && prElectedMembers.length > 0 && <PrElectedMembersTable members={prElectedMembers} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
