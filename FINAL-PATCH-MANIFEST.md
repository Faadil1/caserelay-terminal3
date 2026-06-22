# FINAL-PATCH-MANIFEST.md

CaseRelay — Terminal 3 Agent Dev Kit Bounty
Final approved UI/UX merge: Verified Execution Chain (P2) + Lifecycle/
map-state consequence (P4) UX, with the approved merged UI direction
(65% High-Trust Evidence-Led / 20% Command-Center accent / 15%
Institutional vocabulary).

## Files changed

| File | Status |
|---|---|
| `public/index.html` | CHANGED |
| `public/styles.css` | CHANGED |
| `public/app.js` | CHANGED |
| `src/server.mjs` | CHANGED |
| `src/case-agent.mjs` | UNCHANGED |
| `src/terminal3-service.mjs` | UNCHANGED |
| `scripts/smoke-test.mjs` | UNCHANGED |
| `package.json` | UNCHANGED |
| `package-lock.json` | UNCHANGED |

## SHA-256 hashes

### Original (pre-merge backup, `.backup-pre-ui-merge/`)

```
7a029ad4fee9b18f6ffb0092fffc136b0352829f4e8884a5f9c0018c670e7e41  public/index.html
3d52aa4eeac72c39cd25c3668fdb0e4abe334a11fb804cfbadd5d69d42f2b467  public/styles.css
4430335953501fe6695ab8bd986c55fb9ddd36dd925e8b988c688c3165cc7738  public/app.js
644ffb263889b71f9d7611a4eb11ab284ff24485571bcd90d79ab7ee0f0fbc9b  src/server.mjs
22811d812be8359089b182e3aa523729e6f7c26245576c6f12724c65eeb53f85  src/case-agent.mjs
2e999d6d65c1fba35058fba88d8fada92a4008bb9f8d998aac1ef000c1ce7da2  src/terminal3-service.mjs
d8332387646baa3f7931800bc4ef21cad69800cd282551c6054e29a4aa716d73  package.json
5e32d5aede79c3ece7efe6deeba3b8fd314661b04b3781a9f65dc2584e643ed1  package-lock.json
```

### Final (this archive)

```
b6e8aecbb1834cebc7aa1ca38f9a7b667942d7fcfa5d579915cb4aab2381f065  public/index.html
fbe23c72c6eef6c783a4686152c0c589db4086d32bde6a8793c01abd613655df  public/styles.css
6dcc57a75eb910cd4bd6a2882ed60c0e5a7268f4d8639ad5027314805ade0608  public/app.js
14fc8932449886f443f89af7942d58db62f5d3288b43a3e0eaa3be90996d2295  src/server.mjs
22811d812be8359089b182e3aa523729e6f7c26245576c6f12724c65eeb53f85  src/case-agent.mjs
2e999d6d65c1fba35058fba88d8fada92a4008bb9f8d998aac1ef000c1ce7da2  src/terminal3-service.mjs
59f5220b7fe33b50512f230d199b921bd5ddac729c9b498a744cf3fc2e6c9fb2  scripts/smoke-test.mjs
d8332387646baa3f7931800bc4ef21cad69800cd282551c6054e29a4aa716d73  package.json
5e32d5aede79c3ece7efe6deeba3b8fd314661b04b3781a9f65dc2584e643ed1  package-lock.json
a92e9329bf293149bfd5ebd0f9b5943bd497575c40427eb5ee4bc7e67e555314  .gitignore
eb761eade1c95c5cf466f959f5da0672990f8caa71d836b0d0bbf0e193dd39bc  docs/PRODUCT-CONTRACT.md
3e8859ff5a92ad22d0411d6ce573c145d15c5700e79f81613c492b47dceeb039  evidence/CASERELAY-E2E-LIVE.md
a9908589c55b846906dd09b4bab04a79e48e47794db92b99edddd008ad77cc9d  evidence/TENANT-MAP-LIFECYCLE-SPIKE.md
1451ac774017df05fa2ac4b9c154765c3e72e2305413bb28118efe5c3e9be994  evidence/TENANT-MAP-SPIKE.md
```

## npm run check

```
> caserelay-terminal3@1.0.0 check
> node --check src/server.mjs && node --check src/case-agent.mjs && node --check src/terminal3-service.mjs && node --check public/app.js && node --check scripts/smoke-test.mjs

CHECK_EXIT=0
```

## npm test

```
> caserelay-terminal3@1.0.0 test
> node scripts/smoke-test.mjs

SMOKE_PASS
STATIC_ASSETS_PASS
ANALYZE_PASS
APPROVAL_GATE_PASS
HOLD_NO_MUTATION_PASS
TEST_EXIT=0
```

## Rollback instructions

From a working copy containing `.backup-pre-ui-merge/` (or by re-applying
the inverse of `caserelay-final.patch`):

```bash
cd <project-root>
rm -rf public src package.json package-lock.json
cp -r .backup-pre-ui-merge/public .
cp -r .backup-pre-ui-merge/src .
cp .backup-pre-ui-merge/package.json .backup-pre-ui-merge/package-lock.json .
npm run check && npm test
```

Or, against a clean checkout that does not have the backup directory,
apply the inverse patch:

```bash
patch -p1 -R < caserelay-final.patch
npm run check && npm test
```

## Notes

- `src/case-agent.mjs`, `src/terminal3-service.mjs`, `package.json`,
  `package-lock.json` are byte-identical to the pre-merge backup —
  hash match confirms no drift.
- `caserelay-final.patch` is a unified diff covering the four changed
  files (`public/index.html`, `public/styles.css`, `public/app.js`,
  `src/server.mjs`), verified to apply cleanly via `patch -p1 --dry-run`
  against the pre-merge backup.
