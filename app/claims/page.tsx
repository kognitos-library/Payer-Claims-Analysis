"use client";

import { useEffect, useState } from "react";
import { Title, Text, Skeleton } from "@kognitos/lattice";
import { ClaimsTable } from "@/components/claims-table";
import { DashboardError } from "@/components/error-states";
import { NoRunsEmpty } from "@/components/empty-states";
import type { NormalizedRun } from "@/lib/transforms";

export default function ClaimsPage() {
  const [runs, setRuns] = useState<NormalizedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/runs?pageSize=50");
        if (!res.ok) throw new Error("Failed to load claims data");
        const data = await res.json();
        setRuns(data.runs);
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
        <Title level="h2">Claims</Title>
        <Text color="muted">All processed patient claims across batches</Text>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 rounded-lg w-full" />
          <Skeleton className="h-[600px] rounded-lg" />
        </div>
      ) : runs.length === 0 ? (
        <NoRunsEmpty />
      ) : (
        <ClaimsTable runs={runs} />
      )}
    </div>
  );
}
