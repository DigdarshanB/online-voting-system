/**
 * VoterElectionsHub.jsx
 *
 * Hub page at /elections — shows Federal / Provincial / Local level cards.
 * Fetches all eligible elections on load to derive live status chips
 * and the voter's overall voting progress counter.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Vote, Landmark, Building2, MapPin, CheckCircle2 } from "lucide-react";
import apiClient from "../lib/apiClient";
import { useLanguage } from "../lib/LanguageContext";
import { VT } from "../lib/voterTokens";
import {
  VoterKeyframes,
  VoterPageContainer,
  VoterHubBanner,
  VoterLevelCard,
  VoterProgressSteps,
} from "../components/VoterUI";

/* ── Level definitions ────────────────────────────────────────── */
const LEVELS = [
  {
    key: "FEDERAL",
    slug: "federal",
    label: "Federal Elections",
    icon: Landmark,
    color: VT.federal.color,
    bg: VT.federal.bg,
    border: VT.federal.border,
    description:
      "House of Representatives — your constituency FPTP vote and nationwide Proportional Representation vote.",
    cta: "View Federal Elections",
  },
  {
    key: "PROVINCIAL",
    slug: "provincial",
    label: "Provincial Elections",
    icon: Building2,
    color: VT.provincial.color,
    bg: VT.provincial.bg,
    border: VT.provincial.border,
    description:
      "Provincial Assembly — your province's constituency seat contests and proportional representation seats.",
    cta: "View Provincial Elections",
  },
  {
    key: "LOCAL",
    slug: "local",
    label: "Local Elections",
    icon: MapPin,
    color: VT.local.color,
    bg: VT.local.bg,
    border: VT.local.border,
    description:
      "Municipal & Rural Municipal — your mayor, deputy mayor, ward chair, and ward member elections.",
    cta: "View Local Elections",
  },
];

/* ── Voter process steps ──────────────────────────────────────── */
const PROCESS_STEPS = [
  {
    label: "Find Your Elections",
    description: "Browse the elections you are eligible for by government level.",
    done: false,
  },
  {
    label: "Review Candidates",
    description: "Check approved candidate profiles and party information before you vote.",
    done: false,
  },
  {
    label: "Cast Your Ballot",
    description: "Submit your vote securely and receive a confirmation receipt.",
    done: false,
  },
];

/* ── Helpers ──────────────────────────────────────────────────── */
function deriveLiveChips(elections, levelKey, vt) {
  const subset = elections.filter((e) => e.government_level === levelKey);
  if (subset.length === 0) {
    return [{ label: "No elections", color: vt.muted, bg: vt.surfaceSubtle, border: vt.border }];
  }
  const open = subset.filter((e) => e.status === "POLLING_OPEN").length;
  const voted = subset.filter((e) => e.has_voted).length;
  const chips = [];
  if (open > 0) {
    chips.push({ label: `${open} Open`, color: VT.status.POLLING_OPEN.color, bg: VT.status.POLLING_OPEN.bg, border: VT.status.POLLING_OPEN.border });
  } else {
    chips.push({ label: `${subset.length} Election${subset.length !== 1 ? "s" : ""}`, color: vt.textSecondary, bg: vt.surfaceSubtle, border: vt.border });
  }
  if (voted > 0) {
    chips.push({ label: `${voted} Voted`, color: VT.success, bg: VT.successBg, border: VT.successBorder });
  }
  return chips;
}

function allVotedForLevel(elections, levelKey) {
  const openable = elections.filter(
    (e) => e.government_level === levelKey && e.status === "POLLING_OPEN"
  );
  return openable.length > 0 && openable.every((e) => e.has_voted);
}

/* ══════════════════════════════════════════════════════════════ */
export default function VoterElectionsHub() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/voter/elections/")
      .then((res) => setElections(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Overall voting progress counter */
  const totalOpen = elections.filter((e) => e.status === "POLLING_OPEN").length;
  const totalVoted = elections.filter((e) => e.status === "POLLING_OPEN" && e.has_voted).length;
  const progressBadge =
    totalOpen > 0 ? `${totalVoted} of ${totalOpen} voted` : null;

  return (
    <VoterPageContainer>
      <VoterKeyframes />

      {/* ── Banner ───────────────────────────────────────────── */}
      <VoterHubBanner
        icon={Vote}
        title={t("elections.title")}
        subtitle={t("elections.subtitle")}
        badge={progressBadge}
      />

      {/* ── Level cards ──────────────────────────────────────── */}
      <ul
        role="list"
        aria-label="Election levels"
        className="voter-hub-grid"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          gap: 20,
          marginBottom: VT.space["3xl"],
        }}
      >
        {LEVELS.map((level) => {
          const allVoted = !loading && allVotedForLevel(elections, level.key);
          const chips = loading
            ? [{ label: "Loading…", color: VT.muted, bg: VT.surfaceSubtle, border: VT.border }]
            : deriveLiveChips(elections, level.key, VT);

          return (
            <li key={level.key}>
              <VoterLevelCard
                icon={level.icon}
                title={level.label}
                description={level.description}
                chips={chips.map((c) => ({
                  label: c.label,
                  color: c.color,
                  bg: c.bg,
                  border: c.border,
                }))}
                cta={allVoted ? "✓ All voted" : level.cta}
                ctaColor={allVoted ? VT.success : level.color}
                onClick={() => navigate(`/elections/${level.slug}`)}
              />
            </li>
          );
        })}
      </ul>

      {/* ── Process step panel ───────────────────────────────── */}
      <VoterProgressSteps steps={PROCESS_STEPS} />
    </VoterPageContainer>
  );
}
