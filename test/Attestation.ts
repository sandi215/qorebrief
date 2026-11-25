import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Attestation", async () => {
  // Runs on Hardhat's simulated network; no QoreChain endpoint is needed.
  const { viem } = await network.create();

  it("starts empty and posts one attestation", async () => {
    const attestation = await viem.deployContract("Attestation", []);
    assert.equal(await attestation.read.count(), 0n);

    const hash = "0x" + "ab".repeat(32);
    await attestation.write.attest([hash, "QoreBrief #1: fmsg.ai 3 hari lagi"]);
    assert.equal(await attestation.read.count(), 1n);

    const [readHash, memo, timestamp, author] = await attestation.read.get([0n]);
    assert.equal(readHash, hash);
    assert.equal(memo, "QoreBrief #1: fmsg.ai 3 hari lagi");
    assert.ok(timestamp > 0n);
    assert.match(author, /^0x[0-9a-fA-F]{40}$/);
  });

  it("emits Attested with the hash and memo", async () => {
    const attestation = await viem.deployContract("Attestation", []);
    const hash = "0x" + "12".repeat(32);
    const [author] = await viem.getWalletClients();
    await viem.assertions.emitWithArgs(
      attestation.write.attest([hash, "QoreBrief #2"]),
      attestation,
      "Attested",
      [0n, hash, author.account.address, "QoreBrief #2"],
    );
  });
});
