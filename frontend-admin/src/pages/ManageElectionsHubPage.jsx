import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Vote,
  Landmark,
  Building2,
  MapPin,
  ChevronRight,
} from "lucide-react";

const P = {
  navy: "#173B72",
  accent: "#2F6FED",
  surface: "#FFFFFF",
  bg: "#F5F7FB",
  border: "#DCE3EC",
  text: "#0F172A",
  muted: "#64748B",
  success: "#059669",
  purple: "#7C3AED",
  orange: "#EA580C",
};

const LEVELS = [
  {
    key: "federal",
    label: "Federal Elections",
    description: "House of Representatives direct elections — nationwide FPTP and PR contests",
    icon: Landmark,
    color: P.accent,
    bg: "#EFF6FF",
    to: "/admin/manage-elections/federal",
    ready: true,
  },
  {
    key: "provincial",
    label: "Provincial Elections",
    description: "Provincial Assembly elections across all 7 provinces — coming next phase",
    icon: Building2,
    color: P.purple,
    bg: "#F5F3FF",
    to: "/admin/manage-elections/provincial",
    ready: false,
  },
  {
    key: "local",
    label: "Local Elections",
    description: "Municipal and Rural Municipal elections for mayors, deputy mayors, and ward representatives — coming next phase",
    icon: MapPin,
    color: P.orange,
    bg: "#FFF7ED",
    to: "/admin/manage-elections/local",
    ready: false,
  },
];

export default function ManageElectionsHubPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: P.text,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Vote size={22} strokeWidth={2.2} color={P.accent} />
          Manage Elections
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: P.muted }}>
          Select a government level to manage its elections, contests, and lifecycle
        </p>
      </div>

      {/* Level cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
        {LEVELS.map((level) => {
          const Icon = level.icon;
          return (
            <button
              key={level.key}
              onClick={() => navigate(level.to)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                padding: "28px 28px 24px",
                borderRadius: 14,
                border: `1px solid ${P.border}`,
                background: P.surface,
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.2s, box-shadow 0.2s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = level.color + "60";
                e.currentTarget.style.boxShadow = `0 2px 12px ${level.color}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = P.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Icon badge */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: level.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={24} color={level.color} strokeWidth={2} />
              </div>

              {/* Title row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: P.text }}>
                  {level.label}
                </span>
                {!level.ready && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "#F1F5F9",
                      color: P.muted,
                    }}
                  >
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Description */}
              <p style={{ margin: 0, fontSize: 14, color: P.muted, lineHeight: 1.5 }}>
                {level.description}
              </p>

              {/* Arrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 700,
                  color: level.color,
                }}
              >
                {level.ready ? "Manage" : "View"} <ChevronRight size={16} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
