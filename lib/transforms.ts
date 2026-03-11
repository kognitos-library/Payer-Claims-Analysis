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
  /** Charge parsed from claim_response text when pending_patients table is absent */
  claimResponseCharge?: number;
  /** Count of claims inferred from claim_response (e.g. 1 when a single Claim Value is found) */
  claimResponseClaimCount?: number;
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
  /** High-risk claims total charges (e.g. from flagged claims). */
  highRiskCharges?: number;
  /** Number of claims flagged as high-risk. */
  highRiskClaimCount?: number;
  /** Average adjudication cycle time in days. */
  adjudicationCycleDays?: number | null;
  /** Percent change in cycle time vs prior period (e.g. this month). */
  adjudicationCycleChangePct?: number | null;
}

export function getRunState(run: RawRun): RunState {
  const stateKeys = Object.keys(run.state || {}) as RunState[];
  return stateKeys[0] || "pending";
}

export function getRunId(run: RawRun): string {
  return run.name.split("/").pop()!;
}

const CHARGE_COLUMN_NAMES = [
  "Claim Value",
  "Total Charges",
  "Charge",
  "Charges",
  "Amount",
  "Claim Amount",
  "Total Charge",
  "Charge Amount",
  "Billed Amount",
  "Value",
  "Claim Total",
];

function getChargeFromRow(row: Record<string, unknown>): number {
  for (const key of CHARGE_COLUMN_NAMES) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== "") {
      const n = parseFloat(String(val).replace(/[,$]/g, ""));
      if (!Number.isNaN(n)) return n;
    }
  }
  for (const [key, val] of Object.entries(row)) {
    if (
      (key.toLowerCase().includes("charge") ||
        key.toLowerCase().includes("amount") ||
        key.toLowerCase().includes("value")) &&
      key !== "Patient Control Number"
    ) {
      const n = parseFloat(String(val).replace(/[,$]/g, ""));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

/** Parse claim_response text for "Claim Value" and return total charge and claim count */
export function parseClaimResponseText(text: string | undefined): { charge: number; count: number } {
  if (!text || typeof text !== "string") return { charge: 0, count: 0 };
  const amounts: number[] = [];
  let m: RegExpExecArray | null;

  // 1) Markdown table: | **Claim Value** | $12,345.67 | or | Claim Value | $12,345.67 |
  const tableRe = /Claim\s+Value\s*\*?\*?\s*[:\|]\s*\$?\s*([\d,]+(?:\.\d{2})?)/gi;
  while ((m = tableRe.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isNaN(n)) amounts.push(n);
  }
  // 2) Same line: "Claim Value" somewhere then $X,XXX.XX later on the line
  if (amounts.length === 0) {
    const lineRe = /Claim\s+Value[^\n$]*?\$\s*([\d,]+(?:\.\d{2})?)/gi;
    while ((m = lineRe.exec(text)) !== null) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isNaN(n)) amounts.push(n);
    }
  }
  // 3) Label: value on next line or after colon
  if (amounts.length === 0) {
    const labelRe = /Claim\s+Value\s*[:\s]+\$?\s*([\d,]+(?:\.\d{2})?)/gi;
    while ((m = labelRe.exec(text)) !== null) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isNaN(n)) amounts.push(n);
    }
  }

  const total = amounts.length ? amounts.reduce((a, b) => a + b, 0) : 0;
  return { charge: total, count: amounts.length || (total > 0 ? 1 : 0) };
}

export function normalizePatients(b64: string): Patient[] {
  const rows = decodeArrowTable(b64);
  return rows.map((r) => ({
    patientName: String(r["Patient Name"] ?? ""),
    admissionDate: String(r["Admission Date"] ?? ""),
    patientControlNumber: String(r["Patient Control Number"] ?? ""),
    insuredName: String(r["Insured Name"] ?? ""),
    dateOfBirth: String(r["Date of Birth"] ?? ""),
    totalCharges: getChargeFromRow(r),
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

/** Parse claims_summary table: extract Claim Value per row and return as Patient[] for dashboard/charges. */
function normalizeClaimsSummary(b64: string): Patient[] {
  const rows = decodeArrowTable(b64);
  return rows.map((r) => ({
    patientName: String(r["Patient Name"] ?? r["PatientName"] ?? "—"),
    admissionDate: String(r["Admission Date"] ?? r["AdmissionDate"] ?? ""),
    patientControlNumber: String(r["Patient Control Number"] ?? r["PatientControlNumber"] ?? ""),
    insuredName: String(r["Insured Name"] ?? r["InsuredName"] ?? ""),
    dateOfBirth: String(r["Date of Birth"] ?? r["DateOfBirth"] ?? ""),
    totalCharges: getChargeFromRow(r),
    payer: String(r["Payer"] ?? ""),
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
  const out = outputs as Record<string, { table?: { inline?: { data?: string } } } | undefined>;
  const claimsSummaryB64 = out.claims_summary?.table?.inline?.data ?? out["claims summary"]?.table?.inline?.data;
  const esB64 = outputs.email_status?.table?.inline?.data;
  const csB64 = outputs.claims_submitted?.table?.inline?.data;

  const pdfItems = (outputs.completed_pdfs as any)?.list?.items ?? [];

  const claimResponseOut = outputs.claim_response as { text?: string; string?: { text?: string } } | undefined;
  const claimResponseText = claimResponseOut?.text ?? claimResponseOut?.string?.text ?? undefined;
  const { charge: claimResponseCharge, count: claimResponseClaimCount } = parseClaimResponseText(claimResponseText);

  let patients = ppB64 ? normalizePatients(ppB64) : [];
  if (patients.length === 0 && typeof claimsSummaryB64 === "string") {
    patients = normalizeClaimsSummary(claimsSummaryB64);
  }
  if (patients.length === 0 && claimResponseCharge > 0) {
    patients = [
      {
        patientName: "—",
        admissionDate: "",
        patientControlNumber: "",
        insuredName: "",
        dateOfBirth: "",
        totalCharges: claimResponseCharge,
        payer: "",
      },
    ];
  }

  return {
    id: getRunId(run),
    state,
    createdAt: run.create_time,
    updatedAt: run.update_time ?? null,
    kognitosUrl,
    emailRecipient: run.user_inputs?.["Email Recipient"]?.text ?? null,
    patients,
    emailStatuses: esB64 ? normalizeEmailStatuses(esB64) : [],
    claimFields: csB64 ? normalizeClaimFields(csB64) : [],
    pdfCount: pdfItems.length,
    ...(claimResponseCharge > 0 && { claimResponseCharge }),
    ...(claimResponseClaimCount > 0 && { claimResponseClaimCount }),
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
    highRiskCharges: 0,
    highRiskClaimCount: 0,
    adjudicationCycleDays: null,
    adjudicationCycleChangePct: null,
  };
}

export interface TrendPoint {
  date: string;
  batches: number;
  patients: number;
  charges: number;
  /** Total charges received (same as charges). */
  claimsReceived: number;
  /** Total claims paid (placeholder until paid data is available). */
  claimsPaid: number;
}

export function computeTrend(runs: NormalizedRun[]): TrendPoint[] {
  const byDate = new Map<string, TrendPoint>();

  for (const run of runs) {
    if (run.state !== "completed") continue;
    const date = dayjs(run.createdAt).format("MMM D");
    const runCharges = run.patients.reduce((s, p) => s + p.totalCharges, 0);
    const existing = byDate.get(date) || {
      date,
      batches: 0,
      patients: 0,
      charges: 0,
      claimsReceived: 0,
      claimsPaid: 0,
    };
    existing.batches += 1;
    existing.patients += run.patients.length;
    existing.charges += runCharges;
    existing.claimsReceived += runCharges;
    existing.claimsPaid += runCharges * 0.85; // placeholder: 85% of received until paid data exists
    byDate.set(date, existing);
  }

  return Array.from(byDate.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
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
