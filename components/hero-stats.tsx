"use client";

import { InsightsCard } from "@kognitos/lattice";
import type { DashboardStats } from "@/lib/transforms";

export function HeroStats({ stats }: { stats: DashboardStats }) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <InsightsCard
        title="Claim Batches"
        value={String(stats.totalBatches)}
      />
      <div className="rounded-lg border bg-card min-w-0 p-5 flex flex-col gap-2">
        <span className="text-base font-medium text-muted-foreground truncate">
          Success Rate
        </span>
        <span className="text-3xl font-medium leading-9 text-foreground">
          {stats.successRate.toFixed(0)}%
        </span>
        <span
          className={`text-xs font-medium ${
            stats.successRate >= 90 ? "text-success" : "text-destructive"
          }`}
        >
          {stats.successRate >= 90 ? "Healthy" : "Needs attention"}
        </span>
      </div>
      <div className="rounded-lg border bg-card min-w-0 p-5 flex flex-col gap-2">
        <span className="text-base font-medium text-muted-foreground truncate">
          Claims Received
        </span>
        <span className="text-3xl font-medium leading-9 text-foreground">
          {stats.totalPatients.toLocaleString()}
        </span>
        <span
          className={`text-xs font-medium ${
            stats.claimsReceivedVsLastWeekPct != null
              ? stats.claimsReceivedVsLastWeekPct >= 0
                ? "text-success"
                : "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {stats.claimsReceivedVsLastWeekPct != null
            ? `${stats.claimsReceivedVsLastWeekPct > 0 ? "↑" : stats.claimsReceivedVsLastWeekPct < 0 ? "↓" : "→"} ${Math.abs(stats.claimsReceivedVsLastWeekPct).toFixed(0)}% vs last week`
            : "— vs last week"}
        </span>
      </div>
      <InsightsCard
        title="Total Charges"
        value={formatter.format(stats.totalCharges)}
      />
      <div className="rounded-lg border bg-card min-w-0 p-5 flex flex-col gap-2">
        <span className="text-base font-medium text-muted-foreground truncate">
          Needs Review
        </span>
        <span className="text-3xl font-medium leading-9 text-foreground">
          {stats.needsReviewBatches.toLocaleString()}
        </span>
        <span
          className={`text-xs font-medium ${
            stats.needsReviewBatches > 0 ? "text-destructive" : "text-success"
          }`}
        >
          {stats.needsReviewBatches > 0
            ? `${stats.needsReviewBatches} pending`
            : "All clear"}
        </span>
      </div>
    </div>
  );
}
