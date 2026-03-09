import "dotenv/config";
import { req, ORG_ID, WORKSPACE_ID } from "../lib/kognitos";

const candidates = [
  { name: "Insurance Claims Determination Engine", id: "81GkoOYhol7USSIe002pB" },
  { name: "Failed STP Claims Adjudication Review", id: "zx0zmjlN9KE95hZNK5Ki3" },
  { name: "Insurance Claims STP Failure Review", id: "9TQADH7IsQaEyx7gESRBl" },
  { name: "CMS-1450 Insurance Claim Submission", id: "8eCfDygy555S3tQZDNO4Y" },
  { name: "Medical Claim Review & Decision Automation", id: "s1wcaC1SaqDxaLhbMaHDD" },
  { name: "Payer Rules Validation", id: "5Fve3oJChBBAAjhRR5zMZ" },
  { name: "Claims", id: "FcAYFZQ4kW3rWvQ43WkvR" },
  { name: "Provider Claims Processor", id: "CbDkiV3WGBYMu6Uc9KlGC" },
];

async function check(displayName: string, id: string) {
  const prefix = `/organizations/${ORG_ID}/workspaces/${WORKSPACE_ID}/automations/${id}`;
  const [autoRes, runsRes] = await Promise.all([
    req(prefix),
    req(`${prefix}/runs?pageSize=5`),
  ]);
  const auto = autoRes.ok ? await autoRes.json() : null;
  const runsData = runsRes.ok ? await runsRes.json() : null;
  const runs = runsData?.runs ?? [];
  const hasCode = !!(auto?.english_code || auto?.code);
  const states: Record<string, number> = {};
  for (const r of runs) {
    const s = Object.keys(r.state || {})[0] || "unknown";
    states[s] = (states[s] || 0) + 1;
  }
  return { displayName, id, hasCode, runCount: runs.length, states, connections: auto?.connections };
}

async function main() {
  const results = await Promise.all(candidates.map((c) => check(c.name, c.id)));
  for (const r of results) {
    const stateStr = Object.entries(r.states).map(([k, v]) => `${k}:${v}`).join(", ") || "none";
    console.log(`${r.displayName} (${r.id})`);
    console.log(`  Code: ${r.hasCode ? "YES" : "no"} | Runs: ${r.runCount} | States: ${stateStr}`);
    console.log(`  Connections: ${JSON.stringify(r.connections || {})}`);
    console.log();
  }
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
