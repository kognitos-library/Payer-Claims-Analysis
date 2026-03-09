"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@kognitos/lattice";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import type { TrendPoint } from "@/lib/transforms";

const chartConfig = {
  patients: { label: "Patients", color: "var(--chart-1)" },
  batches: { label: "Batches", color: "var(--chart-2)" },
};

export function VolumeTrend({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claims Volume Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="patients"
              stackId="1"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="batches"
              stackId="2"
              stroke="var(--chart-2)"
              fill="var(--chart-2)"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
