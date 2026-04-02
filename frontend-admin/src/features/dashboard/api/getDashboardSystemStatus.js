import apiClient from "../../../lib/apiClient";

export async function getDashboardSystemStatus() {
  try {
    await apiClient.get("/health");

    return {
      label: "Normal",
      state: "healthy",
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw error;
  }
}
