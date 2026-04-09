import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useAuthGuard from "../hooks/useAuthGuard";
import apiClient from "../lib/apiClient";

const STATUS_DISPLAY = {
  POLLING_OPEN: { bg: "#dcfce7", text: "#166534", label: "Polling Open" },
  POLLING_CLOSED: { bg: "#fef3c7", text: "#92400e", label: "Polling Closed" },
  COUNTING: { bg: "#dbeafe", text: "#1e40af", label: "Counting in Progress" },
  FINALIZED: { bg: "#f0fdf4", text: "#166534", label: "Results Published" },
  ARCHIVED: { bg: "#f1f5f9", text: "#475569", label: "Archived" },
};

export default function VoterElections() {
  const { loading: authLoading, user } = useAuthGuard();
  const navigate = useNavigate();

  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    apiClient
      .get("/voter/elections/")
      .then((res) => {
        setElections(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Failed to load elections");
        setLoading(false);
      });
  }, [user]);

  if (authLoading)
    return (
      <div style={{ textAlign: "center", padding: 40 }}>Loading…</div>
    );
  if (!user) return <Navigate to="/" replace />;

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── header ─────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#1e293b",
            margin: 0,
          }}
        >
          Elections
        </h1>
        <p style={{ color: "#64748b", marginTop: 4, fontSize: 14 }}>
          View available elections and cast your ballot
        </p>
      </div>

      {/* ── states ─────────────────────────────────────── */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "#64748b",
          }}
        >
          Loading elections…
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 16,
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && elections.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗳️</div>
          <p style={{ fontSize: 16 }}>
            No elections are currently available.
          </p>
        </div>
      )}

      {/* ── election cards ─────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {elections.map((e) => {
          const sc = STATUS_DISPLAY[e.status] || {
            bg: "#f1f5f9",
            text: "#475569",
            label: e.status,
          };

          return (
            <div
              key={e.id}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {/* title row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#1e293b",
                      margin: 0,
                    }}
                  >
                    {e.title}
                  </h2>
                  {e.description && (
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      {e.description}
                    </p>
                  )}
                </div>

                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: sc.bg,
                    color: sc.text,
                    whiteSpace: "nowrap",
                  }}
                >
                  {sc.label}
                </span>
              </div>

              {/* meta row */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  fontSize: 13,
                  color: "#64748b",
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                {e.government_level && (
                  <span>
                    Level: <strong>{e.government_level}</strong>
                  </span>
                )}
                {e.polling_start_at && (
                  <span>
                    Opens:{" "}
                    <strong>
                      {new Date(e.polling_start_at).toLocaleString()}
                    </strong>
                  </span>
                )}
                {e.polling_end_at && (
                  <span>
                    Closes:{" "}
                    <strong>
                      {new Date(e.polling_end_at).toLocaleString()}
                    </strong>
                  </span>
                )}
              </div>

              {/* action row */}
              <div
                style={{ display: "flex", justifyContent: "flex-end" }}
              >
                {e.has_voted ? (
                  <span
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    ✓ Ballot Cast
                  </span>
                ) : e.status === "POLLING_OPEN" ? (
                  <button
                    onClick={() =>
                      navigate(`/elections/${e.id}/ballot`)
                    }
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cast Your Vote
                  </button>
                ) : e.status === "FINALIZED" || e.status === "ARCHIVED" ? (
                  <button
                    onClick={() =>
                      navigate(`/elections/${e.id}/results`)
                    }
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      background: "#fff",
                      color: "#2563eb",
                      border: "1px solid #2563eb",
                      cursor: "pointer",
                    }}
                  >
                    View Results
                  </button>
                ) : (
                  <span
                    style={{
                      padding: "8px 20px",
                      fontSize: 14,
                      color: "#94a3b8",
                    }}
                  >
                    {e.status === "COUNTING" ? "Counting in Progress" : "Polling Closed"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── back link ──────────────────────────────────── */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button
          onClick={() => navigate("/home")}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            fontSize: 14,
            background: "transparent",
            color: "#64748b",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
          }}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
