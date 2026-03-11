import { decodeArrowTable } from "./arrow";
import type { RawRun, RunState } from "./types";
import dayjs from "dayjs";

export interface Patient {
  patientName: string;
  admissionDate: string;
  patientControlNumber: string;
  insuredName: string;
  dateOfBirth: string;
  totalCharges: number;
  payer: string;
}

export interface EmailStatus {
  recipientEmail: string;
  pdfFound: boolean;
  patientName: string;
  patientControlNumber: string;
  emailSent: boolean;
}

export interface ClaimField {
  field: string;
  section: string;
  values: Record<string, string>;
}

export interface NormalizedRun {
  id: string;
  state: RunState;
  createdAt: string;
  updatedAt: string | null;
  kognitosUrl: string;
  emailRecipient: string | null;
  patients: Patient[];
  emailStatuses: EmailStatus[];
  claimFields: ClaimField[];
  pdfCount: number;
}

export interface DashboardStats {
  totalBatches: number;
  completedBatches: number;
  processingBatches: number;
  failedBatches: number;
  needsReviewBatches: number;
  successRate: number;
  totalPatients: number;
  totalCharges: number;
  uniquePayers: string[];
  claimsReceivedVsLastWeekPct: number | null;
}

export function getRunState(run: RawRun): RunState {
  const stateKeys = Object.keys(run.state || {}) as RunState[];
  return stateKeys[0] || "pending";
}

export function getRunId(run: RawRun): string {
  return run.name.split("/").pop()!;
}

export function normalizePatients(b64: string): Patient[] {
  const rows = decodeArrowTable(b64);
  return rows.map((r) => ({
    patientName: String(r["Patient Name"] ?? ""),
    admissionDate: String(r["Admission Date"] ?? ""),
    patientControlNumber: String(r["Patient Control Number"] ?? ""),
    insuredName: String(r["Insured Name"] ?? ""),
    dateOfBirth: String(r["Date of Birth"] ?? ""),
    totalCharges: parseFloat(String(r["Claim Value"] ?? r["Total Charges"] ?? "0")) || 0,
    payer: String(r["Payer"] ?? ""),
  }));
}

export function normalizeEmailStatuses(b64: string): EmailStatus[] {
  const rows = decodeArrowTable(b64);
  return rows.map((r) => ({
    recipientEmail: String(r["Recipient Email"] ?? ""),
    pdfFound: String(r["PDF Found"]).toLowerCase() === "true",
    patientName: String(r["Patient Name"] ?? ""),
    patientControlNumber: String(r["Patient Control Number"] ?? ""),
    emailSent: String(r["Email Sent"]).toLowerCase() === "true",
  }));
}

export function normalizeClaimFields(b64: string): ClaimField[] {
  const rows = decodeArrowTable(b64);
  if (rows.length === 0) return [];

  const metaCols = new Set(["Field", "Section"]);
  const patientCols = Object.keys(rows[0]).filter((k) => !metaCols.has(k));

  return rows.map((r) => ({
    field: String(r["Field"] ?? ""),
    section: String(r["Section"] ?? ""),
    values: Object.fromEntries(
      patientCols.map((col) => [col, String(r[col] ?? "")])
    ),
  }));
}

export function normalizeRun(
  run: RawRun,
  kognitosUrl: string
): NormalizedRun {
  const state = getRunState(run);
  const outputs = run.state.completed?.outputs ?? {};
  const outputKeys = Object.keys(outputs);

  if (state === "completed" && outputKeys.length === 0) {
    const runId = getRunId(run);
    console.warn(
      `[normalizeRun] Completed run ${runId} has no outputs — ` +
      `the list API may not include output data. ` +
      `State keys: ${JSON.stringify(Object.keys(run.state))}`
    );
  }

  const ppB64 = outputs.pending_patients?.table?.inline?.data;
  const esB64 = outputs.email_status?.table?.inline?.data;
  const csB64 = outputs.claims_submitted?.table?.inline?.data;

  const pdfItems = (outputs.completed_pdfs as any)?.list?.items ?? [];

  return {
    id: getRunId(run),
    state,
    createdAt: run.create_time,
    updatedAt: run.update_time ?? null,
    kognitosUrl,
    emailRecipient: run.user_inputs?.["Email Recipient"]?.text ?? null,
    patients: ppB64 ? normalizePatients(ppB64) : [],
    emailStatuses: esB64 ? normalizeEmailStatuses(esB64) : [],
    claimFields: csB64 ? normalizeClaimFields(csB64) : [],
    pdfCount: pdfItems.length,
  };
}

export function computeDashboardStats(runs: NormalizedRun[]): DashboardStats {
  const stateCounts: Record<string, number> = {};
  let totalPatients = 0;
  let totalCharges = 0;
  const payerSet = new Set<string>();

  const now = dayjs();
  const weekStart = now.subtract(7, "day");
  const twoWeeksStart = now.subtract(14, "day");
  let thisWeekPatients = 0;
  let lastWeekPatients = 0;

  for (const run of runs) {
    stateCounts[run.state] = (stateCounts[run.state] || 0) + 1;
    const count = run.patients.length;
    totalPatients += count;
    for (const p of run.patients) {
      totalCharges += p.totalCharges;
      if (p.payer) payerSet.add(p.payer);
    }
    const runDate = dayjs(run.createdAt);
    if (runDate.isAfter(weekStart)) thisWeekPatients += count;
    else if (runDate.isAfter(twoWeeksStart)) lastWeekPatients += count;
  }

  const completed = stateCounts["completed"] || 0;
  const total = runs.length;

  const claimsReceivedVsLastWeekPct =
    lastWeekPatients > 0
      ? ((thisWeekPatients - lastWeekPatients) / lastWeekPatients) * 100
      : null;

  return {
    totalBatches: total,
    completedBatches: completed,
    processingBatches: (stateCounts["executing"] || 0) + (stateCounts["pending"] || 0),
    failedBatches: (stateCounts["failed"] || 0) + (stateCounts["stopped"] || 0),
    needsReviewBatches: stateCounts["awaiting_guidance"] || 0,
    successRate: total > 0 ? (completed / total) * 100 : 0,
    totalPatients,
    totalCharges,
    uniquePayers: Array.from(payerSet).sort(),
    claimsReceivedVsLastWeekPct,
  };
}

export interface TrendPoint {
  date: string;
  batches: number;
  patients: number;
  charges: number;
}

export function computeTrend(runs: NormalizedRun[]): TrendPoint[] {
  const byDate = new Map<string, TrendPoint>();

  for (const run of runs) {
    if (run.state !== "completed") continue;
    const date = dayjs(run.createdAt).format("MMM D");
    const existing = byDate.get(date) || { date, batches: 0, patients: 0, charges: 0 };
    existing.batches += 1;
    existing.patients += run.patients.length;
    existing.charges += run.patients.reduce((s, p) => s + p.totalCharges, 0);
    byDate.set(date, existing);
  }

  return Array.from(byDate.values());
}

export interface PayerBreakdown {
  payer: string;
  patients: number;
  totalCharges: number;
}

export function computePayerBreakdown(runs: NormalizedRun[]): PayerBreakdown[] {
  const byPayer = new Map<string, PayerBreakdown>();

  for (const run of runs) {
    for (const p of run.patients) {
      if (!p.payer) continue;
      const existing = byPayer.get(p.payer) || { payer: p.payer, patients: 0, totalCharges: 0 };
      existing.patients += 1;
      existing.totalCharges += p.totalCharges;
      byPayer.set(p.payer, existing);
    }
  }

  return Array.from(byPayer.values()).sort((a, b) => b.totalCharges - a.totalCharges);
}

export function stateLabel(state: RunState): string {
  const map: Record<RunState, string> = {
    completed: "Submitted",
    executing: "Processing",
    pending: "Queued",
    awaiting_guidance: "Needs Review",
    failed: "Failed",
    stopped: "Stopped",
  };
  return map[state] || state;
}

export function stateBadgeVariant(
  state: RunState
): "success" | "warning" | "destructive" | "secondary" | "default" {
  const map: Record<RunState, "success" | "warning" | "destructive" | "secondary" | "default"> = {
    completed: "success",
    executing: "warning",
    pending: "secondary",
    awaiting_guidance: "warning",
    failed: "destructive",
    stopped: "secondary",
  };
  return map[state] || "default";
}
