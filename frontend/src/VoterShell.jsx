// Authenticated voter shell: sidebar + topbar + footer. Mirrors AdminShell.

import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Vote,
  BarChart3,
  FileCheck2,
  UserCircle2,
  LogOut,
  Menu,
  Users,
  HelpCircle,
} from "lucide-react";
import { clearToken } from "./lib/authStorage";
import { useLanguage } from "./lib/LanguageContext";
import "./VoterShell.css";
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

const MAIN_NAV_KEYS = [
  { tKey: "nav.dashboard", to: "/dashboard", icon: LayoutDashboard },
  { tKey: "nav.candidates", to: "/candidates", icon: Users },
  { tKey: "nav.elections", to: "/elections", icon: Vote },
  { tKey: "nav.results", to: "/results", icon: BarChart3 },
];

const ACCOUNT_NAV_KEYS = [
  { tKey: "nav.receipt", to: "/receipt", icon: FileCheck2 },
  { tKey: "nav.account", to: "/account", icon: UserCircle2 },
  { tKey: "nav.guide", to: "/guide", icon: HelpCircle },
];

const ROUTE_META_KEYS = {
  "/dashboard": { title: "route.dashboard.title", subtitle: "route.dashboard.subtitle" },
  "/candidates": { title: "route.candidates.title", subtitle: "route.candidates.subtitle" },
  "/elections": { title: "route.elections.title", subtitle: "route.elections.subtitle" },
  "/results": { title: "route.results.title", subtitle: "route.results.subtitle" },
  "/receipt": { title: "route.receipt.title", subtitle: "route.receipt.subtitle" },
  "/account": { title: "route.account.title", subtitle: "route.account.subtitle" },
  "/guide": { title: "route.guide.title", subtitle: "route.guide.subtitle" },
};

export default function VoterShell({ children, title, subtitle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const metaKeys = ROUTE_META_KEYS[location.pathname];
  const displayTitle = title || (metaKeys ? t(metaKeys.title) : t("shell.brand"));
  const displaySubtitle = subtitle || (metaKeys ? t(metaKeys.subtitle) : "");

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

  const handleLogout = () => {
    clearToken();
    sessionStorage.removeItem("voter_mfa_ok");
    navigate("/", { replace: true });
  };

  const isRouteActive = (to) => {
    if (to === location.pathname) return true;
    if (to !== "/" && location.pathname.startsWith(to + "/")) return true;
    return false;
  };

  return (
    <>
    <div
      className="voter-shell"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: PALETTE.appBg,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        className={`voter-backdrop ${isSidebarOpen ? "visible" : ""}`}
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside
        className={`voter-sidebar ${isSidebarOpen ? "open" : ""}`}
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
        {/* Branding */}
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
            <div
              style={{
                fontWeight: 800,
                fontSize: 13.5,
                color: "#FFF",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {t("shell.brand")}
            </div>
            <div
              style={{
                fontSize: 10,
                color: PALETTE.sidebarMuted,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {t("shell.brand_role")}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="voter-sidebar-nav"
          style={{
            padding: "20px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: 1,
            overflowY: "auto",
          }}
        >
          {MAIN_NAV_KEYS.map((item) => {
            const active = isRouteActive(item.to);
            const IconComp = item.icon;
            return (
              <Link
                key={item.to}
                className={`voter-sidebar-link${active ? " active" : ""}`}
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
                  background: active ? PALETTE.activeBg : "transparent",
                  color: active ? PALETTE.activeText : PALETTE.sidebarText,
                  fontWeight: active ? 700 : 500,
                  fontSize: 13.5,
                  position: "relative",
                }}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      left: -12,
                      top: "20%",
                      height: "60%",
                      width: 3,
                      background: PALETTE.nepalRed,
                      borderRadius: "0 2px 2px 0",
                    }}
                  />
                )}
                <IconComp
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  color={active ? PALETTE.activeIcon : PALETTE.sidebarMuted}
                />
                {t(item.tKey)}
              </Link>
            );
          })}

          {/* Account Section */}
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
              gap: 8,
            }}
          >
            {t("nav.section.account")}
          </div>

          {ACCOUNT_NAV_KEYS.map((item) => {
            const active = isRouteActive(item.to);
            const IconComp = item.icon;
            return (
              <Link
                key={item.to}
                className={`voter-sidebar-link${active ? " active" : ""}`}
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
                  background: active ? PALETTE.activeBg : "transparent",
                  color: active ? PALETTE.activeText : PALETTE.sidebarText,
                  fontWeight: active ? 700 : 500,
                  fontSize: 13.5,
                  position: "relative",
                }}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      left: -12,
                      top: "20%",
                      height: "60%",
                      width: 3,
                      background: PALETTE.nepalRed,
                      borderRadius: "0 2px 2px 0",
                    }}
                  />
                )}
                <IconComp
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  color={active ? PALETTE.activeIcon : PALETTE.sidebarMuted}
                />
                {t(item.tKey)}
              </Link>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={() => {
              closeSidebar();
              setShowSignOutConfirm(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: PALETTE.sidebarText,
              fontWeight: 500,
              fontSize: 13.5,
              cursor: "pointer",
              transition: "all 0.2s ease",
              width: "100%",
              textAlign: "left",
              marginTop: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(220,60,60,0.12)";
              e.currentTarget.style.color = "#FCA5A5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = PALETTE.sidebarText;
            }}
          >
            <LogOut size={20} strokeWidth={1.8} color={PALETTE.sidebarMuted} />
            {t("nav.signout")}
          </button>
        </nav>
      </aside>

      {/* Main content area */}
      <div
        className="voter-content-wrap"
        style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
      >
        {/* Topbar */}
        <header
          className="voter-topbar"
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
          <button
            className="voter-burger-btn"
            onClick={toggleSidebar}
            aria-label="Toggle Menu"
          >
            <Menu size={22} strokeWidth={2.2} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? 16 : 19,
                fontWeight: 800,
                color: PALETTE.topbarText,
                letterSpacing: "-0.02em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayTitle}
            </h1>
            {!isMobile && displaySubtitle && (
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 13,
                  color: PALETTE.mutedText,
                  fontWeight: 500,
                }}
              >
                {displaySubtitle}
              </p>
            )}
          </div>

          <div className="voter-topbar-actions">
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
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: PALETTE.success,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {isMobile ? t("shell.secure_short") : t("shell.secure")}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="voter-main-content"
          style={{ flex: 1, overflowY: "auto", position: "relative" }}
        >
          {children}
        </main>

        {/* Footer */}
        <footer
          className="voter-footer"
          style={{
            padding: "16px 32px",
            textAlign: "center",
            fontSize: 12,
            color: PALETTE.mutedText,
            borderTop: "1px solid #DCE3EC",
            background: PALETTE.surface,
          }}
        >
          {t("shell.footer")}{" "}
          <span style={{ fontWeight: 800, color: PALETTE.topbarText }}>©</span>
        </footer>
      </div>
    </div>

    <SignOutConfirmModal
      open={showSignOutConfirm}
      onClose={() => setShowSignOutConfirm(false)}
      onConfirm={handleLogout}
    />
    </>
  );
}

/* ── Sign Out Confirmation Modal ─────────────────────────────── */
function SignOutConfirmModal({ open, onClose, onConfirm }) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const timer = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (prev && prev.focus) prev.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(4px)",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            flexShrink: 0,
            background: "#FEE2E2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <LogOut size={20} color="#DC2626" strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              id="signout-title"
              style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}
            >
              Sign Out
            </h3>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "#64748B", lineHeight: 1.5 }}>
              Are you sure you want to sign out? You will need to sign in again to continue.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          padding: "20px 24px",
          marginTop: 8,
          borderTop: "1px solid #F1F5F9",
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              color: "#475569",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: "#DC2626",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
