import { useQuery } from "@tanstack/react-query";
import { getDashboardSystemStatus } from "../api/getDashboardSystemStatus";

export function useDashboardSystemStatus() {
  return useQuery({
    queryKey: ["dashboard", "system-status"],
    queryFn: getDashboardSystemStatus,
  });
}
