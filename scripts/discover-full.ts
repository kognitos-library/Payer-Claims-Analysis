import "dotenv/config";
import { req, ORG_ID, WORKSPACE_ID, requireAutomationId } from "../lib/kognitos";

async function main() {
  const AUTOMATION_ID = requireAutomationId();
  const prefix = `/organizations/${ORG_ID}/workspaces/${WORKSPACE_ID}/automations/${AUTOMATION_ID}`;

  const autoRes = await req(prefix);
  const auto = await autoRes.json();
  console.log("=== AUTOMATION ===");
  console.log("Display Name:", auto.display_name);
  console.log("Connections:", JSON.stringify(auto.connections, null, 2));
  console.log("\n--- Code ---");
  console.log(auto.english_code || auto.code || "(none)");
  console.log("--- End ---\n");
  if (auto.inputs) console.log("Inputs:", JSON.stringify(auto.inputs, null, 2));

  const runsRes = await req(`${prefix}/runs?pageSize=20`);
  const runsData = await runsRes.json();
  const runs = runsData.runs ?? [];

  console.log(`\n=== RUNS (${runs.length}) ===\n`);
  for (const run of runs) {
    const id = run.name.split("/").pop();
    const stateKey = Object.keys(run.state || {})[0] || "unknown";
    console.log(`Run ${id} | State: ${stateKey} | Created: ${run.create_time}`);
    if (run.user_inputs) {
      console.log("  Inputs:", JSON.stringify(run.user_inputs));
    }
  }

  const completedRun = runs.find((r: any) => r.state.completed);
  if (completedRun) {
    const runId = completedRun.name.split("/").pop();
    console.log(`\n=== COMPLETED RUN DETAIL: ${runId} ===\n`);
    const detailRes = await req(`${prefix}/runs/${runId}`);
    const detail = await detailRes.json();
    const outputs = detail.state?.completed?.outputs ?? {};
    console.log("Output keys:", Object.keys(outputs));
    for (const [key, val] of Object.entries(outputs) as [string, any][]) {
      console.log(`\nOutput: "${key}"`);
      if (val.table?.inline?.data) {
        console.log("  Type: Arrow IPC table (base64)");
        console.log("  Data length:", val.table.inline.data.length, "chars");
      } else if (val.number != null) {
        console.log("  Type: number →", val.number);
      } else if (val.text != null) {
        console.log("  Type: text →", val.text.slice(0, 200));
      } else {
        console.log("  Type: unknown →", JSON.stringify(val).slice(0, 300));
      }
    }
  }
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
