import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const port = 8091;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["src/server.mjs"], {
  env: { ...process.env, PORT: String(port), T3N_DEMO_KEY: "" },
  stdio: ["ignore", "pipe", "pipe"],
});

let logs = "";
child.stdout.on("data", (chunk) => { logs += chunk; });
child.stderr.on("data", (chunk) => { logs += chunk; });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  for (let i = 0; i < 30; i += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error(`SERVER_START_TIMEOUT\n${logs}`);
}

async function json(path, options) {
  const response = await fetch(`${base}${path}`, options);
  return { status: response.status, body: await response.json() };
}

try {
  await waitForServer();

  const health = await json("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.status, "READY");
  assert.equal(health.body.terminal3KeyConfigured, false);

  for (const [path, type] of [
    ["/", "text/html"],
    ["/styles.css", "text/css"],
    ["/app.js", "text/javascript"],
  ]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", new RegExp(type));
  }

  const analyze = await json("/api/cases/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      subject: "Unauthorized refund complaint",
      summary: "Possible fraud, repeated unresolved charges, and no response.",
      priority: "high",
    }),
  });
  assert.equal(analyze.status, 201);
  assert.equal(analyze.body.case.analysis.recommendation, "OPEN_CASE");
  const caseId = analyze.body.case.id;

  const blocked = await json(`/api/cases/${caseId}/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "OPEN_CASE", approved: false }),
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error, "EXPLICIT_APPROVAL_REQUIRED");

  const held = await json(`/api/cases/${caseId}/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "HOLD", approved: false }),
  });
  assert.equal(held.status, 200);
  assert.equal(held.body.case.receipt, null);
  assert.equal(held.body.case.timeline.at(-1).type, "HELD");

  console.log("SMOKE_PASS");
  console.log("STATIC_ASSETS_PASS");
  console.log("ANALYZE_PASS");
  console.log("APPROVAL_GATE_PASS");
  console.log("HOLD_NO_MUTATION_PASS");
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(1500),
  ]);
}
