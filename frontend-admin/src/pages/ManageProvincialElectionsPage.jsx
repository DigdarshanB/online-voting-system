import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ArrowLeft,
  Landmark,
  Users,
  Vote,
  BarChart3,
} from "lucide-react";

const P = {
  navy: "#173B72",
  accent: "#2F6FED",
  surface: "#FFFFFF",
  bg: "#F5F7FB",
  border: "#DCE3EC",
  text: "#0F172A",
  muted: "#64748B",
  purple: "#7C3AED",
  purpleBg: "#F5F3FF",
};

const SECTIONS = [
  {
    icon: Vote,
    label: "Election Setup",
    description: "Create provincial assembly elections, generate constituency structures, and configure lifecycle",
  },
  {
    icon: Users,
    label: "Candidate Nominations",
    description: "Manage party nominations, candidate lists, and PR allocations for provincial contests",
  },
  {
    icon: Landmark,
    label: "Voter Assignments",
    description: "Assign voters to provincial assembly constituencies across all 7 provinces",
  },
  {
    icon: BarChart3,
    label: "Results & Counting",
    description: "Provincial ballot counting, result tallying, and finalization workflows",
  },
];

export default function ManageProvincialElectionsPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Back link */}
      <button
        onClick={() => navigate("/admin/manage-elections")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          padding: 0,
          border: "none",
          background: "transparent",
          color: P.muted,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={15} /> Back to Election Hub
      </button>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
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
          <Building2 size={22} strokeWidth={2.2} color={P.purple} />
          Provincial Elections
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: P.muted }}>
          Provincial Assembly elections across all 7 provinces of Nepal
        </p>
      </div>

      {/* Coming soon banner */}
      <div
        style={{
          padding: "28px 32px",
          borderRadius: 14,
          background: P.purpleBg,
          border: `1px solid ${P.purple}20`,
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        <Building2 size={40} color={P.purple} style={{ margin: "0 auto 16px", opacity: 0.6 }} />
        <p style={{ fontSize: 18, fontWeight: 800, color: P.text, margin: "0 0 6px" }}>
          Coming Next Phase
        </p>
        <p style={{ fontSize: 14, color: P.muted, maxWidth: 520, margin: "0 auto" }}>
          Provincial election management is being built. The following areas will be available once this phase is complete.
        </p>
      </div>

      {/* Section preview cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.label}
              style={{
                padding: "22px 24px",
                borderRadius: 12,
                background: P.surface,
                border: `1px solid ${P.border}`,
                opacity: 0.7,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Icon size={18} color={P.purple} strokeWidth={2} />
                <span style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{section.label}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: P.muted, lineHeight: 1.5 }}>
                {section.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
