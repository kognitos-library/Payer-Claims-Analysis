"use client";

import type { DashboardStats } from "@/lib/transforms";

export function HeroStats({ stats }: { stats: DashboardStats }) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const compactFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
  const avgClaim =
    stats.totalPatients > 0 ? stats.totalCharges / stats.totalPatients : 0;
  const manualReviewPct =
    stats.totalPatients > 0 && stats.needsReviewBatches != null
      ? (stats.needsReviewBatches / stats.totalPatients) * 100
      : null;
  const cycleDays = stats.adjudicationCycleDays ?? 0;
  const cycleChange = stats.adjudicationCycleChangePct ?? null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Claims Received */}
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
            ? `${stats.claimsReceivedVsLastWeekPct > 0 ? "+" : ""}${stats.claimsReceivedVsLastWeekPct.toFixed(0)}% vs last week`
            : "— vs last week"}
        </span>
      </div>

      {/* 2. Total Charges Received */}
      <div className="rounded-lg border bg-card min-w-0 p-5 flex flex-col gap-2">
        <span className="text-base font-medium text-muted-foreground truncate">
          Total Charges Received
        </span>
        <span className="text-3xl font-medium leading-9 text-foreground">
          {compactFormatter.format(stats.totalCharges)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {avgClaim > 0 ? (
            <span className="text-success">{formatter.format(avgClaim)}</span>
          ) : (
            "—"
          )}{" "}
          Avg Claim
        </span>
      </div>

      {/* 3. STP Rate */}
      <div className="rounded-lg border bg-card min-w-0 p-5 flex flex-col gap-2">
        <span className="text-base font-medium text-muted-foreground truncate">
          STP Rate
        </span>
        <span className="text-3xl font-medium leading-9 text-success">
          {stats.successRate.toFixed(0)}%
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Claims auto-adjudicated without manual review
        </span>
      </div>

      {/* 4. High-Risk Claims */}
      <div className="rounded-lg border bg-card min-w-0 p-5 flex flex-col gap-2">
        <span className="text-base font-medium text-muted-foreground truncate">
          High-Risk Claims
        </span>
        <span className="text-3xl font-medium leading-9 text-foreground">
          {compactFormatter.format(stats.highRiskCharges ?? 0)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {(stats.highRiskClaimCount ?? 0).toLocaleString()} claims flagged
        </span>
      </div>

      {/* 5. Manual Review Queue */}
      <div className="rounded-lg border bg-card min-w-0 p-5 flex flex-col gap-2">
        <span className="text-base font-medium text-muted-foreground truncate">
          Manual Review Queue
        </span>
        <span className="text-3xl font-medium leading-9 text-foreground">
          {stats.needsReviewBatches.toLocaleString()}
          <span className="text-base font-normal text-muted-foreground ml-1">
            claims
          </span>
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {manualReviewPct != null
            ? `${manualReviewPct.toFixed(1)}% of intake`
            : "—% of intake"}
        </span>
      </div>

      {/* 6. Adjudication Cycle Time */}
      <div className="rounded-lg border bg-card min-w-0 p-5 flex flex-col gap-2">
        <span className="text-base font-medium text-muted-foreground truncate">
          Adjudication Cycle Time
        </span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl font-medium leading-9 text-foreground">
            {cycleDays > 0 ? `${cycleDays.toFixed(1)} days` : "— days"}
          </span>
          {cycleChange != null && (
            <span className="text-xs font-medium text-success">
              {cycleChange > 0 ? "↑" : cycleChange < 0 ? "↓" : "→"}{" "}
              {Math.abs(cycleChange).toFixed(0)}% this month
            </span>
          )}
        </div>
        <div className="flex gap-0.5 h-1.5 mt-1 rounded-full overflow-hidden bg-muted">
          <div
            className="bg-primary rounded-l-full"
            style={{ width: cycleDays > 0 ? "25%" : "10%" }}
          />
          <div className="flex-1 bg-muted" />
          <div
            className="bg-success rounded-r-full"
            style={{ width: "15%" }}
          />
        </div>
      </div>
    </div>
  );
}
