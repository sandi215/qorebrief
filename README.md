# QoreBrief — a post-quantum attestation agent on QoreChain testnet

Entry for the **QoreChain Developer Fest — "Build Before Q-Day"**
(https://build.qorechain.io), **Quantum Pass** level, in the spirit of the
Post-Quantum AI Agents category. Built 26 Nov 2026, submission deadline
2 Dec 2026 23:59 UTC.

## What it is

A small autonomous agent that, once a day (or on demand):

1. composes a short daily briefing in casual Indonesian from a curated
   queue (`agent/briefing.json`) using the free Pollinations LLM (no key);
2. posts the **keccak256 hash of the briefing text** plus a short memo to
   the `Attestation` contract on the QoreChain testnet;
3. reads the attestation back from the chain and verifies the hash matches.

The posting transaction is **hybrid-signed** (classical secp256k1 +
post-quantum ML-DSA-87): the agent's throwaway testnet account holds a
registered ML-DSA-87 key and an open EVM authorisation window. Anyone can
check the proof on the public REST endpoint (`pqc_hybrid_verify` event,
status `verified`) and in the explorer.

## Project layout

- `contracts/Attestation.sol` — the attestation registry (post a hash +
  memo, read it back, count).
- `contracts/Counter.sol` — the scaffold's example contract (kept, untouched).
- `ignition/modules/Attestation.ts` — deployment recipe for Attestation.
- `agent/attest.mjs` — the agent: compose → hash → attest → read back →
  verify. Also `--verify-window <COSMOS_TX_HASH>` checks the
  hybrid-signature proof of the window-open transaction.
- `agent/briefing.json` — the curated queue the briefing is composed from.
- `scripts/window.ts` — the scaffold's helper (`pnpm window register/open/status`).

## Runbook (testnet only, free)

```bash
pnpm install
pnpm test            # 4 passing, local simulation only
pnpm build

# 1. Throwaway testnet account (already in .env, mode 600, NEVER commit it)
node make-key.mjs              # only once: new PRIVATE_KEY in .env
pnpm window recovery-code      # paste the QRC1... code into .env
pnpm window status             # shows 0x... (qor1...) addresses

# 2. Free test QOR — https://dashboard.qorechain.io/faucet (sign-in required)
#    100 QOR / 24h per account.

# 3. Register the post-quantum key (once, ~0.09 QOR), then open the window
pnpm window register
pnpm window open               # note the `opened: <HASH>`

# 4. Deploy the contract (confirm with y when asked)
pnpm deploy:attestation
#    Save the printed contract address into agent/contract.json:
#    {"address": "0x..."}

# 5. Run the agent (window must still be open; re-open if it expired)
node agent/attest.mjs

# 6. Verify the hybrid signature of the window-open tx
node agent/attest.mjs --verify-window <HASH from step 3>
```

### Window mechanics (from the scaffold)

QoreChain admits an EVM transaction only when the sender has a registered
ML-DSA-87 key and a live EVM authorisation window. The window bounds
blocks, EVM transactions, and the total they may spend (value plus the
maximum fee of each transaction). `pnpm window open` defaults to 600
blocks and 5 transactions. Opening a window **advances the account's
nonce** — open it first, wait ~10 seconds, then deploy or run the agent;
otherwise Hardhat may stop with HHE10402 and you run it again. Opening
replaces any earlier window. Contract verification: Sourcify does not list
chain ids 9800 and 9801 yet.

## Testnet account (throwaway, test QOR only)

- EVM: `0x1f7514C234E3194238DE043C296c7b3f061356E7`
- QoreChain: `qor1ra63fs35uvv5ywx7qs7zjmrm8urpx4h877z7lz`
- The private key + PQC recovery code live ONLY in `.env` (mode 600).
  Never share them, never commit them. They hold test QOR only.

## Network

- Testnet `qorechain-diana`, EVM chain ID 9800.
- EVM JSON-RPC: https://evm-testnet.qore.host
- REST: https://api-testnet.qore.host
- Explorer: https://explore.qore.network (switch to Testnet).
- Mainnet (chain ID 9801) is never used by this project.

## Submission (for the fest, due 2 Dec 2026 23:59 UTC)

- Public repo: this repository.
- Video: ≤3 min demo (to be recorded — see `../notes.md`).
- Testnet address used by the project: `qor1ra63fs35uvv5ywx7qs7zjmrm8urpx4h877z7lz`
  (EVM `0x1f7514C234E3194238DE043C296c7b3f061356E7`).
