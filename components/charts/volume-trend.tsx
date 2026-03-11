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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import type { TrendPoint } from "@/lib/transforms";

const CLAIMS_RECEIVED_COLOR = "var(--chart-1)";
const CLAIMS_PAID_COLOR = "var(--chart-2)";

const chartConfig = {
  claimsReceived: { label: "Claims Received", color: CLAIMS_RECEIVED_COLOR },
  claimsPaid: { label: "Claims Paid", color: CLAIMS_PAID_COLOR },
};

function formatYMillion(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

export function VolumeTrend({ data }: { data: TrendPoint[] }) {
  const safeData = data ?? [];
  if (safeData.length === 0) return null;

  const totalReceived = safeData.reduce((s, d) => s + (d.claimsReceived ?? d.charges ?? 0), 0);
  const totalPaid = safeData.reduce((s, d) => s + (d.claimsPaid ?? 0), 0);
  const prevPeriodPaid =
    safeData.length >= 2
      ? safeData.slice(0, -1).reduce((s, d) => s + (d.claimsPaid ?? 0), 0)
      : 0;
  const paidChangePct =
    prevPeriodPaid > 0 ? ((totalPaid - prevPeriodPaid) / prevPeriodPaid) * 100 : null;

  const chartData = safeData.map((d) => ({
    ...d,
    claimsReceived: d.claimsReceived ?? d.charges ?? 0,
    claimsPaid: d.claimsPaid ?? 0,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle>Claims Paid vs Received</CardTitle>
        <div className="flex flex-col items-end gap-0.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              ${(totalPaid / 1e6).toFixed(1)}M
            </span>
            <span className="text-muted-foreground">Claims Paid</span>
          </div>
          {paidChangePct != null && (
            <span className="text-success text-xs font-medium">
              ↑ {paidChangePct.toFixed(0)}% month
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs"
              tickFormatter={(v) => formatYMillion(v)}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number"
                      ? `$${(value / 1e6).toFixed(2)}M`
                      : value
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="claimsReceived"
              name="Claims Received"
              stroke={CLAIMS_RECEIVED_COLOR}
              fill={CLAIMS_RECEIVED_COLOR}
              fillOpacity={0.3}
              strokeWidth={2}
              dot={{ r: 4, fill: CLAIMS_RECEIVED_COLOR, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="claimsPaid"
              name="Claims Paid"
              stroke={CLAIMS_PAID_COLOR}
              fill={CLAIMS_PAID_COLOR}
              fillOpacity={0.3}
              strokeWidth={2}
              dot={{ r: 4, fill: CLAIMS_PAID_COLOR, strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
