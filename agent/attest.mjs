// QoreBrief agent: compose a short daily briefing, post its hash as a
// hybrid-signed attestation on the QoreChain testnet, read it back and
// verify it. Free only: Pollinations LLM (no key), testnet QOR only.
//
// Runbook (after the contract is deployed and the window is open):
//   1. pnpm window register   (once per account)
//   2. pnpm window open       (opens the EVM authorisation window, 600 blocks / 5 txs)
//   3. node agent/attest.mjs  (posts one attestation, verifies it on chain)
//   4. node agent/attest.mjs --verify-window <COSMOS_TX_HASH>
//      (checks the window-open tx: code 0 + pqc_hybrid_verify = verified)
//
// The EVM transaction in step 3 is admitted only while the window from
// step 2 is open. If it fails with "no window", re-run step 2.

import { readFileSync, existsSync } from "node:fs";
import { createPublicClient, createWalletClient, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Load .env (PRIVATE_KEY) without printing it.
try {
  process.loadEnvFile();
} catch {
  // No .env: rely on the environment.
}

const RPC = "https://evm-testnet.qore.host";
const REST = "https://api-testnet.qore.host";
const EXPLORER = "https://explore.qore.network";
const CHAIN_ID = 9800;
const POLLINATIONS_URL = "https://text.pollinations.ai/openai/v1/chat/completions";

const CONTRACT_FILE = new URL("./contract.json", import.meta.url);
const BRIEFING_FILE = new URL("./briefing.json", import.meta.url);

function loadContract() {
  if (!existsSync(CONTRACT_FILE)) {
    console.error(
      "No agent/contract.json yet. Deploy first:\n" +
        "  pnpm deploy:attestation\n" +
        "then save the contract address as {\"address\": \"0x...\"} in agent/contract.json",
    );
    process.exit(1);
  }
  const { address } = JSON.parse(readFileSync(CONTRACT_FILE, "utf8"));
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    console.error("agent/contract.json has no valid contract address.");
    process.exit(1);
  }
  return address;
}

const ATTESTATION_ABI = [
  {
    type: "function",
    name: "attest",
    inputs: [
      { name: "briefHash", type: "bytes32" },
      { name: "memo", type: "string" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "count",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "get",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "briefHash", type: "bytes32" },
      { name: "memo", type: "string" },
      { name: "timestamp", type: "uint256" },
      { name: "author", type: "address" },
    ],
    stateMutability: "view",
  },
];

async function composeBriefing() {
  const data = JSON.parse(readFileSync(BRIEFING_FILE, "utf8"));
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines = data.items
    .map((i) => `- ${i.name}: deadline ${i.deadline}, hadiah ${i.prize}. ${i.note}`)
    .join("\n");
  const prompt =
    `Hari ini ${today}. Buatkan briefing harian 2-3 kalimat, bahasa Indonesia kasual gaya lu/gua, ` +
    `untuk Aa (Sandi), dari data antrean ini. Sebut 2 hal yang paling mepet deadline-nya dulu, ` +
    `lalu satu langkah paling penting hari ini. Jangan ngarang tanggal atau hadiah, pakai data ini saja:\n${lines}`;
  const res = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [
        {
          role: "system",
          content:
            "Kamu agen briefing pribadi. Jawab singkat, bahasa Indonesia kasual, jangan bertele-tele. Jangan pernah minta password, seed, atau private key.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Pollinations ${res.status}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Pollinations returned an empty reply");
  return text;
}

async function verifyWindowTx(hash) {
  const res = await fetch(`${REST}/cosmos/tx/v1beta1/txs/${hash}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    console.log(`window tx ${hash}: REST ${res.status} (mungkin belum final, coba lagi 10 detik)`);
    return false;
  }
  const json = await res.json();
  const code = json?.tx_response?.code;
  const events = json?.tx_response?.events ?? [];
  const hybrid = events.find((e) => e.type === "pqc_hybrid_verify");
  const status = hybrid?.attributes?.find((a) => a.key === "status")?.value;
  const ext = (json?.tx?.body?.extensions ?? []).some(
    (e) => JSON.stringify(e).includes("PQCHybridSignature"),
  );
  console.log(`window tx ${hash}: code=${code}, hybrid extension present=${ext}, pqc_hybrid_verify=${status}`);
  return code === 0 && status === "verified";
}

async function main() {
  const args = process.argv.slice(2);
  const verifyIdx = args.indexOf("--verify-window");
  if (verifyIdx !== -1) {
    const ok = await verifyWindowTx(args[verifyIdx + 1]);
    console.log(ok ? "HYBRID SIGNATURE VERIFIED ON CHAIN" : "NOT VERIFIED (yet)");
    process.exit(ok ? 0 : 1);
  }

  const contractAddress = loadContract();
  const key = process.env.PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    console.error("PRIVATE_KEY missing or invalid in .env (throwaway testnet account only).");
    process.exit(1);
  }

  console.log("QoreBrief: composing briefing...");
  const briefing = await composeBriefing();
  console.log("--- briefing ---");
  console.log(briefing);
  console.log("----------------");

  const briefHash = keccak256(toHex(briefing));
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const memo = `QoreBrief ${today}: ${briefing.split(".")[0].slice(0, 80)}`;
  console.log(`hash: ${briefHash}`);
  console.log(`memo: ${memo}`);

  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({ transport: http(RPC) });
  const walletClient = createWalletClient({ account, transport: http(RPC) });

  const before = await publicClient.readContract({
    address: contractAddress,
    abi: ATTESTATION_ABI,
    functionName: "count",
  });
  console.log(`attestations before: ${before}`);

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: ATTESTATION_ABI,
    functionName: "attest",
    args: [briefHash, memo],
    chain: { id: CHAIN_ID, name: "qorechain-diana", nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } },
  });
  console.log(`tx sent: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`tx status: ${receipt.status} (block ${receipt.blockNumber})`);

  const [readHash, readMemo, ts, author] = await publicClient.readContract({
    address: contractAddress,
    abi: ATTESTATION_ABI,
    functionName: "get",
    args: [before],
  });
  const ok = readHash.toLowerCase() === briefHash.toLowerCase() && readMemo === memo;
  console.log(`read back #${before}: hash match=${readHash.toLowerCase() === briefHash.toLowerCase()}, memo match=${readMemo === memo}, author=${author}, ts=${ts}`);
  console.log(`explorer (Testnet): ${EXPLORER} — search ${txHash}`);
  console.log(ok ? "ATTESTATION VERIFIED ON CHAIN" : "MISMATCH — check the contract");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("QoreBrief failed:", e.message);
  process.exit(1);
});
