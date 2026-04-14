import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VerificationSummaryStrip from "../features/voter-verifications/components/VerificationSummaryStrip";
import VerificationWorkbench from "../features/voter-verifications/components/VerificationWorkbench";
import { T } from "../components/ui/tokens";
import {
  PageContainer, AdminKeyframes, AdminPortalHero, AdminHeroChip, ADMIN_HERO_TINTS,
} from "../components/ui/AdminUI";
import { CheckCircle2, AlertTriangle, RefreshCw, Clock } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}

class VerificationErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, textAlign: "center", color: T.error }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Something went wrong loading Voter Verifications.</h3>
          <pre style={{ fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap", color: T.muted }}>{this.state.error.message}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ marginTop: 16, padding: "8px 20px", borderRadius: T.radius.md, border: `1px solid ${T.border}`, cursor: "pointer", fontWeight: 600, fontSize: 13, background: T.surface }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ManageVoters() {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchVoters = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await axios.get(`${API}/admin/voters/pending`, { headers: authHeaders() });
      setVoters(response.data || []);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMessage({ type: "error", text: "Failed to load verification queue." });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVoters();
  }, [fetchVoters]);

  const handleApprove = async (userId) => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await axios.post(`${API}/admin/voters/${userId}/approve`, {}, { headers: authHeaders() });
      setStatusMessage({ type: "success", text: "Voter verified successfully." });
      setSelectedVoter(null);
      fetchVoters(true);
    } catch {
      setStatusMessage({ type: "error", text: "Failed to approve voter." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (userId, reason) => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await axios.post(`${API}/admin/voters/${userId}/reject`, { reason }, { headers: authHeaders() });
      setStatusMessage({ type: "success", text: "Voter submission rejected." });
      setSelectedVoter(null);
      fetchVoters(true);
    } catch {
      setStatusMessage({ type: "error", text: "Failed to reject voter." });
    } finally {
      setIsProcessing(false);
    }
  };

  const metrics = {
    pending: voters.length,
    ready: voters.filter(v => v.document_uploaded_at && v.face_uploaded_at).length,
    missingDocs: voters.filter(v => !v.document_uploaded_at || !v.face_uploaded_at).length,
    alerts: voters.filter(v => v.status === "FLAGGED").length,
  };

  return (
    <VerificationErrorBoundary>
      <PageContainer>
        <AdminKeyframes />
        <style>{`@keyframes vvSpin { to { transform: rotate(360deg); } }`}</style>
        <div className="admin-page-enter" style={{ maxWidth: 1320, margin: "0 auto", padding: "0 0 40px" }}>

          {/* ── Portal Hero ──────────────────────────────────── */}
          <AdminPortalHero
            eyebrow="Identity Verification"
            title="Verification Command Centre"
            subtitle="Adjudicate voter identity submissions, review uploaded citizenship documents and biometric data, and ensure every registered voter meets verification requirements."
            rightContent={<>
              <AdminHeroChip label={`${metrics.pending} Pending`} tint={metrics.pending > 0 ? ADMIN_HERO_TINTS.warn : ADMIN_HERO_TINTS.success} />
              <AdminHeroChip label={`${metrics.ready} Ready`} tint={ADMIN_HERO_TINTS.info} />
              {metrics.alerts > 0 && (
                <AdminHeroChip label={`${metrics.alerts} Flagged`} tint={ADMIN_HERO_TINTS.danger} />
              )}
            </>}
          />

          {/* ── Queue actions ───────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: T.space.lg }}>
            {lastRefreshed && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.subtle, fontWeight: 500 }}>
                <Clock size={12} color={T.subtle} />
                <span>Updated {lastRefreshed}</span>
              </div>
            )}
            <button
              onClick={() => fetchVoters(true)}
              disabled={isRefreshing}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: T.radius.md,
                border: `1px solid ${T.border}`, background: T.surface,
                fontSize: 13, fontWeight: 600, color: T.textSecondary,
                cursor: isRefreshing ? "not-allowed" : "pointer",
                transition: T.transition, opacity: isRefreshing ? 0.6 : 1,
                boxShadow: T.shadow.sm,
              }}
              onMouseEnter={e => { if (!isRefreshing) { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.borderColor = T.borderStrong; } }}
              onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border; }}
            >
              <RefreshCw size={13} style={isRefreshing ? { animation: "vvSpin 1s linear infinite" } : {}} />
              Refresh Queue
            </button>
          </div>

          {/* ── Queue health metrics ──────────────────────────── */}
          <VerificationSummaryStrip metrics={metrics} />

          {/* ── Status banner ───────────────────────────── */}
          {statusMessage && (
            <div style={{
              padding: "10px 16px",
              marginBottom: T.space.lg,
              borderRadius: T.radius.md,
              background: statusMessage.type === "success" ? T.successBg : T.errorBg,
              color: statusMessage.type === "success" ? T.success : T.error,
              border: `1px solid ${statusMessage.type === "success" ? T.successBorder : T.errorBorder}`,
              fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {statusMessage.type === "success"
                ? <CheckCircle2 size={14} />
                : <AlertTriangle size={14} />}
              <span>{statusMessage.text}</span>
              <button
                onClick={() => setStatusMessage(null)}
                style={{
                  marginLeft: "auto", background: "transparent", border: "none",
                  cursor: "pointer", color: "inherit", fontSize: 17, lineHeight: 1, padding: 0,
                }}
              >×</button>
            </div>
          )}

          {/* ── Master-detail workbench ──────────────────── */}
          <VerificationWorkbench
            allItems={voters}
            isLoading={loading}
            selectedVoter={selectedVoter}
            onSelectVoter={setSelectedVoter}
            isBusy={isProcessing}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </PageContainer>
    </VerificationErrorBoundary>
  );
}
