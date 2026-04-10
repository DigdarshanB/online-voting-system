import React from "react";
import { Building2, Users, UserPlus, ListOrdered, Shield } from "lucide-react";
import { T } from "../components/ui/tokens";
import {
  PageContainer, BackLink, SummaryStrip, SummaryMetric,
  SectionCard, SectionHeader, PlannedBanner, AdminKeyframes,
} from "../components/ui/AdminUI";

const CAPABILITIES = [
  { icon: Users, title: "Provincial Candidate Profiles", desc: "Shared candidate registry — same profiles used across all election levels" },
  { icon: UserPlus, title: "Provincial Nominations", desc: "Nominate candidates for Provincial Assembly constituency contests in each province" },
  { icon: ListOrdered, title: "Provincial PR Lists", desc: "Ordered party lists for provincial proportional representation seats" },
  { icon: Shield, title: "Provincial Compliance", desc: "Inclusion quota verification, eligibility checks, and nomination window enforcement" },
];

export default function ManageProvincialCandidatesPage() {
  return (
    <PageContainer>
      <AdminKeyframes />
      <BackLink to="/admin/manage-candidates" label="Candidate Management" />

      <SummaryStrip>
        <SummaryMetric label="Provinces" value={7} color={T.purple} />
        <SummaryMetric label="Candidate workspace" value="Planned" color={T.muted} />
        <SummaryMetric label="Level" value="Provincial" color={T.purple} />
      </SummaryStrip>

      <PlannedBanner
        title="Provincial candidate management"
        message="Provincial Assembly candidate operations — nominations, PR lists, and compliance verification across all 7 provinces — will be available in the next development phase."
        color={T.purple}
      />

      <SectionCard>
        <SectionHeader
          icon={Building2} iconColor={T.purple}
          title="Planned capabilities"
          subtitle="Provincial Assembly candidate management features"
        />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14, padding: "4px 24px 24px",
        }}>
          {CAPABILITIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} style={{
                padding: "18px 20px", borderRadius: T.radius.lg,
                border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: T.radius.md,
                  background: T.purpleBg, display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: 10,
                }}>
                  <Icon size={16} color={T.purple} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 4 }}>{c.title}</div>
                <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{c.desc}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
