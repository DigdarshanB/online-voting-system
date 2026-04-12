import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Landmark,
  Building2,
  MapPin,
  ChevronRight,
  Users,
  Shield,
  Info,
} from "lucide-react";
import apiClient from "../lib/apiClient";

/* ─── Injected CSS (once) ────────────────────────────────────── */
const STYLE_ID = "vc-hub-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = `
    @keyframes vcPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes vcFadeUp {
      from { opacity:0; transform:translateY(12px) }
      to   { opacity:1; transform:translateY(0) }
    }
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
};

const CHIP_COLORS = {
  federal: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  provincial: { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  local: { bg: "#FFEDD5", text: "#9A3412", border: "#FDBA74" },
};

const FAMILIES = [
  {
    key: "federal",
    level: "FEDERAL",
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
    level: "PROVINCIAL",
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
    level: "LOCAL",
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
  const [liveMap, setLiveMap] = useState({});

  useEffect(() => {
    apiClient
      .get("/voter/elections/")
      .then((res) => {
        const map = {};
        (res.data || []).forEach((e) => {
          if (e.status === "POLLING_OPEN" && e.government_level) {
            map[e.government_level] = true;
          }
        });
        setLiveMap(map);
      })
      .catch(() => {});
  }, []);

  return (
    <div
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Hero header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${PALETTE.navy} 0%, #1E4D8C 100%)`,
          borderRadius: 18,
          padding: "28px 28px 24px",
          marginBottom: 28,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Nepal flag accent stripe */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #DC143C 0%, #DC143C 50%, #003893 50%, #003893 100%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <Shield size={26} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <h1
                style={{
                  fontSize: "clamp(22px, 3vw, 28px)",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  margin: 0,
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                }}
              >
                Nominated Candidates
              </h1>
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.85)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Election Commission
              </span>
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                margin: 0,
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

      {/* Family cards — responsive grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
          gap: 20,
        }}
      >
        {FAMILIES.map((f, idx) => (
          <FamilyCard
            key={f.key}
            family={f}
            isLive={!!liveMap[f.level]}
            animDelay={idx * 80}
            onClick={() => navigate(f.to)}
          />
        ))}
      </div>

      {/* Info callout */}
      <div
        style={{
          marginTop: 32,
          padding: "16px 20px",
          background: PALETTE.accentLight,
          borderRadius: 12,
          border: `1px solid ${PALETTE.accent}20`,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <Info
          size={16}
          color={PALETTE.accent}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: PALETTE.textSecondary,
            lineHeight: 1.55,
          }}
        >
          Only candidates nominated for elections currently open for polling in
          your registered voting area are shown. Once an election closes,
          candidates move to the Results section.
        </p>
      </div>
    </div>
  );
}

/* ─── Family Card ────────────────────────────────────────────── */
function FamilyCard({ family, isLive, animDelay, onClick }) {
  const Icon = family.icon;
  const chipColor = CHIP_COLORS[family.key] || CHIP_COLORS.federal;

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
        borderTop: `4px solid ${family.borderAccent}`,
        background: PALETTE.surface,
        cursor: "pointer",
        textAlign: "left",
        overflow: "hidden",
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        transition:
          "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        outline: "none",
        animation: `vcFadeUp 0.4s ease ${animDelay}ms both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.borderColor = family.borderAccent + "50";
        e.currentTarget.style.borderTopColor = family.borderAccent;
        e.currentTarget.style.boxShadow =
          "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = family.borderAccent + "20";
        e.currentTarget.style.borderTopColor = family.borderAccent;
        e.currentTarget.style.boxShadow =
          "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 3px ${family.borderAccent}30`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow =
          "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
      }}
    >
      {/* Card body */}
      <div style={{ padding: "22px 22px 16px", flex: 1 }}>
        {/* Icon + title row */}
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
            {/* Live status */}
            <div style={{ marginTop: 6 }}>
              {isLive ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: PALETTE.success,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: PALETTE.success,
                      display: "inline-block",
                      animation: "vcPulse 1.5s ease-in-out infinite",
                    }}
                  />
                  Live — Polling Open
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "2px 8px",
                    borderRadius: 5,
                    fontSize: 10,
                    fontWeight: 600,
                    color: PALETTE.muted,
                    background: PALETTE.surfaceSubtle,
                  }}
                >
                  No active elections
                </span>
              )}
            </div>
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

        {/* Chips — family-colored */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {family.chips.map((chip) => (
            <span
              key={chip}
              style={{
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                color: chipColor.text,
                background: chipColor.bg,
                border: `1px solid ${chipColor.border}`,
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
