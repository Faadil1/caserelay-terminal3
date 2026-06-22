const $ = (id) => document.getElementById(id);

const ui = {
  form: $("caseForm"),
  subject: $("subjectInput"),
  summary: $("summaryInput"),
  priority: $("priorityInput"),
  analyzeButton: $("analyzeButton"),
  loadDemoButton: $("loadDemoButton"),
  emptyState: $("emptyState"),
  decisionPanel: $("decisionPanel"),
  decisionContent: $("decisionContent"),
  caseId: $("caseId"),
  caseState: $("caseState"),
  riskScore: $("riskScore"),
  riskLevel: $("riskLevel"),
  riskCaption: $("riskCaption"),
  signalCount: $("signalCount"),
  signalList: $("signalList"),
  recommendation: $("recommendation"),
  gateTitle: $("gateTitle"),
  gateCopy: $("gateCopy"),
  holdButton: $("holdButton"),
  protectedActionButton: $("protectedActionButton"),
  receiptEmpty: $("receiptEmpty"),
  receiptGrid: $("receiptGrid"),
  receiptStatus: $("receiptStatus"),
  receiptAction: $("receiptAction"),
  receiptEvidence: $("receiptEvidence"),
  receiptEnvironment: $("receiptEnvironment"),
  receiptMap: $("receiptMap"),
  receiptTenant: $("receiptTenant"),
  receiptTime: $("receiptTime"),
  timeline: $("timeline"),
  dialog: $("approvalDialog"),
  dialogTitle: $("dialogTitle"),
  dialogAction: $("dialogAction"),
  dialogCopy: $("dialogCopy"),
  confirmActionButton: $("confirmActionButton"),
  systemDot: $("systemDot"),
  systemStatus: $("systemStatus"),
  livePill: $("livePill"),
  proofBadge: $("proofBadge"),
  proofCardLabel: $("proofCardLabel"),
  toast: $("toast"),
};

const ACTION_COPY = {
  OPEN_CASE: {
    label: "Approve & open case",
    title: "Approve protected case creation?",
    copy: "CaseRelay will create a private Terminal 3 tenant map for this anonymized case.",
  },
  ESCALATE: {
    label: "Approve escalation",
    title: "Approve access escalation?",
    copy: "CaseRelay will update the Terminal 3 map access configuration for this case.",
  },
  CLOSE_CASE: {
    label: "Approve close & revoke",
    title: "Approve case closure?",
    copy: "CaseRelay will delete the Terminal 3 map and revoke the protected workspace.",
  },
};

let currentCase = null;
let pendingAction = null;

function setBusy(isBusy, label = "Working…") {
  ui.analyzeButton.disabled = isBusy;
  ui.loadDemoButton.disabled = isBusy;
  ui.holdButton.disabled = isBusy || !currentCase || currentCase.status !== "NEW";
  ui.protectedActionButton.disabled = isBusy || !nextProtectedAction(currentCase);
  ui.confirmActionButton.disabled = isBusy;

  if (isBusy) {
    ui.analyzeButton.dataset.label = ui.analyzeButton.textContent;
    ui.analyzeButton.textContent = label;
  } else if (ui.analyzeButton.dataset.label) {
    ui.analyzeButton.textContent = ui.analyzeButton.dataset.label;
    delete ui.analyzeButton.dataset.label;
  }
}

function showToast(message, tone = "info") {
  ui.toast.textContent = message;
  ui.toast.dataset.tone = tone;
  ui.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => ui.toast.classList.remove("show"), 3200);
}

function nextProtectedAction(record) {
  if (!record) return null;
  if (record.status === "NEW") return "OPEN_CASE";
  if (record.status === "OPEN") return "ESCALATE";
  if (record.status === "ESCALATED") return "CLOSE_CASE";
  return null;
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
}

function riskCaption(analysis) {
  if (analysis.riskLevel === "HIGH") return "Immediate review recommended";
  if (analysis.riskLevel === "MEDIUM") return "Protected review recommended";
  return "No protected action recommended";
}

function renderSignals(signals = []) {
  ui.signalList.replaceChildren();
  ui.signalCount.textContent = String(signals.length);

  if (!signals.length) {
    const item = document.createElement("li");
    item.textContent = "No material risk signal detected.";
    ui.signalList.append(item);
    return;
  }

  for (const signal of signals) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const points = document.createElement("strong");
    label.textContent = signal.label;
    points.textContent = `+${signal.points}`;
    item.append(label, points);
    ui.signalList.append(item);
  }
}

function renderReceipt(receipt) {
  const hasReceipt = Boolean(receipt);
  ui.receiptEmpty.classList.toggle("hidden", hasReceipt);
  ui.receiptGrid.classList.toggle("hidden", !hasReceipt);

  if (!receipt) return;

  ui.receiptStatus.textContent = receipt.status ?? "—";
  ui.receiptAction.textContent = receipt.action ?? "—";
  ui.receiptEvidence.textContent = receipt.evidence ?? "—";
  ui.receiptEnvironment.textContent = receipt.environment ?? "—";
  ui.receiptMap.textContent = receipt.mapTail ?? "—";
  ui.receiptTenant.textContent = receipt.tenantDidMasked ?? "—";
  ui.receiptTime.textContent = formatTime(receipt.executedAt);
}

function renderTimeline(events = []) {
  ui.timeline.replaceChildren();

  if (!events.length) {
    const item = document.createElement("li");
    item.className = "timeline-placeholder";
    item.textContent = "No events yet.";
    ui.timeline.append(item);
    return;
  }

  for (const event of events) {
    const item = document.createElement("li");
    const marker = document.createElement("span");
    const content = document.createElement("div");
    const header = document.createElement("div");
    const type = document.createElement("strong");
    const time = document.createElement("time");
    const detail = document.createElement("p");

    marker.className = "timeline-marker";
    content.className = "timeline-content";
    header.className = "timeline-event-head";
    type.textContent = event.type.replaceAll("_", " ");
    time.textContent = formatTime(event.at);
    time.dateTime = event.at;
    detail.textContent = event.detail;

    header.append(type, time);
    content.append(header, detail);
    item.append(marker, content);
    ui.timeline.append(item);
  }
}

const GATE_TITLE = {
  NEW: "Protected action requires approval",
  OPEN: "Protected workspace opened",
  ESCALATED: "Protected access escalated",
  CLOSED: "Protected workspace revoked",
};

function renderGate(record) {
  const action = nextProtectedAction(record);
  const copy = action ? ACTION_COPY[action] : null;

  ui.gateTitle.textContent = GATE_TITLE[record.status] ?? "Decision held";
  ui.gateCopy.textContent =
    record.status === "CLOSED"
      ? "The Terminal 3 map was deleted and the case lifecycle is complete."
      : copy?.copy ?? "No protected mutation will run until a new action is explicitly approved.";

  ui.holdButton.classList.toggle("hidden", record.status !== "NEW");
  ui.protectedActionButton.classList.toggle("hidden", !action);
  ui.protectedActionButton.textContent = copy?.label ?? "Protected action";
  ui.protectedActionButton.disabled = !action;
}

const LIFECYCLE_PROGRESS = {
  NEW: 0,
  OPEN: 1,
  ESCALATED: 2,
  CLOSED: 3,
};

function renderLifecycle(status) {
  const completedCount = LIFECYCLE_PROGRESS[status] ?? 0;

  document.querySelectorAll(".lifecycle-step").forEach((step, index) => {
    const complete = index < completedCount;
    const current = completedCount < 3 && index === completedCount;
    const state = step.querySelector(".step-state");

    step.classList.toggle("is-complete", complete);
    step.classList.toggle("is-current", current);

    if (state) {
      state.textContent = complete
        ? "Complete"
        : current
          ? "Next"
          : "Pending";
    }
  });
}

const CHAIN_STAGES = ["approval", "auth", "mutation", "receipt"];

function setChainStage(stage, label, cssClass) {
  const el = document.querySelector(`.chain-stage[data-stage="${stage}"]`);
  if (!el) return;
  el.classList.remove("is-active", "is-complete");
  if (cssClass) el.classList.add(cssClass);
  const stateEl = el.querySelector(".chain-stage-state");
  if (stateEl) stateEl.textContent = label;
}

const MAP_STATE_BY_ACTION = {
  OPEN_CASE: { creating: "Creating…", done: "Created", cls: "exists" },
  ESCALATE: { creating: "Updating…", done: "Access updated", cls: "exists" },
  CLOSE_CASE: { creating: "Deleting…", done: "Deleted", cls: "deleted" },
};

function renderChain(record) {
  const action = nextProtectedAction(record);
  const receipt = record.receipt;
  const rails = document.querySelectorAll(".chain-rail");
  const mapStateEl = $("mapStateValue");
  const sdkCallEl = $("chainSdkCall");
  const durationEl = $("chainDuration");

  if (record.status === "NEW" && !record.latestDecision) {
    // No action taken yet — every stage genuinely pending.
    for (const stage of CHAIN_STAGES) setChainStage(stage, "Pending", null);
    rails.forEach((r) => r.classList.remove("is-traversed"));
    if (sdkCallEl) sdkCallEl.textContent = "Awaiting action";
    if (durationEl) durationEl.textContent = "Awaiting result";
    if (mapStateEl) {
      mapStateEl.textContent = "Does not exist";
      mapStateEl.classList.remove("exists", "deleted");
    }
    return;
  }

  if (receipt) {
    // A mutation has genuinely completed — every stage truthfully complete.
    setChainStage("approval", "Complete", "is-complete");
    setChainStage("auth", "Complete", "is-complete");
    setChainStage("mutation", "Complete", "is-complete");
    setChainStage("receipt", "Complete", "is-complete");
    rails.forEach((r) => r.classList.add("is-traversed"));

    const sdkCallByAction = {
      OPEN_CASE: "tenant.maps.create()",
      ESCALATE: "tenant.maps.update()",
      CLOSE_CASE: "tenant.maps.delete()",
    };
    if (sdkCallEl) sdkCallEl.textContent = sdkCallByAction[receipt.action] ?? "—";
    if (durationEl) durationEl.textContent = `${receipt.evidence} · result returned`;

    const mapInfo = MAP_STATE_BY_ACTION[receipt.action];
    if (mapStateEl && mapInfo) {
      mapStateEl.textContent = mapInfo.done;
      mapStateEl.classList.remove("exists", "deleted");
      mapStateEl.classList.add(mapInfo.cls);
    }
  } else if (action) {
    // Approval recorded, mutation in flight — stage 3 genuinely
    // executing, stage 4 genuinely still pending. No fake receipt.
    setChainStage("approval", "Complete", "is-complete");
    setChainStage("auth", "Complete", "is-complete");
    setChainStage("mutation", "Executing", "is-active");
    setChainStage("receipt", "Pending", null);
    rails[0]?.classList.add("is-traversed");
    rails[1]?.classList.add("is-traversed");
    rails[2]?.classList.remove("is-traversed");

    const sdkCallByAction = {
      OPEN_CASE: "tenant.maps.create()",
      ESCALATE: "tenant.maps.update()",
      CLOSE_CASE: "tenant.maps.delete()",
    };
    if (sdkCallEl) sdkCallEl.textContent = sdkCallByAction[action] ?? "—";
    if (durationEl) durationEl.textContent = "Awaiting result";

    const mapInfo = MAP_STATE_BY_ACTION[action];
    if (mapStateEl && mapInfo) {
      mapStateEl.textContent = mapInfo.creating;
      mapStateEl.classList.remove("exists", "deleted");
    }
  }
}

function renderActionTrace(record) {
  const trace = $("actionTrace");
  const traceText = $("actionTraceText");
  const disclosure = $("techDisclosure");
  if (!trace || !traceText) return;

  const receipt = record.receipt;
  if (!receipt) {
    trace.classList.add("hidden");
    disclosure?.classList.add("hidden");
    return;
  }

  const sdkCallByAction = {
    OPEN_CASE: "tenant.maps.create()",
    ESCALATE: "tenant.maps.update()",
    CLOSE_CASE: "tenant.maps.delete()",
  };
  const sdkCall = sdkCallByAction[receipt.action] ?? "—";

  trace.classList.remove("hidden");
  traceText.innerHTML =
    `Human approved <strong>&rarr;</strong> POST /action <strong>&rarr;</strong> ` +
    `${sdkCall} <strong>&rarr;</strong> ${receipt.evidence} · ${formatTime(receipt.executedAt)}`;

  if (disclosure) {
    disclosure.classList.remove("hidden");
    disclosure.removeAttribute("open");
    const sdkCallLine = $("techDisclosureSdkCall");
    const tenantLine = $("techDisclosureTenant");
    if (sdkCallLine) sdkCallLine.textContent = `SDK operation: ${sdkCall}`;
    if (tenantLine) tenantLine.textContent = `Tenant: ${receipt.tenantDidMasked ?? "—"}`;
  }
}

function renderCase(record) {
  renderLifecycle(record.status);
  renderChain(record);
  currentCase = record;
  ui.emptyState.classList.add("hidden");
  ui.decisionContent.classList.remove("hidden");
  ui.caseId.textContent = record.id;
  ui.caseState.textContent = record.status;
  ui.riskScore.textContent = String(record.analysis.score);
  ui.riskLevel.textContent = record.analysis.riskLevel;
  ui.riskLevel.dataset.risk = record.analysis.riskLevel;
  ui.riskCaption.textContent = riskCaption(record.analysis);
  ui.recommendation.textContent = record.analysis.recommendation.replaceAll("_", " ");
  renderSignals(record.analysis.signals);
  renderGate(record);
  renderReceipt(record.receipt);
  renderActionTrace(record);
  renderTimeline(record.timeline);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Unexpected response (${response.status})`);
  }

  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.detail || payload.error || `Request failed (${response.status})`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

const SESSION_PILL_COPY = {
  SAFE_PREVIEW_NO_LIVE_KEY: "Safe preview · no live key",
  TERMINAL3_READY_TESTNET: "Terminal 3 ready · testnet",
  LIVE_VERIFIED_THIS_SESSION: "Live · verified this session",
};

async function checkHealth() {
  try {
    const payload = await request("/api/health");
    const state = payload.sessionState;

    ui.systemDot.dataset.status =
      state === "SAFE_PREVIEW_NO_LIVE_KEY" ? "warning" : "ready";
    ui.systemStatus.textContent =
      state === "SAFE_PREVIEW_NO_LIVE_KEY"
        ? "Key not loaded · safe preview"
        : "Live session ready";

    ui.livePill.textContent = SESSION_PILL_COPY[state] ?? "Safe preview · no live key";

    // Hero capability card: never shows a session-level LIVE badge
    // before a real successful mutation. Label stays "Terminal 3
    // integration" until sessionHasLiveReceipt flips true.
    const hasLiveReceipt = payload.sessionHasLiveReceipt === true;
    ui.proofBadge.classList.toggle("hidden", !hasLiveReceipt);
    ui.proofCardLabel.textContent = hasLiveReceipt
      ? "Verified integration"
      : "Terminal 3 integration";
  } catch {
    ui.systemDot.dataset.status = "error";
    ui.systemStatus.textContent = "Service unavailable";
    ui.livePill.textContent = "Safe preview · no live key";
    ui.proofBadge.classList.add("hidden");
    ui.proofCardLabel.textContent = "Terminal 3 integration";
  }
}

async function analyze(event) {
  event.preventDefault();
  const subject = ui.subject.value.trim();
  const summary = ui.summary.value.trim();

  if (!subject || !summary) {
    showToast("Add a subject and anonymized summary.", "error");
    return;
  }

  setBusy(true, "Analyzing…");
  try {
    const payload = await request("/api/cases/analyze", {
      method: "POST",
      body: JSON.stringify({
        subject,
        summary,
        priority: ui.priority.value,
      }),
    });
    renderCase(payload.case);
    showToast("Risk review complete.", "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy(false);
  }
}

async function runAction(action, approved) {
  if (!currentCase) return;

  setBusy(true, action === "HOLD" ? "Holding…" : "Executing LIVE…");
  try {
    const payload = await request(`/api/cases/${encodeURIComponent(currentCase.id)}/action`, {
      method: "POST",
      body: JSON.stringify({ action, approved }),
    });
    renderCase(payload.case);
    if (action !== "HOLD") await checkHealth();
    showToast(
      action === "HOLD" ? "Decision held. No mutation executed." : `${action.replaceAll("_", " ")} completed LIVE.`,
      "success"
    );
  } catch (error) {
    if (error.payload?.case) renderCase(error.payload.case);
    showToast(error.message, "error");
  } finally {
    setBusy(false);
  }
}

function openApproval() {
  const action = nextProtectedAction(currentCase);
  if (!action) return;

  pendingAction = action;
  const copy = ACTION_COPY[action];
  ui.dialogTitle.textContent = copy.title;
  ui.dialogAction.textContent = action.replaceAll("_", " ");
  ui.dialogCopy.textContent = copy.copy;

  if (typeof ui.dialog.showModal === "function") {
    ui.dialog.showModal();
  } else {
    ui.dialog.setAttribute("open", "");
  }
}

function closeApproval() {
  pendingAction = null;
  if (typeof ui.dialog.close === "function") {
    ui.dialog.close();
  } else {
    ui.dialog.removeAttribute("open");
  }
}

function loadDemo() {
  ui.subject.value = "Unauthorized transactions and identity concern";
  ui.summary.value =
    "Customer reports possible fraud, repeated unresolved charges, and no response after multiple contacts. They request an urgent investigation.";
  ui.priority.value = "high";
  showToast("Demo case loaded.", "success");
}

ui.form.addEventListener("submit", analyze);
ui.loadDemoButton.addEventListener("click", loadDemo);
ui.holdButton.addEventListener("click", () => runAction("HOLD", false));
ui.protectedActionButton.addEventListener("click", openApproval);
ui.confirmActionButton.addEventListener("click", async () => {
  const action = pendingAction;
  closeApproval();
  if (action) await runAction(action, true);
});
ui.dialog.addEventListener("click", (event) => {
  if (event.target === ui.dialog) closeApproval();
});
ui.dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeApproval();
});

checkHealth();
