import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

function RegistrationTrendChart({ data, height = 280 }) {
  const option = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];

    return {
      color: ["#1D4E89"],
      tooltip: {
        trigger: "axis",
      },
      legend: {
        show: false,
      },
      grid: {
        top: 20,
        right: 16,
        bottom: 28,
        left: 40,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: safeData.map((item) => item.label),
        axisLine: {
          lineStyle: {
            color: "#CBD5E1",
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: "#64748B",
          fontSize: 12,
        },
      },
      yAxis: {
        type: "value",
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: "#E2E8F0",
          },
        },
        axisLabel: {
          color: "#64748B",
          fontSize: 12,
        },
      },
      series: [
        {
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: "#1D4E89",
          },
          areaStyle: {
            color: "rgba(29, 78, 137, 0.12)",
          },
          data: safeData.map((item) => item.value),
        },
      ],
    };
  }, [data]);

  return (
    <div aria-label="Registration trend chart">
      <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />
    </div>
  );
}

export default React.memo(RegistrationTrendChart);
