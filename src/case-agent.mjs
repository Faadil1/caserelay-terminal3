const RULES = [
  ["Immediate safety risk", 35, /\b(threat|unsafe|harm|violence|self-harm)\b/i],
  ["Fraud or identity risk", 25, /\b(fraud|scam|identity|stolen|unauthorized)\b/i],
  ["Legal or regulatory risk", 20, /\b(legal|lawyer|regulator|privacy breach|discrimination)\b/i],
  ["Financial impact", 15, /\b(refund|charge|payment|money|compensation)\b/i],
  ["Repeated unresolved issue", 15, /\b(repeated|multiple times|unresolved|ignored|no response)\b/i],
];

const TRANSITIONS = {
  NEW: new Set(["HOLD", "OPEN_CASE"]),
  OPEN: new Set(["ESCALATE", "CLOSE_CASE"]),
  ESCALATED: new Set(["CLOSE_CASE"]),
  CLOSED: new Set(),
};

export function analyzeCase(input = {}) {
  const text = `${input.subject ?? ""} ${input.summary ?? ""}`.trim();
  const signals = [];
  let score = 0;

  for (const [label, points, pattern] of RULES) {
    if (pattern.test(text)) {
      signals.push({ label, points });
      score += points;
    }
  }

  if (input.priority === "high") {
    signals.push({ label: "High priority", points: 10 });
    score += 10;
  }

  score = Math.min(score, 100);
  const riskLevel = score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
  const recommendation = score >= 45 ? "OPEN_CASE" : "HOLD";

  return { score, riskLevel, signals, recommendation };
}

export function validateAction(status, action) {
  const allowed = TRANSITIONS[status];
  if (!allowed) return { allowed: false, reason: "UNKNOWN_STATUS" };
  if (!allowed.has(action)) return { allowed: false, reason: "INVALID_TRANSITION" };
  return { allowed: true, reason: null };
}
