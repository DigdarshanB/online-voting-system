import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./ManageCandidates.css";

const API_URL = "http://localhost:8000";

const STATUS_STYLES = {
  ACTIVE: { background: "#dcfce7", color: "#166534" },
  INACTIVE: { background: "#fee2e2", color: "#991b1b" },
};

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { headers: { Authorization: `Bearer ${token}` } };
}

function getApiErrorMessage(error, fallback) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  return detail || fallback;
}

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CandidateStatusBadge({ isActive }) {
  const status = isActive ? "ACTIVE" : "INACTIVE";
  return (
    <span className="mc-status-badge" style={STATUS_STYLES[status]}>
      {status}
    </span>
  );
}

function CandidateThumb({ src, alt }) {
  if (!src) {
    return <div className="mc-thumb-placeholder">N/A</div>;
  }
  return <img className="mc-thumb" src={src} alt={alt} onError={(e) => { e.currentTarget.style.display = "none"; }} />;
}

function CandidateActions({ candidate, onAction }) {
  const [open, setOpen] = useState(false);

  const trigger = (action) => {
    setOpen(false);
    onAction(action, candidate);
  };

  return (
    <div className="mc-actions-wrap">
      <button type="button" className="mc-actions-trigger" onClick={() => setOpen((v) => !v)}>
        Actions
      </button>
      {open && (
        <div className="mc-actions-menu">
          <button type="button" onClick={() => trigger("view")}>View</button>
          <button type="button" onClick={() => trigger("edit")}>Edit / Reassign</button>
          <button type="button" className="danger" onClick={() => trigger("delete")}>Delete</button>
        </div>
      )}
    </div>
  );
}

function CandidateModal({
  mode,
  candidate,
  elections,
  selectedElectionId,
  onClose,
  onSubmit,
}) {
  const initialElectionId = candidate?.election_id ?? selectedElectionId ?? "";
  const [form, setForm] = useState({
    election_id: initialElectionId,
    name: candidate?.name ?? "",
    party: candidate?.party ?? "",
    description: candidate?.description ?? "",
    photo_path: candidate?.photo_path ?? "",
    symbol_path: candidate?.symbol_path ?? "",
    display_order: candidate?.display_order ?? 0,
    is_active: candidate?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const nextElectionId = candidate?.election_id ?? selectedElectionId ?? "";
    setForm({
      election_id: nextElectionId,
      name: candidate?.name ?? "",
      party: candidate?.party ?? "",
      description: candidate?.description ?? "",
      photo_path: candidate?.photo_path ?? "",
      symbol_path: candidate?.symbol_path ?? "",
      display_order: candidate?.display_order ?? 0,
      is_active: candidate?.is_active ?? true,
    });
    setError("");
  }, [candidate, selectedElectionId]);

  const previewElection = useMemo(
    () => elections.find((e) => e.id === Number(form.election_id)),
    [elections, form.election_id]
  );

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        election_id: Number(form.election_id),
        display_order: Number(form.display_order || 0),
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save candidate."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mc-modal-overlay">
      <div className="mc-modal">
        <div className="mc-modal-header">
          <h2>{mode === "create" ? "Add Candidate" : "Edit Candidate"}</h2>
          <button type="button" className="mc-close" onClick={onClose}>x</button>
        </div>
        <form onSubmit={submit} className="mc-form-layout">
          <div className="mc-form-main">
            {error ? <div className="mc-error">{error}</div> : null}
            <label>
              Full Name
              <input name="name" value={form.name} onChange={onChange} required />
            </label>
            <label>
              Party
              <input name="party" value={form.party} onChange={onChange} required />
            </label>
            <label>
              Election
              <select name="election_id" value={form.election_id} onChange={onChange} required>
                <option value="">Select election</option>
                {elections.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.status})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea name="description" value={form.description} onChange={onChange} rows={3} />
            </label>
            <div className="mc-inline-two">
              <label>
                Display Order
                <input name="display_order" type="number" min="0" value={form.display_order} onChange={onChange} />
              </label>
              <label className="mc-checkbox">
                Active
                <input name="is_active" type="checkbox" checked={form.is_active} onChange={onChange} />
              </label>
            </div>
            <label>
              Photo Path or URL (optional)
              <input name="photo_path" value={form.photo_path} onChange={onChange} />
            </label>
            <label>
              Symbol Path or URL (optional)
              <input name="symbol_path" value={form.symbol_path} onChange={onChange} />
            </label>
          </div>
          <aside className="mc-preview">
            <h3>Live Preview</h3>
            <div className="mc-preview-card">
              <CandidateThumb src={form.photo_path} alt={form.name || "candidate"} />
              <div>
                <div className="mc-preview-name">{form.name || "Candidate name"}</div>
                <div className="mc-preview-party">{form.party || "Party"}</div>
                <div className="mc-preview-election">{previewElection?.title || "No election selected"}</div>
                <div className="mc-preview-order">Display order: {Number(form.display_order || 0)}</div>
              </div>
            </div>
          </aside>
          <div className="mc-modal-actions">
            <button type="button" className="mc-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="mc-btn-primary" disabled={saving}>
              {saving ? "Saving..." : mode === "create" ? "Add Candidate" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CandidateDeleteDialog({ candidate, onCancel, onConfirm, deleting }) {
  return (
    <div className="mc-modal-overlay">
      <div className="mc-modal mc-confirm-modal">
        <div className="mc-modal-header">
          <h2>Delete Candidate</h2>
          <button type="button" className="mc-close" onClick={onCancel}>x</button>
        </div>
        <div className="mc-confirm-body">
          <p>
            Are you sure you want to permanently delete <strong>{candidate?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="mc-confirm-actions">
            <button type="button" className="mc-btn-secondary" onClick={onCancel} disabled={deleting}>Cancel</button>
            <button type="button" className="mc-btn-danger" onClick={onConfirm} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Candidate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateViewModal({ candidate, onClose }) {
  return (
    <div className="mc-modal-overlay">
      <div className="mc-modal mc-view-modal">
        <div className="mc-modal-header">
          <h2>Candidate Details</h2>
          <button type="button" className="mc-close" onClick={onClose}>x</button>
        </div>
        <div className="mc-view-content">
          <div className="mc-view-head">
            <CandidateThumb src={candidate.photo_path} alt={candidate.name} />
            <div>
              <h3>{candidate.name}</h3>
              <p>{candidate.party}</p>
              <CandidateStatusBadge isActive={candidate.is_active} />
            </div>
          </div>
          <div className="mc-view-grid">
            <div>
              <strong>Election</strong>
              <span>{candidate.election.title}</span>
            </div>
            <div>
              <strong>Election Status</strong>
              <span>{candidate.election.status}</span>
            </div>
            <div>
              <strong>Display Order</strong>
              <span>{candidate.display_order}</span>
            </div>
            <div>
              <strong>Created</strong>
              <span>{fmtDate(candidate.created_at)}</span>
            </div>
          </div>
          <div>
            <strong>Description</strong>
            <p>{candidate.description || "No description"}</p>
          </div>
          <div className="mc-view-symbol">
            <strong>Symbol</strong>
            <span>{candidate.symbol_path || "Not set"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManageCandidates() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [elections, setElections] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedElectionId, setSelectedElectionId] = useState(searchParams.get("electionId") || "");
  const [nameQuery, setNameQuery] = useState(searchParams.get("q") || "");
  const [modal, setModal] = useState({ type: null, candidate: null });

  const fromElections = searchParams.get("from") === "elections";

  const loadElections = useCallback(async () => {
    const res = await axios.get(`${API_URL}/admin/elections`, authHeaders());
    setElections(res.data || []);
  }, []);

  const loadCandidates = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedElectionId) params.set("election_id", selectedElectionId);
    if (nameQuery.trim()) params.set("q", nameQuery.trim());
    const queryString = params.toString();
    const endpoint = queryString
      ? `${API_URL}/admin/candidates?${queryString}`
      : `${API_URL}/admin/candidates`;
    const res = await axios.get(endpoint, authHeaders());
    setCandidates(res.data || []);
  }, [selectedElectionId, nameQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadElections();
      await loadCandidates();
      setUnauthorized(false);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) setUnauthorized(true);
      setError(getApiErrorMessage(err, "Failed to load candidates page data."));
    } finally {
      setLoading(false);
    }
  }, [loadCandidates, loadElections]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedElectionId) {
      next.set("electionId", selectedElectionId);
    } else {
      next.delete("electionId");
    }
    if (nameQuery.trim()) {
      next.set("q", nameQuery.trim());
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  }, [selectedElectionId, nameQuery, searchParams, setSearchParams]);

  const openCreate = () => setModal({ type: "create", candidate: null });
  const openEdit = (candidate) => setModal({ type: "edit", candidate });
  const openView = (candidate) => setModal({ type: "view", candidate });

  const closeModal = () => setModal({ type: null, candidate: null });

  const saveCandidate = async (payload) => {
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      if (modal.type === "create") {
        await axios.post(`${API_URL}/admin/candidates`, payload, authHeaders());
        setSuccess("Candidate created successfully.");
      } else {
        await axios.put(`${API_URL}/admin/candidates/${modal.candidate.id}`, payload, authHeaders());
        setSuccess("Candidate updated successfully.");
      }
      await loadCandidates();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save candidate."));
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteCandidate = async () => {
    if (!modal.candidate) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.delete(`${API_URL}/admin/candidates/${modal.candidate.id}`, authHeaders());
      setSuccess("Candidate deleted successfully.");
      await loadCandidates();
      setModal({ type: null, candidate: null });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete candidate."));
    } finally {
      setActionLoading(false);
    }
  };

  const onAction = (action, candidate) => {
    if (action === "view") return openView(candidate);
    if (action === "edit") return openEdit(candidate);
    if (action === "delete") {
      setModal({ type: "delete", candidate });
      return;
    }
    return undefined;
  };

  const filteredCandidates = useMemo(() => candidates, [candidates]);

  const hasElections = elections.length > 0;
  const selectedElection = elections.find((e) => String(e.id) === String(selectedElectionId));

  return (
    <div className="mc-page">
      <header className="mc-header">
        <div>
          <h1>Manage Candidates</h1>
          <p>Maintain candidate records, election assignment, and ballot ordering.</p>
        </div>
        <div className="mc-header-actions">
          {fromElections ? (
            <button type="button" className="mc-btn-secondary" onClick={() => navigate("/admin/elections")}>Back to Elections</button>
          ) : null}
          <button type="button" className="mc-btn-primary" onClick={openCreate} disabled={!hasElections || actionLoading}>
            Add Candidate
          </button>
        </div>
      </header>

      {success ? <div className="mc-success">{success}</div> : null}
      {error ? <div className="mc-error">{error}</div> : null}

      {!hasElections && !loading ? (
        <section className="mc-empty-state">
          <h3>Create an election first before adding candidates</h3>
          <p>Candidates must belong to an election. Start by creating at least one election.</p>
          <Link to="/admin/elections" className="mc-btn-primary mc-link-btn">Go to Manage Elections</Link>
        </section>
      ) : null}

      {hasElections ? (
        <section className="mc-filters">
          <label>
            Election
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              disabled={loading || actionLoading}
            >
              <option value="">All elections</option>
              {elections.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Search Candidate
            <input
              placeholder="Search by candidate name"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              disabled={loading || actionLoading}
            />
          </label>
          <button type="button" className="mc-btn-secondary" onClick={loadData} disabled={loading || actionLoading}>
            Apply
          </button>
        </section>
      ) : null}

      {unauthorized ? (
        <section className="mc-empty-state">
          <h3>Unauthorized</h3>
          <p>Your account does not have permission to access candidate management.</p>
          <button type="button" className="mc-btn-secondary" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </section>
      ) : null}

      {selectedElection ? (
        <div className="mc-election-context">
          Showing candidates for <strong>{selectedElection.title}</strong>
        </div>
      ) : null}

      {!unauthorized && loading ? <div className="mc-loading">Loading candidates...</div> : null}

      {!unauthorized && !loading && hasElections && filteredCandidates.length === 0 ? (
        <div className="mc-empty-list">
          <h3>No candidates found</h3>
          <p>Try another filter or add a candidate for the selected election.</p>
        </div>
      ) : null}

      {!unauthorized && !loading && filteredCandidates.length > 0 ? (
        <>
          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Party</th>
                  <th>Election</th>
                  <th>Status</th>
                  <th>Display Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td><CandidateThumb src={candidate.photo_path} alt={candidate.name} /></td>
                    <td>{candidate.name}</td>
                    <td>{candidate.party}</td>
                    <td>{candidate.election.title}</td>
                    <td><CandidateStatusBadge isActive={candidate.is_active} /></td>
                    <td>{candidate.display_order}</td>
                    <td><CandidateActions candidate={candidate} onAction={onAction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mc-card-list">
            {filteredCandidates.map((candidate) => (
              <article key={candidate.id} className="mc-card">
                <div className="mc-card-top">
                  <CandidateThumb src={candidate.photo_path} alt={candidate.name} />
                  <div>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.party}</p>
                    <CandidateStatusBadge isActive={candidate.is_active} />
                  </div>
                </div>
                <div className="mc-card-grid">
                  <div><strong>Election</strong><span>{candidate.election.title}</span></div>
                  <div><strong>Order</strong><span>{candidate.display_order}</span></div>
                </div>
                <div className="mc-card-actions">
                  <button type="button" className="mc-btn-secondary" onClick={() => openView(candidate)}>View</button>
                  <button type="button" className="mc-btn-secondary" onClick={() => openEdit(candidate)}>Edit</button>
                  <button type="button" className="mc-btn-danger" onClick={() => setModal({ type: "delete", candidate })}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {modal.type === "create" || modal.type === "edit" ? (
        <CandidateModal
          mode={modal.type}
          candidate={modal.candidate}
          elections={elections}
          selectedElectionId={selectedElectionId}
          onClose={closeModal}
          onSubmit={saveCandidate}
        />
      ) : null}

      {modal.type === "view" && modal.candidate ? (
        <CandidateViewModal candidate={modal.candidate} onClose={closeModal} />
      ) : null}

      {modal.type === "delete" && modal.candidate ? (
        <CandidateDeleteDialog
          candidate={modal.candidate}
          onCancel={closeModal}
          onConfirm={confirmDeleteCandidate}
          deleting={actionLoading}
        />
      ) : null}
    </div>
  );
}
