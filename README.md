# CaseRelay

**Permission before action for sensitive customer cases.**

CaseRelay analyzes an anonymized customer case, recommends a safe next action, requires explicit human approval, and uses the Terminal 3 Agent Dev Kit to control a protected workspace lifecycle.

## Why it matters

Sensitive cases involving fraud, identity risk, regulatory exposure, or repeated unresolved issues should not trigger access changes automatically.

CaseRelay places a human permission gate between analysis and execution.

## Workflow

1. Submit an anonymized case
2. Run deterministic policy-based risk analysis
3. Recommend `HOLD` or `OPEN_CASE`
4. Require explicit human approval
5. Execute the protected action through Terminal 3
6. Display a sanitized LIVE receipt and audit timeline

## Terminal 3 integration

CaseRelay uses `@terminal3/t3n-sdk` for authenticated, tenant-scoped operations.

| CaseRelay action | Terminal 3 operation | Result |
|---|---|---|
| `OPEN_CASE` | `tenant.maps.create()` | Creates a private tenant map |
| `ESCALATE` | `tenant.maps.update()` | Updates controlled reader access |
| `CLOSE_CASE` | `tenant.maps.delete()` | Deletes the protected map |

The interface exposes a verified execution chain:

```text
Human approval
→ Agent Dev Kit authentication
→ Tenant map mutation
→ LIVE receipt
````

## Safety properties

* Every protected mutation requires explicit approval
* `HOLD` performs no Terminal 3 mutation
* Unapproved actions are rejected server-side
* Private keys remain server-side
* Tenant DIDs are masked
* Raw customer PII is not sent to Terminal 3
* Failed actions do not create synthetic success receipts

## Architecture

```text
Browser interface
       ↓
Node.js HTTP server
       ↓
Deterministic policy engine
       ↓
Explicit approval gate
       ↓
Terminal 3 Agent Dev Kit
       ↓
Private tenant-map lifecycle
```

## Run locally

Requirements:

* Node.js 20+
* A Terminal 3 testnet private key for LIVE protected actions

Install dependencies:

```bash
npm install
```

Run in safe-preview mode:

```bash
unset T3N_DEMO_KEY
npm start
```

Run with Terminal 3 testnet access:

```bash
read -r -s -p "Terminal 3 private key: " T3N_DEMO_KEY
echo
export T3N_DEMO_KEY
npm start
```

Open:

```text
http://localhost:8080
```

Never commit or expose `T3N_DEMO_KEY`.

## Validation

```bash
npm run check
npm test
```

Expected acceptance output:

```text
SMOKE_PASS
STATIC_ASSETS_PASS
ANALYZE_PASS
APPROVAL_GATE_PASS
HOLD_NO_MUTATION_PASS
```

## Evidence

The `evidence/` directory contains:

* tenant-map create/delete spike
* create/update/delete lifecycle spike
* browser end-to-end LIVE evidence
* final LIVE acceptance record
* final test outputs
* SHA-256 artifact manifest

## Final verified result

```text
OPEN_CASE → ESCALATE → CLOSE_CASE
```

Final state:

* case status: `CLOSED`
* protected map: deleted
* final receipt: `CLOSE_CASE / SUCCESS / LIVE`
* residual protected workspace: none

The exact LIVE-validated application build is preserved by the annotated tag:

```text
submission-final
```

## Technology

* Node.js
* Native HTTP server
* Vanilla HTML, CSS, and JavaScript
* `@terminal3/t3n-sdk`
* Terminal 3 testnet

## License

MIT
