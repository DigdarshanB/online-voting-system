import React from 'react';
import { tokens } from './tokens';

export default function ManageAdminsPageShell({
  title,
  subtitle,
  meta = null,
  children
}) {
  const mainStyle = {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacing.xxxl,
  };

  return (
    <div style={mainStyle}>
      <div style={{
        width: "100%",
        maxWidth: 1320,
        margin: "0 auto",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacing.xxxl
      }}>
        <header style={{
          display: "flex",
          flexDirection: "column",
          gap: tokens.spacing.sm
        }}>
          <h1 style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 800,
            color: tokens.text.primary
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              margin: 0,
              fontSize: 16,
              color: tokens.text.secondary
            }}>
              {subtitle}
            </p>
          )}
          {meta && (
            <div style={{ marginTop: tokens.spacing.md }}>
              {meta}
            </div>
          )}
        </header>

        <main style={mainStyle}>
          {children}
        </main>
      </div>
    </div>
  );
}
