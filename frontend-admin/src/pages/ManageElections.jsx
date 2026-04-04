import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Plus, Search, Filter, AlertCircle, CheckCircle2, Clock, XCircle, MoreVertical } from "lucide-react";

/**
 * ManageElections component
 * Provides an administrative interface for creating, editing, and monitoring elections.
 */

const API_BASE_URL = "http://localhost:8000/admin/elections";

export default function ManageElections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [modalState, setModalState] = useState({ type: null, data: null });
  const [toasts, setToasts] = useState([]);

  const fetchElections = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await axios.get(API_BASE_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(data?.items || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch elections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const addToast = (message, tone = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, tone }]);
  };

  const handleDismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredItems = items.filter((it) => {
    const s = search.toLowerCase();
    if (search.trim() && !it.title.toLowerCase().includes(s) && !it.government_level.toLowerCase().includes(s)) {
      return false;
    }
    if (filterStatus !== "all" && it.status !== filterStatus) return false;
    if (filterLevel !== "all" && it.government_level !== filterLevel) return false;
    return true;
  });

  const stats = [
    { label: "Total Elections", value: items.length, tone: "primary" },
    { label: "Active", value: items.filter((e) => e.status === "ACTIVE").length, tone: "success" },
    { label: "Scheduled", value: items.filter((e) => e.status === "SCHEDULED").length, tone: "amber" },
    { label: "Completed", value: items.filter((e) => e.status === "COMPLETED").length, tone: "neutral" },
  ];

  return (
    <div className="manage-elections-page">
      <div className="manage-elections-container">
        <header className="page-header card-surface">
          <div>
            <p className="eyebrow">Electoral management</p>
            <h1>Manage Elections</h1>
            <p className="subtitle">Configure polls, define levels, and monitor live voting status.</p>
          </div>
          <div className="header-actions">
            <button className="primary-button" onClick={() => setCreateOpen(true)}>
              + New Election
            </button>
          </div>
        </header>

        <div className="stats-grid">
          {stats.map((card) => (
            <div key={card.label} className={`stat-card tone-${card.tone}`}>
              <p className="stat-label">{card.label}</p>
              <p className="stat-value">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="toolbar card-surface">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search elections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filters">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="all">All Levels</option>
              <option value="Federal">Federal</option>
              <option value="Provincial">Provincial</option>
              <option value="Local">Local</option>
            </select>
          </div>
        </div>

        <div className="elections-grid">
          {loading ? (
            <div className="loader">Loading elections...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">No elections found matching criteria.</div>
          ) : (
            filteredItems.map((election) => (
              <div key={election.id} className="election-card card-surface">
                <div className="card-header">
                  <span className={`status-badge tone-${election.status.toLowerCase()}`}>
                    {election.status}
                  </span>
                  <button className="icon-btn">
                    <MoreVertical size={18} />
                  </button>
                </div>
                <h3>{election.title}</h3>
                <p className="level">{election.government_level}</p>
                <div className="card-footer">
                  <div className="dates">
                    <Clock size={14} />
                    <span>{new Date(election.start_time).toLocaleDateString()}</span>
                  </div>
                  <button
                    className="secondary-button mini"
                    onClick={() => setModalState({ type: "details", data: election })}
                  >
                    Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalState.type === "details" && (
          <div className="modal-overlay">
            <div className="modal-content card-surface">
              <h2>Election Details</h2>
              <pre>{JSON.stringify(modalState.data, null, 2)}</pre>
              <button className="primary-button" onClick={() => setModalState({ type: null, data: null })}>
                Close
              </button>
            </div>
          </div>
      )}

      {/* ToastStack placeholder */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast tone-${t.tone}`}>
            {t.message}
            <button onClick={() => handleDismissToast(t.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
