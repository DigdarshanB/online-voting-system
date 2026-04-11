import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Landmark,
  Building2,
  MapPin,
  Users,
  User,
  AlertCircle,
  MapPinned,
} from "lucide-react";
import apiClient from "../lib/apiClient";

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

  return (
    <div
      style={{
        maxWidth: 900,
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

      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: meta.bgStrong,
            border: `1px solid ${meta.color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FamilyIcon size={24} color={meta.color} strokeWidth={2.2} />
        </div>
        <div>
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
              margin: "2px 0 0",
              color: PALETTE.muted,
              fontSize: 14,
            }}
          >
            Nominated candidates for your eligible contests
          </p>
        </div>
      </div>

      {/* Voter area badge */}
      {data?.voter_area && (
        <VoterAreaBadge area={data.voter_area} color={meta.color} />
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
            padding: "40px 24px",
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: PALETTE.surfaceSubtle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Users size={28} color={PALETTE.subtle} strokeWidth={1.8} />
          </div>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: 17,
              fontWeight: 700,
              color: PALETTE.text,
            }}
          >
            No eligible nominated candidates
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: PALETTE.muted,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.5,
            }}
          >
            No nominated candidates are available for your registered area in{" "}
            {meta.label.toLowerCase()}. This may be because no elections are
            currently active, or you have not been assigned to a voting area for
            this level.
          </p>
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
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: PALETTE.surfaceSubtle,
        borderRadius: 10,
        border: `1px solid ${PALETTE.border}`,
        marginTop: 16,
        marginBottom: 8,
      }}
    >
      <MapPinned size={15} color={color} strokeWidth={2.2} />
      <span style={{ fontSize: 13, fontWeight: 600, color: PALETTE.text }}>
        Your Voting Area:
      </span>
      <span style={{ fontSize: 13, color: PALETTE.textSecondary }}>
        {label}
      </span>
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
    if (!iso) return "—";
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
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Election header */}
      <div
        style={{
          padding: "18px 22px",
          borderBottom: `1px solid ${PALETTE.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          borderLeft: `4px solid ${familyColor}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
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
              marginTop: 6,
              flexWrap: "wrap",
              fontSize: 12,
              color: PALETTE.muted,
            }}
          >
            {election.polling_start_at && (
              <span>Start: {formatDate(election.polling_start_at)}</span>
            )}
            {election.polling_end_at && (
              <span>End: {formatDate(election.polling_end_at)}</span>
            )}
            {election.province_code && (
              <span>Province: {election.province_code}</span>
            )}
          </div>
        </div>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            background: statusInfo.bg,
            color: statusInfo.text,
            whiteSpace: "nowrap",
          }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Contests */}
      <div style={{ padding: "6px 0" }}>
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

  return (
    <div
      style={{
        padding: "16px 22px",
        borderBottom: `1px solid ${PALETTE.borderLight}`,
      }}
    >
      {/* Contest header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 6,
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
      </div>

      {/* Candidates */}
      {(!contest.candidates || contest.candidates.length === 0) && (
        <p style={{ fontSize: 13, color: PALETTE.muted, margin: 0 }}>
          No approved candidates for this contest yet.
        </p>
      )}
      {contest.candidates && contest.candidates.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 10,
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

  return (
    <div
      style={{
        padding: "16px 22px",
        borderBottom: `1px solid ${PALETTE.borderLight}`,
      }}
    >
      {/* Contest header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 6,
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
      </div>

      {/* Parties */}
      {(!contest.parties || contest.parties.length === 0) && (
        <p style={{ fontSize: 13, color: PALETTE.muted, margin: 0 }}>
          No approved party submissions for this contest yet.
        </p>
      )}
      {contest.parties && contest.parties.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
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

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: PALETTE.surfaceSubtle,
        borderRadius: 10,
        border: `1px solid ${PALETTE.borderLight}`,
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Photo */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: PALETTE.surface,
          border: `1px solid ${PALETTE.border}`,
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
            style={{ width: 40, height: 40, objectFit: "cover" }}
          />
        ) : (
          <User size={20} color={PALETTE.subtle} strokeWidth={1.6} />
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13.5,
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
            gap: 6,
            marginTop: 3,
          }}
        >
          {symbolUrl && (
            <img
              src={symbolUrl}
              alt=""
              style={{
                width: 16,
                height: 16,
                objectFit: "contain",
                borderRadius: 3,
              }}
            />
          )}
          <span
            style={{
              fontSize: 12,
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
        gap: 12,
        padding: "10px 14px",
        background: "#F5F3FF",
        borderRadius: 10,
        border: `1px solid #EDE9FE`,
      }}
    >
      {/* Symbol */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: PALETTE.surface,
          border: `1px solid ${PALETTE.border}`,
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
            style={{ width: 28, height: 28, objectFit: "contain" }}
          />
        ) : (
          <Users size={18} color={PALETTE.subtle} strokeWidth={1.6} />
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13.5,
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
              fontSize: 12,
              color: PALETTE.muted,
              fontWeight: 500,
              marginTop: 2,
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
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: "18px 22px",
              borderBottom: `1px solid ${PALETTE.borderLight}`,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  width: 200,
                  height: 18,
                  background: PALETTE.surfaceSubtle,
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  width: 300,
                  height: 14,
                  background: PALETTE.surfaceSubtle,
                  borderRadius: 4,
                }}
              />
            </div>
            <div
              style={{
                width: 80,
                height: 24,
                background: PALETTE.surfaceSubtle,
                borderRadius: 8,
              }}
            />
          </div>
          <div style={{ padding: "16px 22px" }}>
            <div
              style={{
                width: 140,
                height: 24,
                background: PALETTE.surfaceSubtle,
                borderRadius: 6,
                marginBottom: 12,
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 10,
              }}
            >
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  style={{
                    height: 56,
                    background: PALETTE.surfaceSubtle,
                    borderRadius: 10,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
