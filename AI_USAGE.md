# AI Usage — QoreBrief

This project was built with AI assistance. This file documents where AI was
used, for the QoreChain Developer Fest "AI-Native" award.

## Build-time (development)

- **Coding agent (Muse / "Yua Mikami")**: scaffolded the Hardhat project
  from `create-qorechain-dapp`, wrote `contracts/Attestation.sol`, the
  Ignition deployment module, `agent/attest.mjs`, the test suite, and this
  README. All generated code was reviewed, tested (`pnpm test`, 4/4 passing),
  deployed to the QoreChain testnet, and verified on-chain by the human owner
  before submission.
- **Demo video**: recorded from the real, live agent run (repo, explorer,
  terminal) — no AI-generated footage. The cover image (`cover.png`) was
  AI-generated.

## Run-time (part of the product)

- **Briefing composition**: the agent composes its daily Indonesian briefing
  with the free Pollinations LLM (`https://text.pollinations.ai/`, no key),
  from a human-curated queue in `agent/briefing.json`. Only the keccak256 hash
  of the composed text plus a short memo is posted on-chain; the hash is
  verified by reading it back from the contract.

## Human role

- Sandi Supriatna (project owner) set the concept and scope, created the
  QoreChain dashboard account, funded the testnet account via the faucet,
  registered for the fest, connected X and QoreX, and approved the submission.
  No AI output is presented as human work.
