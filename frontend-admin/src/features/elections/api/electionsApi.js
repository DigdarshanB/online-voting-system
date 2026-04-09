import apiClient from "../../../lib/apiClient";

export async function createElection(data) {
  const res = await apiClient.post("/admin/elections/", data);
  return res.data;
}

export async function updateElection(id, data) {
  const res = await apiClient.patch(`/admin/elections/${id}`, data);
  return res.data;
}

export async function deleteElection(id) {
  await apiClient.delete(`/admin/elections/${id}`);
}

export async function getElection(id) {
  const res = await apiClient.get(`/admin/elections/${id}`);
  return res.data;
}

export async function generateStructure(id) {
  const res = await apiClient.post(`/admin/elections/${id}/generate-structure`);
  return res.data;
}

export async function getContests(id) {
  const res = await apiClient.get(`/admin/elections/${id}/contests`);
  return res.data;
}

export async function getReadiness(id) {
  const res = await apiClient.get(`/admin/elections/${id}/readiness`);
  return res.data;
}

export async function configureElection(id) {
  const res = await apiClient.post(`/admin/elections/${id}/configure`);
  return res.data;
}

export async function advanceElection(id) {
  const res = await apiClient.post(`/admin/elections/${id}/advance`);
  return res.data;
}

export async function getMasterDataStatus() {
  const res = await apiClient.get("/admin/elections/master-data/status");
  return res.data;
}
