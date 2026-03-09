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
      <InsightsCard
        title="Success Rate"
        value={`${stats.successRate.toFixed(0)}%`}
        trend={
          stats.successRate >= 90
            ? { value: "Healthy", type: "positive" }
            : { value: "Needs attention", type: "negative" }
        }
      />
      <InsightsCard
        title="Patients Processed"
        value={String(stats.totalPatients)}
      />
      <InsightsCard
        title="Total Charges"
        value={formatter.format(stats.totalCharges)}
      />
      <InsightsCard
        title="Needs Review"
        value={String(stats.needsReviewBatches)}
        trend={
          stats.needsReviewBatches > 0
            ? { value: `${stats.needsReviewBatches} pending`, type: "negative" }
            : { value: "All clear", type: "positive" }
        }
      />
    </div>
  );
}
