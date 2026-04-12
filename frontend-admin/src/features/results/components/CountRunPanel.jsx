import React from "react";
import { Play, Award, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { CountStatusBadge } from "./ResultStatusBadge";

const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF",
  border: "#DCE3EC", text: "#0F172A", muted: "#64748B",
  success: "#059669", orange: "#EA580C",
};

function actionBtnStyle(color, disabled) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 10, border: "none",
    background: color, color: "#fff", fontSize: 13,
    fontWeight: 700, cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1, transition: "all 0.2s ease",
  };
}

/* ── Count Run Timeline ─────────────────────────────────────── */
function CountRunTimeline({ run }) {
  if (!run) return null;
  const steps = [
    { label: "Pending", active: true, completed: run.status !== "PENDING" },
    { label: "Running", active: run.status === "RUNNING", completed: ["COMPLETED", "FAILED"].includes(run.status) },
    { label: "Completed", active: run.status === "COMPLETED", completed: run.is_final },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 12 }}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: step.completed ? P.success : step.active ? P.accent : "#E2E8F0",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s ease",
            }}>
              {step.completed ? (
                <CheckCircle2 size={14} color="#fff" />
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: step.active ? "#fff" : P.muted }}>{i + 1}</span>
              )}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: step.completed ? P.success : step.active ? P.text : P.muted }}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 32, height: 2, background: step.completed ? P.success : "#E2E8F0", margin: "0 8px", borderRadius: 1 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function CountRunPanel({
  election, countRuns, selectedRunId, setSelectedRunId,
  actionLoading, onInitiate, onExecute, onFinalize, onLock,
}) {
  const selectedRun = countRuns.find((r) => r.id === selectedRunId);

  return (
    <div style={{ marginTop: 16, marginBottom: 16 }}>
      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        {["POLLING_CLOSED", "COUNTING"].includes(election.status) && (
          <button
            disabled={!!actionLoading}
            onClick={onInitiate}
            style={actionBtnStyle(P.accent, !!actionLoading)}
          >
            {actionLoading === `init-${election.id}` ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
            New Count Run
          </button>
        )}
        {countRuns.length > 0 && (
          <select
            value={selectedRunId || ""}
            onChange={(e) => setSelectedRunId(Number(e.target.value))}
            style={{
              padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${P.border}`,
              fontSize: 13, color: P.text, background: P.surface, fontWeight: 600,
              outline: "none", cursor: "pointer",
            }}
          >
            {countRuns.map((r) => (
              <option key={r.id} value={r.id}>
                Run #{r.id} — {r.status}{r.is_final ? " ★ FINAL" : ""}{r.is_locked ? " 🔒" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Selected run: timeline + actions */}
      {selectedRun && (
        <>
          <CountRunTimeline run={selectedRun} />
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {selectedRun.status === "PENDING" && (
              <button
                disabled={!!actionLoading}
                onClick={() => onExecute(selectedRun.id)}
                style={actionBtnStyle(P.orange, !!actionLoading)}
              >
                {actionLoading === `exec-${selectedRun.id}` ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
                Execute Count
              </button>
            )}
            {selectedRun.status === "COMPLETED" && !selectedRun.is_final && (
              <button
                disabled={!!actionLoading}
                onClick={() => onFinalize(selectedRun.id)}
                style={actionBtnStyle(P.success, !!actionLoading)}
              >
                {actionLoading === `fin-${selectedRun.id}` ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Award size={14} />}
                Finalize
              </button>
            )}
            {["COMPLETED", "FAILED"].includes(selectedRun.status) && !selectedRun.is_locked && (
              <button
                disabled={!!actionLoading}
                onClick={() => onLock(selectedRun.id)}
                style={actionBtnStyle("#475569", !!actionLoading)}
              >
                {actionLoading === `lock-${selectedRun.id}` ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Lock size={14} />}
                Lock
              </button>
            )}
            <CountStatusBadge status={selectedRun.status} />
            {selectedRun.is_final && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: P.success }}>
                <CheckCircle2 size={14} /> Final
              </span>
            )}
            {selectedRun.is_locked && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: P.muted }}>
                <Lock size={14} /> Locked
              </span>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
