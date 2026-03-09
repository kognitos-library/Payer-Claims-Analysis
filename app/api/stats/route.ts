import { NextResponse } from "next/server";
import { req, ORG_ID, WORKSPACE_ID, requireAutomationId, kognitosRunUrl } from "@/lib/kognitos";
import {
  normalizeRun,
  computeDashboardStats,
  computeTrend,
  computePayerBreakdown,
} from "@/lib/transforms";
import type { RawRun } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const AUTOMATION_ID = requireAutomationId();
    const prefix = `/organizations/${ORG_ID}/workspaces/${WORKSPACE_ID}/automations/${AUTOMATION_ID}`;

    const res = await req(`${prefix}/runs?pageSize=200`);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Kognitos API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const rawRuns: RawRun[] = data.runs ?? [];

    const runs = rawRuns.map((r) => {
      const runId = r.name.split("/").pop()!;
      return normalizeRun(r, kognitosRunUrl(runId));
    });

    return NextResponse.json({
      stats: computeDashboardStats(runs),
      trend: computeTrend(runs),
      payerBreakdown: computePayerBreakdown(runs),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
