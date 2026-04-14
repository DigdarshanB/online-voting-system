import React from 'react';
import { tokens } from './tokens';
import { T } from '../../../components/ui/tokens';
import { PageContainer, AdminKeyframes, AdminPortalHero, AdminHeroChip, ADMIN_HERO_TINTS } from '../../../components/ui/AdminUI';

export default function ManageAdminsPageShell({ children }) {
  return (
    <PageContainer>
      <AdminKeyframes />
      <AdminPortalHero
        eyebrow="Security Console"
        title="Administrator Governance Centre"
        subtitle="Invite new administrators, manage approvals, review TOTP recovery requests, and oversee the full admin lifecycle with audit-grade controls."
        gradient={`linear-gradient(135deg, ${T.navy}, #1E3A5F)`}
        rightContent={
          <div className="admin-hero-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <AdminHeroChip label="Super Admin Only" tint="danger" />
            <AdminHeroChip label="Governance" tint="info" />
          </div>
        }
      />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <main style={{
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacing.xxl,
      }}>
        {children}
      </main>
    </PageContainer>
  );
}
