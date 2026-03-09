import { NextResponse } from "next/server";
import { req, ORG_ID, WORKSPACE_ID, requireAutomationId, kognitosRunUrl } from "@/lib/kognitos";
import { normalizeRun } from "@/lib/transforms";
import type { RawRun } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const AUTOMATION_ID = requireAutomationId();
    const prefix = `/organizations/${ORG_ID}/workspaces/${WORKSPACE_ID}/automations/${AUTOMATION_ID}`;

    const res = await req(`${prefix}/runs/${id}`);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Kognitos API error: ${res.status}` },
        { status: res.status }
      );
    }

    const raw: RawRun = await res.json();
    const run = normalizeRun(raw, kognitosRunUrl(id));

    return NextResponse.json({ run });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
