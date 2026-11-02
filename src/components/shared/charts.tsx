"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartPoint } from "@/types";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function AreaChartCard({
  title,
  data,
  color = "#22c55e",
  height = 280,
}: {
  title: string;
  data: ChartPoint[];
  color?: string;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart
          type="area"
          height={height}
          series={[{ name: title, data: data.map((d) => d.value) }]}
          options={{
            chart: {
              toolbar: { show: false },
              zoom: { enabled: false },
              fontFamily: "inherit",
              background: "transparent",
            },
            dataLabels: { enabled: false },
            stroke: { curve: "smooth", width: 3 },
            fill: {
              type: "gradient",
              gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [0, 90, 100],
              },
            },
            colors: [color],
            grid: {
              borderColor: "rgba(148,163,184,0.2)",
              strokeDashArray: 4,
            },
            xaxis: {
              categories: data.map((d) => d.label),
              labels: { style: { colors: "#94a3b8" } },
              axisBorder: { show: false },
              axisTicks: { show: false },
            },
            yaxis: {
              labels: {
                style: { colors: "#94a3b8" },
                formatter: (val: number) =>
                  val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`,
              },
            },
            tooltip: { theme: "dark" },
          }}
        />
      </CardContent>
    </Card>
  );
}

export function BarChartCard({
  title,
  data,
  color = "#16a34a",
  height = 280,
}: {
  title: string;
  data: ChartPoint[];
  color?: string;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart
          type="bar"
          height={height}
          series={[{ name: title, data: data.map((d) => d.value) }]}
          options={{
            chart: {
              toolbar: { show: false },
              fontFamily: "inherit",
              background: "transparent",
            },
            plotOptions: {
              bar: { borderRadius: 8, columnWidth: "45%" },
            },
            dataLabels: { enabled: false },
            colors: [color],
            grid: {
              borderColor: "rgba(148,163,184,0.2)",
              strokeDashArray: 4,
            },
            xaxis: {
              categories: data.map((d) => d.label),
              labels: { style: { colors: "#94a3b8" } },
              axisBorder: { show: false },
              axisTicks: { show: false },
            },
            yaxis: {
              labels: { style: { colors: "#94a3b8" } },
            },
            tooltip: { theme: "dark" },
          }}
        />
      </CardContent>
    </Card>
  );
}
