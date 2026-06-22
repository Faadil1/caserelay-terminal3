# CaseRelay — Product Contract v0.1

## Product promise

CaseRelay reviews sensitive customer cases before executing protected access changes through Terminal 3.

## Primary user

Customer experience, Voice of Customer, complaints, compliance, or escalation teams.

## Core decisions

- HOLD: do not execute a Terminal 3 mutation.
- OPEN_CASE: create a private tenant map.
- ESCALATE: update the map access configuration.
- CLOSE_CASE: delete the tenant map.

## Terminal 3 mapping

- OPEN_CASE -> tenant.maps.create({ visibility: "private" })
- ESCALATE -> tenant.maps.update(...)
- CLOSE_CASE -> tenant.maps.delete(...)

## Judge-facing flow

1. Submit an anonymized customer case.
2. Display risk signals and the proposed decision.
3. Require explicit approval before a protected action.
4. Execute the corresponding Terminal 3 mutation.
5. Display a sanitized execution receipt and lifecycle timeline.

## Evidence status

- Authentication: LIVE
- Active tenant resolution: LIVE
- Private map creation: LIVE
- Access update: LIVE
- Map deletion: LIVE
- Residual side effect after spike: none

## MVP boundaries

- Do not send raw customer personal data to Terminal 3.
- Use anonymized case summaries in the demo.
- Do not claim that the tenant map stores the complaint record.
- Terminal 3 controls the protected workspace and access lifecycle.
- No simulated Terminal 3 success states in the final demo.

## Acceptance criteria

- AC1: HOLD produces no Terminal 3 mutation.
- AC2: OPEN_CASE creates a private map.
- AC3: ESCALATE updates its access configuration.
- AC4: CLOSE_CASE deletes the map.
- AC5: Every action produces a sanitized judge-visible receipt.
- AC6: Secrets and full DIDs never appear in logs or UI.
