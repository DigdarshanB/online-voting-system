/**
 * VoterResultsLevel.jsx
 *
 * Level results list page at /results/:level (federal | provincial | local).
 * Shows all elections with published/counting results for that government level.
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Landmark, Building2, MapPin, BarChart3, Search } from "lucide-react";
import apiClient from "../lib/apiClient";
import { VT } from "../lib/voterTokens";
import {
  VoterKeyframes,
  VoterPageContainer,
  VoterBackLink,
  VoterSummaryStrip,
  VoterMetricCard,
  VoterResultCard,
  VoterEmptyState,
  VoterStatusBadge,
} from "../components/VoterUI";

/* ── Level meta ───────────────────────────────────────────────── */
const LEVEL_META = {
  federal: {
    key: "FEDERAL",
    label: "Federal Results",
    icon: Landmark,
    color: VT.federal.color,
    bg: VT.federal.bg,
    border: VT.federal.border,
    emptyMsg: "No Federal election results are available yet.",
  },
  provincial: {
    key: "PROVINCIAL",
    label: "Provincial Results",
    icon: Building2,
    color: VT.provincial.color,
    bg: VT.provincial.bg,
    border: VT.provincial.border,
    emptyMsg: "No Provincial election results are available yet.",
  },
  local: {
    key: "LOCAL",
    label: "Local Results",
    icon: MapPin,
    color: VT.local.color,
    bg: VT.local.bg,
    border: VT.local.border,
    emptyMsg: "No Local election results are available yet.",
  },
};

const RESULTS_STATUSES = new Set(["FINALIZED", "ARCHIVED", "COUNTING"]);

/* ── Skeleton result card ─────────────────────────────────────── */
function ResultSkeleton() {
  return (
    <div
      style={{
        background: VT.surface,
        border: `1px solid ${VT.border}`,
        borderRadius: VT.radius.lg,
        padding: "18px 22px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: VT.shadow.sm,
      }}
    >
      <div className="voter-skeleton" style={{ width: 40, height: 40, borderRadius: VT.radius.md }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="voter-skeleton" style={{ width: "50%", height: 16 }} />
        <div className="voter-skeleton" style={{ width: "30%", height: 12 }} />
      </div>
      <div className="voter-skeleton" style={{ width: 80, height: 22 }} />
      <div className="voter-skeleton" style={{ width: 16, height: 16 }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function VoterResultsLevel({ level: levelProp }) {
  const params = useParams();
  const navigate = useNavigate();
  const level = levelProp || params.level;
  const meta = LEVEL_META[level?.toLowerCase()];

  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiClient
      .get("/voter/elections/")
      .then((res) => {
        const all = res.data || [];
        if (meta) {
          setElections(
            all.filter(
              (e) => e.government_level === meta.key && RESULTS_STATUSES.has(e.status)
            )
          );
        } else {
          setElections([]);
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Failed to load results.");
      })
      .finally(() => setLoading(false));
  }, [meta]);

  if (!meta) {
    return (
      <VoterPageContainer>
        <VoterBackLink to="/results">Results Hub</VoterBackLink>
        <p style={{ color: VT.error, fontSize: 14 }}>Unknown results level.</p>
      </VoterPageContainer>
    );
  }

  const Icon = meta.icon;

  const filtered = elections.filter(
    (e) =>
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.election_subtype?.toLowerCase().includes(search.toLowerCase())
  );

  const finalized = elections.filter((e) => e.status === "FINALIZED" || e.status === "ARCHIVED").length;
  const counting  = elections.filter((e) => e.status === "COUNTING").length;

  return (
    <VoterPageContainer>
      <VoterKeyframes />

      {/* ── Back link ─────────────────────────────────────────── */}
      <VoterBackLink to="/results">Results Hub</VoterBackLink>

      {/* ── Level header ──────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: VT.space["2xl"],
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 52, height: 52,
            borderRadius: VT.radius.lg,
            background: meta.bg,
            border: `1px solid ${meta.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={26} color={meta.color} strokeWidth={2.2} />
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(20px, 2.4vw, 28px)",
              fontWeight: 800,
              color: VT.navy,
              lineHeight: 1.2,
            }}
          >
            {meta.label}
          </h1>
          <span
            style={{
              display: "inline-block",
              marginTop: 6,
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 10px",
              borderRadius: 5,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.border}`,
            }}
          >
            {level?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Summary strip ─────────────────────────────────────── */}
      {!loading && !error && (
        <VoterSummaryStrip>
          <VoterMetricCard label="Total Results" value={elections.length} color={VT.navy} />
          <VoterMetricCard label="Finalized" value={finalized} color={VT.success} />
          <VoterMetricCard label="Counting" value={counting} color={VT.status.COUNTING.color} />
        </VoterSummaryStrip>
      )}

      {/* ── Search ────────────────────────────────────────────── */}
      {!loading && !error && elections.length > 0 && (
        <div style={{ position: "relative", marginBottom: VT.space.lg }}>
          <Search
            size={16}
            color={VT.muted}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            type="text"
            placeholder={`Search ${meta.label.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              height: 42,
              borderRadius: VT.radius.lg,
              border: `1px solid ${VT.border}`,
              padding: "0 14px 0 40px",
              fontSize: 14,
              color: VT.text,
              fontFamily: "inherit",
              background: VT.surface,
              outline: "none",
              boxSizing: "border-box",
              transition: VT.transition,
            }}
            onFocus={(e) => { e.target.style.borderColor = VT.accent; e.target.style.boxShadow = VT.focusRing; }}
            onBlur={(e) => { e.target.style.borderColor = VT.border; e.target.style.boxShadow = "none"; }}
          />
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            padding: "14px 20px",
            background: VT.errorBg,
            border: `1px solid ${VT.errorBorder}`,
            borderRadius: VT.radius.lg,
            color: VT.error,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Loading skeletons ─────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ResultSkeleton />
          <ResultSkeleton />
          <ResultSkeleton />
        </div>
      )}

      {/* ── Results list ──────────────────────────────────────── */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((election) => (
            <VoterResultCard
              key={election.id}
              election={election}
              onClick={() => navigate(`/results/${election.id}`)}
            />
          ))}
        </div>
      )}

      {/* ── Empty: no results at all ───────────────────────────── */}
      {!loading && !error && elections.length === 0 && (
        <VoterEmptyState
          icon={BarChart3}
          title="No results yet"
          message={meta.emptyMsg}
        />
      )}

      {/* ── Empty: search returned nothing ─────────────────────── */}
      {!loading && !error && elections.length > 0 && filtered.length === 0 && (
        <VoterEmptyState
          icon={Search}
          title="No matches"
          message={`No ${meta.label.toLowerCase()} match "${search}".`}
        />
      )}
    </VoterPageContainer>
  );
}
