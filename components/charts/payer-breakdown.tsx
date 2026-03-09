"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@kognitos/lattice";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { PayerBreakdown } from "@/lib/transforms";

const chartConfig = {
  totalCharges: { label: "Total Charges ($)", color: "var(--chart-3)" },
  patients: { label: "Patients", color: "var(--chart-4)" },
};

export function PayerBreakdownChart({ data }: { data: PayerBreakdown[] }) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Charges by Payer</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" className="text-xs" />
            <YAxis dataKey="payer" type="category" width={150} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="totalCharges" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
