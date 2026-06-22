import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { analyzeCase, validateAction } from "./case-agent.mjs";
import {
  closeCase,
  escalateCase,
  openCase,
  terminal3Health,
  terminal3SafeError,
} from "./terminal3-service.mjs";

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
const cases = new Map();

// Tracks whether at least one real Terminal 3 mutation has succeeded
// in this server process's lifetime, so /api/health never claims LIVE
// session verification before any mutation has actually happened.
let sessionHasLiveReceipt = false;

const STATIC_FILES = new Map([
  ["/", {
    file: new URL("../public/index.html", import.meta.url),
    type: "text/html; charset=utf-8",
  }],
  ["/styles.css", {
    file: new URL("../public/styles.css", import.meta.url),
    type: "text/css; charset=utf-8",
  }],
  ["/app.js", {
    file: new URL("../public/app.js", import.meta.url),
    type: "text/javascript; charset=utf-8",
  }],
]);

function send(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

async function sendStatic(res, pathname) {
  const asset = STATIC_FILES.get(pathname);
  if (!asset) return false;

  const content = await readFile(asset.file);
  res.writeHead(200, {
    "content-type": asset.type,
    "content-length": content.length,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(content);
  return true;
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function view(record) {
  return {
    id: record.id,
    subject: record.subject,
    summary: record.summary,
    priority: record.priority,
    status: record.status,
    analysis: record.analysis,
    latestDecision: record.latestDecision,
    receipt: record.receipt,
    timeline: record.timeline,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function event(record, type, detail) {
  record.timeline.push({
    id: randomUUID(),
    type,
    detail,
    at: new Date().toISOString(),
  });
  record.updatedAt = new Date().toISOString();
}

function nextStatus(action, current) {
  if (action === "OPEN_CASE") return "OPEN";
  if (action === "ESCALATE") return "ESCALATED";
  if (action === "CLOSE_CASE") return "CLOSED";
  return current;
}

async function analyze(req, res) {
  const input = await body(req);
  const subject = String(input.subject ?? "").trim().slice(0, 160);
  const summary = String(input.summary ?? "").trim().slice(0, 2000);
  const priority = input.priority === "high" ? "high" : "normal";

  if (!subject || !summary) {
    return send(res, 400, { ok: false, error: "SUBJECT_AND_SUMMARY_REQUIRED" });
  }

  const now = new Date().toISOString();
  const record = {
    id: `CR-${randomUUID().slice(0, 8).toUpperCase()}`,
    subject,
    summary,
    priority,
    status: "NEW",
    analysis: analyzeCase({ subject, summary, priority }),
    latestDecision: null,
    receipt: null,
    timeline: [],
    createdAt: now,
    updatedAt: now,
  };

  event(record, "RECEIVED", "Anonymized case received.");
  event(
    record,
    "ANALYZED",
    `Risk ${record.analysis.riskLevel}; recommendation ${record.analysis.recommendation}.`
  );
  cases.set(record.id, record);
  send(res, 201, { ok: true, case: view(record) });
}

async function act(req, res, caseId) {
  const record = cases.get(caseId);
  if (!record) return send(res, 404, { ok: false, error: "CASE_NOT_FOUND" });

  const input = await body(req);
  const action = String(input.action ?? "").toUpperCase();
  const approved = input.approved === true;
  const check = validateAction(record.status, action);

  if (!check.allowed) {
    return send(res, 409, {
      ok: false,
      error: check.reason,
      status: record.status,
      action,
    });
  }

  if (action !== "HOLD" && !approved) {
    return send(res, 403, {
      ok: false,
      error: "EXPLICIT_APPROVAL_REQUIRED",
      action,
    });
  }

  try {
    let receipt = null;
    if (action === "OPEN_CASE") receipt = await openCase(record.id);
    if (action === "ESCALATE") receipt = await escalateCase(record.id);
    if (action === "CLOSE_CASE") receipt = await closeCase(record.id);

    record.latestDecision = action;
    record.receipt = receipt;
    record.status = nextStatus(action, record.status);

    if (action === "HOLD") {
      event(record, "HELD", "No Terminal 3 mutation executed.");
    } else {
      event(record, action, `${receipt.action} completed with LIVE evidence.`);
      if (receipt?.evidence === "LIVE") sessionHasLiveReceipt = true;
    }

    send(res, 200, { ok: true, case: view(record) });
  } catch (error) {
    event(record, "ACTION_FAILED", `${action} failed safely.`);
    send(res, 502, {
      ok: false,
      error: "TERMINAL3_ACTION_FAILED",
      detail: terminal3SafeError(error),
      case: view(record),
    });
  }
}

async function route(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "GET" && STATIC_FILES.has(pathname)) {
    await sendStatic(res, pathname);
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    const keyConfigured = Boolean(process.env.T3N_DEMO_KEY);
    // Three truthful, mutually exclusive states — never LIVE-verified
    // before a real mutation has actually succeeded this session.
    const sessionState = !keyConfigured
      ? "SAFE_PREVIEW_NO_LIVE_KEY"
      : sessionHasLiveReceipt
        ? "LIVE_VERIFIED_THIS_SESSION"
        : "TERMINAL3_READY_TESTNET";

    return send(res, 200, {
      ok: true,
      service: "CaseRelay",
      status: "READY",
      terminal3KeyConfigured: keyConfigured,
      sessionHasLiveReceipt,
      sessionState,
    });
  }

  if (req.method === "GET" && pathname === "/api/terminal3/health") {
    try {
      return send(res, 200, { ok: true, terminal3: await terminal3Health() });
    } catch (error) {
      return send(res, 502, {
        ok: false,
        error: "TERMINAL3_HEALTH_FAILED",
        detail: terminal3SafeError(error),
      });
    }
  }

  if (req.method === "POST" && pathname === "/api/cases/analyze") {
    return analyze(req, res);
  }

  const getMatch = pathname.match(/^\/api\/cases\/([^/]+)$/);
  if (req.method === "GET" && getMatch) {
    const record = cases.get(getMatch[1]);
    return record
      ? send(res, 200, { ok: true, case: view(record) })
      : send(res, 404, { ok: false, error: "CASE_NOT_FOUND" });
  }

  const actionMatch = pathname.match(/^\/api\/cases\/([^/]+)\/action$/);
  if (req.method === "POST" && actionMatch) {
    return act(req, res, actionMatch[1]);
  }

  send(res, 404, { ok: false, error: "NOT_FOUND" });
}

http
  .createServer((req, res) => {
    route(req, res).catch((error) => {
      send(res, 500, {
        ok: false,
        error: "INTERNAL_ERROR",
        detail: terminal3SafeError(error),
      });
    });
  })
  .listen(PORT, HOST, () => {
    console.log(`CASERELAY_API_READY http://${HOST}:${PORT}`);
  });
