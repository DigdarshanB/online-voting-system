import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Landmark,
  Building2,
  MapPin,
  ChevronRight,
  Users,
} from "lucide-react";

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
};

const FAMILIES = [
  {
    key: "federal",
    label: "Federal Elections",
    description:
      "View nominated candidates for House of Representatives direct elections — FPTP constituency candidates and Proportional Representation party lists.",
    icon: Landmark,
    color: PALETTE.accent,
    bg: PALETTE.accentLight,
    bgStrong: "#DBEAFE",
    borderAccent: PALETTE.accent,
    to: "/candidates/federal",
    chips: ["FPTP Candidates", "PR Party Lists"],
  },
  {
    key: "provincial",
    label: "Provincial Elections",
    description:
      "View nominated candidates for your Provincial Assembly — constituency candidates and province-wide party lists.",
    icon: Building2,
    color: PALETTE.purple,
    bg: PALETTE.purpleBg,
    bgStrong: "#EDE9FE",
    borderAccent: PALETTE.purple,
    to: "/candidates/provincial",
    chips: ["Provincial FPTP", "Provincial PR"],
  },
  {
    key: "local",
    label: "Local Elections",
    description:
      "View nominated candidates for your local body — Mayor/Chairperson, Deputy, Ward Chair, and ward-level representatives.",
    icon: MapPin,
    color: PALETTE.orange,
    bg: PALETTE.orangeBg,
    bgStrong: "#FFEDD5",
    borderAccent: PALETTE.orange,
    to: "/candidates/local",
    chips: ["Head Positions", "Ward Contests"],
  },
];

export default function VoterCandidates() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: PALETTE.accentLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Users size={22} color={PALETTE.accent} strokeWidth={2.2} />
          </div>
          <div>
            <h1
              style={{
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 800,
                color: PALETTE.navy,
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              Nominated Candidates
            </h1>
            <p
              style={{
                color: PALETTE.muted,
                margin: "2px 0 0",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              View candidates nominated for elections you are eligible to vote
              in. Select an election level below.
            </p>
          </div>
        </div>
      </div>

      {/* Family cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: 20,
        }}
      >
        {FAMILIES.map((f) => (
          <FamilyCard key={f.key} family={f} onClick={() => navigate(f.to)} />
        ))}
      </div>

      {/* Info note */}
      <div
        style={{
          marginTop: 32,
          padding: "16px 20px",
          background: PALETTE.surfaceSubtle,
          borderRadius: 12,
          border: `1px solid ${PALETTE.border}`,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: PALETTE.accent,
            marginTop: 6,
            flexShrink: 0,
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: PALETTE.textSecondary,
            lineHeight: 1.55,
          }}
        >
          Only candidates nominated for elections and contests matching your
          registered voting area are shown. The list reflects approved
          nominations for elections currently visible to voters.
        </p>
      </div>
    </div>
  );
}

function FamilyCard({ family, onClick }) {
  const Icon = family.icon;

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: 0,
        borderRadius: 16,
        border: `1.5px solid ${family.borderAccent}20`,
        background: PALETTE.surface,
        cursor: "pointer",
        textAlign: "left",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = family.borderAccent + "50";
        e.currentTarget.style.boxShadow =
          "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = family.borderAccent + "20";
        e.currentTarget.style.boxShadow =
          "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = family.borderAccent;
        e.currentTarget.style.boxShadow = `0 0 0 3px ${family.borderAccent}20`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = family.borderAccent + "20";
        e.currentTarget.style.boxShadow =
          "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
      }}
    >
      {/* Card body */}
      <div style={{ padding: "22px 22px 16px" }}>
        {/* Icon + title */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: family.bgStrong,
              border: `1px solid ${family.color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={23} color={family.color} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: "clamp(16px, 1.5vw, 19px)",
                fontWeight: 800,
                color: PALETTE.text,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              {family.label}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 13.5,
            color: PALETTE.textSecondary,
            lineHeight: 1.55,
          }}
        >
          {family.description}
        </p>

        {/* Chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {family.chips.map((chip) => (
            <span
              key={chip}
              style={{
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                color: PALETTE.textSecondary,
                background: PALETTE.surfaceSubtle,
                border: `1px solid ${PALETTE.borderLight}`,
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 22px",
          borderTop: `1px solid ${PALETTE.borderLight}`,
          background: PALETTE.surfaceAlt,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            color: family.color,
          }}
        >
          View candidates
          <ChevronRight size={15} />
        </span>
      </div>
    </button>
  );
}
