import apiClient from "../../../lib/apiClient";

// ── Parties ──────────────────────────────────────────────────────

export async function listParties({ activeOnly = false } = {}) {
  const res = await apiClient.get("/admin/parties/", { params: { active_only: activeOnly } });
  return res.data;
}

export async function createParty(data) {
  const res = await apiClient.post("/admin/parties/", data);
  return res.data;
}

export async function updateParty(id, data) {
  const res = await apiClient.patch(`/admin/parties/${id}`, data);
  return res.data;
}

export async function deleteParty(id) {
  await apiClient.delete(`/admin/parties/${id}`);
}

// ── Candidate profiles ──────────────────────────────────────────

export async function listProfiles({ partyId, activeOnly, governmentLevel } = {}) {
  const params = {};
  if (partyId) params.party_id = partyId;
  if (activeOnly) params.active_only = true;
  if (governmentLevel) params.government_level = governmentLevel;
  const res = await apiClient.get("/admin/candidates/profiles", { params });
  return res.data;
}

export async function createProfile(data) {
  const res = await apiClient.post("/admin/candidates/profiles", data);
  return res.data;
}

export async function updateProfile(id, data) {
  const res = await apiClient.patch(`/admin/candidates/profiles/${id}`, data);
  return res.data;
}

export async function deleteProfile(id) {
  await apiClient.delete(`/admin/candidates/profiles/${id}`);
}

// ── FPTP nominations ────────────────────────────────────────────

export async function listFptpNominations(electionId, { contestId, status } = {}) {
  const params = {};
  if (contestId) params.contest_id = contestId;
  if (status) params.status = status;
  const res = await apiClient.get(
    `/admin/candidates/elections/${electionId}/fptp-nominations`,
    { params },
  );
  return res.data;
}

export async function createFptpNomination(electionId, data) {
  const res = await apiClient.post(
    `/admin/candidates/elections/${electionId}/fptp-nominations`,
    data,
  );
  return res.data;
}

export async function updateFptpNomination(nominationId, data) {
  const res = await apiClient.patch(
    `/admin/candidates/fptp-nominations/${nominationId}`,
    data,
  );
  return res.data;
}

export async function deleteFptpNomination(nominationId) {
  await apiClient.delete(`/admin/candidates/fptp-nominations/${nominationId}`);
}

// ── PR submissions ──────────────────────────────────────────────

export async function listPrEligibleCandidates(electionId, partyId) {
  const res = await apiClient.get(
    `/admin/candidates/elections/${electionId}/pr-eligible-candidates`,
    { params: { party_id: partyId } },
  );
  return res.data;
}

export async function listPrSubmissions(electionId) {
  const res = await apiClient.get(
    `/admin/candidates/elections/${electionId}/pr-submissions`,
  );
  return res.data;
}

export async function createPrSubmission(electionId, data) {
  const res = await apiClient.post(
    `/admin/candidates/elections/${electionId}/pr-submissions`,
    data,
  );
  return res.data;
}

export async function deletePrSubmission(submissionId) {
  await apiClient.delete(`/admin/candidates/pr-submissions/${submissionId}`);
}

export async function reviewPrSubmission(submissionId, data) {
  const res = await apiClient.post(
    `/admin/candidates/pr-submissions/${submissionId}/review`,
    data,
  );
  return res.data;
}

// ── PR list entries ─────────────────────────────────────────────

export async function listPrEntries(submissionId) {
  const res = await apiClient.get(
    `/admin/candidates/pr-submissions/${submissionId}/entries`,
  );
  return res.data;
}

export async function addPrEntry(submissionId, data) {
  const res = await apiClient.post(
    `/admin/candidates/pr-submissions/${submissionId}/entries`,
    data,
  );
  return res.data;
}

export async function removePrEntry(submissionId, entryId) {
  await apiClient.delete(
    `/admin/candidates/pr-submissions/${submissionId}/entries/${entryId}`,
  );
}

export async function reorderPrEntries(submissionId, orderedCandidateIds) {
  const res = await apiClient.post(
    `/admin/candidates/pr-submissions/${submissionId}/entries/reorder`,
    { ordered_candidate_ids: orderedCandidateIds },
  );
  return res.data;
}

// ── PR validation ───────────────────────────────────────────────

export async function validatePrList(submissionId) {
  const res = await apiClient.post(
    `/admin/candidates/pr-submissions/${submissionId}/validate`,
  );
  return res.data;
}

export async function submitPrList(submissionId) {
  const res = await apiClient.post(
    `/admin/candidates/pr-submissions/${submissionId}/submit`,
  );
  return res.data;
}

// ── Candidate readiness ─────────────────────────────────────────

export async function getCandidateReadiness(electionId) {
  const res = await apiClient.get(
    `/admin/candidates/elections/${electionId}/readiness`,
  );
  return res.data;
}

// ── Re-export election listing for election selector ────────────

export async function listElections() {
  const res = await apiClient.get("/admin/elections/");
  return res.data;
}

export async function listContests(electionId) {
  const res = await apiClient.get(`/admin/elections/${electionId}/contests`);
  return res.data;
}

// ── Party symbol upload ─────────────────────────────────────────

export async function uploadPartySymbol(partyId, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiClient.post(`/admin/parties/${partyId}/symbol`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function removePartySymbol(partyId) {
  const res = await apiClient.delete(`/admin/parties/${partyId}/symbol`);
  return res.data;
}

// ── Candidate photo upload ──────────────────────────────────────

export async function uploadCandidatePhoto(profileId, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiClient.post(
    `/admin/candidates/profiles/${profileId}/photo`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data;
}

export async function removeCandidatePhoto(profileId) {
  const res = await apiClient.delete(
    `/admin/candidates/profiles/${profileId}/photo`,
  );
  return res.data;
}
