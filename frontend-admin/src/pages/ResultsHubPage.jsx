import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, Landmark, Building2, MapPin, ArrowRight,
  ClipboardCheck, Calculator, FileCheck, Lock,
} from "lucide-react";
import { PageContainer, AdminKeyframes, AdminPortalHero, AdminHeroChip, ADMIN_HERO_TINTS } from "../components/ui/AdminUI";
import { T } from "../components/ui/tokens";
import ResultsHubCard from "../features/results/components/ResultsHubCard";

/* ── Level card data ─────────────────────────────────────────── */
const LEVELS = [
  {
    key: "federal",
    label: "Federal Results",
    description:
      "Direct and proportional representation results for federal elections — House of Representatives FPTP and PR counting.",
    icon: Landmark,
    color: "#2F6FED",
    bg: "#EAF2FF",
    to: "/admin/results/federal",
    chips: ["House of Representatives", "FPTP & PR"],
  },
  {
    key: "provincial",
    label: "Provincial Results",
    description:
      "Provincial assembly counting and results across all provinces — constituency and proportional seats.",
    icon: Building2,
    color: "#7C3AED",
    bg: "#F5F3FF",
    to: "/admin/results/provincial",
    chips: ["7 Provinces", "Assembly Seats"],
  },
  {
    key: "local",
    label: "Local Results",
    description:
      "Municipal and rural municipal election outcomes — mayors, deputy mayors, ward chairs, and representatives.",
    icon: MapPin,
    color: "#EA580C",
    bg: "#FFF7ED",
    to: "/admin/results/local",
    chips: ["753 Local Bodies"],
  },
];

/* ── Counting process steps ──────────────────────────────────── */
const PROCESS_STEPS = [
  { icon: ClipboardCheck, label: "Poll Closed", description: "Polling closes and ballot counting phase begins." },
  { icon: Calculator, label: "Initiate Count", description: "Create a new count run and prepare tallying systems." },
  { icon: FileCheck, label: "Execute & Review", description: "Run ballot count, review FPTP/PR results, handle ties." },
  { icon: Lock, label: "Finalize & Lock", description: "Certify final results and lock count from further changes." },
];

const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF",
  border: "#DCE3EC", text: "#0F172A", muted: "#64748B",
};

export default function ResultsHubPage() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <AdminKeyframes />
      <HubStyles />

      {/* ── Portal Hero ──────────────────────────────── */}
      <AdminPortalHero
        eyebrow="Results & Counting"
        title="Election Results Centre"
        subtitle="Initiate ballot counts, review FPTP tallies and PR allocations, handle adjudication cases, and certify final results — organized by government level."
        rightContent={<>
          <AdminHeroChip label="Federal" tint={ADMIN_HERO_TINTS.federal} />
          <AdminHeroChip label="Provincial" tint={ADMIN_HERO_TINTS.provincial} />
          <AdminHeroChip label="Local" tint={ADMIN_HERO_TINTS.local} />
        </>}
      />

      {/* ── Level cards ─────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
        gap: T.space.xl,
        marginBottom: T.space["3xl"],
      }}>
        {LEVELS.map((level) => (
          <ResultsHubCard
            key={level.key}
            level={level}
            onClick={() => navigate(level.to)}
          />
        ))}
      </div>

      {/* ── Counting process steps ────────────────────── */}
      <section style={{
        background: "#FAFBFE",
        border: `1px solid ${P.border}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(12,18,34,0.04)",
      }}>
        <div style={{
          padding: "18px 28px",
          borderBottom: `1px solid #E8ECF2`,
          display: "flex", alignItems: "center", gap: 12,
          background: P.surface,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "#EEF1F6",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BarChart3 size={16} color={P.navy} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: P.navy, lineHeight: 1.2 }}>
              Counting process reference
            </h2>
            <p style={{ margin: "1px 0 0", fontSize: 12, color: P.muted }}>
              Four-phase lifecycle from poll close through certified lock
            </p>
          </div>
        </div>

        {/* Horizontal steps */}
        <div className="results-process-hz" style={{ padding: "24px 28px 28px" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {PROCESS_STEPS.map((step, i) => (
              <React.Fragment key={i}>
                <div style={{
                  flex: 1, minWidth: 0, background: P.surface,
                  border: `1px solid #E8ECF2`, borderRadius: 12,
                  padding: "18px 16px 16px",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: P.accent, display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <step.icon size={14} color="#fff" strokeWidth={2.4} />
                    </div>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: P.text, lineHeight: 1.3, textAlign: "center" }}>
                    {step.label}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: P.muted, lineHeight: 1.5, textAlign: "center" }}>
                    {step.description}
                  </p>
                </div>
                {i < PROCESS_STEPS.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", flexShrink: 0, width: 16 }}>
                    <div style={{ width: 16, height: 2, background: "#93B4F6", borderRadius: 1 }} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Mobile vertical steps */}
        <div className="results-process-vt" style={{ display: "none", padding: "20px 24px 24px" }}>
          {PROCESS_STEPS.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < PROCESS_STEPS.length - 1 ? 16 : 0, position: "relative" }}>
              {i < PROCESS_STEPS.length - 1 && (
                <div style={{ position: "absolute", left: 13, top: 34, bottom: 0, width: 2, background: "#93B4F6", borderRadius: 1 }} />
              )}
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: P.accent, display: "flex",
                alignItems: "center", justifyContent: "center",
                flexShrink: 0, zIndex: 1,
              }}>
                <step.icon size={12} color="#fff" strokeWidth={2.4} />
              </div>
              <div style={{
                flex: 1, background: P.surface,
                border: `1px solid ${P.border}`, borderRadius: 8,
                padding: "12px 14px",
              }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: P.text }}>{step.label}</h3>
                <p style={{ margin: 0, fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}

function HubStyles() {
  return (
    <style>{`
      .results-hub-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(12,18,34,0.10), 0 2px 6px rgba(12,18,34,0.04) !important;
      }
      .results-hub-card:hover .results-hub-arrow {
        transform: translateX(3px);
      }
      .results-hub-card:active {
        transform: translateY(-1px);
      }
      .results-hub-card:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(37,99,235,0.35), 0 2px 8px rgba(12,18,34,0.07) !important;
      }
      @media (max-width: 900px) {
        .results-process-hz { display: none !important; }
        .results-process-vt { display: block !important; }
      }
    `}</style>
  );
}
