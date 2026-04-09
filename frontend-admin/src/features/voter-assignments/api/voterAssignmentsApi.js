import apiClient from "../../../lib/apiClient";

export async function listAssignments(page = 1, pageSize = 50) {
  const res = await apiClient.get("/admin/voter-assignments/", {
    params: { page, page_size: pageSize },
  });
  return res.data;
}

export async function getAssignment(voterId) {
  const res = await apiClient.get(`/admin/voter-assignments/${voterId}`);
  return res.data;
}

export async function assignVoter(voterId, constituencyId) {
  const res = await apiClient.post("/admin/voter-assignments/", {
    voter_id: voterId,
    constituency_id: constituencyId,
  });
  return res.data;
}

export async function removeAssignment(voterId) {
  await apiClient.delete(`/admin/voter-assignments/${voterId}`);
}

export async function listConstituencies() {
  const res = await apiClient.get("/admin/voter-assignments/constituencies");
  return res.data;
}

export async function listAssignableVoters(search = "") {
  const res = await apiClient.get("/admin/voter-assignments/voters", {
    params: { search },
  });
  return res.data;
}
