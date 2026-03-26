/**
 * File: ManageElections.jsx
 *
 * Purpose:
 *   Admin page for creating, viewing, updating, and managing the lifecycle
 *   of elections. It provides a comprehensive interface for all election-related
 *   administrative tasks.
 *
 * Access:
 *   - admin / super_admin: full UI
 *   - others: "Access denied" (redirected by router guard)
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./ManageElections.css";

const API_URL = "http://localhost:8000";

// ── Icon Components ────────────────────────────────────────────────

const Icon = ({ path, className = "icon" }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);

const ICONS = {
  plus: "M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z",
  search: "M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z",
  edit: "M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 14a1 1 0 01-1-1V5a1 1 0 011-1h2a1 1 0 110 2H6v7h7v-1a1 1 0 112 0v1a1 1 0 01-1 1H5z",
  trash: "M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z",
  dots: "M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z",
  play: "M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",
  stop: "M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H9z",
  archive: "M5 8a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm-1 3a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zM3 3a1 1 0 011-1h12a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3z",
  x: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
  info: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z",
};

// ── API Helpers ────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { headers: { Authorization: `Bearer ${token}` } };
}

function toLocalDateTimeInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toApiDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function getApiErrorMessage(error, fallback) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  return detail || fallback;
}

// ── UI Components ──────────────────────────────────────────────────

const STATUS_STYLES = {
  DRAFT: { background: "#e2e8f0", color: "#475569" },
  SCHEDULED: { background: "#dbeafe", color: "#1e40af" },
  OPEN: { background: "#d1fae5", color: "#065f46" },
  CLOSED: { background: "#fee2e2", color: "#991b1b" },
  ARCHIVED: { background: "#f1f5f9", color: "#64748b" },
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  return (
    <span className="status-badge" style={style}>
      {status}
    </span>
  );
}

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActionsMenu({ election, onAction }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action, data) => {
    setIsOpen(false);
    onAction(action, data);
  };

  return (
    <div className="actions-menu-container">
      <button onClick={() => setIsOpen(!isOpen)} className="actions-menu-trigger">
        <Icon path={ICONS.dots} />
      </button>
      {isOpen && (
        <div className="actions-menu-dropdown">
          <button onClick={() => handleAction("view", election)}>View Details</button>
          {["DRAFT", "SCHEDULED"].includes(election.status) && (
            <button onClick={() => handleAction("edit", election)}>Edit</button>
          )}
          {["DRAFT", "SCHEDULED"].includes(election.status) && (
            <button onClick={() => handleAction("open", election)}>Open Election</button>
          )}
          {election.status === "OPEN" && (
            <button onClick={() => handleAction("close", election)}>Close Election</button>
          )}
          {election.status === "CLOSED" && (
            <button onClick={() => handleAction("archive", election)}>Archive</button>
          )}
          {election.status === "DRAFT" && (
            <button className="danger" onClick={() => handleAction("delete", election)}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ElectionModal({ election, onClose, onSave }) {
  const [formData, setFormData] = useState({
    id: election?.id,
    title: election?.title ?? "",
    description: election?.description ?? "",
    election_type: election?.election_type ?? "LOCAL",
    start_time: toLocalDateTimeInput(election?.start_time),
    end_time: toLocalDateTimeInput(election?.end_time),
    result_visible_from: toLocalDateTimeInput(election?.result_visible_from),
  });
  const [error, setError] = useState("");

  const isCreating = !election?.id;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await onSave(
        {
          ...formData,
          start_time: toApiDateTime(formData.start_time),
          end_time: toApiDateTime(formData.end_time),
          result_visible_from: formData.result_visible_from
            ? toApiDateTime(formData.result_visible_from)
            : null,
        },
        isCreating
      );
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "An unexpected error occurred."));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isCreating ? "Create Election" : "Edit Election"}</h2>
          <button onClick={onClose} className="modal-close-btn">
            <Icon path={ICONS.x} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-banner">{error}</div>}
          <div className="form-group">
            <label htmlFor="title">Election Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            ></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="election_type">Election Type</label>
            <select
              id="election_type"
              name="election_type"
              value={formData.election_type}
              onChange={handleChange}
            >
              <option value="FEDERAL">Federal</option>
              <option value="PROVINCIAL">Provincial</option>
              <option value="LOCAL">Local</option>
            </select>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="start_time">Start Time</label>
              <input
                type="datetime-local"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="end_time">End Time</label>
              <input
                type="datetime-local"
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="result_visible_from">Result Visible From (optional)</label>
            <input
              type="datetime-local"
              id="result_visible_from"
              name="result_visible_from"
              value={formData.result_visible_from}
              onChange={handleChange}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isCreating ? "Create" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailView({ election, onClose, onManageCandidates }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content detail-view">
        <div className="modal-header">
          <h2>{election.title}</h2>
          <button onClick={onClose} className="modal-close-btn">
            <Icon path={ICONS.x} />
          </button>
        </div>
        <div className="detail-body">
          <div className="detail-grid">
            <div>
              <strong>Status</strong>
              <StatusBadge status={election.status} />
            </div>
            <div>
              <strong>Type</strong>
              <span>{election.election_type}</span>
            </div>
            <div>
              <strong>Start Time</strong>
              <span>{formatDate(election.start_time)}</span>
            </div>
            <div>
              <strong>End Time</strong>
              <span>{formatDate(election.end_time)}</span>
            </div>
            <div>
              <strong>Candidates</strong>
              <span>{election.candidate_count}</span>
            </div>
            <div>
              <strong>Created At</strong>
              <span>{formatDate(election.created_at)}</span>
            </div>
          </div>
          {election.description && (
            <div className="detail-description">
              <strong>Description</strong>
              <p>{election.description}</p>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onManageCandidates(election.id)}
          >
            Manage Candidates
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmationDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content confirmation-dialog">
        <div className="confirmation-icon">
          <Icon path={ICONS.info} />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────────

export default function ManageElections() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    status: searchParams.get("status") || "",
    election_type: searchParams.get("type") || "",
  });
  const [modalState, setModalState] = useState({ type: null, data: null }); // 'create', 'edit', 'view', 'delete', etc.

  const fetchElections = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await axios.get(`${API_URL}/admin/elections?${params}`, authHeaders());
      setElections(response.data);
      setUnauthorized(false);
    } catch (err) {
      console.error("Failed to fetch elections", err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) setUnauthorized(true);
      setError(getApiErrorMessage(err, "Failed to fetch elections. Please try again later."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (filters.q) next.set("q", filters.q);
    else next.delete("q");

    if (filters.status) next.set("status", filters.status);
    else next.delete("status");

    if (filters.election_type) next.set("type", filters.election_type);
    else next.delete("type");

    setSearchParams(next, { replace: true });
  }, [filters, searchParams, setSearchParams]);

  const handleSave = async (data, isCreating) => {
    setActionLoading(true);
    setSuccess("");
    setError("");
    try {
      if (isCreating) {
        await axios.post(`${API_URL}/admin/elections`, data, authHeaders());
        setSuccess("Election created successfully.");
      } else {
        await axios.put(`${API_URL}/admin/elections/${data.id}`, data, authHeaders());
        setSuccess("Election updated successfully.");
      }
      await fetchElections();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save election."));
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action, data) => {
    if (["edit", "view", "delete", "open", "close", "archive"].includes(action)) {
      setModalState({ type: action, data });
      return;
    }
  };

  const handleConfirmAction = async () => {
    const { type, data } = modalState;
    setActionLoading(true);
    setSuccess("");
    setError("");
    try {
      if (type === "delete") {
        await axios.delete(`${API_URL}/admin/elections/${data.id}`, authHeaders());
        setSuccess("Election deleted successfully.");
      } else if (["open", "close", "archive"].includes(type)) {
        await axios.post(`${API_URL}/admin/elections/${data.id}/${type}`, {}, authHeaders());
        if (type === "open") setSuccess("Election opened successfully.");
        if (type === "close") setSuccess("Election closed successfully.");
        if (type === "archive") setSuccess("Election archived successfully.");
      }
      setModalState({ type: null, data: null });
      await fetchElections();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to perform election action."));
    } finally {
      setActionLoading(false);
      setModalState({ type: null, data: null });
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading-state">Loading elections...</div>;
    }
    if (error) {
      return <div className="error-state">{error}</div>;
    }
    if (elections.length === 0) {
      return (
        <div className="empty-state">
          <h3>{filters.q || filters.status || filters.election_type ? "No matching elections" : "No elections found"}</h3>
          <p>
            {filters.q || filters.status || filters.election_type
              ? "Try changing your filters to find elections."
              : "Get started by creating a new election."}
          </p>
          <button className="btn-primary" disabled={actionLoading} onClick={() => setModalState({ type: "create", data: null })}>
            <Icon path={ICONS.plus} /> Create Election
          </button>
        </div>
      );
    }
    return (
      <table className="elections-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Candidates</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {elections.map((election) => (
            <tr key={election.id}>
              <td>{election.title}</td>
              <td>{election.election_type}</td>
              <td>
                <StatusBadge status={election.status} />
              </td>
              <td>{formatDate(election.start_time)}</td>
              <td>{formatDate(election.end_time)}</td>
              <td>
                <button
                  type="button"
                  className="candidate-count-link"
                  onClick={() => handleManageCandidates(election.id)}
                  title="Open Manage Candidates for this election"
                >
                  {election.candidate_count}
                </button>
              </td>
              <td>
                <ActionsMenu election={election} onAction={handleAction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const getConfirmationDetails = () => {
    const { type, data } = modalState;
    if (!data) return {};
    switch (type) {
      case "delete":
        return {
          title: "Delete Election?",
          message: `Are you sure you want to permanently delete "${data.title}"? This action cannot be undone.`,
        };
      case "open":
        return {
          title: "Open Election?",
          message: `Are you sure you want to open "${data.title}" for voting? This may lock certain fields from being edited.`,
        };
      case "close":
        return {
          title: "Close Election?",
          message: `Are you sure you want to close "${data.title}"? Voting will be stopped immediately.`,
        };
      case "archive":
        return {
          title: "Archive Election?",
          message: `Are you sure you want to archive "${data.title}"? It will be moved to a read-only state.`,
        };
      default:
        return {};
    }
  };

  const confirmationDetails = getConfirmationDetails();

  const handleManageCandidates = (electionId) => {
    navigate(`/admin/candidates?from=elections&electionId=${electionId}`);
  };

  return (
    <div className="manage-elections-page">
      <header className="page-header">
        <div>
          <h1>Manage Elections</h1>
          <p>Create, monitor, and control the entire election lifecycle.</p>
        </div>
        <button className="btn-primary" onClick={() => setModalState({ type: "create", data: null })}>
          <Icon path={ICONS.plus} /> Create Election
        </button>
      </header>

      {success ? <div className="global-success-banner">{success}</div> : null}
      {error ? <div className="global-error-banner">{error}</div> : null}

      {unauthorized ? (
        <div className="unauthorized-state">
          <h3>Unauthorized</h3>
          <p>Your account does not have access to election management.</p>
          <button type="button" className="btn-secondary" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
      ) : null}

      {!unauthorized ? <div className="filter-bar">
        <div className="search-input">
          <Icon path={ICONS.search} className="search-icon" />
          <input
            type="text"
            name="q"
            placeholder="Search by title..."
            value={filters.q}
            onChange={handleFilterChange}
          />
        </div>
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select name="election_type" value={filters.election_type} onChange={handleFilterChange}>
          <option value="">All Types</option>
          <option value="FEDERAL">Federal</option>
          <option value="PROVINCIAL">Provincial</option>
          <option value="LOCAL">Local</option>
        </select>
      </div> : null}

      {!unauthorized ? <main className="page-content">{renderContent()}</main> : null}

      {["create", "edit"].includes(modalState.type) && (
        <ElectionModal
          key={`${modalState.type}-${modalState.data?.id ?? "new"}`}
          election={modalState.data}
          onClose={() => setModalState({ type: null, data: null })}
          onSave={handleSave}
        />
      )}

      {modalState.type === "view" && (
        <DetailView
          election={modalState.data}
          onClose={() => setModalState({ type: null, data: null })}
          onManageCandidates={handleManageCandidates}
        />
      )}

      {["delete", "open", "close", "archive"].includes(modalState.type) && (
        <ConfirmationDialog
          {...confirmationDetails}
          onConfirm={handleConfirmAction}
          onCancel={() => setModalState({ type: null, data: null })}
        />
      )}
    </div>
  );
}
