import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

function ElectionStatusDonutChart({ data, height = 280 }) {
  const option = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];

    return {
      color: ["#1D4E89", "#2F6FED", "#60A5FA", "#93C5FD"],
      tooltip: {
        trigger: "item",
      },
      legend: {
        show: false,
      },
      series: [
        {
          type: "pie",
          radius: ["52%", "72%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 600,
              color: "#1E293B",
              formatter: "{b}: {c}",
            },
          },
          data: safeData,
        },
      ],
    };
  }, [data]);

  return (
    <div aria-label="Election status distribution chart">
      <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />
    </div>
  );
}

export default React.memo(ElectionStatusDonutChart);
