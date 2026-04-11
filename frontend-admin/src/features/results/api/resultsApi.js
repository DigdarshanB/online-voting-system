import apiClient from "../../../lib/apiClient";

export async function listCountRuns(electionId) {
  const res = await apiClient.get(`/admin/results/${electionId}/count-runs`);
  return res.data;
}

export async function createCountRun(electionId) {
  const res = await apiClient.post(`/admin/results/${electionId}/count-runs`);
  return res.data;
}

export async function executeCountRun(countRunId) {
  const res = await apiClient.post(`/admin/results/count-runs/${countRunId}/execute`);
  return res.data;
}

export async function getCountRun(countRunId) {
  const res = await apiClient.get(`/admin/results/count-runs/${countRunId}`);
  return res.data;
}

export async function getResultSummary(countRunId) {
  const res = await apiClient.get(`/admin/results/count-runs/${countRunId}/summary`);
  return res.data;
}

export async function getFptpResults(countRunId) {
  const res = await apiClient.get(`/admin/results/count-runs/${countRunId}/fptp`);
  return res.data;
}

export async function getPrResults(countRunId) {
  const res = await apiClient.get(`/admin/results/count-runs/${countRunId}/pr`);
  return res.data;
}

export async function finalizeCountRun(countRunId) {
  const res = await apiClient.post(`/admin/results/count-runs/${countRunId}/finalize`);
  return res.data;
}

export async function lockCountRun(countRunId) {
  const res = await apiClient.post(`/admin/results/count-runs/${countRunId}/lock`);
  return res.data;
}

export async function getPrElectedMembers(countRunId) {
  const res = await apiClient.get(`/admin/results/count-runs/${countRunId}/pr-elected-members`);
  return res.data;
}

export async function getProvincialSummary(countRunId) {
  const res = await apiClient.get(`/admin/results/count-runs/${countRunId}/provincial-summary`);
  return res.data;
}

export async function getLocalSummary(countRunId) {
  const res = await apiClient.get(`/admin/results/count-runs/${countRunId}/local-summary`);
  return res.data;
}
