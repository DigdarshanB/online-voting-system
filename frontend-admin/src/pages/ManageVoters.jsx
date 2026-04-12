import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VerificationSummaryStrip from "../features/voter-verifications/components/VerificationSummaryStrip";
import VoterVerificationQueue from "../features/voter-verifications/components/VoterVerificationQueue";
import VoterVerificationReviewPanel from "../features/voter-verifications/components/VoterVerificationReviewPanel";
import VerificationEmptyState from "../features/voter-verifications/components/VerificationEmptyState";
import { T } from "../components/ui/tokens";
import { PageContainer, AdminKeyframes } from "../components/ui/AdminUI";
import { ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

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
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchVoters = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/voters/pending`, { headers: authHeaders() });
      setVoters(response.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMessage({ type: "error", text: "Failed to load verification queue." });
    } finally {
      setLoading(false);
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
      fetchVoters();
    } catch (err) {
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
      fetchVoters();
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to reject voter." });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredVoters = (voters || []).filter(v => 
    (v.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.citizenship_no_normalized || "").includes(searchTerm)
  );

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
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: T.radius.lg, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg, ${T.accent}18, ${T.accent}08)`,
          border: `1.5px solid ${T.accent}30`,
        }}><ShieldCheck size={22} color={T.accent} /></div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>
            Voter Verification
          </h1>
          <p style={{ margin: "2px 0 0", color: T.muted, fontSize: 13.5, fontWeight: 500 }}>
            Review and verify pending voter identity submissions.
          </p>
        </div>
      </div>

      <VerificationSummaryStrip metrics={metrics} />

      {statusMessage && (
        <div style={{
          padding: "12px 16px",
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
          {statusMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMessage.text}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontWeight: "bold", fontSize: 16 }}
          >
            ×
          </button>
        </div>
      )}

      {!selectedVoter ? (
        voters.length === 0 && !loading ? (
          <VerificationEmptyState />
        ) : (
          <VoterVerificationQueue 
            items={filteredVoters}
            isLoading={loading}
            selectedVoterId={selectedVoter?.id}
            onSelectVoter={setSelectedVoter}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )
      ) : (
        <VoterVerificationReviewPanel 
          voter={selectedVoter}
          isBusy={isProcessing}
          onClose={() => setSelectedVoter(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
    </PageContainer>
    </VerificationErrorBoundary>
  );
}
