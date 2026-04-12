import React from 'react';
import { tokens } from './tokens';
import { T } from '../../../components/ui/tokens';
import { PageContainer, AdminKeyframes } from '../../../components/ui/AdminUI';

export default function ManageAdminsPageShell({ children }) {
  return (
    <PageContainer>
      <AdminKeyframes />
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
