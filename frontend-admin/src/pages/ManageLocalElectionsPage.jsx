import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Vote, Users, Landmark, BarChart3, Shield, Home } from "lucide-react";
import { T } from "../components/ui/tokens";
import {
  PageContainer, BackLink, SummaryStrip, SummaryMetric,
  PlannedBanner, SectionCard, SectionHeader, AdminKeyframes,
} from "../components/ui/AdminUI";

const CAPABILITIES = [
  { icon: Vote, label: "Election setup", description: "Create municipal and rural municipal elections, generate ward structures, and configure lifecycle" },
  { icon: Users, label: "Candidate nominations", description: "Manage mayor, deputy mayor, ward chair, and ward member nominations across all local bodies" },
  { icon: Landmark, label: "Ward-level operations", description: "Assign voters to wards within their municipalities and rural municipalities" },
  { icon: BarChart3, label: "Counting & publication", description: "Local ballot counting, result tallying across wards, and finalization workflows" },
];

export default function ManageLocalElectionsPage() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <AdminKeyframes />
      <BackLink onClick={() => navigate("/admin/manage-elections")}>Election Hub</BackLink>

      {/* Summary strip */}
      <SummaryStrip>
        <SummaryMetric label="Local bodies" value="753" icon={Home} color={T.orange} />
        <SummaryMetric label="Status" value="Planned" color={T.muted} />
        <SummaryMetric label="Election types" value="Municipal + Rural" color={T.orange} description="Mayor, Deputy Mayor, Ward seats" />
      </SummaryStrip>

      {/* Planned banner */}
      <PlannedBanner
        icon={MapPin}
        color={T.orange}
        bgColor={T.orangeBg}
        title="Local election management — planned"
        description="Municipal and Rural Municipal election administration is being developed. This module will support the complete election lifecycle for all 753 local bodies, including ward-level structure generation, multi-seat nominations, and result publication."
      />

      {/* Capability cards */}
      <SectionCard>
        <SectionHeader
          icon={Shield}
          iconColor={T.orange}
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
                    background: T.orangeBg, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={16} color={T.orange} strokeWidth={2} />
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
