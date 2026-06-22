# CaseRelay

**Permission before action for sensitive customer cases.**

CaseRelay reviews an anonymized customer case, produces a deterministic risk recommendation, requires explicit human approval, and uses the Terminal 3 Agent Dev Kit to control the lifecycle of a protected workspace.

## Why CaseRelay

Sensitive complaints involving fraud, identity risk, regulatory exposure, or repeated unresolved issues should not automatically trigger access changes.

CaseRelay introduces a permission gate between analysis and execution:

1. Analyze an anonymized case
2. Detect policy-based risk signals
3. Recommend `HOLD` or `OPEN_CASE`
4. Require explicit human approval
5. Execute the protected action through Terminal 3
6. Display a sanitized LIVE receipt and audit timeline

## Terminal 3 integration

CaseRelay uses `@terminal3/t3n-sdk` for authenticated, tenant-scoped workspace operations:

| CaseRelay action | Terminal 3 operation | Result |
|---|---|---|
| `OPEN_CASE` | `tenant.maps.create()` | Creates a private tenant map |
| `ESCALATE` | `tenant.maps.update()` | Expands controlled reader access |
| `CLOSE_CASE` | `tenant.maps.delete()` | Deletes the protected map |

The final interface exposes a verified execution chain:

```text
Human approval
→ Agent Dev Kit authentication
→ Tenant map mutation
→ LIVE receipt
````

## Safety properties

* Protected mutations require explicit approval
* `HOLD` performs no Terminal 3 mutation
* Unapproved protected actions are rejected server-side
* Private keys remain server-side
* Tenant DIDs are masked
* Raw customer PII is not sent to Terminal 3
* Errors do not produce synthetic success receipts

## Architecture

```text
Browser UI
   ↓
Node.js HTTP server
   ↓
Deterministic case policy engine
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
* Terminal 3 testnet private key for LIVE protected actions

Install:

```bash
npm install
```

Safe preview without a key:

```bash
unset T3N_DEMO_KEY
npm start
```

LIVE testnet mode:

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

Expected automated acceptance:

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
* full create/update/delete lifecycle spike
* browser end-to-end LIVE evidence
* final LIVE acceptance record
* final test outputs
* SHA-256 artifact manifest

## Verified final state

The final testnet lifecycle completed:

```text
OPEN_CASE → ESCALATE → CLOSE_CASE
```

Final result:

* Case status: `CLOSED`
* Protected map: deleted
* Receipt: `CLOSE_CASE / SUCCESS / LIVE`
* Residual protected workspace: none

The exact LIVE-validated build is preserved by the annotated Git tag:

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
