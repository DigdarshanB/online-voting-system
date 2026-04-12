/**
 * VoterElectionsLevel.jsx
 *
 * Level list page at /elections/:level (federal | provincial | local).
 * Shows all elections of that government level the voter is eligible for.
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Landmark, Building2, MapPin, Vote } from "lucide-react";
import apiClient from "../lib/apiClient";
import { VT } from "../lib/voterTokens";
import {
  VoterKeyframes,
  VoterPageContainer,
  VoterBackLink,
  VoterSummaryStrip,
  VoterMetricCard,
  VoterElectionCard,
  VoterEmptyState,
  VoterSkeletonCard,
} from "../components/VoterUI";

/* ── Level meta ───────────────────────────────────────────────── */
const LEVEL_META = {
  federal: {
    key: "FEDERAL",
    label: "Federal Elections",
    icon: Landmark,
    color: VT.federal.color,
    bg: VT.federal.bg,
    border: VT.federal.border,
    badgeBg: VT.federal.bg,
    badgeBorder: VT.federal.border,
    emptyMsg: "No Federal elections are available to you at this time.",
  },
  provincial: {
    key: "PROVINCIAL",
    label: "Provincial Elections",
    icon: Building2,
    color: VT.provincial.color,
    bg: VT.provincial.bg,
    border: VT.provincial.border,
    badgeBg: VT.provincial.bg,
    badgeBorder: VT.provincial.border,
    emptyMsg: "No Provincial elections are available to you at this time.",
  },
  local: {
    key: "LOCAL",
    label: "Local Elections",
    icon: MapPin,
    color: VT.local.color,
    bg: VT.local.bg,
    border: VT.local.border,
    badgeBg: VT.local.bg,
    badgeBorder: VT.local.border,
    emptyMsg: "No Local elections are available to you at this time.",
  },
};

/* ══════════════════════════════════════════════════════════════ */
export default function VoterElectionsLevel({ level: levelProp }) {
  const params = useParams();
  const navigate = useNavigate();
  const level = levelProp || params.level;
  const meta = LEVEL_META[level?.toLowerCase()];

  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient
      .get("/voter/elections/")
      .then((res) => {
        const all = res.data || [];
        if (meta) {
          setElections(all.filter((e) => e.government_level === meta.key));
        } else {
          setElections(all);
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Failed to load elections.");
      })
      .finally(() => setLoading(false));
  }, [meta]);

  /* Redirect unknown level slugs */
  if (!meta) {
    return (
      <VoterPageContainer>
        <VoterBackLink to="/elections">Elections Hub</VoterBackLink>
        <p style={{ color: VT.error, fontSize: 14 }}>Unknown election level.</p>
      </VoterPageContainer>
    );
  }

  const Icon = meta.icon;

  /* Compute summary metrics */
  const total = elections.length;
  const open = elections.filter((e) => e.status === "POLLING_OPEN").length;
  const voted = elections.filter((e) => e.has_voted).length;
  const finalized = elections.filter((e) => e.status === "FINALIZED" || e.status === "ARCHIVED").length;

  return (
    <VoterPageContainer>
      <VoterKeyframes />

      {/* ── Back link ─────────────────────────────────────────── */}
      <VoterBackLink to="/elections">Elections Hub</VoterBackLink>

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
              background: meta.badgeBg,
              color: meta.color,
              border: `1px solid ${meta.badgeBorder}`,
            }}
          >
            {level?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Summary strip ─────────────────────────────────────── */}
      {!loading && !error && (
        <VoterSummaryStrip>
          <VoterMetricCard label="Total Elections" value={total} color={VT.navy} />
          <VoterMetricCard label="Open for Voting" value={open} color={VT.status.POLLING_OPEN.color} />
          <VoterMetricCard label="You Have Voted" value={voted} color={VT.success} />
          <VoterMetricCard label="Finalized / Archived" value={finalized} color={VT.muted} />
        </VoterSummaryStrip>
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
            marginBottom: VT.space.xl,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Loading skeletons ─────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <VoterSkeletonCard />
          <VoterSkeletonCard />
          <VoterSkeletonCard />
        </div>
      )}

      {/* ── Election cards ────────────────────────────────────── */}
      {!loading && !error && elections.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {elections.map((election) => (
            <VoterElectionCard
              key={election.id}
              election={election}
              levelColor={meta.color}
              onVote={(id) => navigate(`/elections/${id}/ballot`)}
              onResults={(id) => navigate(`/results/${id}`)}
            />
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!loading && !error && elections.length === 0 && (
        <VoterEmptyState
          icon={Vote}
          title="No elections available"
          message={meta.emptyMsg}
        />
      )}
    </VoterPageContainer>
  );
}
