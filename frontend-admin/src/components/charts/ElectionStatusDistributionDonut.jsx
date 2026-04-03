import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";

export default function ElectionStatusDistributionDonut({ items = [], height = 320 }) {
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
    const total = safeItems.reduce((sum, item) => sum + Number(item?.value || 0), 0);

    const legend = isMobile
      ? {
          show: true,
          orient: "horizontal",
          left: "center",
          bottom: 8,
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 10,
          textStyle: {
            color: "#475569",
            fontSize: 11,
            fontWeight: 600,
          },
          data: safeItems.map((item) => item?.label || ""),
        }
      : {
          show: true,
          orient: "vertical",
          right: 8,
          top: "middle",
          itemWidth: 10,
          itemHeight: 10,
          textStyle: {
            color: "#475569",
            fontSize: 12,
            fontWeight: 600,
          },
          data: safeItems.map((item) => item?.label || ""),
        };

    return {
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const value = Number(params?.value || 0);
          const percent = Number(params?.percent || 0);
          return `${params?.name || ""}<br/>Count: ${value}<br/>Share: ${percent}%`;
        },
      },
      legend,
      graphic: [
        {
          type: "group",
          left: isMobile ? "50%" : "36%",
          top: isMobile ? "38%" : "52%",
          children: [
            {
              type: "text",
              style: {
                text: String(total),
                fontSize: isMobile ? 24 : 30,
                fontWeight: 800,
                fill: "#0F172A",
                textAlign: "center",
              },
              left: "center",
              top: -18,
            },
            {
              type: "text",
              style: {
                text: "Total",
                fontSize: 12,
                fontWeight: 600,
                fill: "#64748B",
                textAlign: "center",
              },
              left: "center",
              top: 12,
            },
          ],
        },
      ],
      series: [
        {
          name: "Election Status",
          type: "pie",
          radius: isMobile ? ["42%", "62%"] : ["52%", "74%"],
          center: isMobile ? ["50%", "38%"] : ["36%", "52%"],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          data: safeItems.map((item) => ({
            name: item?.label || "",
            value: Number(item?.value || 0),
            itemStyle: {
              color: item?.color || "#94A3B8",
            },
          })),
        },
      ],
    };
  }, [items, isMobile]);

  return (
    <div
      aria-label="Election status distribution chart"
      style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}
    >
      <ReactECharts option={option} style={{ width: "100%", height }} notMerge lazyUpdate />
    </div>
  );
}
