import React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Vote, Users, Landmark, BarChart3, Shield, Map } from "lucide-react";
import { T } from "../components/ui/tokens";
import {
  PageContainer, BackLink, SummaryStrip, SummaryMetric,
  PlannedBanner, SectionCard, SectionHeader, AdminKeyframes,
} from "../components/ui/AdminUI";

const CAPABILITIES = [
  { icon: Vote, label: "Election setup", description: "Create provincial assembly elections, generate constituency structures per province, and configure lifecycle" },
  { icon: Users, label: "Candidate nominations", description: "Manage party nominations and candidate lists for provincial assembly constituencies" },
  { icon: Landmark, label: "Voter assignments", description: "Assign voters to provincial assembly constituencies across all 7 provinces" },
  { icon: BarChart3, label: "Results & counting", description: "Provincial ballot counting, result tallying, and finalization workflows" },
];

export default function ManageProvincialElectionsPage() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <AdminKeyframes />
      <BackLink onClick={() => navigate("/admin/manage-elections")}>Election Hub</BackLink>

      {/* Summary strip */}
      <SummaryStrip>
        <SummaryMetric label="Provinces" value="7" icon={Map} color={T.purple} />
        <SummaryMetric label="Status" value="Planned" color={T.muted} />
        <SummaryMetric label="Election type" value="Provincial Assembly" color={T.purple} description="Direct + PR seats" />
      </SummaryStrip>

      {/* Planned banner */}
      <PlannedBanner
        icon={Building2}
        color={T.purple}
        bgColor={T.purpleBg}
        title="Provincial election management — planned"
        description="Provincial Assembly election administration is being developed. This module will support the complete election lifecycle for all 7 provinces, including constituency-level structure generation, nominations, and vote counting."
      />

      {/* Capability cards */}
      <SectionCard>
        <SectionHeader
          icon={Shield}
          iconColor={T.purple}
          title="Planned capabilities"
          subtitle="Areas that will be available when this phase is complete"
        />
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 0,
        }}>
          {CAPABILITIES.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <div key={i} style={{
                padding: "20px 24px",
                borderRight: `1px solid ${T.borderLight}`,
                borderBottom: `1px solid ${T.borderLight}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: T.radius.md,
                    background: T.purpleBg, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={16} color={T.purple} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{cap.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5, paddingLeft: 42 }}>
                  {cap.description}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
