"use client";

import { useEffect, useState } from "react";
import { Title, Text, Skeleton } from "@kognitos/lattice";
import { HeroStats } from "@/components/hero-stats";
import { VolumeTrend } from "@/components/charts/volume-trend";
import { PayerBreakdownChart } from "@/components/charts/payer-breakdown";
import { RecentBatches } from "@/components/recent-batches";
import type { DashboardStats, TrendPoint, PayerBreakdown, NormalizedRun } from "@/lib/transforms";
import { DashboardError } from "@/components/error-states";

interface StatsData {
  stats: DashboardStats;
  trend: TrendPoint[];
  payerBreakdown: PayerBreakdown[];
}

export default function DashboardPage() {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [runs, setRuns] = useState<NormalizedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, runsRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/runs?pageSize=50"),
        ]);

        if (!statsRes.ok || !runsRes.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const [statsJson, runsJson] = await Promise.all([
          statsRes.json(),
          runsRes.json(),
        ]);

        setStatsData(statsJson);
        setRuns(runsJson.runs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error) return <DashboardError message={error} />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <Title level="h2">Dashboard</Title>
        <Text color="muted">Claims processing overview</Text>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Skeleton className="h-[380px] rounded-lg" />
            <Skeleton className="h-[380px] rounded-lg" />
          </div>
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      ) : (
        statsData && (
          <>
            <HeroStats stats={statsData.stats} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <VolumeTrend data={statsData.trend} />
              <PayerBreakdownChart data={statsData.payerBreakdown} />
            </div>
            <RecentBatches runs={runs} />
          </>
        )
      )}
    </div>
  );
}
