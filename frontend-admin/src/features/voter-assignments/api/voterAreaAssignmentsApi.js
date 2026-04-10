import apiClient from "../../../lib/apiClient";

/**
 * API client for provincial/local voter area assignments.
 * Backend: /admin/voter-area-assignments/
 */

export async function listAreaAssignments({
  government_level = "PROVINCIAL",
  page = 1,
  pageSize = 50,
} = {}) {
  const res = await apiClient.get("/admin/voter-area-assignments/", {
    params: { government_level, page, page_size: pageSize },
  });
  return res.data;
}

export async function listAreas({ government_level = "PROVINCIAL", province_number } = {}) {
  const params = { government_level };
  if (province_number != null) params.province_number = province_number;
  const res = await apiClient.get("/admin/voter-area-assignments/areas", { params });
  return res.data;
}

export async function listAssignableVotersForArea(search = "", government_level = "PROVINCIAL") {
  const res = await apiClient.get("/admin/voter-area-assignments/voters", {
    params: { search, government_level },
  });
  return res.data;
}

export async function assignVoterToArea(voter_id, area_id, government_level = "PROVINCIAL") {
  const res = await apiClient.post("/admin/voter-area-assignments/", {
    voter_id,
    area_id,
    government_level,
  });
  return res.data;
}

export async function removeAreaAssignment(voter_id, government_level = "PROVINCIAL") {
  await apiClient.delete(`/admin/voter-area-assignments/${voter_id}`, {
    params: { government_level },
  });
}
