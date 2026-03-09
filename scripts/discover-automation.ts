import "dotenv/config";
import { req, ORG_ID, WORKSPACE_ID, requireAutomationId } from "../lib/kognitos";

async function main() {
  const AUTOMATION_ID = requireAutomationId();
  const prefix = `/organizations/${ORG_ID}/workspaces/${WORKSPACE_ID}/automations/${AUTOMATION_ID}`;

  console.log("=== Automation Details ===\n");
  const autoRes = await req(prefix);
  if (!autoRes.ok) {
    console.error("Failed to fetch automation:", autoRes.status, await autoRes.text());
    process.exit(1);
  }
  const auto = await autoRes.json();
  console.log("Display Name:", auto.display_name);
  console.log("Name:", auto.name);
  console.log("\nConnections:", JSON.stringify(auto.connections, null, 2));
  console.log("\n--- English Code ---");
  console.log(auto.english_code || auto.code || "(none)");
  console.log("--- End Code ---\n");

  console.log("=== Run History ===\n");
  const runsRes = await req(`${prefix}/runs?pageSize=20`);
  if (!runsRes.ok) {
    console.error("Failed to fetch runs:", runsRes.status, await runsRes.text());
    process.exit(1);
  }
  const runsData = await runsRes.json();
  const runs = runsData.runs ?? [];
  console.log(`Total runs returned: ${runs.length}\n`);

  const states: Record<string, number> = {};
  for (const run of runs) {
    const stateKey = Object.keys(run.state || {})[0] || "unknown";
    states[stateKey] = (states[stateKey] || 0) + 1;
  }
  console.log("State breakdown:");
  for (const [state, count] of Object.entries(states)) {
    console.log(`  ${state}: ${count}`);
  }

  console.log("\nRecent runs:");
  for (const run of runs.slice(0, 5)) {
    const id = run.name.split("/").pop();
    const stateKey = Object.keys(run.state || {})[0] || "unknown";
    console.log(`  ${id} | ${stateKey} | created: ${run.create_time}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
