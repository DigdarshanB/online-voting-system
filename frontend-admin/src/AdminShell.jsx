import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  BadgeCheck,
  Users,
  Landmark,
  UserCircle,
  LockKeyhole,
  Menu,
  LifeBuoy,
  BarChart3,
  ClipboardList,
  FileBarChart,
  UserCircle2
} from "lucide-react";
import "./AdminShell.css";
import ecnLogo from "./assets/ECN.png";

const PALETTE = {
  appBg: "#F5F7FB",
  surface: "#FFFFFF",
  sidebarBg: "#173B72",
  sidebarHover: "rgba(255,255,255,0.08)",
  sidebarText: "#F8FAFC",
  sidebarMuted: "#C7D2E5",
  activeBg: "#EAF2FF",
  activeText: "#173B72",
  activeIcon: "#2F6FED",
  topbarText: "#0F172A",
  mutedText: "#64748B",
  navy: "#173B72",
  accentBlue: "#2F6FED",
  success: "#0F9F6E",
  secureBg: "#EAFBF4",
  nepalRed: "#D42C3A",
};

const MAIN_NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Manage Admins", to: "/superadmin/manage-admins", icon: ShieldCheck },
  { label: "Voter Verifications", to: "/admin/voter-verifications", icon: BadgeCheck },
  { label: "Manage Voters", to: "/admin/manage-voters", icon: Users },
  { label: "Manage Elections", to: "/admin/elections", icon: Landmark },
  { label: "Manage Candidates", to: "/admin/candidates", icon: UserCircle },
  { label: "Results", to: "/admin/results", icon: BarChart3 },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ClipboardList },
  { label: "Reports", to: "/admin/reports", icon: FileBarChart },
];

const ACCOUNT_NAV_ITEMS = [
  { label: "Account Center", to: "/account-center", icon: UserCircle2 },
];

export default function AdminShell({ children, title, subtitle }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const routeMeta = {
    "/dashboard": {
      title: "Dashboard",
      subtitle: "Overview and quick access",
    },
    "/superadmin/manage-admins": {
      title: "Manage Admins",
      subtitle: "Review, manage, and oversee administrator accounts",
    },
    "/admin/voter-verifications": {
      title: "Voter Verifications",
      subtitle: "Review identity checks and approval requests",
    },
    "/admin/manage-voters": {
      title: "Manage Voters",
      subtitle: "Search, review, and manage voter profiles",
    },
    "/admin/elections": {
      title: "Manage Elections",
      subtitle: "Configure, schedule, and monitor electoral events",
    },
    "/admin/candidates": {
      title: "Manage Candidates",
      subtitle: "Add, review, and organize electoral candidates",
    },
    "/admin/results": {
      title: "Results",
      subtitle: "View election outcomes, turnout, and summaries",
    },
    "/admin/audit-logs": {
      title: "Audit Logs",
      subtitle: "Review administrative actions and system activity",
    },
    "/admin/reports": {
      title: "Reports",
      subtitle: "Generate and review administrative and election reports",
    },
    "/account-center": {
      title: "Account Center",
      subtitle: "Manage your profile, security, and current session",
    },
  };
  const currentMeta = routeMeta[location.pathname] ?? {
    title: "Admin Portal",
    subtitle: "Election administration workspace",
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      className="admin-shell"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: PALETTE.appBg,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        className={`admin-backdrop ${isSidebarOpen ? "visible" : ""}`}
        onClick={toggleSidebar}
      />

      <aside
        className={`admin-sidebar ${isSidebarOpen ? "open" : ""}`}
        style={{
          width: 270,
          background: PALETTE.sidebarBg,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 100,
        }}
      >
        {/* Branding Block */}
        <div
          style={{
            height: 72,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "#FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <img
              src={ecnLogo}
              alt="Election Commission Nepal logo"
              style={{ width: 26, height: 26, objectFit: "contain" }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: "#FFF", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              Election Portal
            </div>
            <div style={{ fontSize: 10, color: PALETTE.sidebarMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Administrator
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav
          className="admin-sidebar-nav"
          style={{ padding: "20px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto" }}
        >
          {MAIN_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            const IconComp = item.icon;
            return (
              <Link
                key={item.to}
                className={`admin-sidebar-link${isActive ? " active" : ""}`}
                to={item.to}
                onClick={closeSidebar}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  background: isActive ? PALETTE.activeBg : "transparent",
                  color: isActive ? PALETTE.activeText : PALETTE.sidebarText,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13.5,
                  position: "relative",
                }}
              >
                {isActive && (
                  <div style={{ position: "absolute", left: -12, top: "20%", height: "60%", width: 3, background: PALETTE.nepalRed, borderRadius: "0 2px 2px 0" }} />
                )}
                <IconComp
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  color={isActive ? PALETTE.activeIcon : PALETTE.sidebarMuted}
                />
                {item.label}
              </Link>
            );
          })}

          {/* Account Section Separator */}
          <div 
            style={{ 
              marginTop: 24, 
              marginBottom: 8,
              padding: "16px 14px 8px", 
              fontSize: 11, 
              fontWeight: 800, 
              color: PALETTE.sidebarMuted, 
              textTransform: "uppercase", 
              letterSpacing: "0.08em",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            Account Control
          </div>

          {ACCOUNT_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            const IconComp = item.icon;
            return (
              <Link
                key={item.to}
                className={`admin-sidebar-link${isActive ? " active" : ""}`}
                to={item.to}
                onClick={closeSidebar}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  background: isActive ? PALETTE.activeBg : "transparent",
                  color: isActive ? PALETTE.activeText : PALETTE.sidebarText,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13.5,
                  position: "relative",
                }}
              >
                {isActive && (
                  <div style={{ position: "absolute", left: -12, top: "20%", height: "60%", width: 3, background: PALETTE.nepalRed, borderRadius: "0 2px 2px 0" }} />
                )}
                <IconComp
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  color={isActive ? PALETTE.activeIcon : PALETTE.sidebarMuted}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

      </aside>

      <div
        className="admin-content-wrap"
        style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
      >
        {/* Topbar */}
        <header
          className="admin-topbar"
          style={{
            height: 72,
            background: PALETTE.surface,
            borderBottom: "1px solid #DCE3EC",
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <button className="admin-burger-btn" onClick={toggleSidebar} aria-label="Toggle Menu">
            <Menu size={22} strokeWidth={2.2} />
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 19, fontWeight: 800, color: PALETTE.topbarText, letterSpacing: "-0.02em" }}>
              {currentMeta.title}
            </h1>
            {currentMeta.subtitle && (
              <p style={{ margin: "2px 0 0", fontSize: 13, color: PALETTE.mutedText, fontWeight: 500 }}>
                {currentMeta.subtitle}
              </p>
            )}
          </div>

          <div className="admin-topbar-actions">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "7px 16px",
                background: PALETTE.secureBg,
                borderRadius: 12,
                border: "1px solid #0F9F6E20",
              }}
            >
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    display: "block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: PALETTE.success,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    inset: -2,
                    borderRadius: "50%",
                    background: PALETTE.success,
                    opacity: 0.3,
                    animation: "pulse 2s infinite",
                  }}
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: PALETTE.success, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {isMobile ? "Secure" : "Secure Connection"}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="admin-main-content"
          style={{ flex: 1, overflowY: "auto", position: "relative" }}
        >
          {children}
        </main>
        <footer
          style={{
            padding: "16px 32px",
            textAlign: "center",
            fontSize: 12,
            color: PALETTE.mutedText,
            borderTop: "1px solid #DCE3EC",
            background: PALETTE.surface,
          }}
        >
          Election Commission Nepal <span style={{ fontWeight: 800, color: PALETTE.topbarText }}>©</span>
        </footer>
      </div>
    </div>
  );
}
