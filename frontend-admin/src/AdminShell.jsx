import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./AdminShell.css";

const PALETTE = {
  pageBg:      "#F6F8FB",
  sidebarBg:   "#FBFCFE",
  topbarBg:    "#FFFFFF",
  border:      "#E6EAF0",
  primaryText: "#0F172A",
  secondaryText:"#475569",
  mutedText:   "#64748B",
  deepNavy:    "#163B73",
  accentBlue:  "#2F6FED",
  activeBg:    "#EAF2FF",
  hoverBg:     "#F2F7FF",
  successGreen:"#0F9F6E",
  successSoft: "#EAFBF4",
};

const SIDEBAR_ITEMS = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    label: "Manage Admins",
    to: "/superadmin/manage-admins",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-3-3.87m0 0a4 4 0 10-6 0m9 0a4 4 0 116 0" />
      </svg>
    ),
  },
  {
    label: "Voter Verifications",
    to: "/admin/voter-verifications",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Manage Voters",
    to: "/admin/manage-voters",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 11a4 4 0 100-8 4 4 0 000 8zm0 0v9m0-9H4a4 4 0 00-4 4v2h9" />
      </svg>
    ),
  },
  {
    label: "Manage Elections",
    to: "/admin/elections",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Manage Candidates",
    to: "/admin/candidates",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    label: "Change Password",
    to: "/change-password",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

export default function AdminShell({ children, title, subtitle }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isSidebarOpen, isMobile]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: PALETTE.pageBg,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* ── Mobile Backdrop ────────────────────────────────────────────────── */}
      <div
        className={`admin-backdrop ${isSidebarOpen ? "visible" : ""}`}
        onClick={toggleSidebar}
      />

      {/* ── Sidebar Drawer ─────────────────────────────────────────────────── */}
      <aside
        className={`admin-sidebar ${isSidebarOpen ? "open" : ""}`}
        style={{
          width: 280,
          background: PALETTE.sidebarBg,
          borderRight: `1px solid ${PALETTE.border}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Branding */}
        <div
          style={{
            height: 70,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            borderBottom: `1px solid ${PALETTE.border}`,
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: PALETTE.deepNavy,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#FFFFFF" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: PALETTE.deepNavy, letterSpacing: "-0.01em" }}>
              Election Portal
            </div>
            <div style={{ fontSize: 10, color: PALETTE.mutedText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Admin Shell
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="admin-sidebar-nav"
          style={{ padding: "20px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto" }}
        >
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  borderRadius: 10,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  background: isActive ? PALETTE.activeBg : "transparent",
                  color: isActive ? PALETTE.accentBlue : PALETTE.secondaryText,
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isActive ? PALETTE.accentBlue : PALETTE.mutedText,
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div style={{ padding: "20px 24px", borderTop: `1px solid ${PALETTE.border}`, fontSize: 11, color: PALETTE.mutedText }}>
          System Version 1.2 &nbsp;·&nbsp; Support
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <div
        className="admin-content-wrap"
        style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
      >
        {/* Topbar */}
        <header
          className="admin-topbar"
          style={{
            height: 70,
            background: PALETTE.topbarBg,
            borderBottom: `1px solid ${PALETTE.border}`,
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Hamburger Menu Toggle */}
          <button
            className="admin-burger-btn"
            onClick={toggleSidebar}
            aria-label="Toggle Menu"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: PALETTE.primaryText, letterSpacing: "-0.01em" }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: PALETTE.mutedText }}>
                {subtitle}
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 16 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: PALETTE.successGreen,
                boxShadow: "0 0 0 3px rgba(15,159,110,0.15)",
                display: isMobile ? "none" : "block",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: PALETTE.secondaryText, whiteSpace: "nowrap" }}>
              {isMobile ? "Admin" : "Secure Session"}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="admin-main-content"
          style={{ flex: 1, overflowY: "auto", position: "relative" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
