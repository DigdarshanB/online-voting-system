import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import StatusPill from './StatusPill';
import EmptyStateBlock from './EmptyStateBlock';
import { ShieldAlert, RefreshCw, XCircle, UserCheck } from 'lucide-react';

export default function ActiveAdminsTable({
  items = [],
  isLoading = false,
  error = "",
  searchValue,
  onSearchChange,
  onRefresh,
  onDisableAdmin
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const actionButtonStyle = {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: "6px 10px",
    backgroundColor: "transparent",
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.medium,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.text.secondary,
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  const filterContainerStyle = {
    display: "flex",
    padding: `${tokens.spacing.md}px 0`,
  };

  const searchInputStyle = {
    flex: 1,
    padding: "8px 12px",
    borderRadius: tokens.borderRadius.medium,
    border: `1px solid ${tokens.cardBorder}`,
    fontSize: 14,
    color: tokens.text.primary,
    backgroundColor: tokens.input.background,
  };

  const renderContent = () => {
    if (isLoading) {
      return <EmptyStateBlock title="Loading Active Administrators..." description="Please wait while we load the records." height={200} />;
    }
    if (error) {
      return <EmptyStateBlock icon={XCircle} title="Error Loading Data" description={error} height={200} />;
    }
    if (items.length === 0) {
      return (
        <EmptyStateBlock
          icon={UserCheck}
          title="No Active Administrators Found"
          description="There are no admins matching your search, or no admins have been approved yet."
          height={200}
        />
      );
    }
    return isMobile ? (
      <MobileView items={items} onDisableAdmin={onDisableAdmin} />
    ) : (
      <TableView items={items} onDisableAdmin={onDisableAdmin} />
    );
  };

  return (
    <SectionCard>
      <SectionHeader
        title="Active Administrator Roster"
        description="Manage all verified administrators with active system access."
        actions={
          <button
            style={actionButtonStyle}
            onClick={onRefresh}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.input.background)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            title="Refresh Data"
          >
            <RefreshCw size={14} />
          </button>
        }
      />
      <div style={filterContainerStyle}>
        <input
          type="search"
          placeholder="Search by name or email..."
          style={searchInputStyle}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search active administrators"
        />
      </div>

      <div style={{ marginTop: tokens.spacing.lg }}>
        {renderContent()}
      </div>
    </SectionCard>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString();
}

function TableView({ items, onDisableAdmin }) {
  const tableWrapperStyle = { overflowX: "auto" };
  const tableStyle = { width: "100%", borderCollapse: "collapse", textAlign: "left" };
  const thStyle = {
    padding: `10px ${tokens.spacing.md}px`,
    color: tokens.text.secondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 600,
    borderBottom: `1px solid ${tokens.cardBorder}`,
  };
  const trStyle = { borderBottom: `1px solid ${tokens.cardBorder}`, transition: "background-color 0.2s" };
  const tdStyle = { padding: `${tokens.spacing.md}px`, verticalAlign: "middle", fontSize: 14 };
  const userStyle = { fontWeight: 600, color: tokens.text.primary };
  const userEmailStyle = { fontSize: 13, color: tokens.text.secondary };
  const actionsStyle = { display: "flex", justifyContent: "flex-end", gap: tokens.spacing.sm };
  const dangerActionButtonStyle = {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: "4px 8px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: tokens.borderRadius.small,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.status.danger.text,
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <caption style={{ captionSide: "bottom", textAlign: "left", padding: "12px", fontSize: 13, color: tokens.text.muted }}>
          List of all active administrators with system access. Use actions to manage access.
        </caption>
        <thead>
          <tr style={{ borderBottom: `2px solid ${tokens.cardBorder}` }}>
            <th style={thStyle}>Administrator</th>
            <th style={thStyle}>Approved / Since</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>2FA Status</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Governance Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              style={trStyle}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.pageBackground)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <td style={tdStyle}>
                <div style={userStyle}>{item.full_name}</div>
                <div style={userEmailStyle}>{item.email}</div>
              </td>
              <td style={tdStyle}>
                {formatDate(item.approved_at)}
              </td>
              <td style={tdStyle}>
                {item.role ? <StatusPill status={item.role} /> : "—"}
              </td>
              <td style={tdStyle}>
                {item.totp_enabled_at
                  ? <StatusPill status="TOTP_ENABLED" />
                  : <StatusPill status="TOTP_DISABLED" />
                }
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <div style={actionsStyle}>
                  <button
                    style={dangerActionButtonStyle}
                    onClick={() => onDisableAdmin(item)}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.danger.background)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    title="Disable Administrator Access"
                  >
                    <XCircle size={16} />
                    <span>Disable Access</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileView({ items, onDisableAdmin }) {
  const cardStyle = {
    padding: tokens.spacing.lg,
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.medium,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacing.md,
    backgroundColor: tokens.background,
  };
  const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
  const userStyle = { fontWeight: 600, color: tokens.text.primary };
  const userEmailStyle = { fontSize: 13, color: tokens.text.secondary };
  const infoGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.md, alignItems: 'center', marginTop: tokens.spacing.md };
  const infoLabelStyle = { fontSize: 12, color: tokens.text.secondary, textTransform: 'uppercase', fontWeight: 500 };
  const infoValueStyle = { fontSize: 13, color: tokens.text.primary };

  const footerStyle = {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTop: `1px solid ${tokens.cardBorder}`,
    display: "flex",
    justifyContent: "flex-end",
  };
  const buttonStyle = { 
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    background: 'none', 
    border: 'none', 
    fontWeight: 600, 
    cursor: 'pointer', 
    padding: "8px", 
    color: tokens.status.danger.text,
    fontSize: 14,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.md }}>
      {items.map(item => (
        <div key={item.id} style={cardStyle}>
          <div style={headerStyle}>
            <div>
              <div style={userStyle}>{item.full_name || "—"}</div>
              <div style={userEmailStyle}>{item.email || "—"}</div>
            </div>
            {item.role && <StatusPill status={item.role} />}
          </div>
          
          <div style={infoGridStyle}>
            <div>
              <div style={infoLabelStyle}>2FA Status</div>
              <div style={infoValueStyle}>
                {item.totp_enabled_at ? <StatusPill status="TOTP_ENABLED" /> : <StatusPill status="TOTP_DISABLED" />}
              </div>
            </div>
            <div>
              <div style={infoLabelStyle}>Approved Since</div>
              <div style={infoValueStyle}>{formatDate(item.approved_at)}</div>
            </div>
          </div>

          <div style={footerStyle}>
            <button onClick={() => onDisableAdmin(item)} style={buttonStyle} title="Disable Administrator Access">
              <XCircle size={16} />
              <span>Disable Access</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
