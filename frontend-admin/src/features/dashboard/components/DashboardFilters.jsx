export default function DashboardFilters({
  range,
  startDate,
  endDate,
  onRangeChange,
  onStartDateChange,
  onEndDateChange,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "end",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 130 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dashboard-text-soft)" }}>Range</span>
        <select
          value={range}
          onChange={(event) => onRangeChange(event.target.value)}
          style={{
            height: 34,
            borderRadius: 8,
            border: "1px solid var(--dashboard-border)",
            background: "#FFF",
            color: "var(--dashboard-text)",
            fontSize: 13,
            padding: "0 10px",
          }}
        >
          <option value="30d">30d</option>
          <option value="90d">90d</option>
          <option value="6m">6m</option>
          <option value="12m">12m</option>
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dashboard-text-soft)" }}>Start Date</span>
        <input
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          style={{
            height: 34,
            borderRadius: 8,
            border: "1px solid var(--dashboard-border)",
            background: "#FFF",
            color: "var(--dashboard-text)",
            fontSize: 13,
            padding: "0 10px",
          }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dashboard-text-soft)" }}>End Date</span>
        <input
          type="date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          style={{
            height: 34,
            borderRadius: 8,
            border: "1px solid var(--dashboard-border)",
            background: "#FFF",
            color: "var(--dashboard-text)",
            fontSize: 13,
            padding: "0 10px",
          }}
        />
      </label>
    </div>
  );
}
