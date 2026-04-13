import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VerificationOverviewCard from "../features/voter-verifications/components/VerificationOverviewCard";
import VerificationSummaryStrip from "../features/voter-verifications/components/VerificationSummaryStrip";
import VerificationWorkbench from "../features/voter-verifications/components/VerificationWorkbench";
import { T } from "../components/ui/tokens";
import { PageContainer, AdminKeyframes } from "../components/ui/AdminUI";
import { CheckCircle2, AlertTriangle } from "lucide-react";

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
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>

          {/* Overview card — replaces the duplicate hero */}
          <VerificationOverviewCard
            onRefresh={() => fetchVoters(true)}
            isRefreshing={isRefreshing}
            lastRefreshed={lastRefreshed}
          />

          {/* Queue health metrics */}
          <VerificationSummaryStrip metrics={metrics} />

          {/* Status banner */}
          {statusMessage && (
            <div style={{
              padding: "11px 16px",
              marginBottom: 20,
              borderRadius: T.radius.md,
              background: statusMessage.type === "success" ? T.successBg : T.errorBg,
              color: statusMessage.type === "success" ? T.success : T.error,
              border: `1px solid ${statusMessage.type === "success" ? T.successBorder : T.errorBorder}`,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              {statusMessage.type === "success"
                ? <CheckCircle2 size={15} />
                : <AlertTriangle size={15} />
              }
              <span>{statusMessage.text}</span>
              <button
                onClick={() => setStatusMessage(null)}
                style={{
                  marginLeft: "auto", background: "transparent", border: "none",
                  cursor: "pointer", color: "inherit", fontWeight: "bold", fontSize: 16, lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Master-detail review workbench */}
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
