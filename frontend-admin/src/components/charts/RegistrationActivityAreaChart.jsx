import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";

export default function RegistrationActivityAreaChart({ items = [], height = 320 }) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const option = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];

    const grid = isMobile
      ? {
          left: 20,
          right: 12,
          top: 44,
          bottom: 28,
          containLabel: true,
        }
      : {
          left: 40,
          right: 20,
          top: 48,
          bottom: 36,
          containLabel: true,
        };

    const legend = isMobile
      ? {
          show: true,
          top: 0,
          left: "center",
          itemGap: 8,
          textStyle: {
            color: "#475569",
            fontSize: 11,
            fontWeight: 600,
          },
          data: ["Registrations"],
        }
      : {
          show: true,
          top: 0,
          left: 0,
          textStyle: {
            color: "#475569",
            fontSize: 12,
            fontWeight: 600,
          },
          data: ["Registrations"],
        };

    return {
      color: ["#2457A6"],
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const first = Array.isArray(params) ? params[0] : params;
          const label = first?.axisValue || "";
          const value = Number(first?.data || 0);
          return `${label}<br/>Registrations: ${value}`;
        },
      },
      legend,
      grid,
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: safeItems.map((item) => item?.month_label || ""),
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
          fontSize: isMobile ? 11 : 12,
          fontWeight: 600,
          hideOverlap: true,
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
        axisLabel: {
          color: "#64748B",
          fontSize: isMobile ? 11 : 12,
          fontWeight: 600,
        },
        splitLine: {
          lineStyle: {
            color: "#E2E8F0",
          },
        },
      },
      series: [
        {
          name: "Registrations",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: "#2457A6",
          },
          areaStyle: {
            color: "rgba(36, 87, 166, 0.14)",
          },
          data: safeItems.map((item) => Number(item?.count || 0)),
        },
      ],
    };
  }, [items, isMobile]);

  return (
    <div
      aria-label="Registration activity chart"
      style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}
    >
      <ReactECharts option={option} style={{ width: "100%", height }} notMerge lazyUpdate />
    </div>
  );
}
