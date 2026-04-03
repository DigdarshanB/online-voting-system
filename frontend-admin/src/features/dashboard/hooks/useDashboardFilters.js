import { useState } from "react";

export default function useDashboardFilters() {
  const [range, setRange] = useState("6m");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return {
    range,
    startDate,
    endDate,
    setRange,
    setStartDate,
    setEndDate,
  };
}
