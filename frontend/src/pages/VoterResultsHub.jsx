/**
 * VoterResultsHub.jsx
 *
 * Hub page at /results — shows Federal / Provincial / Local level cards.
 * Fetches elections to compute live result counts per level.
 * Each card navigates to /results/:level for the filtered list.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Landmark, Building2, MapPin, TrendingUp } from "lucide-react";
import apiClient from "../lib/apiClient";
import { VT } from "../lib/voterTokens";
import {
  VoterKeyframes,
  VoterPageContainer,
  PortalHero,
  HeroChip,
  HERO_TINTS,
  VoterLevelCard,
  VoterSummaryStrip,
  VoterMetricCard,
} from "../components/VoterUI";

/* ── Level definitions ────────────────────────────────────────── */
const RESULT_LEVELS = [
  {
    key: "FEDERAL",
    slug: "federal",
    label: "Federal Results",
    icon: Landmark,
    color: VT.federal.color,
    bg: VT.federal.bg,
    border: VT.federal.border,
    description:
      "Parliamentary election results — FPTP constituency winners and Proportional Representation seat allocation.",
    cta: "View Federal Results",
  },
  {
    key: "PROVINCIAL",
    slug: "provincial",
    label: "Provincial Results",
    icon: Building2,
    color: VT.provincial.color,
    bg: VT.provincial.bg,
    border: VT.provincial.border,
    description:
      "Provincial Assembly results — constituency winners and assembly composition by party.",
    cta: "View Provincial Results",
  },
  {
    key: "LOCAL",
    slug: "local",
    label: "Local Results",
    icon: MapPin,
    color: VT.local.color,
    bg: VT.local.bg,
    border: VT.local.border,
    description:
      "Municipal & Rural Municipal results — head positions, ward chair winners, and ward member outcomes.",
    cta: "View Local Results",
  },
];

const RESULTS_STATUSES = new Set(["FINALIZED", "ARCHIVED", "COUNTING"]);

function deriveResultChips(elections, levelKey) {
  const subset = elections.filter((e) => e.government_level === levelKey && RESULTS_STATUSES.has(e.status));
  if (subset.length === 0) {
    return [{ label: "No results yet", color: VT.muted, bg: VT.surfaceSubtle, border: VT.border }];
  }
  const finalized = subset.filter((e) => e.status === "FINALIZED" || e.status === "ARCHIVED").length;
  const counting = subset.filter((e) => e.status === "COUNTING").length;
  const chips = [];
  if (finalized > 0) {
    chips.push({ label: `${finalized} Result${finalized !== 1 ? "s" : ""} Published`, color: VT.success, bg: VT.successBg, border: VT.successBorder });
  }
  if (counting > 0) {
    chips.push({ label: `${counting} Counting`, color: VT.status.COUNTING.color, bg: VT.status.COUNTING.bg, border: VT.status.COUNTING.border });
  }
  return chips;
}

/* ══════════════════════════════════════════════════════════════ */
export default function VoterResultsHub() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/voter/elections/")
      .then((res) => setElections(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allWithResults = elections.filter((e) => RESULTS_STATUSES.has(e.status));
  const totalFinalized = allWithResults.filter((e) => e.status === "FINALIZED" || e.status === "ARCHIVED").length;
  const totalCounting  = allWithResults.filter((e) => e.status === "COUNTING").length;
  const resultsBadge   = totalFinalized > 0 ? `${totalFinalized} result${totalFinalized !== 1 ? "s" : ""} available` : null;

  return (
    <VoterPageContainer>
      <VoterKeyframes />

      {/* ── Banner ───────────────────────────────────────────── */}
      <PortalHero
        eyebrow="Election Commission Nepal"
        title="Election Results"
        subtitle="Certified electoral outcomes from finalized contests across Nepal's federal, provincial, and local governance levels."
        rightContent={
          <>
            <HeroChip label="Federal" tint={HERO_TINTS.federal} />
            <HeroChip label="Provincial" tint={HERO_TINTS.provincial} />
            <HeroChip label="Local" tint={HERO_TINTS.local} />
            {resultsBadge && <HeroChip label={resultsBadge} tint={HERO_TINTS.success} />}
          </>
        }
      />

      {/* ── Level cards ──────────────────────────────────────── */}
      <ul
        role="list"
        aria-label="Results by level"
        className="voter-hub-grid"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          gap: 20,
          marginBottom: VT.space["2xl"],
        }}
      >
        {RESULT_LEVELS.map((level) => {
          const chips = loading
            ? [{ label: "Loading…", color: VT.muted, bg: VT.surfaceSubtle, border: VT.border }]
            : deriveResultChips(elections, level.key);

          const hasNoResults = !loading && chips.length === 1 && chips[0].label === "No results yet";

          return (
            <li key={level.key}>
              <VoterLevelCard
                icon={level.icon}
                title={level.label}
                description={level.description}
                chips={chips}
                cta={hasNoResults ? "Check back later" : level.cta}
                ctaColor={hasNoResults ? VT.muted : level.color}
                dimmed={hasNoResults}
                onClick={() => !hasNoResults && navigate(`/results/${level.slug}`)}
              />
            </li>
          );
        })}
      </ul>

      {/* ── Stats strip ──────────────────────────────────────── */}
      {!loading && (
        <VoterSummaryStrip>
          <VoterMetricCard
            label="Results Published"
            value={totalFinalized}
            color={VT.success}
            icon={TrendingUp}
          />
          <VoterMetricCard
            label="Elections Finalized"
            value={elections.filter((e) => e.status === "FINALIZED").length}
            color={VT.federal.color}
          />
          <VoterMetricCard
            label="Being Counted"
            value={totalCounting}
            color={VT.status.COUNTING.color}
          />
        </VoterSummaryStrip>
      )}
    </VoterPageContainer>
  );
}
