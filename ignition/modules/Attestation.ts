import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys Attestation. On QoreChain the deployer needs a registered
 * ML-DSA-87 key and a live EVM authorisation window first
 * (see README: pnpm window register, then pnpm window open).
 */
export default buildModule("AttestationModule", (m) => {
  const attestation = m.contract("Attestation", []);
  return { attestation };
});
