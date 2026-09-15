# PharmaLedger — Blockchain Anti-Counterfeit Pharmaceutical Network

A 5-stakeholder decentralized pharmaceutical traceability and verification platform:

1. **Manufacturer**: Registers genuine medicine batches, mints origin blocks on-chain, and generates serialized QR labels.
2. **Distributor**: Tracks transit handoffs, cold-chain conditions, and verifies factory origins.
3. **Retailer / Pharmacy**: Authenticates inventory before stocking shelves, dispenses to patients, and quarantines suspect batches.
4. **Consumer / Patient**: Scans package QR codes to verify genuine vs. counterfeit medicines and inspects full custody history.
5. **Administrator**: Oversees authorized participant wallets, role permissions, and investigates tamper alerts.

## Key Features

- **Live Scannable Medicine Catalog**: Inspect genuine medicines, view high-resolution scannable QR codes and unique Pack Serial IDs.
- **Consumer Instant Verification**: Point any smartphone camera at medicine QR codes or enter pack IDs to execute cryptographic provenance verification.
- **Interactive 3D Packaging Inspector**: Preview realistic medicine packaging boxes with tamper-evident holographic seals, batch lots, and barcodes.
- **Dual-Mode Blockchain Ledger**: Works both with an active local Hardhat Ethereum node (`DrugTracker.sol`) and with a high-fidelity deterministic browser ledger.
- **Counterfeit Threat Reporting**: Immediate flagging and administrative escalation of unauthorized reproduction attempts.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or bun

### Local Development

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be running at `http://localhost:8080/`.

### Blockchain Smart Contract Setup (Optional)

To run the local Ethereum node with Hardhat:

```sh
# Start local Hardhat Ethereum node
npm run hardhat:node

# Deploy DrugTracker.sol smart contract
npm run hardhat:deploy
```

### Production Build

```sh
npm run build
```
