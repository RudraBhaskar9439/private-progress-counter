# VeilMark Pulse

> Speak honestly. Stay unexposed.

[![CI](https://github.com/RudraBhaskar9439/private-progress-counter/actions/workflows/ci.yml/badge.svg)](https://github.com/RudraBhaskar9439/private-progress-counter/actions/workflows/ci.yml)

VeilMark Pulse is an anonymous feedback survey built on Midnight. A contributor privately selects a response from 1–5. The Compact circuit proves the response is valid and records participation without publishing the selected answer or the browser-held device key.

This project follows the Moonshot **Anonymous Feedback / Survey** track.

## Submission links

| Item | Value |
| --- | --- |
| Live dApp | [rudrabhaskar9439.github.io/private-progress-counter](https://rudrabhaskar9439.github.io/private-progress-counter/) |
| Source | [github.com/RudraBhaskar9439/private-progress-counter](https://github.com/RudraBhaskar9439/private-progress-counter) |
| Network | Midnight Preprod |
| Level 3 contract | `88fa2cafe00bf991e5d8dfec2c54679236ae5027f07e724883dee5caf58b6ef0` |
| Verified Level 3 pulse | `00a5145a1b870574b62898fc099334c8da37386c299b6cae8897162d611ec79454` (block `1744793`) |
| Test evidence | [8 passing privacy tests](docs/screenshots/level-3-tests.png) |
| Demo video | [1-minute product walkthrough](https://rudrabhaskar9439.github.io/private-progress-counter/veilmark-pulse-demo.mp4) |

Level 2 is preserved in Git history. Its deployed contract was `9afd75682f9ebf51efabb743bd58d95352f8380ae4fb71aa06dfd4644de88fdc`, with successful Lace proof transaction `00f8ff3d4d4ea957922e6c298c5711ae11f29acd5dbad679d9fc642e173dd96e09`.

## The problem

Workplace pulse surveys often ask people to reveal sensitive sentiment to the same organization that evaluates them. Even when a form claims to be anonymous, contributors must trust the database, administrators, and analytics stack.

VeilMark changes the trust model. It lets a team verify that valid survey participation happened while keeping each 1–5 response in the contributor's private witness. The first release deliberately publishes participation rather than an answer histogram, because a public total updated one transaction at a time could allow observers to infer individual answers by comparing ledger states.

## Product flow

1. Open the dApp with Lace configured for Midnight Preprod.
2. Connect the wallet and choose one of five pulse states: **Blocked, Strained, Steady, Strong, or Thriving**.
3. The selected response becomes a private circuit witness in the browser.
4. Click **Submit anonymous pulse** and approve the scoped transaction in Lace.
5. The Compact circuit proves that the private response is one of 1–5, derives a response-bound campaign commitment, and prevents an identical proof from being replayed.
6. The UI displays the transaction ID, verified participation count, campaign, and commitment. It never displays the selected answer as public state.

The interface includes wallet discovery, connector-version checks, network mismatch guidance, cancellation handling, duplicate-proof feedback, proof loading states, fee guidance, closed-wallet-channel recovery, and accessible keyboard/touch response controls.

## Privacy model

### What an observer can learn

- A valid response was submitted to the current monthly campaign.
- The global number of verified responses.
- The public campaign tag, for example `pulse-2026-07`.
- A domain-separated one-way commitment and transaction metadata.

### What an observer cannot learn

- Which 1–5 response was selected.
- The meaning or personal context behind the answer.
- The random 32-byte device key.
- The raw witnesses used to create the proof.
- A plaintext identity-to-answer mapping from this contract.

### What the proof guarantees

`submitAnonymousPulse(campaign)` receives `localSecret()` and `privateResponse()` as witnesses. It constrains the private response to one of the padded values `1` through `5`, then derives:

```text
persistentHash(["veilmark:pulse:v1", secret, campaign, response])
```

Only the derived commitment and campaign are disclosed. The response and secret remain private. The contract rejects an identical commitment already present in `usedCommitments`, then increments `verifiedResponses`.

The response is included in the commitment, so the proof is bound to the selected value without exposing it. The campaign is also included, so commitments rotate between campaigns and are less linkable across time.

## Architecture

```text
Lace wallet
    │ authorize / balance / submit
    ▼
React + Vite dApp
    │ device secret + private 1–5 witness
    ▼
Midnight.js providers
    ├── browser proving assets
    ├── proof server
    └── Preprod indexer
    ▼
Compact contract
    ├── submitAnonymousPulse(campaign)
    ├── private response range constraint
    ├── usedCommitments replay guard
    ├── latestCampaign + latestCommitment
    └── verifiedResponses
```

## Tests and CI/CD

The simulator suite currently has eight passing tests:

1. initializes the public response count at zero;
2. accepts valid private responses from 1–5;
3. binds commitments to the private response;
4. produces secret-dependent commitments;
5. rotates commitments between campaigns;
6. rejects an identical response proof in the same campaign;
7. rejects response values outside 1–5; and
8. verifies the raw secret and response never enter public ledger state.

The `CI` workflow runs on every push and pull request. It installs locked dependencies, checks compatible Midnight versions, smoke-tests the compiled circuit, runs all tests, type-checks both applications, builds the production dApp, and verifies that the browser bundle contains exactly one Compact runtime. The Pages workflow publishes the validated client on every push to `main`.

Run the same checks locally:

```bash
npm ci
npm ci --prefix frontend
npm run compile
npm --prefix frontend run smoke:contract
npm test
npm run build
npm run web:build
npm --prefix frontend run check:bundle-runtime
```

## Local development

Prerequisites: Node.js 22+, npm, Docker Desktop, Compact compiler 0.31.1+, and Lace for browser interaction.

```bash
git clone https://github.com/RudraBhaskar9439/private-progress-counter.git
cd private-progress-counter
npm ci
npm ci --prefix frontend
npm run compile
cp frontend/.env.example frontend/.env.preprod
npm run proof-server:start
npm run web:dev
```

Set `VITE_DEFAULT_CONTRACT` to a deployed 64-character Preprod contract address. The local app is available at `http://localhost:4173`.

To deploy a fresh contract:

```bash
npm run deploy -- --network preprod
```

## Tech stack

- Compact compiler 0.31.1 and Compact language 0.23
- Midnight.js 4.1 in the browser
- DApp Connector API 4.0
- React 19, TypeScript 6, Vite 8
- Lace wallet on Midnight Preprod
- Vitest simulator suite
- GitHub Actions CI/CD and GitHub Pages
- Cloudflare Worker-compatible production build

## Project structure

```text
private-progress-counter/
├── contracts/private-progress-counter.compact
├── frontend/
│   ├── src/components/WalletConnect.tsx
│   ├── src/components/CircuitCall.tsx
│   ├── src/hooks/useMidnight.ts
│   ├── src/lib/veilmark.ts
│   └── public/keys + zkir
├── managed/private-progress-counter/
├── scripts/e2e-check.ts
├── src/deploy.ts
├── src/wallet.ts
├── src/witnesses.ts
└── tests/private-progress-counter.test.ts
```

## Limitations and next steps

- This contract proves a well-formed private response and replay resistance; it does not prove employment or personhood. A production organization would add private credential eligibility or a nullifier-based anti-Sybil policy.
- Clearing browser storage creates a new device key. Production recovery requires a privacy-preserving backup design.
- The current participation count is global. A next version can add organization and survey scopes.
- The contract intentionally does not publish per-answer aggregates. A production result release should use thresholded batching so individual answers cannot be inferred from ledger-state differences.
- Preprod tokens have no monetary value.

## License

MIT
