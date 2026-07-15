# Private Progress Counter

> A Midnight Compact contract that records verifiable private check-ins without publishing the user's raw secret.

## Contract Address

| Network | Address |
| --- | --- |
| Preview | `117a7b2e88a579659122c0bba15decffe98285db9cd0811620184fdb3d79f20a` |
| Preprod | Not deployed |
| Local devnet | `c839eb72b9dc83553c1abfa43f19eff3eb010d6be0e5c11886afd1e8773a2213` |

## What This Does

Private Progress Counter lets a user record a check-in using a secret that remains inside a zero-knowledge circuit. Each successful call increments the public `verifiedCheckIns` counter and publishes only a domain-separated one-way commitment. Observers can verify that check-ins occurred without learning the secret used to create them.

## Privacy Model

- **PUBLIC — visible to anyone on-chain:** the aggregate `verifiedCheckIns` count and `latestCommitment`, a domain-separated hash derived from the witness.
- **PRIVATE — never written on-chain:** the 32-byte value returned by the `localSecret()` witness and the local private state that stores it.
- **PROVED WITHOUT REVEALING:** a successful circuit execution proves that the caller supplied the private input used to derive the published commitment. The contract's deliberate `disclose()` applies only to that commitment, not to the witness itself.

## Tech Stack

- Midnight Network Preview and local devnet
- Compact language 0.23.0 and compiler 0.31.1
- Midnight.js 4.0.4
- Node.js 22
- TypeScript and Vitest
- Docker and the local Midnight proof server

## Prerequisites

- macOS or Linux
- Node.js 22+
- npm
- Docker Desktop with Docker Compose v2
- Compact toolchain with compiler 0.31.1 or newer

Install Compact using the [official Midnight toolchain instructions](https://docs.midnight.network/getting-started/installation):

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update
```

## Setup

```bash
git clone https://github.com/RudraBhaskar9439/private-progress-counter.git
cd private-progress-counter
nvm use
npm install
```

Compile the contract and generate the `managed/` circuits and keys:

```bash
npm run compile
```

Start a local Midnight devnet, compile, and deploy:

```bash
npm run setup
```

After setup, interact with the deployed contract:

```bash
npm run cli
```

For Preview, start the deployment and fund the printed wallet address using the faucet when prompted:

```bash
npm run setup -- --network preview
```

## Run Tests

Run the four simulator tests:

```bash
npm test
```

Type-check the application:

```bash
npm run build
```

After a deployment, verify indexed on-chain state:

```bash
npm run test:e2e
```

The test suite covers circuit initialization, public state transitions, deterministic commitments, different commitments for different secrets, and the absence of the raw private witness from public ledger state.

## Project Structure

```text
private-progress-counter/
├── contracts/
│   └── private-progress-counter.compact
├── managed/
│   └── private-progress-counter/
│       ├── contract/
│       ├── keys/
│       └── zkir/
├── src/
│   ├── cli.ts
│   ├── deploy.ts
│   ├── network.ts
│   ├── setup.ts
│   ├── wallet.ts
│   └── witnesses.ts
├── tests/
│   ├── private-progress-counter-simulator.ts
│   └── private-progress-counter.test.ts
├── .github/workflows/ci.yml
├── README.md
└── package.json
```

## Initial Idea

Private Progress Counter can become a privacy-first habit and milestone layer for communities, learning programs, or wellness applications. A participant could prove that they completed a daily private action while publishing only an aggregate streak and a cryptographic commitment; later versions could add time windows, unlinkable per-day commitments, and selective disclosure to trusted reviewers without putting sensitive activity details on-chain.

## Screenshots

### Successful Compact compile

![Successful Compact compile](docs/screenshots/compact-compile.png)

### Preview deployment and contract address

![Preview contract deployment](docs/screenshots/preview-deployment.png)

## Commands

| Command | Purpose |
| --- | --- |
| `npm run compile` | Compile Compact and regenerate circuits/keys in `managed/`. |
| `npm test` | Run the contract simulator test suite. |
| `npm run build` | Type-check source, scripts, and tests. |
| `npm run setup` | Start local services, compile, and deploy locally. |
| `npm run setup -- --network preview` | Compile and deploy to Preview. |
| `npm run cli` | Record a private progress proof or inspect public state. |
| `npm run test:e2e` | Reconnect to the active deployment and verify indexed state. |

## Security Notes

- `.midnight-state.json` and `.midnight-wallet-state/` contain wallet/runtime state and are excluded from Git.
- The local devnet uses the well-known development genesis seed and must never be used for real funds.
- Reusing the same witness produces the same commitment; a production version should rotate or derive a scoped secret for unlinkability.
- The proof server runs locally so witness data is not sent to a third-party proving service.

## License

MIT
