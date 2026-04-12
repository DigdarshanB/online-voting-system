import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Landmark,
  Building2,
  MapPin,
  Users,
  AlertCircle,
  MapPinned,
  CalendarOff,
  ChevronRight,
} from "lucide-react";
import apiClient from "../lib/apiClient";

/* ─── Injected CSS (once) ────────────────────────────────────── */
const STYLE_ID = "vcf-shimmer-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = `
    @keyframes vcfShimmer {
      0%   { background-position: -400px 0 }
      100% { background-position: 400px 0 }
    }
    @keyframes vcfPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
  `;
  document.head.appendChild(tag);
}

const PALETTE = {
  appBg: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  surfaceSubtle: "#F1F5F9",
  navy: "#173B72",
  text: "#0F172A",
  textSecondary: "#475569",
  muted: "#64748B",
  subtle: "#94A3B8",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  accent: "#2F6FED",
  accentLight: "#EBF2FF",
  purple: "#7C3AED",
  purpleBg: "#F5F3FF",
  orange: "#EA580C",
  orangeBg: "#FFF7ED",
  success: "#059669",
  successBg: "#ECFDF5",
  error: "#DC2626",
  errorBg: "#FEF2F2",
};

const FAMILY_META = {
  federal: {
    label: "Federal Elections",
    icon: Landmark,
    color: PALETTE.accent,
    bg: PALETTE.accentLight,
    bgStrong: "#DBEAFE",
  },
  provincial: {
    label: "Provincial Elections",
    icon: Building2,
    color: PALETTE.purple,
    bg: PALETTE.purpleBg,
    bgStrong: "#EDE9FE",
  },
  local: {
    label: "Local Elections",
    icon: MapPin,
    color: PALETTE.orange,
    bg: PALETTE.orangeBg,
    bgStrong: "#FFEDD5",
  },
};

const CONTEST_TYPE_LABELS = {
  FPTP: "First Past The Post (FPTP)",
  PR: "Proportional Representation (PR)",
  MAYOR: "Mayor / Chairperson",
  DEPUTY_MAYOR: "Deputy Mayor / Vice-Chairperson",
  WARD_CHAIR: "Ward Chairperson",
  WARD_WOMAN_MEMBER: "Ward Woman Member",
  WARD_DALIT_WOMAN_MEMBER: "Ward Dalit Woman Member",
  WARD_MEMBER_OPEN: "Ward Member (Open)",
};

const CONTEST_ICONS = {
  MAYOR: "\u{1F3DB}",
  DEPUTY_MAYOR: "\u{1F3DB}",
  WARD_CHAIR: "\u{1F3D8}",
  WARD_WOMAN_MEMBER: "\u{1F465}",
  WARD_DALIT_WOMAN_MEMBER: "\u{1F465}",
  WARD_MEMBER_OPEN: "\u{1F465}",
  FPTP: "\u{1F5F3}",
  PR: "\u{1F4CA}",
};

const CONTEST_TYPE_COLORS = {
  FPTP: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  PR: { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  MAYOR: { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" },
  DEPUTY_MAYOR: { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74" },
  WARD_CHAIR: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  WARD_WOMAN_MEMBER: { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  WARD_DALIT_WOMAN_MEMBER: { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  WARD_MEMBER_OPEN: { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" },
};

const STATUS_DISPLAY = {
  POLLING_OPEN: { bg: "#DCFCE7", text: "#166534", label: "Polling Open" },
  POLLING_CLOSED: { bg: "#FEF3C7", text: "#92400E", label: "Polling Closed" },
  COUNTING: { bg: "#DBEAFE", text: "#1E40AF", label: "Counting" },
  FINALIZED: { bg: "#F0FDF4", text: "#166534", label: "Finalized" },
  ARCHIVED: { bg: "#F1F5F9", text: "#475569", label: "Archived" },
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/* ─── Shimmer bar helper ─────────────────────────────────────── */
function ShimmerBar({ width, height, radius = 6, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${PALETTE.surfaceSubtle} 25%, ${PALETTE.borderLight} 50%, ${PALETTE.surfaceSubtle} 75%)`,
        backgroundSize: "800px 100%",
        animation: "vcfShimmer 1.6s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/* ─── Initials helper ────────────────────────────────────────── */
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function VoterCandidatesByFamily() {
  const { family } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const meta = FAMILY_META[family] || FAMILY_META.federal;
  const FamilyIcon = meta.icon;

  useEffect(() => {
    if (!family) return;
    setLoading(true);
    setError("");
    apiClient
      .get(`/voter/elections/candidates/${family.toUpperCase()}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.detail || "Failed to load nominated candidates"
        );
        setLoading(false);
      });
  }, [family]);

  const hasElections = data && data.elections && data.elections.length > 0;

  return (
    <div
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Back link */}
      <button
        onClick={() => navigate("/candidates")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px 6px 8px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: PALETTE.muted,
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 8,
          marginBottom: 20,
          transition: "color 0.15s ease, background 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = PALETTE.text;
          e.currentTarget.style.background = PALETTE.surfaceSubtle;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = PALETTE.muted;
          e.currentTarget.style.background = "transparent";
        }}
      >
        <ArrowLeft size={16} />
        All Election Levels
      </button>

      {/* Hero header */}
      <div
        style={{
          background: PALETTE.surface,
          border: `1px solid ${PALETTE.border}`,
          borderRadius: 18,
          padding: "24px 26px",
          marginBottom: 8,
          borderTop: `4px solid ${meta.color}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: meta.bgStrong,
              border: `1px solid ${meta.color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FamilyIcon size={26} color={meta.color} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 800,
                color: PALETTE.navy,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              {meta.label}
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                color: PALETTE.muted,
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              Nominated candidates for your eligible contests
            </p>
          </div>
        </div>
      </div>

      {/* Voter area badge */}
      {data?.voter_area && (
        <VoterAreaBadge area={data.voter_area} color={meta.color} />
      )}

      {/* Status banner */}
      {!loading && !error && data && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 4,
            padding: "12px 18px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: hasElections ? PALETTE.successBg : PALETTE.surfaceSubtle,
            border: `1px solid ${hasElections ? "#A7F3D0" : PALETTE.border}`,
          }}
        >
          {hasElections ? (
            <>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: PALETTE.success,
                  display: "inline-block",
                  animation: "vcfPulse 1.5s ease-in-out infinite",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#065F46",
                }}
              >
                Polling is Open
              </span>
              <span style={{ fontSize: 13, color: "#047857" }}>
                — {data.elections.length} election{data.elections.length > 1 ? "s" : ""} active for your area
              </span>
            </>
          ) : (
            <>
              <CalendarOff
                size={16}
                color={PALETTE.muted}
                style={{ flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: PALETTE.muted, fontWeight: 600 }}>
                No elections are currently open for polling
              </span>
            </>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && <LoadingSkeleton />}

      {/* Error state */}
      {error && (
        <div
          style={{
            marginTop: 24,
            padding: "20px 24px",
            background: PALETTE.errorBg,
            border: `1px solid #FECACA`,
            borderRadius: 12,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <AlertCircle
            size={20}
            color={PALETTE.error}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: 14,
                color: PALETTE.error,
              }}
            >
              Error loading candidates
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "#991B1B",
              }}
            >
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.elections.length === 0 && (
        <div
          style={{
            marginTop: 24,
            padding: "48px 24px",
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 18,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: PALETTE.surfaceSubtle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <CalendarOff size={32} color={PALETTE.subtle} strokeWidth={1.6} />
          </div>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 19,
              fontWeight: 800,
              color: PALETTE.text,
            }}
          >
            No Elections Are Currently Open
          </h3>
          <p
            style={{
              margin: "0 auto 24px",
              fontSize: 14,
              color: PALETTE.muted,
              maxWidth: 420,
              lineHeight: 1.55,
            }}
          >
            Candidates will appear here once polling begins for your registered
            area. Check back later or view Results for past elections.
          </p>
          <button
            onClick={() => navigate("/results")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 22px",
              background: PALETTE.accent,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1D5ED9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = PALETTE.accent)}
          >
            View Election Results
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Election sections */}
      {!loading &&
        !error &&
        data &&
        data.elections.map((election) => (
          <ElectionSection
            key={election.id}
            election={election}
            familyColor={meta.color}
          />
        ))}
    </div>
  );
}

/* ─── Voter Area Badge ────────────────────────────────────────── */
function VoterAreaBadge({ area, color }) {
  let label = "";
  if (area.type === "constituency") {
    label = `${area.name}${area.district_name ? `, ${area.district_name}` : ""}`;
  } else if (area.type === "provincial_constituency") {
    label = `${area.name} (Province ${area.province_number})`;
  } else if (area.type === "ward") {
    label = `${area.ward_name}${area.local_body_name ? `, ${area.local_body_name}` : ""}`;
    if (area.province_number) label += ` (Province ${area.province_number})`;
  }

  if (!label) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: PALETTE.surface,
        borderRadius: 12,
        border: `1px solid ${PALETTE.border}`,
        marginTop: 16,
        marginBottom: 4,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: PALETTE.surfaceSubtle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <MapPinned size={16} color={color} strokeWidth={2.2} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: PALETTE.muted, letterSpacing: "0.02em", textTransform: "uppercase" }}>
          Your Voting Area
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: PALETTE.text, marginTop: 1 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/* ─── Election Section ────────────────────────────────────────── */
function ElectionSection({ election, familyColor }) {
  const statusInfo = STATUS_DISPLAY[election.status] || {
    bg: "#F1F5F9",
    text: "#475569",
    label: election.status,
  };

  const formatDate = (iso) => {
    if (!iso) return "\u2014";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Separate FPTP/single-seat contests from PR
  const fptpContests = election.contests.filter((c) => c.contest_type !== "PR");
  const prContests = election.contests.filter((c) => c.contest_type === "PR");

  return (
    <section
      style={{
        marginTop: 24,
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      {/* Election header — colored top border */}
      <div
        style={{
          borderTop: `4px solid ${familyColor}`,
          padding: "20px 24px",
          borderBottom: `1px solid ${PALETTE.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: PALETTE.text,
              lineHeight: 1.3,
            }}
          >
            {election.title}
          </h2>
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 8,
              flexWrap: "wrap",
              fontSize: 12,
              color: PALETTE.muted,
            }}
          >
            {election.polling_start_at && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Start:</span> {formatDate(election.polling_start_at)}
              </span>
            )}
            {election.polling_end_at && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 600 }}>End:</span> {formatDate(election.polling_end_at)}
              </span>
            )}
            {election.province_code && (
              <span>Province: {election.province_code}</span>
            )}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            background: statusInfo.bg,
            color: statusInfo.text,
            whiteSpace: "nowrap",
          }}
        >
          {election.status === "POLLING_OPEN" && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#059669",
                display: "inline-block",
                animation: "vcfPulse 1.5s ease-in-out infinite",
              }}
            />
          )}
          {statusInfo.label}
        </span>
      </div>

      {/* Contests */}
      <div style={{ padding: "4px 0 8px" }}>
        {fptpContests.length === 0 && prContests.length === 0 && (
          <div
            style={{
              padding: "32px 22px",
              textAlign: "center",
              color: PALETTE.muted,
              fontSize: 14,
            }}
          >
            No approved nominations yet for your contests in this election.
          </div>
        )}

        {fptpContests.map((contest) => (
          <ContestBlock key={contest.contest_id} contest={contest} />
        ))}

        {prContests.map((contest) => (
          <PrContestBlock key={contest.contest_id} contest={contest} />
        ))}
      </div>
    </section>
  );
}

/* ─── Contest Block (FPTP / single-seat) ─────────────────────── */
function ContestBlock({ contest }) {
  const typeColor = CONTEST_TYPE_COLORS[contest.contest_type] || {
    bg: "#F1F5F9",
    text: "#475569",
    border: "#CBD5E1",
  };
  const typeLabel =
    CONTEST_TYPE_LABELS[contest.contest_type] || contest.contest_type;
  const icon = CONTEST_ICONS[contest.contest_type] || "\u{1F5F3}";
  const count = contest.candidates ? contest.candidates.length : 0;

  return (
    <div
      style={{
        padding: "18px 24px",
        borderBottom: `1px solid ${PALETTE.borderLight}`,
      }}
    >
      {/* Contest header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 7,
            fontSize: 11,
            fontWeight: 700,
            background: typeColor.bg,
            color: typeColor.text,
            border: `1px solid ${typeColor.border}`,
          }}
        >
          {typeLabel}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: PALETTE.text,
          }}
        >
          {contest.contest_title}
        </span>
        {contest.seat_count > 1 && (
          <span
            style={{
              fontSize: 11,
              color: PALETTE.muted,
              fontWeight: 600,
            }}
          >
            ({contest.seat_count} seats)
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            color: PALETTE.subtle,
            fontWeight: 600,
            marginLeft: "auto",
          }}
        >
          {count > 0 ? `${count} candidate${count > 1 ? "s" : ""}` : "No candidates yet"}
        </span>
      </div>

      {/* Candidates */}
      {count === 0 && (
        <p style={{ fontSize: 13, color: PALETTE.muted, margin: 0 }}>
          No approved candidates for this contest yet.
        </p>
      )}
      {count > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
            gap: 12,
          }}
        >
          {contest.candidates.map((c) => (
            <CandidateCard key={c.nomination_id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── PR Contest Block ───────────────────────────────────────── */
function PrContestBlock({ contest }) {
  const typeColor = CONTEST_TYPE_COLORS.PR;
  const count = contest.parties ? contest.parties.length : 0;

  return (
    <div
      style={{
        padding: "18px 24px",
        borderBottom: `1px solid ${PALETTE.borderLight}`,
        background: "#FDFCFF",
      }}
    >
      {/* Contest header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 16 }}>{CONTEST_ICONS.PR}</span>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 7,
            fontSize: 11,
            fontWeight: 700,
            background: typeColor.bg,
            color: typeColor.text,
            border: `1px solid ${typeColor.border}`,
          }}
        >
          Proportional Representation (PR)
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: PALETTE.text,
          }}
        >
          {contest.contest_title}
        </span>
        {contest.seat_count > 0 && (
          <span
            style={{
              fontSize: 11,
              color: PALETTE.muted,
              fontWeight: 600,
            }}
          >
            ({contest.seat_count} seats)
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            color: PALETTE.subtle,
            fontWeight: 600,
            marginLeft: "auto",
          }}
        >
          {count > 0 ? `${count} part${count > 1 ? "ies" : "y"}` : "No parties yet"}
        </span>
      </div>

      {/* Parties */}
      {count === 0 && (
        <p style={{ fontSize: 13, color: PALETTE.muted, margin: 0 }}>
          No approved party submissions for this contest yet.
        </p>
      )}
      {count > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
            gap: 12,
          }}
        >
          {contest.parties.map((p) => (
            <PartyCard key={p.party_id} party={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Candidate Card ─────────────────────────────────────────── */
function CandidateCard({ candidate }) {
  const photoUrl = candidate.candidate_photo_path
    ? `${API_BASE}/uploads/${candidate.candidate_photo_path}`
    : null;
  const symbolUrl = candidate.party_symbol_path
    ? `${API_BASE}/uploads/${candidate.party_symbol_path}`
    : null;
  const initials = getInitials(candidate.candidate_name);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        background: PALETTE.surfaceSubtle,
        borderRadius: 12,
        border: `1px solid ${PALETTE.borderLight}`,
        transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = PALETTE.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = PALETTE.borderLight;
      }}
    >
      {/* Photo — 56×56 with initials fallback */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: photoUrl ? PALETTE.surface : PALETTE.accent + "12",
          border: `1.5px solid ${photoUrl ? PALETTE.border : PALETTE.accent + "25"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={candidate.candidate_name}
            style={{ width: 56, height: 56, objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: PALETTE.accent,
              letterSpacing: "0.02em",
            }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: PALETTE.text,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {candidate.candidate_name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 4,
          }}
        >
          {symbolUrl && (
            <img
              src={symbolUrl}
              alt=""
              style={{
                width: 18,
                height: 18,
                objectFit: "contain",
                borderRadius: 4,
                border: `1px solid ${PALETTE.borderLight}`,
              }}
            />
          )}
          <span
            style={{
              fontSize: 12.5,
              color: PALETTE.muted,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {candidate.party_name || "Independent"}
            {candidate.party_abbreviation
              ? ` (${candidate.party_abbreviation})`
              : ""}
          </span>
        </div>
        {candidate.candidate_number && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              fontWeight: 600,
              color: PALETTE.subtle,
            }}
          >
            #{candidate.candidate_number}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Party Card (PR) ────────────────────────────────────────── */
function PartyCard({ party }) {
  const symbolUrl = party.party_symbol_path
    ? `${API_BASE}/uploads/${party.party_symbol_path}`
    : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        background: "#F5F3FF",
        borderRadius: 12,
        border: `1px solid #EDE9FE`,
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(124,58,237,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Symbol — 48×48 */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: PALETTE.surface,
          border: `1.5px solid ${PALETTE.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {symbolUrl ? (
          <img
            src={symbolUrl}
            alt={party.party_name}
            style={{ width: 36, height: 36, objectFit: "contain" }}
          />
        ) : (
          <Users size={22} color={PALETTE.subtle} strokeWidth={1.6} />
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: PALETTE.text,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {party.party_name}
        </div>
        {party.party_abbreviation && (
          <div
            style={{
              display: "inline-block",
              marginTop: 4,
              padding: "2px 8px",
              borderRadius: 5,
              fontSize: 11,
              fontWeight: 600,
              color: PALETTE.purple,
              background: "#EDE9FE",
            }}
          >
            {party.party_abbreviation}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Loading Skeleton ───────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div style={{ marginTop: 24 }}>
      {[1, 2].map((i) => (
        <div
          key={i}
          style={{
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 18,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {/* Header skeleton */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: `1px solid ${PALETTE.borderLight}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <ShimmerBar width={220} height={18} style={{ marginBottom: 10 }} />
              <ShimmerBar width={320} height={14} />
            </div>
            <ShimmerBar width={90} height={28} radius={8} />
          </div>
          {/* Contest skeleton */}
          <div style={{ padding: "18px 24px" }}>
            <ShimmerBar width={160} height={26} radius={7} style={{ marginBottom: 14 }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
                gap: 12,
              }}
            >
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: PALETTE.surfaceSubtle,
                  }}
                >
                  <ShimmerBar width={56} height={56} radius={12} />
                  <div style={{ flex: 1 }}>
                    <ShimmerBar width="70%" height={15} style={{ marginBottom: 8 }} />
                    <ShimmerBar width="50%" height={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
