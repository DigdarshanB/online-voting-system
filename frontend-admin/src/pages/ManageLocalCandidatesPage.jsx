import React from "react";
import { MapPin, Users, UserPlus, ListOrdered, Shield } from "lucide-react";
import { T } from "../components/ui/tokens";
import {
  PageContainer, BackLink, SummaryStrip, SummaryMetric,
  SectionCard, SectionHeader, PlannedBanner, AdminKeyframes,
} from "../components/ui/AdminUI";

const CAPABILITIES = [
  { icon: Users, title: "Local Candidate Profiles", desc: "Shared candidate registry — same profiles used across all election levels" },
  { icon: UserPlus, title: "Local Nominations", desc: "Nominate candidates for Municipal and Rural Municipal executive and ward-level contests" },
  { icon: ListOrdered, title: "Local PR Lists", desc: "Ward-level proportional representation lists for local body elections" },
  { icon: Shield, title: "Local Compliance", desc: "Ward-level inclusion quotas, eligibility verification, and nomination window enforcement" },
];

export default function ManageLocalCandidatesPage() {
  return (
    <PageContainer>
      <AdminKeyframes />
      <BackLink to="/admin/manage-candidates" label="Candidate Management" />

      <SummaryStrip>
        <SummaryMetric label="Local bodies" value={753} color={T.orange} />
        <SummaryMetric label="Types" value="Municipal + Rural" color={T.textSecondary} />
        <SummaryMetric label="Candidate workspace" value="Planned" color={T.muted} />
      </SummaryStrip>

      <PlannedBanner
        title="Local candidate management"
        message="Municipal and Rural Municipal candidate operations — including ward-level nominations, local PR lists, and executive position candidates across all 753 local bodies — will be available in a future development phase."
        color={T.orange}
      />

      <SectionCard>
        <SectionHeader
          icon={MapPin} iconColor={T.orange}
          title="Planned capabilities"
          subtitle="Local body candidate management features"
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
                  background: T.orangeBg, display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: 10,
                }}>
                  <Icon size={16} color={T.orange} />
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
