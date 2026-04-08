import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VerificationSummaryStrip from "../features/voter-verifications/components/VerificationSummaryStrip";
import VoterVerificationQueue from "../features/voter-verifications/components/VoterVerificationQueue";
import VoterVerificationReviewPanel from "../features/voter-verifications/components/VoterVerificationReviewPanel";
import VerificationEmptyState from "../features/voter-verifications/components/VerificationEmptyState";
import { tokens } from "../features/voter-verifications/components/tokens";

const API = "http://localhost:8000";

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
        <div style={{ padding: 32, textAlign: "center", color: "#b91c1c" }}>
          <h3>Something went wrong loading Voter Verifications.</h3>
          <pre style={{ fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>{this.state.error.message}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ marginTop: 16, padding: "8px 20px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer" }}>
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
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: tokens.spacing.lg }}>
      <VerificationSummaryStrip metrics={metrics} />

      {statusMessage && (
        <div style={{
          padding: tokens.spacing.md,
          marginBottom: tokens.spacing.xl,
          borderRadius: tokens.borderRadius.medium,
          background: statusMessage.type === "success" ? tokens.status.success.background : tokens.status.danger.background,
          color: statusMessage.type === "success" ? tokens.status.success.text : tokens.status.danger.text,
          border: `1px solid ${statusMessage.type === "success" ? tokens.status.success.border : tokens.status.danger.border}`,
          fontSize: tokens.fontSizes.sm,
          fontWeight: 500,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{statusMessage.text}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontWeight: "bold" }}
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
    </VerificationErrorBoundary>
  );
}
