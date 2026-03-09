import "dotenv/config";
import { req, ORG_ID, WORKSPACE_ID, requireAutomationId } from "../lib/kognitos";
import { tableFromIPC } from "apache-arrow";

async function main() {
  const AUTOMATION_ID = requireAutomationId();
  const prefix = `/organizations/${ORG_ID}/workspaces/${WORKSPACE_ID}/automations/${AUTOMATION_ID}`;

  const runsRes = await req(`${prefix}/runs?pageSize=20`);
  const runsData = await runsRes.json();
  const runs = runsData.runs ?? [];
  const completed = runs.filter((r: any) => r.state.completed);

  console.log("=== CLAIMS_SUBMITTED ALL FIELDS (latest run) ===\n");
  const latest = completed[0];
  const b64 = latest.state.completed.outputs?.claims_submitted?.table?.inline?.data;
  if (b64) {
    const table = tableFromIPC(Buffer.from(b64, "base64"));
    const fieldCol = table.getChild("Field");
    const sectionCol = table.getChild("Section");
    for (let i = 0; i < table.numRows; i++) {
      console.log(`  ${String(i + 1).padStart(2)}. [${sectionCol?.get(i)}] ${fieldCol?.get(i)}`);
    }
  }

  console.log("\n=== CROSS-RUN COMPARISON (pending_patients) ===\n");
  for (const run of completed.slice(0, 4)) {
    const runId = run.name.split("/").pop();
    const pp = run.state.completed.outputs?.pending_patients?.table?.inline?.data;
    if (pp) {
      const table = tableFromIPC(Buffer.from(pp, "base64"));
      const patients: string[] = [];
      const charges: string[] = [];
      const payers: string[] = [];
      const nameCol = table.getChild("Patient Name");
      const chargeCol = table.getChild("Claim Value") ?? table.getChild("Total Charges");
      const payerCol = table.getChild("Payer");
      for (let i = 0; i < table.numRows; i++) {
        patients.push(nameCol?.get(i) ?? "?");
        charges.push(chargeCol?.get(i) ?? "?");
        payers.push(payerCol?.get(i) ?? "?");
      }
      const total = charges.reduce((s, c) => s + parseFloat(c || "0"), 0);
      console.log(`Run ${runId} | ${table.numRows} patients | $${total.toFixed(2)} total`);
      console.log(`  Payers: ${[...new Set(payers)].join(", ")}`);
      console.log(`  Patients: ${patients.join(", ")}`);
      console.log();
    }
  }

  console.log("=== RUNS STATE SUMMARY ===\n");
  const states: Record<string, number> = {};
  for (const run of runs) {
    const s = Object.keys(run.state || {})[0] || "unknown";
    states[s] = (states[s] || 0) + 1;
  }
  for (const [s, c] of Object.entries(states)) {
    console.log(`  ${s}: ${c}`);
  }
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
